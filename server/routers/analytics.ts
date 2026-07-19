import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  trackValuationView,
  updateValuationView,
  trackTabEngagement,
  trackConversion,
  trackFeedback,
  getConversionRate,
  getTabEngagementStats,
  getAverageFeedback,
  getValuationAnalyticsDashboard,
  getValuationFunnel,
} from "../services/valuationAnalytics";

export const analyticsRouter = router({
  // Track valuation page view
  trackValuationView: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        userId: z.number().optional(),
        sessionId: z.string().optional(),
        deviceType: z.string().optional(),
        browser: z.string().optional(),
        referrerPage: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const viewId = await trackValuationView(input);
      return { viewId };
    }),

  // Update valuation view (duration, scroll depth, etc.)
  updateValuationView: publicProcedure
    .input(
      z.object({
        viewId: z.number(),
        viewDurationSeconds: z.number().optional(),
        tabsViewed: z.string().optional(),
        scrollDepth: z.string().optional(),
        contactedAgent: z.number().optional(),
        scheduledTour: z.number().optional(),
        addedToFavorites: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { viewId, ...updates } = input;
      const success = await updateValuationView(viewId, updates);
      return { success };
    }),

  // Track tab engagement
  trackTabEngagement: publicProcedure
    .input(
      z.object({
        viewId: z.number(),
        propertyId: z.number(),
        userId: z.number().optional(),
        tabName: z.string(),
        timeSpentSeconds: z.number(),
        interactionCount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const engagementId = await trackTabEngagement(input);
      return { engagementId };
    }),

  // Track conversion event
  trackConversion: publicProcedure
    .input(
      z.object({
        viewId: z.number(),
        propertyId: z.number(),
        userId: z.number().optional(),
        conversionType: z.enum(["contact_agent", "schedule_tour", "add_favorite"]),
        conversionValue: z.string().optional(),
        timeToConversionSeconds: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const conversionId = await trackConversion(input);
      return { conversionId };
    }),

  // Track user feedback
  trackFeedback: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        userId: z.number().optional(),
        rating: z.number().min(1).max(5).optional(),
        accuracyRating: z.number().min(1).max(5).optional(),
        usefulnessRating: z.number().min(1).max(5).optional(),
        comment: z.string().optional(),
        helpfulFeatures: z.string().optional(),
        issuesReported: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const feedbackId = await trackFeedback(input);
      return { feedbackId };
    }),

  // Get conversion rate stats
  getConversionRate: protectedProcedure
    .input(
      z.object({
        propertyId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const stats = await getConversionRate(
        input.propertyId,
        input.startDate,
        input.endDate
      );
      return stats;
    }),

  // Get tab engagement stats
  getTabEngagementStats: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const stats = await getTabEngagementStats(input.propertyId);
      return stats;
    }),

  // Get average feedback
  getAverageFeedback: protectedProcedure
    .input(z.object({ propertyId: z.number().optional() }))
    .query(async ({ input }) => {
      const stats = await getAverageFeedback(input.propertyId);
      return stats;
    }),

  // Get analytics dashboard data
  getDashboard: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const data = await getValuationAnalyticsDashboard(
        input.startDate,
        input.endDate
      );
      return data;
    }),

  // Get funnel analysis
  getFunnel: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const funnel = await getValuationFunnel(input.startDate, input.endDate);
      return funnel;
    }),
});
