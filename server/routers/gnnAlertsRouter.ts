import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { gnnAlertService } from "../services/gnnAlertService";

/**
 * GNN Alerts Router
 * Manages GNN-powered property alerts and notifications
 */
export const gnnAlertsRouter = router({
  /**
   * Create a new alert subscription
   */
  createSubscription: protectedProcedure
    .input(z.object({
      alertType: z.enum(['undervalued', 'market_trend', 'investment_opportunity', 'price_momentum']),
      cities: z.array(z.string()).optional(),
      neighborhoods: z.array(z.string()).optional(),
      propertyTypes: z.array(z.string()).optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      minBedrooms: z.number().optional(),
      maxBedrooms: z.number().optional(),
      minInvestmentScore: z.number().min(0).max(100).optional(),
      minUndervaluedPercent: z.number().min(0).max(100).optional(),
      minTrendStrength: z.number().min(-1).max(1).optional(),
      minGrowthPotential: z.number().min(0).max(100).optional(),
      notificationChannels: z.array(z.enum(['email', 'push', 'sms'])),
      frequency: z.enum(['instant', 'daily', 'weekly']).default('instant'),
    }))
    .mutation(async ({ ctx, input }) => {
      const subscriptionId = await gnnAlertService.createSubscription(ctx.user.id, {
        alertType: input.alertType,
        cities: input.cities ? JSON.stringify(input.cities) : null,
        neighborhoods: input.neighborhoods ? JSON.stringify(input.neighborhoods) : null,
        propertyTypes: input.propertyTypes ? JSON.stringify(input.propertyTypes) : null,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        minBedrooms: input.minBedrooms,
        maxBedrooms: input.maxBedrooms,
        minInvestmentScore: input.minInvestmentScore,
        minUndervaluedPercent: input.minUndervaluedPercent,
        minTrendStrength: input.minTrendStrength,
        minGrowthPotential: input.minGrowthPotential,
        notificationChannels: JSON.stringify(input.notificationChannels),
        frequency: input.frequency,
      });

      return { success: true, subscriptionId };
    }),

  /**
   * Get user's alert subscriptions
   */
  getMySubscriptions: protectedProcedure
    .query(async ({ ctx }) => {
      const subscriptions = await gnnAlertService.getUserSubscriptions(ctx.user.id);
      
      // Parse JSON fields
      return subscriptions.map(sub => ({
        ...sub,
        cities: sub.cities ? JSON.parse(sub.cities) : [],
        neighborhoods: sub.neighborhoods ? JSON.parse(sub.neighborhoods) : [],
        propertyTypes: sub.propertyTypes ? JSON.parse(sub.propertyTypes) : [],
        notificationChannels: JSON.parse(sub.notificationChannels),
      }));
    }),

  /**
   * Update alert subscription
   */
  updateSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
      cities: z.array(z.string()).optional(),
      neighborhoods: z.array(z.string()).optional(),
      propertyTypes: z.array(z.string()).optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      minBedrooms: z.number().optional(),
      maxBedrooms: z.number().optional(),
      minInvestmentScore: z.number().min(0).max(100).optional(),
      minUndervaluedPercent: z.number().min(0).max(100).optional(),
      minTrendStrength: z.number().min(-1).max(1).optional(),
      minGrowthPotential: z.number().min(0).max(100).optional(),
      notificationChannels: z.array(z.enum(['email', 'push', 'sms'])).optional(),
      frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { subscriptionId, ...data } = input;
      
      const updateData: any = {};
      if (data.cities) updateData.cities = JSON.stringify(data.cities);
      if (data.neighborhoods) updateData.neighborhoods = JSON.stringify(data.neighborhoods);
      if (data.propertyTypes) updateData.propertyTypes = JSON.stringify(data.propertyTypes);
      if (data.notificationChannels) updateData.notificationChannels = JSON.stringify(data.notificationChannels);
      
      Object.assign(updateData, {
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        minBedrooms: data.minBedrooms,
        maxBedrooms: data.maxBedrooms,
        minInvestmentScore: data.minInvestmentScore,
        minUndervaluedPercent: data.minUndervaluedPercent,
        minTrendStrength: data.minTrendStrength,
        minGrowthPotential: data.minGrowthPotential,
        frequency: data.frequency,
      });

      await gnnAlertService.updateSubscription(subscriptionId, ctx.user.id, updateData);
      
      return { success: true };
    }),

  /**
   * Delete alert subscription
   */
  deleteSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await gnnAlertService.deleteSubscription(input.subscriptionId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Toggle subscription active status
   */
  toggleSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await gnnAlertService.toggleSubscription(input.subscriptionId, ctx.user.id, input.isActive);
      return { success: true };
    }),

  /**
   * Get user's alert triggers (notifications received)
   */
  getMyAlertTriggers: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const triggers = await gnnAlertService.getUserAlertTriggers(ctx.user.id, input.limit);
      
      // Parse JSON fields
      return triggers.map(trigger => ({
        ...trigger,
        reasoning: trigger.reasoning ? JSON.parse(trigger.reasoning) : null,
        notificationsSent: trigger.notificationsSent ? JSON.parse(trigger.notificationsSent) : [],
      }));
    }),

  /**
   * Mark alert as viewed
   */
  markAlertViewed: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await gnnAlertService.markAlertViewed(input.triggerId);
      return { success: true };
    }),

  /**
   * Mark alert as dismissed
   */
  markAlertDismissed: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await gnnAlertService.markAlertDismissed(input.triggerId);
      return { success: true };
    }),

  /**
   * Track user action on alert
   */
  trackAlertAction: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
      action: z.enum(['saved', 'viewed_property', 'contacted_agent']),
    }))
    .mutation(async ({ input }) => {
      await gnnAlertService.trackAlertAction(input.triggerId, input.action);
      return { success: true };
    }),

  /**
   * Evaluate a specific property for alerts (manual trigger)
   */
  evaluateProperty: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .query(async ({ input }) => {
      const matches = await gnnAlertService.evaluatePropertyForAlerts(input.propertyId);
      return { matches };
    }),

  /**
   * Get alert performance metrics
   */
  getPerformanceMetrics: protectedProcedure
    .input(z.object({
      alertType: z.enum(['undervalued', 'market_trend', 'investment_opportunity', 'price_momentum']).optional(),
    }))
    .query(async ({ input }) => {
      const metrics = await gnnAlertService.getPerformanceMetrics(input.alertType);
      return { metrics };
    }),

  /**
   * Get alert statistics for dashboard
   */
  getAlertStats: protectedProcedure
    .query(async ({ ctx }) => {
      const subscriptions = await gnnAlertService.getUserSubscriptions(ctx.user.id);
      const triggers = await gnnAlertService.getUserAlertTriggers(ctx.user.id, 100);
      
      const activeSubscriptions = subscriptions.filter(s => s.isActive === 1).length;
      const unviewedAlerts = triggers.filter(t => t.userViewed === 0).length;
      const totalAlerts = triggers.length;
      
      // Calculate alert type breakdown
      const alertTypeBreakdown: Record<string, number> = {};
      triggers.forEach(trigger => {
        alertTypeBreakdown[trigger.alertType] = (alertTypeBreakdown[trigger.alertType] || 0) + 1;
      });

      return {
        activeSubscriptions,
        unviewedAlerts,
        totalAlerts,
        alertTypeBreakdown,
      };
    }),
});
