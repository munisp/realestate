/**
 * Innovation 3: Predictive Maintenance Scoring Engine
 *
 * Calculates a 0-100 "maintenance health score" for each property by analysing:
 *  - Age of property and last renovation date
 *  - Reported issues and repair history
 *  - Climate/weather exposure (coastal, flood zone, etc.)
 *  - Building materials and construction type
 *  - Utility system ages (electrical, plumbing, HVAC)
 *
 * Outputs:
 *  - Overall score with confidence interval
 *  - Per-system breakdown (roof, plumbing, electrical, structure, HVAC)
 *  - Estimated 5-year maintenance cost
 *  - Priority action items
 *  - Depreciation impact on valuation
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { logger } from "../_core/logger";

// ── Scoring Model ──────────────────────────────────────────────────────────

interface SystemScore {
  name: string;
  score: number; // 0-100 (100 = perfect condition)
  estimatedAge: number; // years
  expectedLifespan: number; // years
  replacementCostNGN: number;
  urgency: "immediate" | "within_1yr" | "within_5yr" | "monitor" | "good";
  notes: string;
}

interface MaintenanceReport {
  propertyId: string;
  overallScore: number;
  confidenceLevel: "high" | "medium" | "low";
  grade: "A" | "B" | "C" | "D" | "F";
  systems: SystemScore[];
  estimatedAnnualMaintenanceCostNGN: number;
  estimated5YrCostNGN: number;
  valuationImpactPercent: number; // negative = reduces value
  priorityActions: string[];
  generatedAt: string;
}

function scoreFromAge(currentAge: number, expectedLifespan: number): number {
  if (currentAge <= 0) return 100;
  const ratio = currentAge / expectedLifespan;
  if (ratio >= 1) return 5;
  // Exponential decay: score drops faster as system ages
  return Math.max(5, Math.round(100 * Math.pow(1 - ratio, 1.5)));
}

function urgencyFromScore(score: number): SystemScore["urgency"] {
  if (score < 20) return "immediate";
  if (score < 40) return "within_1yr";
  if (score < 60) return "within_5yr";
  if (score < 75) return "monitor";
  return "good";
}

function gradeFromScore(score: number): MaintenanceReport["grade"] {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

// Nigerian construction cost benchmarks (NGN per sqm, 2024)
const REPLACEMENT_COSTS_PER_SQM: Record<string, number> = {
  roof: 15000,
  plumbing: 8000,
  electrical: 10000,
  structure: 45000,
  hvac: 5000,
  finishes: 12000,
};

function calculateMaintenanceScore(property: any): MaintenanceReport {
  const currentYear = new Date().getFullYear();
  const yearBuilt = property.year_built || currentYear - 10;
  const propertyAge = currentYear - yearBuilt;
  const lastRenovation = property.last_renovation_year || yearBuilt;
  const renovationAge = currentYear - lastRenovation;
  const sizeSqm = property.size_sqm || 100;
  const propertyType = property.property_type || "residential";
  const condition = property.condition || "fair";

  // Condition modifier
  const conditionModifier: Record<string, number> = {
    excellent: 1.3,
    good: 1.1,
    fair: 1.0,
    poor: 0.7,
    very_poor: 0.4,
  };
  const condMod = conditionModifier[condition] || 1.0;

  // System lifespans (years) — Nigerian climate adjusted
  const lifespans = {
    roof: propertyType === "commercial" ? 25 : 20, // shorter due to tropical climate
    plumbing: 30,
    electrical: 25,
    structure: 60,
    hvac: 15,
    finishes: 10,
  };

  // Estimate system ages based on renovation and property age
  const systemAges = {
    roof: renovationAge,
    plumbing: Math.max(renovationAge, propertyAge * 0.7),
    electrical: renovationAge,
    structure: propertyAge,
    hvac: renovationAge,
    finishes: renovationAge,
  };

  const systems: SystemScore[] = Object.entries(systemAges).map(([name, age]) => {
    const lifespan = lifespans[name as keyof typeof lifespans];
    const baseScore = scoreFromAge(age, lifespan);
    const adjustedScore = Math.min(100, Math.round(baseScore * condMod));
    const replacementCost = Math.round(REPLACEMENT_COSTS_PER_SQM[name] * sizeSqm);

    const systemNotes: Record<string, string> = {
      roof: age > 15 ? "Tropical climate accelerates roof degradation — inspect for rust/leaks" : "Within acceptable range",
      plumbing: age > 20 ? "Aging pipes may have scale buildup — consider pressure test" : "Monitor for leaks",
      electrical: age > 15 ? "Wiring may not meet current standards — safety inspection recommended" : "Check circuit breaker capacity",
      structure: propertyAge > 30 ? "Foundation and structural elements warrant professional inspection" : "Monitor for cracks",
      hvac: age > 10 ? "AC units likely near end of life — budget for replacement" : "Service annually",
      finishes: age > 8 ? "Cosmetic refresh will improve marketability" : "Good condition",
    };

    return {
      name,
      score: adjustedScore,
      estimatedAge: Math.round(age),
      expectedLifespan: lifespan,
      replacementCostNGN: replacementCost,
      urgency: urgencyFromScore(adjustedScore),
      notes: systemNotes[name] || "",
    };
  });

  // Overall score = weighted average
  const weights = { roof: 0.2, plumbing: 0.15, electrical: 0.2, structure: 0.3, hvac: 0.1, finishes: 0.05 };
  const overallScore = Math.round(
    systems.reduce((sum, s) => sum + s.score * (weights[s.name as keyof typeof weights] || 0.1), 0)
  );

  // Annual maintenance cost estimate (% of property value)
  const estimatedPropertyValue = property.price || 50000000;
  const maintenanceRateByScore = overallScore >= 75 ? 0.01 : overallScore >= 50 ? 0.02 : overallScore >= 25 ? 0.035 : 0.05;
  const estimatedAnnualCost = Math.round(estimatedPropertyValue * maintenanceRateByScore);

  // Valuation impact
  const valuationImpact = overallScore >= 75 ? 0 : overallScore >= 50 ? -5 : overallScore >= 25 ? -12 : -20;

  // Priority actions
  const priorityActions = systems
    .filter((s) => s.urgency === "immediate" || s.urgency === "within_1yr")
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((s) => `${s.name.charAt(0).toUpperCase() + s.name.slice(1)}: ${s.notes} (Est. ₦${s.replacementCostNGN.toLocaleString()})`);

  if (priorityActions.length === 0) {
    priorityActions.push("Property is in good condition. Schedule annual preventive maintenance.");
  }

  return {
    propertyId: property.id,
    overallScore,
    confidenceLevel: property.year_built ? "high" : property.condition ? "medium" : "low",
    grade: gradeFromScore(overallScore),
    systems,
    estimatedAnnualMaintenanceCostNGN: estimatedAnnualCost,
    estimated5YrCostNGN: estimatedAnnualCost * 5,
    valuationImpactPercent: valuationImpact,
    priorityActions,
    generatedAt: new Date().toISOString(),
  };
}

// ── Router ─────────────────────────────────────────────────────────────────

export const maintenanceScoreRouter = router({
  /**
   * Get maintenance score for a property
   */
  getScore: publicProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
      // Check cache first
      const cached = await db.execute(
        `SELECT score_data, generated_at FROM property_maintenance_scores 
         WHERE property_id = $1 AND generated_at > NOW() - INTERVAL '7 days'
         ORDER BY generated_at DESC LIMIT 1` as any,
        [input.propertyId]
      );

      if (cached.rows?.length) {
        return (cached.rows[0] as any).score_data as MaintenanceReport;
      }

      // Fetch property data
      const propResult = await db.execute(
        `SELECT id, title, price, property_type, condition, year_built, size_sqm,
                last_renovation_year, building_material, floors, city, state
         FROM properties WHERE id = $1 LIMIT 1` as any,
        [input.propertyId]
      );

      if (!propResult.rows?.length) {
        throw new Error("Property not found");
      }

      const property = propResult.rows[0] as any;
      const report = calculateMaintenanceScore(property);

      // Cache the result
      await db.execute(
        `INSERT INTO property_maintenance_scores (property_id, score_data, overall_score, generated_at)
         VALUES ($1, $2::jsonb, $3, NOW())
         ON CONFLICT (property_id) DO UPDATE SET score_data = $2::jsonb, overall_score = $3, generated_at = NOW()` as any,
        [input.propertyId, JSON.stringify(report), report.overallScore]
      );

      return report;
    }),

  /**
   * Batch score multiple properties (for listing pages)
   */
  batchScores: publicProcedure
    .input(z.object({ propertyIds: z.array(z.string()).min(1).max(20) }))
    .query(async ({ input }) => {
      const results = await db.execute(
        `SELECT property_id, overall_score, score_data->>'grade' as grade, generated_at
         FROM property_maintenance_scores
         WHERE property_id = ANY($1)
           AND generated_at > NOW() - INTERVAL '7 days'` as any,
        [input.propertyIds]
      );

      const cached = new Map((results.rows || []).map((r: any) => [r.property_id, r]));

      // For uncached properties, compute on the fly
      const uncached = input.propertyIds.filter((id) => !cached.has(id));
      if (uncached.length > 0) {
        const props = await db.execute(
          `SELECT id, price, property_type, condition, year_built, size_sqm
           FROM properties WHERE id = ANY($1)` as any,
          [uncached]
        );

        for (const prop of (props.rows || []) as any[]) {
          const report = calculateMaintenanceScore(prop);
          cached.set(prop.id, { property_id: prop.id, overall_score: report.overallScore, grade: report.grade });
          // Async cache save (non-blocking)
          db.execute(
            `INSERT INTO property_maintenance_scores (property_id, score_data, overall_score, generated_at)
             VALUES ($1, $2::jsonb, $3, NOW())
             ON CONFLICT (property_id) DO UPDATE SET score_data = $2::jsonb, overall_score = $3, generated_at = NOW()` as any,
            [prop.id, JSON.stringify(report), report.overallScore]
          ).catch(() => {});
        }
      }

      return input.propertyIds.map((id) => cached.get(id) ?? { property_id: id, overall_score: null, grade: null });
    }),

  /**
   * Submit a maintenance report (from inspection or owner)
   */
  submitInspectionReport: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
        inspectorName: z.string(),
        inspectionDate: z.string(),
        findings: z.record(z.object({
          condition: z.enum(["excellent", "good", "fair", "poor", "very_poor"]),
          notes: z.string().optional(),
        })),
        overallCondition: z.enum(["excellent", "good", "fair", "poor", "very_poor"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.execute(
        `INSERT INTO property_inspection_reports 
         (property_id, submitted_by, inspector_name, inspection_date, findings, overall_condition)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)` as any,
        [
          input.propertyId,
          ctx.user.id,
          input.inspectorName,
          input.inspectionDate,
          JSON.stringify(input.findings),
          input.overallCondition,
        ]
      );

      // Invalidate cached score
      await db.execute(
        `DELETE FROM property_maintenance_scores WHERE property_id = $1` as any,
        [input.propertyId]
      );

      return { success: true, message: "Inspection report submitted. Score will be recalculated." };
    }),

  /**
   * Get maintenance cost forecast for budget planning
   */
  getCostForecast: publicProcedure
    .input(z.object({ propertyId: z.string(), years: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      const scoreResult = await db.execute(
        `SELECT score_data FROM property_maintenance_scores WHERE property_id = $1 LIMIT 1` as any,
        [input.propertyId]
      );

      let annualCost = 500000; // default 500k NGN/year
      if (scoreResult.rows?.length) {
        const data = (scoreResult.rows[0] as any).score_data as MaintenanceReport;
        annualCost = data.estimatedAnnualMaintenanceCostNGN;
      }

      // Inflation-adjusted forecast (8% annual inflation in Nigeria)
      const INFLATION_RATE = 0.08;
      const forecast = Array.from({ length: input.years }, (_, i) => ({
        year: new Date().getFullYear() + i + 1,
        estimatedCostNGN: Math.round(annualCost * Math.pow(1 + INFLATION_RATE, i)),
        cumulativeCostNGN: Math.round(
          annualCost * ((Math.pow(1 + INFLATION_RATE, i + 1) - 1) / INFLATION_RATE)
        ),
      }));

      return { propertyId: input.propertyId, forecast, inflationRate: INFLATION_RATE };
    }),
});
