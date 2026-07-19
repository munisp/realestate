import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { competitorDataService } from "../services/competitorDataService";
import { competitorRefreshScheduler } from "../services/competitorRefreshScheduler";
import { ownerNotificationService } from "../services/ownerNotificationService";

export const competitorTrackingRouter = router({
  /**
   * Get market analysis for a specific location and property type
   */
  getMarketAnalysis: protectedProcedure
    .input(
      z.object({
        city: z.string(),
        bedrooms: z.number().int().positive(),
        bathrooms: z.number().int().positive(),
        guests: z.number().int().positive(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await competitorDataService.getMarketAnalysis(input);
    }),

  /**
   * Get pricing recommendation for a property
   */
  getPricingRecommendation: protectedProcedure
    .input(
      z.object({
        city: z.string(),
        bedrooms: z.number().int().positive(),
        bathrooms: z.number().int().positive(),
        guests: z.number().int().positive(),
        currentPrice: z.number().positive().optional(),
        propertyQuality: z.enum(['budget', 'standard', 'premium']).optional(),
      })
    )
    .query(async ({ input }) => {
      return await competitorDataService.getPricingRecommendation(input);
    }),

  /**
   * Get competitor listings similar to a property
   */
  getCompetitorListings: protectedProcedure
    .input(
      z.object({
        city: z.string(),
        bedrooms: z.number().int().positive(),
        bathrooms: z.number().int().positive(),
        guests: z.number().int().positive(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      return await competitorDataService.getCompetitorListings(input);
    }),

  /**
   * Get competitor data service status
   */
  getServiceStatus: protectedProcedure.query(async () => {
    return competitorDataService.getServiceStatus();
  }),

  /**
   * Get scheduler status
   */
  getSchedulerStatus: protectedProcedure.query(async () => {
    return competitorRefreshScheduler.getStatus();
  }),

  /**
   * Manually trigger competitor price refresh
   */
  triggerManualRefresh: protectedProcedure.mutation(async () => {
    return await competitorRefreshScheduler.triggerManualRefresh();
  }),

  /**
   * Send price change alerts to property owners
   */
  sendPriceAlerts: protectedProcedure.mutation(async () => {
    return await ownerNotificationService.sendPriceChangeAlerts();
  }),

  /**
   * Send optimization opportunity alerts
   */
  sendOptimizationAlerts: protectedProcedure.mutation(async () => {
    return await ownerNotificationService.sendOptimizationAlerts();
  }),

  /**
   * Send weekly market summary
   */
  sendWeeklySummary: protectedProcedure.mutation(async () => {
    const sent = await ownerNotificationService.sendWeeklyMarketSummary();
    return { success: sent };
  }),

  /**
   * Test competitor data integration (public for demo)
   */
  testIntegration: publicProcedure
    .input(
      z.object({
        city: z.string().default('Lagos'),
        bedrooms: z.number().int().positive().default(2),
      })
    )
    .query(async ({ input }) => {
      const analysis = await competitorDataService.getMarketAnalysis({
        city: input.city,
        bedrooms: input.bedrooms,
        bathrooms: Math.ceil(input.bedrooms / 2),
        guests: input.bedrooms * 2,
      });

      const recommendation = await competitorDataService.getPricingRecommendation({
        city: input.city,
        bedrooms: input.bedrooms,
        bathrooms: Math.ceil(input.bedrooms / 2),
        guests: input.bedrooms * 2,
        currentPrice: 30000,
        propertyQuality: 'standard',
      });

      const competitors = await competitorDataService.getCompetitorListings({
        city: input.city,
        bedrooms: input.bedrooms,
        bathrooms: Math.ceil(input.bedrooms / 2),
        guests: input.bedrooms * 2,
        limit: 5,
      });

      return {
        analysis,
        recommendation,
        competitorSample: competitors.slice(0, 3),
        serviceStatus: competitorDataService.getServiceStatus(),
      };
    }),
});
