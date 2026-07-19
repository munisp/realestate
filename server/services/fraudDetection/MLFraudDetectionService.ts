// @ts-nocheck
import { invokeLLM } from "../../_core/llm";
import crypto from "crypto";

/**
 * ML-Based Fraud Detection Service
 * Uses multiple AI models to detect fraudulent C of O documents and patterns
 */

export interface FraudDetectionInput {
  cofONumber: string;
  holderName: string;
  issueDate: Date;
  issuingAuthority: string;
  documentUrl?: string;
  state: string;
  landSize?: string;
  location?: string;
  registryData?: any;
}

export interface FraudDetectionResult {
  fraudScore: number; // 0-100, higher means more likely fraudulent
  riskLevel: "low" | "medium" | "high" | "critical";
  detectedIssues: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    confidence: number;
  }>;
  modelScores: {
    patternAnalysis: number;
    documentAnalysis?: number;
    nameMatching: number;
    anomalyDetection: number;
    aiReasoning: number;
  };
  recommendations: string[];
  explanation: string;
}

/**
 * Pattern-based fraud detection
 * Analyzes C of O number patterns, dates, and known fraud indicators
 */
export async function analyzePatterns(
  input: FraudDetectionInput
): Promise<{ score: number; issues: any[] }> {
  const issues: any[] = [];
  let score = 0;

  // Check for suspicious number patterns
  if (/0{4,}/.test(input.cofONumber)) {
    issues.push({
      type: "suspicious_pattern",
      severity: "high",
      description: "C of O number contains suspicious repeating zeros",
      confidence: 0.85,
    });
    score += 30;
  }

  if (/(.)\1{4,}/.test(input.cofONumber)) {
    issues.push({
      type: "suspicious_pattern",
      severity: "medium",
      description: "C of O number contains suspicious repeating characters",
      confidence: 0.75,
    });
    score += 20;
  }

  // Check date validity
  const now = new Date();
  if (input.issueDate > now) {
    issues.push({
      type: "invalid_date",
      severity: "critical",
      description: "Issue date is in the future",
      confidence: 1.0,
    });
    score += 50;
  }

  const nigeriaIndependence = new Date("1960-10-01");
  if (input.issueDate < nigeriaIndependence) {
    issues.push({
      type: "invalid_date",
      severity: "critical",
      description: "Issue date predates Nigerian independence (1960)",
      confidence: 0.95,
    });
    score += 45;
  }

  // Check for known fake authorities
  const suspiciousAuthorities = [
    "fake",
    "test",
    "unknown",
    "temporary",
    "provisional",
    "unofficial",
  ];
  const authorityLower = input.issuingAuthority.toLowerCase();
  for (const suspicious of suspiciousAuthorities) {
    if (authorityLower.includes(suspicious)) {
      issues.push({
        type: "suspicious_authority",
        severity: "critical",
        description: `Issuing authority contains suspicious keyword: "${suspicious}"`,
        confidence: 0.9,
      });
      score += 40;
      break;
    }
  }

  // Check for unrealistic land sizes
  if (input.landSize) {
    const size = parseFloat(input.landSize);
    if (size > 1000000) {
      // > 1 million sqm (100 hectares)
      issues.push({
        type: "unrealistic_size",
        severity: "medium",
        description: "Land size is unusually large (>100 hectares)",
        confidence: 0.7,
      });
      score += 15;
    }
    if (size < 1) {
      issues.push({
        type: "unrealistic_size",
        severity: "high",
        description: "Land size is unrealistically small (<1 sqm)",
        confidence: 0.85,
      });
      score += 25;
    }
  }

  return { score: Math.min(score, 100), issues };
}

/**
 * Name matching analysis using advanced fuzzy logic
 */
