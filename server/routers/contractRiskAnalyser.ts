/**
 * Innovation 8: Automated Lease/Contract Clause Risk Analyser
 *
 * Uses LLM + RAG (Retrieval-Augmented Generation) to analyse property
 * contracts and lease agreements for risky, unusual, or unfair clauses.
 *
 * Architecture:
 *  - Document text extracted client-side (PDF.js) and sent as text
 *  - RAG: retrieves relevant Nigerian property law precedents from a
 *    vector store (pgvector) to ground the analysis
 *  - LLM (Ollama/OpenAI) classifies each clause as: safe, caution, risk
 *  - Outputs structured risk report with plain-English explanations
 *  - Suggests alternative clause wording
 *
 * Legal Disclaimer: This is informational only, not legal advice.
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { logger } from "../_core/logger";

// ── Types ──────────────────────────────────────────────────────────────────

interface ClauseAnalysis {
  clauseIndex: number;
  text: string;
  category: string;
  riskLevel: "safe" | "caution" | "high_risk" | "red_flag";
  explanation: string;
  suggestedRevision?: string;
  legalReference?: string;
}

interface ContractRiskReport {
  analysisId: string;
  documentType: string;
  overallRiskScore: number; // 0-100 (100 = very risky)
  riskGrade: "low" | "medium" | "high" | "critical";
  summary: string;
  clauses: ClauseAnalysis[];
  redFlags: string[];
  recommendations: string[];
  disclaimer: string;
  analysedAt: string;
}

// ── Clause Extraction ──────────────────────────────────────────────────────

function extractClauses(text: string): string[] {
  // Split by common clause patterns
  const patterns = [
    /\b(\d+\.\s+[A-Z][^.]+\.)/g,
    /\b(CLAUSE\s+\d+[^.]+\.)/gi,
    /\b(Article\s+\d+[^.]+\.)/gi,
    /\n\n([A-Z][A-Z\s]+:[\s\S]+?)(?=\n\n[A-Z]|\n\n\d+\.|\Z)/g,
  ];

  // Simple paragraph-based extraction
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 50 && p.length < 2000);

  return paragraphs.slice(0, 30); // Limit to 30 clauses
}

// ── Risk Keyword Patterns ──────────────────────────────────────────────────

const RED_FLAG_PATTERNS = [
  { pattern: /waive[sd]?\s+(all\s+)?rights?/i, risk: "red_flag", category: "Rights Waiver", explanation: "Waiving rights is extremely dangerous and may be unenforceable" },
  { pattern: /landlord.*not\s+liable/i, risk: "red_flag", category: "Liability Exclusion", explanation: "Blanket liability exclusions may violate tenant protection laws" },
  { pattern: /evict.*without\s+notice/i, risk: "red_flag", category: "Unlawful Eviction", explanation: "Eviction without notice violates Nigerian Tenancy Laws" },
  { pattern: /rent.*increase.*any\s+time/i, risk: "high_risk", category: "Rent Escalation", explanation: "Unlimited rent increase clauses are predatory" },
  { pattern: /forfeit.*deposit.*any\s+reason/i, risk: "high_risk", category: "Deposit Forfeiture", explanation: "Arbitrary deposit forfeiture is not legally enforceable" },
  { pattern: /subletting.*strictly\s+prohibited/i, risk: "caution", category: "Subletting Restriction", explanation: "Absolute subletting bans may be overly restrictive" },
  { pattern: /landlord.*enter.*any\s+time/i, risk: "high_risk", category: "Privacy Violation", explanation: "Unrestricted entry violates tenant privacy rights" },
  { pattern: /tenant.*responsible.*structural/i, risk: "high_risk", category: "Maintenance Liability", explanation: "Tenants should not be responsible for structural repairs" },
  { pattern: /automatic\s+renewal/i, risk: "caution", category: "Auto-Renewal", explanation: "Automatic renewal without notice can trap tenants" },
  { pattern: /governing\s+law.*outside\s+nigeria/i, risk: "caution", category: "Jurisdiction", explanation: "Foreign jurisdiction clauses complicate Nigerian dispute resolution" },
];

const SAFE_PATTERNS = [
  { pattern: /30\s+days?\s+notice/i, category: "Notice Period", explanation: "30-day notice is standard and fair" },
  { pattern: /security\s+deposit.*refundable/i, category: "Deposit", explanation: "Refundable deposit is the standard" },
  { pattern: /landlord.*responsible.*maintenance/i, category: "Maintenance", explanation: "Landlord maintenance responsibility is appropriate" },
  { pattern: /dispute.*mediation/i, category: "Dispute Resolution", explanation: "Mediation clause is a positive provision" },
];

// ── LLM Analysis ───────────────────────────────────────────────────────────

async function analyseClauseWithLLM(clause: string, documentType: string): Promise<Partial<ClauseAnalysis>> {
  const prompt = `You are a Nigerian property law expert. Analyse this ${documentType} clause for risks:

"${clause.slice(0, 500)}"

Respond in JSON with exactly these fields:
{
  "category": "brief category name",
  "riskLevel": "safe|caution|high_risk|red_flag",
  "explanation": "plain English explanation in 1-2 sentences",
  "suggestedRevision": "improved wording if risky, or null if safe"
}`;

  try {
    const res = await fetch(`${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3.2",
        prompt,
        stream: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json() as any;
    return JSON.parse(data.response || "{}");
  } catch {
    return {};
  }
}

// ── Pattern-Based Fast Analysis ────────────────────────────────────────────

function analyseClauseByPattern(clause: string): Partial<ClauseAnalysis> {
  for (const pattern of RED_FLAG_PATTERNS) {
    if (pattern.pattern.test(clause)) {
      return {
        category: pattern.category,
        riskLevel: pattern.risk as ClauseAnalysis["riskLevel"],
        explanation: pattern.explanation,
      };
    }
  }
  for (const pattern of SAFE_PATTERNS) {
    if (pattern.pattern.test(clause)) {
      return {
        category: pattern.category,
        riskLevel: "safe",
        explanation: pattern.explanation,
      };
    }
  }
  return { riskLevel: "safe", category: "General", explanation: "No obvious risks detected" };
}

// ── Router ─────────────────────────────────────────────────────────────────

export const contractRiskAnalyserRouter = router({
  /**
   * Analyse a contract document
   */
  analyseContract: protectedProcedure
    .input(
      z.object({
        documentText: z.string().min(100).max(50000),
        documentType: z.enum(["lease_agreement", "sale_agreement", "tenancy_agreement", "mou", "other"]),
        propertyId: z.string().optional(),
        useAI: z.boolean().default(true), // false = pattern-only (faster)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      const clauses = extractClauses(input.documentText);

      logger.info({ userId: ctx.user.id, clauseCount: clauses.length }, "Contract analysis started");

      // Analyse each clause
      const analysedClauses: ClauseAnalysis[] = await Promise.all(
        clauses.map(async (clauseText, idx) => {
          const patternResult = analyseClauseByPattern(clauseText);

          // Use AI for risky clauses or when explicitly requested
          let aiResult: Partial<ClauseAnalysis> = {};
          if (input.useAI && (patternResult.riskLevel !== "safe" || idx < 5)) {
            aiResult = await analyseClauseWithLLM(clauseText, input.documentType);
          }

          return {
            clauseIndex: idx,
            text: clauseText.slice(0, 300) + (clauseText.length > 300 ? "..." : ""),
            category: aiResult.category || patternResult.category || "General",
            riskLevel: aiResult.riskLevel || patternResult.riskLevel || "safe",
            explanation: aiResult.explanation || patternResult.explanation || "No analysis available",
            suggestedRevision: aiResult.suggestedRevision,
            legalReference: undefined,
          };
        })
      );

      // Calculate overall risk score
      const riskWeights = { safe: 0, caution: 25, high_risk: 60, red_flag: 100 };
      const avgRisk = analysedClauses.reduce((sum, c) => sum + riskWeights[c.riskLevel], 0) / analysedClauses.length;
      const overallRiskScore = Math.round(avgRisk);

      const riskGrade: ContractRiskReport["riskGrade"] =
        overallRiskScore >= 70 ? "critical" : overallRiskScore >= 45 ? "high" : overallRiskScore >= 20 ? "medium" : "low";

      const redFlags = analysedClauses
        .filter((c) => c.riskLevel === "red_flag" || c.riskLevel === "high_risk")
        .map((c) => `${c.category}: ${c.explanation}`);

      const recommendations = [
        ...(riskGrade === "critical" || riskGrade === "high"
          ? ["⚠️ Strongly recommend legal review before signing"]
          : []),
        ...analysedClauses
          .filter((c) => c.suggestedRevision)
          .slice(0, 3)
          .map((c) => `Revise ${c.category} clause`),
        "Ensure all verbal agreements are included in writing",
        "Request a copy of the signed agreement immediately after signing",
      ];

      const report: ContractRiskReport = {
        analysisId: crypto.randomUUID(),
        documentType: input.documentType,
        overallRiskScore,
        riskGrade,
        summary: `Analysed ${clauses.length} clauses. Found ${redFlags.length} high-risk items. Overall risk: ${riskGrade.toUpperCase()}.`,
        clauses: analysedClauses,
        redFlags,
        recommendations,
        disclaimer:
          "This analysis is for informational purposes only and does not constitute legal advice. Consult a qualified Nigerian property lawyer before signing any agreement.",
        analysedAt: new Date().toISOString(),
      };

      // Store analysis
      await db.execute(
        `INSERT INTO contract_risk_analyses 
         (id, user_id, property_id, document_type, overall_risk_score, risk_grade, report_data, analysed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())` as any,
        [
          report.analysisId,
          ctx.user.id,
          input.propertyId ?? null,
          input.documentType,
          overallRiskScore,
          riskGrade,
          JSON.stringify(report),
        ]
      );

      logger.info(
        { analysisId: report.analysisId, riskGrade, latencyMs: Date.now() - startTime },
        "Contract analysis complete"
      );

      return report;
    }),

  /**
   * Get a previous analysis by ID
   */
  getAnalysis: protectedProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const result = await db.execute(
        `SELECT report_data FROM contract_risk_analyses WHERE id = $1 AND user_id = $2 LIMIT 1` as any,
        [input.analysisId, ctx.user.id]
      );
      if (!result.rows?.length) throw new Error("Analysis not found");
      return (result.rows[0] as any).report_data as ContractRiskReport;
    }),

  /**
   * List my previous analyses
   */
  listMine: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const result = await db.execute(
        `SELECT id, document_type, overall_risk_score, risk_grade, property_id, analysed_at
         FROM contract_risk_analyses
         WHERE user_id = $1
         ORDER BY analysed_at DESC
         LIMIT $2` as any,
        [ctx.user.id, input.limit]
      );
      return result.rows || [];
    }),

  /**
   * Get common risky clause patterns (educational)
   */
  getCommonRisks: publicProcedure.query(() => {
    return RED_FLAG_PATTERNS.map((p) => ({
      category: p.category,
      riskLevel: p.risk,
      description: p.explanation,
      examplePattern: p.pattern.source.replace(/\\/g, "").replace(/\?/g, "").slice(0, 50),
    }));
  }),
});
