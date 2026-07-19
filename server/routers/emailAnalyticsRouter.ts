import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { emailAnalyticsService } from "../services/emailAnalyticsService";

export const emailAnalyticsRouter = router({
  // Get overall campaign metrics
  getCampaignMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await emailAnalyticsService.getCampaignMetrics(startDate, endDate);
    }),

  // Get campaign performance by template
  getCampaignPerformance: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await emailAnalyticsService.getCampaignPerformance(startDate, endDate);
    }),

  // Get time series data for charts
  getTimeSeriesData: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        interval: z.enum(["day", "week", "month"]),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      return await emailAnalyticsService.getTimeSeriesData(startDate, endDate, input.interval);
    }),

  // Get email type breakdown
  getEmailTypeBreakdown: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await emailAnalyticsService.getEmailTypeBreakdown(startDate, endDate);
    }),

  // Get device breakdown
  getDeviceBreakdown: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await emailAnalyticsService.getDeviceBreakdown(startDate, endDate);
    }),

  // Get top performing campaigns
  getTopPerformingCampaigns: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await emailAnalyticsService.getTopPerformingCampaigns(input.limit, startDate, endDate);
    }),

  // Get worst performing campaigns
  getWorstPerformingCampaigns: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await emailAnalyticsService.getWorstPerformingCampaigns(input.limit, startDate, endDate);
    }),
});