export async function analyzeNameMatching(
  providedName: string,
  registryName?: string
): Promise<{ score: number; issues: any[] }> {
  if (!registryName) {
    return { score: 0, issues: [] };
  }

  const similarity = calculateNameSimilarity(providedName, registryName);
  const issues: any[] = [];
  let score = 0;

  if (similarity < 0.5) {
    issues.push({
      type: "name_mismatch",
      severity: "critical",
      description: `Significant name mismatch with registry (${Math.round(similarity * 100)}% similarity)`,
      confidence: 0.9,
    });
    score += 50;
  } else if (similarity < 0.7) {
    issues.push({
      type: "name_mismatch",
      severity: "high",
      description: `Moderate name mismatch with registry (${Math.round(similarity * 100)}% similarity)`,
      confidence: 0.75,
    });
    score += 30;
  } else if (similarity < 0.85) {
    issues.push({
      type: "name_variation",
      severity: "medium",
      description: `Minor name variation detected (${Math.round(similarity * 100)}% similarity)`,
      confidence: 0.6,
    });
    score += 15;
  }

  return { score, issues };
}

/**
 * Calculate name similarity using Levenshtein distance
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim().replace(/\s+/g, " ");
  const s2 = name2.toLowerCase().trim().replace(/\s+/g, " ");

  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Anomaly detection using statistical analysis
 */
