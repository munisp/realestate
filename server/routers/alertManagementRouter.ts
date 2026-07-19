// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { alertConfigurations, alertHistory, alertAcknowledgments } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { AlertEvaluationService } from "../services/alertEvaluationService";

export const alertManagementRouter = router({
  /**
   * Get all alert configurations
   */
  getConfigurations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.select().from(alertConfigurations).orderBy(desc(alertConfigurations.createdAt));
  }),

  /**
   * Get single alert configuration
   */
  getConfiguration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(alertConfigurations)
        .where(eq(alertConfigurations.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  /**
   * Create alert configuration
   */
  createConfiguration: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        alertType: z.enum(["service_health", "response_time", "error_rate", "cache_hit_rate", "cost_threshold", "api_quota"]),
        serviceName: z.string().optional(),
        metricName: z.string(),
        thresholdValue: z.number(),
        comparisonOperator: z.enum(["gt", "lt", "gte", "lte", "eq"]),
        evaluationWindow: z.number().default(300),
        severity: z.enum(["info", "warning", "critical"]).default("warning"),
        priority: z.number().default(2),
        emailEnabled: z.boolean().default(true),
        smsEnabled: z.boolean().default(false),
        webhookEnabled: z.boolean().default(false),
        emailRecipients: z.array(z.string()).optional(),
        smsRecipients: z.array(z.string()).optional(),
        webhookUrl: z.string().optional(),
        cooldownPeriod: z.number().default(1800),
        autoResolve: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(alertConfigurations).values({
        ...input,
        emailRecipients: input.emailRecipients ? JSON.stringify(input.emailRecipients) : null,
        smsRecipients: input.smsRecipients ? JSON.stringify(input.smsRecipients) : null,
        thresholdValue: input.thresholdValue.toString(),
        emailEnabled: input.emailEnabled ? 1 : 0,
        smsEnabled: input.smsEnabled ? 1 : 0,
        webhookEnabled: input.webhookEnabled ? 1 : 0,
        createdBy: ctx.user.id,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Update alert configuration
   */
  updateConfiguration: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        thresholdValue: z.number().optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        webhookEnabled: z.boolean().optional(),
        emailRecipients: z.array(z.string()).optional(),
        smsRecipients: z.array(z.string()).optional(),
        webhookUrl: z.string().optional(),
        enabled: z.boolean().optional(),
        cooldownPeriod: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = { ...input };
      delete updateData.id;

      if (input.emailRecipients) {
        updateData.emailRecipients = JSON.stringify(input.emailRecipients);
      }
      if (input.smsRecipients) {
        updateData.smsRecipients = JSON.stringify(input.smsRecipients);
      }
      if (input.thresholdValue !== undefined) {
        updateData.thresholdValue = input.thresholdValue.toString();
      }

      await db.update(alertConfigurations).set(updateData).where(eq(alertConfigurations.id, input.id));

      return { success: true };
    }),

  /**
   * Delete alert configuration
   */
  deleteConfiguration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(alertConfigurations).where(eq(alertConfigurations.id, input.id));

      return { success: true };
    }),

  /**
   * Get alert history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        configurationId: z.number().optional(),
        status: z.enum(["triggered", "acknowledged", "resolved", "auto_resolved"]).optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(alertHistory);

      const conditions = [];
      if (input.configurationId) {
        conditions.push(eq(alertHistory.configurationId, input.configurationId));
      }
      if (input.status) {
        conditions.push(eq(alertHistory.status, input.status));
      }
      if (input.severity) {
        conditions.push(eq(alertHistory.severity, input.severity));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      return await query.orderBy(desc(alertHistory.triggeredAt)).limit(input.limit);
    }),

  /**
   * Get alert statistics
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        days: z.number().default(7),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const total = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(alertHistory)
        .where(sql`${alertHistory.triggeredAt} >= ${startDate}`);

      const bySeverity = await db
        .select({
          severity: alertHistory.severity,
          count: sql<number>`COUNT(*)`,
        })
        .from(alertHistory)
        .where(sql`${alertHistory.triggeredAt} >= ${startDate}`)
        .groupBy(alertHistory.severity);

      const byStatus = await db
        .select({
          status: alertHistory.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(alertHistory)
        .where(sql`${alertHistory.triggeredAt} >= ${startDate}`)
        .groupBy(alertHistory.status);

      const avgResolutionTime = await db
        .select({
          avgMinutes: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${alertHistory.triggeredAt}, ${alertHistory.resolvedAt}))`,
        })
        .from(alertHistory)
        .where(
          and(
            sql`${alertHistory.triggeredAt} >= ${startDate}`,
            sql`${alertHistory.resolvedAt} IS NOT NULL`
          )
        );

      return {
        total: total[0]?.count || 0,
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item.severity] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        avgResolutionTimeMinutes: avgResolutionTime[0]?.avgMinutes || 0,
      };
    }),

  /**
   * Acknowledge alert
   */
  acknowledgeAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await AlertEvaluationService.acknowledgeAlert(input.alertId, ctx.user.id, input.notes);

      if (input.notes) {
        const db = await getDb();
        if (db) {
          await db.insert(alertAcknowledgments).values({
            alertHistoryId: input.alertId,
            userId: ctx.user.id,
            notes: input.notes,
            action: "acknowledged",
          });
        }
      }

      return { success: true };
    }),

  /**
   * Resolve alert
   */
  resolveAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await AlertEvaluationService.resolveAlert(input.alertId);

      if (input.notes) {
        const db = await getDb();
        if (db) {
          await db.insert(alertAcknowledgments).values({
            alertHistoryId: input.alertId,
            userId: ctx.user.id,
            notes: input.notes,
            action: "resolved",
          });
        }
      }

      return { success: true };
    }),

  /**
   * Trigger manual evaluation
   */
  evaluateNow: protectedProcedure.mutation(async () => {
    const results = await AlertEvaluationService.evaluateAllAlerts();
    return {
      success: true,
      alertsTriggered: results.filter((r) => r.triggered).length,
      results,
    };
  }),
});
