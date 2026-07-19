// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  recommendationExperiments,
  experimentAssignments,
  experimentMetrics,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * A/B Testing Router
 * 
 * Manages recommendation algorithm experiments including:
 * - Experiment creation and configuration
 * - User variant assignment
 * - Metric tracking (clicks, favorites, feedback)
 * - Performance analytics and statistical significance
 */

export const abTestingRouter = router({
  /**
   * Get user's assigned variant for active experiments
   */
  getAssignment: protectedProcedure
    .input(z.object({ experimentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if user already has an assignment
      const existing = await db
        .select()
        .from(experimentAssignments)
        .where(
          and(
            eq(experimentAssignments.experimentId, input.experimentId),
            eq(experimentAssignments.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { variant: existing[0].variant };
      }

      // Get experiment configuration
      const experiment = await db
        .select()
        .from(recommendationExperiments)
        .where(eq(recommendationExperiments.id, input.experimentId))
        .limit(1);

      if (experiment.length === 0 || experiment[0].status !== "active") {
        return { variant: "control" }; // Default to control if experiment not found/active
      }

      // Assign user to a variant based on traffic allocation
      const allocation = JSON.parse(experiment[0].trafficAllocation);
      const variant = assignVariant(ctx.user.id, allocation);

      // Save assignment
      await db.insert(experimentAssignments).values({
        experimentId: input.experimentId,
        userId: ctx.user.id,
        variant,
      });

      return { variant };
    }),

  /**
   * Track experiment metric (click, favorite, feedback, etc.)
   */
  trackMetric: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
        variant: z.string(),
        metricType: z.enum(["click", "favorite", "feedback_positive", "feedback_negative", "view"]),
        propertyId: z.number().optional(),
        value: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(experimentMetrics).values({
        experimentId: input.experimentId,
        userId: ctx.user.id,
        variant: input.variant,
        metricType: input.metricType,
        propertyId: input.propertyId,
        value: input.value || 1,
      });

      return { success: true };
    }),

  /**
   * Get experiment performance metrics
   */
  getExperimentMetrics: protectedProcedure
    .input(z.object({ experimentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get metrics grouped by variant and metric type
      const metrics = await db
        .select({
          variant: experimentMetrics.variant,
          metricType: experimentMetrics.metricType,
          count: sql<number>`count(*)`,
          totalValue: sql<number>`sum(${experimentMetrics.value})`,
        })
        .from(experimentMetrics)
        .where(eq(experimentMetrics.experimentId, input.experimentId))
        .groupBy(experimentMetrics.variant, experimentMetrics.metricType);

      // Get unique users per variant
      const userCounts = await db
        .select({
          variant: experimentAssignments.variant,
          userCount: sql<number>`count(distinct ${experimentAssignments.userId})`,
        })
        .from(experimentAssignments)
        .where(eq(experimentAssignments.experimentId, input.experimentId))
        .groupBy(experimentAssignments.variant);

      return {
        metrics,
        userCounts,
      };
    }),

  /**
   * Get all experiments
   */
  listExperiments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const experiments = await db
      .select()
      .from(recommendationExperiments)
      .orderBy(sql`${recommendationExperiments.createdAt} DESC`);

    return experiments;
  }),

  /**
   * Create new experiment
   */
  createExperiment: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        variants: z.record(z.any()), // { control: {...}, variant_a: {...} }
        trafficAllocation: z.record(z.number()), // { control: 50, variant_a: 50 }
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(recommendationExperiments).values({
        name: input.name,
        description: input.description || "",
        variants: JSON.stringify(input.variants),
        trafficAllocation: JSON.stringify(input.trafficAllocation),
        status: "draft",
      });

      return { success: true, experimentId: Number(result.id) };
    }),

  /**
   * Update experiment status
   */
  updateExperimentStatus: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
        status: z.enum(["draft", "active", "paused", "completed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(recommendationExperiments)
        .set({ status: input.status })
        .where(eq(recommendationExperiments.id, input.experimentId));

      return { success: true };
    }),

  /**
   * Calculate statistical significance between variants
   */
  calculateSignificance: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
        metricType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get conversion rates for each variant
      const variantStats = await db
        .select({
          variant: experimentMetrics.variant,
          conversions: sql<number>`count(*)`,
        })
        .from(experimentMetrics)
        .where(
          and(
            eq(experimentMetrics.experimentId, input.experimentId),
            eq(experimentMetrics.metricType, input.metricType)
          )
        )
        .groupBy(experimentMetrics.variant);

      const userCounts = await db
        .select({
          variant: experimentAssignments.variant,
          users: sql<number>`count(distinct ${experimentAssignments.userId})`,
        })
        .from(experimentAssignments)
        .where(eq(experimentAssignments.experimentId, input.experimentId))
        .groupBy(experimentAssignments.variant);

      // Calculate conversion rates
      const results = variantStats.map((stat) => {
        const userCount = userCounts.find((u) => u.variant === stat.variant);
        const conversionRate = userCount ? (stat.conversions / userCount.users) * 100 : 0;

        return {
          variant: stat.variant,
          conversions: stat.conversions,
          users: userCount?.users || 0,
          conversionRate: Math.round(conversionRate * 100) / 100,
        };
      });

      // Simple statistical significance check (chi-square test approximation)
      if (results.length === 2) {
        const [control, variant] = results;
        const pooledRate =
          (control.conversions + variant.conversions) / (control.users + variant.users);

        const expectedControl = control.users * pooledRate;
        const expectedVariant = variant.users * pooledRate;

        const chiSquare =
          Math.pow(control.conversions - expectedControl, 2) / expectedControl +
          Math.pow(variant.conversions - expectedVariant, 2) / expectedVariant;

        // Chi-square critical value for 95% confidence (1 degree of freedom) is 3.841
        const isSignificant = chiSquare > 3.841;
        const pValue = isSignificant ? "< 0.05" : ">= 0.05";

        return {
          results,
          statistical: {
            chiSquare: Math.round(chiSquare * 100) / 100,
            isSignificant,
            pValue,
            confidenceLevel: isSignificant ? "95%" : "< 95%",
          },
        };
      }

      return { results, statistical: null };
    }),
});

/**
 * Assign user to a variant based on traffic allocation
 * Uses deterministic hashing to ensure consistent assignment
 */
function assignVariant(userId: number, allocation: Record<string, number>): string {
  const variants = Object.keys(allocation);
  const weights = Object.values(allocation);

  // Simple hash function for consistent assignment
  const hash = userId % 100;

  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulative += weights[i];
    if (hash < cumulative) {
      return variants[i];
    }
  }

  return variants[0]; // Fallback to first variant
}
