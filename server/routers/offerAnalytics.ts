import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as offerAnalyticsService from "../services/offerAnalyticsService";

export const offerAnalyticsRouter = router({
  /**
   * Get user's offer metrics
   */
  getUserMetrics: protectedProcedure
    .input(
      z.object({
        role: z.enum(["buyer", "seller"]),
      })
    )
    .query(async ({ ctx, input }) => {
      return offerAnalyticsService.getUserOfferMetrics(ctx.user.id, input.role);
    }),

  /**
   * Get offer analytics for a property
   */
  getPropertyAnalytics: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return offerAnalyticsService.getPropertyOfferAnalytics(input.propertyId);
    }),

  /**
   * Get market trends
   */
  getMarketTrends: publicProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(), // ISO date string
        groupBy: z.enum(["day", "week", "month"]).default("week"),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      return offerAnalyticsService.getMarketTrends(startDate, endDate, input.groupBy);
    }),

  /**
   * Get comparative market analysis
   */
  getComparativeMarketAnalysis: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return offerAnalyticsService.getComparativeMarketAnalysis(input.propertyId);
    }),

  /**
   * Get offer success prediction
   */
  getOfferSuccessPrediction: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        offerAmount: z.number(),
      })
    )
    .query(async ({ input }) => {
      return offerAnalyticsService.getOfferSuccessPrediction(
        input.propertyId,
        input.offerAmount
      );
    }),
});
