import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createMonitoring,
  getUserMonitoring,
  updateMonitoring,
  deleteMonitoring,
  getUserAlertPreferences,
  updateUserAlertPreferences,
} from "../services/valuationMonitoring";
import {
  getThrottlingStats,
  updateMaxAlertsPerDay,
} from "../services/alertThrottling";

export const valuationAlertsRouter = router({
  // Get user's monitoring list
  getUserMonitoring: protectedProcedure.query(async ({ ctx }) => {
    const monitoring = await getUserMonitoring(ctx.user.id);
    return monitoring;
  }),

  // Create new monitoring
  createMonitoring: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        alertThreshold: z.string(),
        alertType: z.enum(["increase", "decrease", "both"]),
        alertFrequency: z.enum(["instant", "daily", "weekly"]).optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const monitoringId = await createMonitoring({
        ...input,
        userId: ctx.user.id,
      });
      return { id: monitoringId };
    }),

  // Update monitoring
  updateMonitoring: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        alertThreshold: z.string().optional(),
        alertType: z.enum(["increase", "decrease", "both"]).optional(),
        alertFrequency: z.enum(["instant", "daily", "weekly"]).optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const success = await updateMonitoring(id, updates);
      return { success };
    }),

  // Delete monitoring
  deleteMonitoring: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await deleteMonitoring(input.id);
      return { success };
    }),

  // Get user preferences
  getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
    const preferences = await getUserAlertPreferences(ctx.user.id);
    return preferences;
  }),

  // NOTE: getAlertHistory and getAlertStats are implemented below with full functionality
  // (Duplicate TODO implementations removed)

  // Bulk update monitoring
  bulkUpdateMonitoring: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
        isActive: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Update all specified monitoring records
        for (const id of input.ids) {
          await db
            .update(valuationMonitoring)
            .set({ isActive: input.isActive })
            .where(
              and(
                eq(valuationMonitoring.id, id),
                eq(valuationMonitoring.userId, ctx.user.id) // Security: only update own records
              )
            );
        }

        return {
          success: true,
          updated: input.ids.length,
        };
      } catch (error) {
        console.error("[ValuationAlerts] Bulk update failed:", error);
        throw new Error("Failed to update monitoring");
      }
    }),

  // Bulk delete monitoring
  bulkDeleteMonitoring: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Soft delete all specified monitoring records
        for (const id of input.ids) {
          await db
            .update(valuationMonitoring)
            .set({ isActive: 0 })
            .where(
              and(
                eq(valuationMonitoring.id, id),
                eq(valuationMonitoring.userId, ctx.user.id) // Security: only delete own records
              )
            );
        }

        return {
          success: true,
          deleted: input.ids.length,
        };
      } catch (error) {
        console.error("[ValuationAlerts] Bulk delete failed:", error);
        throw new Error("Failed to delete monitoring");
      }
    }),

  // Update user preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailAlertsEnabled: z.number().optional(),
        pushAlertsEnabled: z.number().optional(),
        inAppAlertsEnabled: z.number().optional(),
        smsAlertsEnabled: z.number().optional(),
        maxAlertsPerDay: z.number().optional(),
        quietHoursStart: z.number().optional(),
        quietHoursEnd: z.number().optional(),
        valuationChangeAlerts: z.number().optional(),
        marketTrendAlerts: z.number().optional(),
        priceDropAlerts: z.number().optional(),
        newListingAlerts: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const success = await updateUserAlertPreferences(ctx.user.id, input);
      return { success };
    }),

  // Get alert history
  getAlertHistory: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.enum(["sent", "delivered", "opened", "clicked", "failed"]).optional(),
        statusFilter: z.string().optional(),
        typeFilter: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { alerts: [] };

      const { emailDeliveryLog } = await import("../../drizzle/schema");
      const { eq, and, gte, lte, desc } = await import("drizzle-orm");

      const conditions = [eq(emailDeliveryLog.userId, ctx.user.id)];

      if (input.startDate) {
        conditions.push(gte(emailDeliveryLog.sentAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(emailDeliveryLog.sentAt, input.endDate));
      }
      if (input.status) {
        conditions.push(eq(emailDeliveryLog.status, input.status));
      }
      if (input.statusFilter && input.statusFilter !== "all") {
        conditions.push(eq(emailDeliveryLog.status, input.statusFilter));
      }
      if (input.typeFilter && input.typeFilter !== "all") {
        conditions.push(eq(emailDeliveryLog.alertType, input.typeFilter));
      }

      const alerts = await db
        .select()
        .from(emailDeliveryLog)
        .where(and(...conditions))
        .orderBy(desc(emailDeliveryLog.sentAt))
        .limit(input.limit);

      return {
        alerts: alerts.map((alert) => ({
          id: alert.id,
          propertyId: alert.propertyId,
          alertType: alert.alertType,
          alertTitle: `${alert.alertType} Alert`,
          alertMessage: alert.subject,
          propertyAddress: null, // Would need to join with properties table
          sentAt: alert.sentAt,
          deliveryStatus: alert.status,
          opened: alert.openedAt !== null,
          clicked: alert.clickedAt !== null,
          openedAt: alert.openedAt,
          clickedAt: alert.clickedAt,
          changeType: alert.alertType?.includes("increase") ? "increase" : "decrease",
          error: alert.error,
          status: alert.status,
        })),
      };
    }),

  // Get alert statistics
  getAlertStats: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalSent: 0,
          totalDelivered: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalFailed: 0,
        };
      }

      const { emailDeliveryLog } = await import("../../drizzle/schema");
      const { eq, and, gte, lte, count, sql } = await import("drizzle-orm");

      const conditions = [eq(emailDeliveryLog.userId, ctx.user.id)];

      if (input.startDate) {
        conditions.push(gte(emailDeliveryLog.sentAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(emailDeliveryLog.sentAt, input.endDate));
      }

      const stats = await db
        .select({
          totalSent: count(),
          totalDelivered: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'delivered' THEN 1 ELSE 0 END)`,
          totalOpened: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.openedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
          totalClicked: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.clickedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
          totalFailed: sql<number>`SUM(CASE WHEN ${emailDeliveryLog.status} = 'failed' THEN 1 ELSE 0 END)`,
        })
        .from(emailDeliveryLog)
        .where(and(...conditions));

      return stats[0] || {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalFailed: 0,
      };
    }),

  // Get throttling statistics
  getThrottlingStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getThrottlingStats(ctx.user.id);
    return stats || {
      alertsSentToday: 0,
      alertsSentThisWeek: 0,
      maxAlertsPerDay: 10,
      remainingToday: 10,
      throttlingActive: false,
    };
  }),

  // Update max alerts per day
  updateMaxAlertsPerDay: protectedProcedure
    .input(z.object({ maxAlertsPerDay: z.number().min(1).max(50) }))
    .mutation(async ({ input, ctx }) => {
      const success = await updateMaxAlertsPerDay(ctx.user.id, input.maxAlertsPerDay);
      return { success };
    }),
});