export async function detectAnomalies(
  input: FraudDetectionInput
): Promise<{ score: number; issues: any[] }> {
  const issues: any[] = [];
  let score = 0;

  // Check for data consistency
  if (input.registryData) {
    // Compare provided data with registry data
    if (
      input.registryData.issueDate &&
      Math.abs(
        new Date(input.registryData.issueDate).getTime() -
          input.issueDate.getTime()
      ) >
        86400000 * 7
    ) {
      // 7 days difference
      issues.push({
        type: "date_inconsistency",
        severity: "high",
        description: "Issue date differs significantly from registry records",
        confidence: 0.85,
      });
      score += 35;
    }

    if (
      input.registryData.landSize &&
      input.landSize &&
      Math.abs(
        parseFloat(input.registryData.landSize) - parseFloat(input.landSize)
      ) >
        parseFloat(input.registryData.landSize) * 0.1
    ) {
      // >10% difference
      issues.push({
        type: "size_inconsistency",
        severity: "medium",
        description: "Land size differs from registry records by >10%",
        confidence: 0.75,
      });
      score += 20;
    }
  }

  // Check for temporal anomalies
  const daysSinceIssue = Math.floor(
    (Date.now() - input.issueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceIssue < 30) {
    issues.push({
      type: "recent_issue",
      severity: "low",
      description: "C of O was issued very recently (< 30 days)",
      confidence: 0.5,
    });
    score += 10;
  }

  return { score: Math.min(score, 100), issues };
}

/**
 * AI-powered reasoning using LLM
 * Provides explainable fraud detection with natural language reasoning
 */
export async function aiReasoningAnalysis(
  input: FraudDetectionInput,
  patternIssues: any[],
  nameIssues: any[],
  anomalyIssues: any[]
): Promise<{ score: number; explanation: string; additionalIssues: any[] }> {
  const allIssues = [...patternIssues, ...nameIssues, ...anomalyIssues];

  const prompt = `You are an expert fraud detection analyst specializing in Nigerian Certificate of Occupancy (C of O) documents. Analyze the following C of O information and detected issues to provide a comprehensive fraud risk assessment.

C of O Information:
- Number: ${input.cofONumber}
- Holder Name: ${input.holderName}
- Issue Date: ${input.issueDate.toISOString().split("T")[0]}
- Issuing Authority: ${input.issuingAuthority}
- State: ${input.state}
${input.landSize ? `- Land Size: ${input.landSize}` : ""}
${input.location ? `- Location: ${input.location}` : ""}

Detected Issues:
${allIssues.length > 0 ? allIssues.map((issue, i) => `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.description} (Confidence: ${Math.round(issue.confidence * 100)}%)`).join("\n") : "No issues detected by automated systems."}

${input.registryData ? `Registry Data Available: Yes\nRegistry Holder: ${input.registryData.holderName || "N/A"}` : "Registry Data Available: No"}

Please provide:
1. A fraud risk score from 0-100 (0=no risk, 100=definite fraud)
2. A detailed explanation of your assessment
3. Any additional red flags or concerns not captured by automated systems
4. Specific recommendations for verification

Respond in JSON format:
{
  "fraudScore": <number>,
  "explanation": "<detailed explanation>",
  "additionalIssues": [
    {
      "type": "<issue_type>",
      "severity": "<low|medium|high|critical>",
      "description": "<description>",
      "confidence": <0-1>
    }
  ],
  "recommendations": ["<recommendation1>", "<recommendation2>", ...]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert fraud detection analyst. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fraud_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              fraudScore: {
                type: "number",
                description: "Fraud risk score from 0-100",
              },
              explanation: {
                type: "string",
                description: "Detailed explanation of the assessment",
              },
              additionalIssues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    severity: { type: "string" },
                    description: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["type", "severity", "description", "confidence"],
                  additionalProperties: false,
                },
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "fraudScore",
              "explanation",
              "additionalIssues",
              "recommendations",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      score: result.fraudScore || 0,
      explanation: result.explanation || "No explanation provided",
      additionalIssues: result.additionalIssues || [],
    };
  } catch (error) {
    console.error("[MLFraudDetection] AI reasoning failed:", error);
    return {
      score: 0,
      explanation: "AI analysis unavailable",
      additionalIssues: [],
    };
  }
}

/**
 * Main fraud detection orchestrator
 * Combines multiple models for comprehensive fraud detection
 */
export async function detectFraud(
  input: FraudDetectionInput
): Promise<FraudDetectionResult> {
  // Run all detection models in parallel
  const [patternResult, nameResult, anomalyResult] = await Promise.all([
    analyzePatterns(input),
    analyzeNameMatching(input.holderName, input.registryData?.holderName),
    detectAnomalies(input),
  ]);

  // Run AI reasoning with results from other models
  const aiResult = await aiReasoningAnalysis(
    input,
    patternResult.issues,
    nameResult.issues,
    anomalyResult.issues
  );

  // Combine all issues
  const allIssues = [
    ...patternResult.issues,
    ...nameResult.issues,
    ...anomalyResult.issues,
    ...aiResult.additionalIssues,
  ];

  // Calculate weighted fraud score
  const weights = {
    pattern: 0.2,
    name: 0.2,
    anomaly: 0.2,
    ai: 0.4, // AI gets highest weight as it considers all factors
  };

  const fraudScore =
    patternResult.score * weights.pattern +
    nameResult.score * weights.name +
    anomalyResult.score * weights.anomaly +
    aiResult.score * weights.ai;

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (fraudScore >= 75) riskLevel = "critical";
  else if (fraudScore >= 50) riskLevel = "high";
  else if (fraudScore >= 25) riskLevel = "medium";
  else riskLevel = "low";

  // Generate recommendations
  const recommendations: string[] = [];

  if (fraudScore >= 50) {
    recommendations.push(
      "DO NOT proceed with transaction without thorough manual verification"
    );
    recommendations.push("Engage a qualified property lawyer immediately");
    recommendations.push(
      "Request original C of O document for physical inspection"
    );
  }

  if (allIssues.some((i) => i.type === "name_mismatch")) {
    recommendations.push(
      "Verify holder identity with government-issued ID and registry records"
    );
  }

  if (allIssues.some((i) => i.type.includes("date"))) {
    recommendations.push(
      "Cross-verify dates with multiple independent sources"
    );
  }

  if (!input.registryData) {
    recommendations.push(
      "Obtain verification from state land registry before proceeding"
    );
  }

  if (fraudScore < 25 && allIssues.length === 0) {
    recommendations.push(
      "Document appears legitimate, but standard due diligence still recommended"
    );
  }

  return {
    fraudScore: Math.round(fraudScore),
    riskLevel,
    detectedIssues: allIssues,
    modelScores: {
      patternAnalysis: Math.round(patternResult.score),
      nameMatching: Math.round(nameResult.score),
      anomalyDetection: Math.round(anomalyResult.score),
      aiReasoning: Math.round(aiResult.score),
    },
    recommendations,
    explanation: aiResult.explanation,
  };
}
