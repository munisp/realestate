import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  registerRateAlert,
  unregisterRateAlert,
  getUserAlerts,
  checkExchangeRates,
} from "../services/exchangeRateMonitor";

export const exchangeRateAlertsRouter = router({
  /**
   * Register for exchange rate alerts
   */
  register: protectedProcedure
    .input(
      z.object({
        currency: z.string(),
        threshold: z.number().min(0.1).max(50), // 0.1% to 50%
        currentRate: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = registerRateAlert({
        userId: ctx.user.openId,
        currency: input.currency,
        threshold: input.threshold,
        lastRate: input.currentRate,
        email: ctx.user.email || undefined,
      });
      
      return {
        success: true,
        message: `Alert registered for ${input.currency} with ${input.threshold}% threshold`,
        ...result,
      };
    }),

  /**
   * Unregister from exchange rate alerts
   */
  unregister: protectedProcedure
    .input(
      z.object({
        currency: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = unregisterRateAlert(ctx.user.openId, input.currency);
      
      return {
        success: true,
        message: `Alert removed for ${input.currency}`,
        ...result,
      };
    }),

  /**
   * Get user's active alerts
   */
  getMyAlerts: protectedProcedure.query(async ({ ctx }) => {
    const alerts = getUserAlerts(ctx.user.openId);
    return { alerts };
  }),

  /**
   * Manually trigger rate check (admin only)
   */
  checkNow: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    const result = await checkExchangeRates();
    return result;
  }),
});
