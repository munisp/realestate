import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { automatedVerificationScheduler } from "../services/cofOVerification/AutomatedVerificationScheduler";
import { getDb } from "../db";
import {
  scheduledVerifications,
  verificationChangeAlerts,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const automatedVerificationRouter = router({
  /**
   * Schedule automated verification for a property
   */
  scheduleVerification: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        frequency: z.enum(["monthly", "quarterly", "annually"]),
        alertOnChange: z.boolean().default(true),
        notificationEmail: z.string().email().optional(),
        notificationPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await automatedVerificationScheduler.scheduleVerification({
        propertyId: input.propertyId,
        verificationFrequency: input.frequency,
        alertOnChange: input.alertOnChange,
        notificationEmail: input.notificationEmail,
        notificationPhone: input.notificationPhone,
      });

      return result;
    }),

  /**
   * Get all scheduled verifications for a user
   */
  getScheduledVerifications: protectedProcedure
    .input(
      z.object({
        propertyId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const conditions = [];
      if (input.propertyId) {
        conditions.push(eq(scheduledVerifications.propertyId, input.propertyId));
      }

      const schedules = await db
        .select()
        .from(scheduledVerifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(scheduledVerifications.createdAt));

      return schedules;
    }),

  /**
   * Update scheduled verification settings
   */
  updateScheduledVerification: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        frequency: z.enum(["monthly", "quarterly", "annually"]).optional(),
        alertOnChange: z.boolean().optional(),
        notificationEmail: z.string().email().optional(),
        notificationPhone: z.string().optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const { id, ...updates } = input;

      await db
        .update(scheduledVerifications)
        .set(updates)
        .where(eq(scheduledVerifications.id, id));

      return { success: true };
    }),

  /**
   * Delete scheduled verification
   */
  deleteScheduledVerification: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .delete(scheduledVerifications)
        .where(eq(scheduledVerifications.id, input.id));

      return { success: true };
    }),

  /**
   * Get verification change alerts
   */
  getChangeAlerts: protectedProcedure
    .input(
      z.object({
        propertyId: z.number().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        acknowledged: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const conditions = [];
      if (input.propertyId) {
        conditions.push(eq(verificationChangeAlerts.propertyId, input.propertyId));
      }
      if (input.severity) {
        conditions.push(eq(verificationChangeAlerts.severity, input.severity));
      }
      if (input.acknowledged !== undefined) {
        if (input.acknowledged) {
          conditions.push(eq(verificationChangeAlerts.acknowledgedBy, ctx.user.id));
        } else {
          // Not acknowledged means acknowledgedBy is null
          conditions.push(eq(verificationChangeAlerts.acknowledgedBy, null as any));
        }
      }

      const alerts = await db
        .select()
        .from(verificationChangeAlerts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(verificationChangeAlerts.createdAt))
        .limit(100);

      return alerts;
    }),

  /**
   * Acknowledge a change alert
   */
  acknowledgeAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .update(verificationChangeAlerts)
        .set({
          acknowledgedBy: ctx.user.id,
          acknowledgedAt: new Date(),
          notes: input.notes,
        })
        .where(eq(verificationChangeAlerts.id, input.alertId));

      return { success: true };
    }),

  /**
   * Get scheduler status
   */
  getSchedulerStatus: publicProcedure.query(async () => {
    const status = automatedVerificationScheduler.getStatus();
    return status;
  }),

  /**
   * Start scheduler (admin only)
   */
  startScheduler: protectedProcedure.mutation(async ({ ctx }) => {
    // TODO: Add admin role check
    automatedVerificationScheduler.start();
    return { success: true, message: "Scheduler started" };
  }),

  /**
   * Stop scheduler (admin only)
   */
  stopScheduler: protectedProcedure.mutation(async ({ ctx }) => {
    // TODO: Add admin role check
    automatedVerificationScheduler.stop();
    return { success: true, message: "Scheduler stopped" };
  }),
});
