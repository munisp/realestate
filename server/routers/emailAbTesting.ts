// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  emailAbTests,
  emailAbTestVariants,
  emailAbTestResults,
} from "../../drizzle/schema";

/**
 * Email A/B Testing Router
 * 
 * Provides endpoints for:
 * - Creating and managing A/B tests
 * - Tracking variant performance
 * - Statistical analysis
 * - Winner selection
 */

export const emailAbTestingRouter = router({
  /**
   * Create a new A/B test
   */
  create: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        testType: z.enum(["subject_line", "content", "send_time", "from_name"]),
        trafficSplit: z.number().min(0).max(100).default(50),
        sampleSize: z.number().optional(),
        confidenceLevel: z.number().default(95),
        winnerMetric: z.enum(["open_rate", "click_rate", "conversion_rate"]).default("open_rate"),
        autoPromoteWinner: z.boolean().default(true),
        variantA: z.object({
          subjectLine: z.string().optional(),
          fromName: z.string().optional(),
          content: z.string().optional(),
          sendTime: z.string().optional(),
        }),
        variantB: z.object({
          subjectLine: z.string().optional(),
          fromName: z.string().optional(),
          content: z.string().optional(),
          sendTime: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create the test
      const [test] = await db.insert(emailAbTests).values({
        campaignId: input.campaignId,
        name: input.name,
        description: input.description,
        testType: input.testType,
        trafficSplit: input.trafficSplit,
        sampleSize: input.sampleSize,
        confidenceLevel: input.confidenceLevel,
        winnerMetric: input.winnerMetric,
        autoPromoteWinner: input.autoPromoteWinner ? 1 : 0,
        status: "draft",
      });

      // Create variant A
      await db.insert(emailAbTestVariants).values({
        testId: test.insertId,
        variant: "A",
        ...input.variantA,
      });

      // Create variant B
      await db.insert(emailAbTestVariants).values({
        testId: test.insertId,
        variant: "B",
        ...input.variantB,
      });

      return { testId: test.insertId };
    }),

  /**
   * Get all tests for a campaign
   */
  getForCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return db
        .select()
        .from(emailAbTests)
        .where(eq(emailAbTests.campaignId, input.campaignId));
    }),

  /**
   * Get test details with variants and results
   */
  getDetails: protectedProcedure
    .input(z.object({ testId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [test] = await db
        .select()
        .from(emailAbTests)
        .where(eq(emailAbTests.id, input.testId));

      if (!test) throw new Error("Test not found");

      const variants = await db
        .select()
        .from(emailAbTestVariants)
        .where(eq(emailAbTestVariants.testId, input.testId));

      const [results] = await db
        .select()
        .from(emailAbTestResults)
        .where(eq(emailAbTestResults.testId, input.testId));

      return {
        test,
        variants,
        results: results || null,
      };
    }),

  /**
   * Start an A/B test
   */
  start: protectedProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(emailAbTests)
        .set({
          status: "running",
          startedAt: new Date(),
        })
        .where(eq(emailAbTests.id, input.testId));

      return { success: true };
    }),

  /**
   * Pause an A/B test
   */
  pause: protectedProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(emailAbTests)
        .set({ status: "draft" })
        .where(eq(emailAbTests.id, input.testId));

      return { success: true };
    }),

  /**
   * Update variant metrics
   */
  updateMetrics: protectedProcedure
    .input(
      z.object({
        variantId: z.number(),
        sent: z.number().optional(),
        delivered: z.number().optional(),
        opened: z.number().optional(),
        clicked: z.number().optional(),
        converted: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [variant] = await db
        .select()
        .from(emailAbTestVariants)
        .where(eq(emailAbTestVariants.id, input.variantId));

      if (!variant) throw new Error("Variant not found");

      // Update counts
      const newSent = variant.sentCount + (input.sent ?? 0);
      const newDelivered = variant.deliveredCount + (input.delivered ?? 0);
      const newOpened = variant.openedCount + (input.opened ?? 0);
      const newClicked = variant.clickedCount + (input.clicked ?? 0);
      const newConverted = variant.convertedCount + (input.converted ?? 0);

      // Calculate rates (stored as percentage * 100 for precision)
      const deliveryRate = newSent > 0 ? Math.round((newDelivered / newSent) * 10000) : 0;
      const openRate = newDelivered > 0 ? Math.round((newOpened / newDelivered) * 10000) : 0;
      const clickRate = newOpened > 0 ? Math.round((newClicked / newOpened) * 10000) : 0;
      const conversionRate = newClicked > 0 ? Math.round((newConverted / newClicked) * 10000) : 0;

      await db
        .update(emailAbTestVariants)
        .set({
          sentCount: newSent,
          deliveredCount: newDelivered,
          openedCount: newOpened,
          clickedCount: newClicked,
          convertedCount: newConverted,
          deliveryRate,
          openRate,
          clickRate,
          conversionRate,
        })
        .where(eq(emailAbTestVariants.id, input.variantId));

      return { success: true };
    }),

  /**
   * Analyze test and determine winner
   */
  analyze: protectedProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [test] = await db
        .select()
        .from(emailAbTests)
        .where(eq(emailAbTests.id, input.testId));

      if (!test) throw new Error("Test not found");

      const variants = await db
        .select()
        .from(emailAbTestVariants)
        .where(eq(emailAbTestVariants.testId, input.testId));

      if (variants.length !== 2) throw new Error("Test must have exactly 2 variants");

      const variantA = variants.find((v) => v.variant === "A")!;
      const variantB = variants.find((v) => v.variant === "B")!;

      // Get the metric to compare based on test configuration
      let metricA: number, metricB: number, nA: number, nB: number;

      switch (test.winnerMetric) {
        case "open_rate":
          metricA = variantA.openRate / 10000;
          metricB = variantB.openRate / 10000;
          nA = variantA.deliveredCount;
          nB = variantB.deliveredCount;
          break;
        case "click_rate":
          metricA = variantA.clickRate / 10000;
          metricB = variantB.clickRate / 10000;
          nA = variantA.openedCount;
          nB = variantB.openedCount;
          break;
        case "conversion_rate":
          metricA = variantA.conversionRate / 10000;
          metricB = variantB.conversionRate / 10000;
          nA = variantA.clickedCount;
          nB = variantB.clickedCount;
          break;
        default:
          throw new Error("Invalid winner metric");
      }

      // Require minimum sample size
      if (nA < 30 || nB < 30) {
        return {
          pValue: 1,
          isSignificant: false,
          confidenceInterval: "N/A (insufficient data)",
          winnerVariant: null,
          improvementPercentage: 0,
          recommendation: "Continue test - need at least 30 samples per variant",
          shouldPromote: false,
        };
      }

      // Calculate statistical significance using Z-test
      const pPool = (metricA * nA + metricB * nB) / (nA + nB);
      const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
      const zScore = (metricA - metricB) / se;
      const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

      // Determine significance
      const alphaLevel = (100 - test.confidenceLevel) / 100;
      const isSignificant = pValue < alphaLevel;

      // Calculate confidence interval
      const marginOfError = 1.96 * Math.sqrt((metricA * (1 - metricA)) / nA);
      const ciLower = ((metricA - marginOfError) * 100).toFixed(2);
      const ciUpper = ((metricA + marginOfError) * 100).toFixed(2);
      const confidenceInterval = `${test.confidenceLevel}% CI: [${ciLower}%, ${ciUpper}%]`;

      // Determine winner
      let winnerVariant: "A" | "B" | null = null;
      let improvementPercentage = 0;

      if (isSignificant) {
        if (metricA > metricB) {
          winnerVariant = "A";
          improvementPercentage = Math.round(((metricA - metricB) / metricB) * 100);
        } else {
          winnerVariant = "B";
          improvementPercentage = Math.round(((metricB - metricA) / metricA) * 100);
        }
      }

      // Generate recommendation
      let recommendation: string;
      if (!isSignificant) {
        recommendation = `No statistically significant difference detected (p=${pValue.toFixed(4)}). Continue test or use either variant.`;
      } else {
        recommendation = `Variant ${winnerVariant} is the clear winner with ${improvementPercentage}% improvement (p=${pValue.toFixed(4)}). ${
          test.autoPromoteWinner ? "Auto-promoting winner." : "Consider promoting winner."
        }`;
      }

      const shouldPromote = isSignificant && test.autoPromoteWinner === 1;

      // Save results
      await db.insert(emailAbTestResults).values({
        testId: input.testId,
        pValue: pValue.toFixed(6),
        isSignificant: isSignificant ? 1 : 0,
        confidenceInterval,
        winnerVariant,
        improvementPercentage: improvementPercentage * 100,
        recommendation,
        shouldPromote: shouldPromote ? 1 : 0,
      });

      // Update test status
      await db
        .update(emailAbTests)
        .set({
          status: "completed",
          completedAt: new Date(),
          winnerVariant,
        })
        .where(eq(emailAbTests.id, input.testId));

      return {
        pValue,
        isSignificant,
        confidenceInterval,
        winnerVariant,
        improvementPercentage,
        recommendation,
        shouldPromote,
      };
    }),

  /**
   * Delete an A/B test
   */
  delete: protectedProcedure
    .input(z.object({ testId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete in order: results, variants, test
      await db.delete(emailAbTestResults).where(eq(emailAbTestResults.testId, input.testId));
      await db.delete(emailAbTestVariants).where(eq(emailAbTestVariants.testId, input.testId));
      await db.delete(emailAbTests).where(eq(emailAbTests.id, input.testId));

      return { success: true };
    }),
});

// Helper function for normal CDF
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const probability =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - probability : probability;
}
