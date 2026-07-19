import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { DataQualityService } from "../services/dataQualityService";

export const dataQualityRouter = router({
  /**
   * Get comprehensive data quality report
   */
  getReport: protectedProcedure
    .input(
      z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        propertyType: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await DataQualityService.generateReport(input);
    }),

  /**
   * Get data quality trends over time
   */
  getTrends: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return await DataQualityService.getTrends(input.days);
    }),

  /**
   * Get confidence score breakdown for a valuation
   */
  getConfidenceBreakdown: publicProcedure
    .input(
      z.object({
        valuationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const breakdown = await DataQualityService.getConfidenceBreakdown(input.valuationId);
      if (!breakdown) {
        throw new Error("Confidence score not found for this valuation");
      }
      return breakdown;
    }),

  /**
   * Get low confidence valuations that need review
   */
  getLowConfidenceValuations: protectedProcedure
    .input(
      z.object({
        threshold: z.number().default(50),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return await DataQualityService.getLowConfidenceValuations(input.threshold, input.limit);
    }),

  /**
   * Update regional data quality metrics
   */
  updateRegionalMetrics: protectedProcedure
    .input(
      z.object({
        city: z.string(),
        state: z.string(),
        propertyType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await DataQualityService.updateRegionalMetrics(
        input.city,
        input.state,
        input.propertyType
      );

      if (!result) {
        return { success: false, message: "No data available for this region" };
      }

      return { success: true, metrics: result };
    }),
});
