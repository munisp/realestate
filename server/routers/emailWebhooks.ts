// @ts-nocheck
import { z } from 'zod';
import { publicProcedure, router } from "../_core/trpc";
import { sql as sqlTag } from 'drizzle-orm';
import { getDb } from "../db";
import { emailDeliveryLog } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Email Webhooks Router
 * 
 * Handles webhook events from email service providers (Resend, SendGrid, AWS SES, etc.)
 * to track email delivery status, opens, clicks, bounces, and complaints
 */

export const emailWebhooksRouter = router({
  /**
   * Handle delivery status webhook
   * Called by email service when email is delivered, bounced, or failed
   */
  deliveryStatus: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        subject: z.string(),
        status: z.enum(["delivered", "bounced", "failed"]),
        timestamp: z.string().datetime(),
        errorMessage: z.string().optional(),
        // bounceType: z.enum(["hard", "soft", "complaint"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        console.error("[EmailWebhook] Database not available");
        return { success: false };
      }

      try {
        // Find the most recent email matching this recipient and subject
        const [emailLog] = await db
          .select()
          .from(emailDeliveryLog)
          .where(
            and(
              eq(emailDeliveryLog.recipient, input.email),
              eq(emailDeliveryLog.subject, input.subject)
            )
          )
          .orderBy(desc(emailDeliveryLog.sentAt))
          .limit(1);

        if (!emailLog) {
          console.warn(`[EmailWebhook] No email log found for ${input.email} - ${input.subject}`);
          return { success: false, message: "Email log not found" };
        }

        // Update delivery status
        const updates: any = {
          status: input.status,
        };

        if (input.status === "delivered") {
          updates.deliveredAt = new Date(input.timestamp);
        } else if (input.status === "bounced") {
          updates.deliveredAt = new Date(input.timestamp);
          updates.errorMessage = input.errorMessage || null;
        } else if (input.status === "failed") {
          updates.errorMessage = input.errorMessage || null;
        }

        await db
          .update(emailDeliveryLog)
          .set(updates)
          .where(eq(emailDeliveryLog.id, emailLog.id));

        console.log(`[EmailWebhook] Updated delivery status for email ${emailLog.id}: ${input.status}`);

        return { success: true };
      } catch (error) {
        console.error("[EmailWebhook] Failed to process delivery status:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    }),

  /**
   * Handle email open event
   * Called when recipient opens the email
   */
  emailOpened: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        subject: z.string(),
        timestamp: z.string().datetime(),
        userAgent: z.string().optional(),
        ipAddress: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        // Find the email log
        const [emailLog] = await db
          .select()
          .from(emailDeliveryLog)
          .where(
            and(
              eq(emailDeliveryLog.recipient, input.email),
              eq(emailDeliveryLog.subject, input.subject)
            )
          )
          .orderBy(desc(emailDeliveryLog.sentAt))
          .limit(1);

        if (!emailLog) {
          return { success: false, message: "Email log not found" };
        }

        // Update open timestamp (only first open)
        if (!emailLog.openedAt) {
          await db
            .update(emailDeliveryLog)
            .set({
              openedAt: new Date(input.timestamp),
            })
            .where(eq(emailDeliveryLog.id, emailLog.id));

          // Alert tracking is handled via emailDeliveryLog table

          console.log(`[EmailWebhook] Email opened: ${emailLog.id}`);
        }

        return { success: true };
      } catch (error) {
        console.error("[EmailWebhook] Failed to process email open:", error);
        return { success: false };
      }
    }),

  /**
   * Handle link click event
   * Called when recipient clicks a link in the email
   */
  linkClicked: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        subject: z.string(),
        url: z.string().url(),
        timestamp: z.string().datetime(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        // Find the email log
        const [emailLog] = await db
          .select()
          .from(emailDeliveryLog)
          .where(
            and(
              eq(emailDeliveryLog.recipient, input.email),
              eq(emailDeliveryLog.subject, input.subject)
            )
          )
          .orderBy(desc(emailDeliveryLog.sentAt))
          .limit(1);

        if (!emailLog) {
          return { success: false, message: "Email log not found" };
        }

        // Update click timestamp (only first click)
        if (!emailLog.clickedAt) {
          await db
            .update(emailDeliveryLog)
            .set({
              clickedAt: new Date(input.timestamp),
            })
            .where(eq(emailDeliveryLog.id, emailLog.id));

          // Alert tracking handled via emailDeliveryLog table (no separate alertDeliveryTracking table)

          console.log(`[EmailWebhook] Link clicked in email ${emailLog.id}: ${input.url}`);
        }

        return { success: true };
      } catch (error) {
        console.error("[EmailWebhook] Failed to process link click:", error);
        return { success: false };
      }
    }),

  /**
   * Handle spam complaint
   * Called when recipient marks email as spam
   */
  spamComplaint: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        subject: z.string(),
        timestamp: z.string().datetime(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        // Find the email log
        const [emailLog] = await db
          .select()
          .from(emailDeliveryLog)
          .where(
            and(
              eq(emailDeliveryLog.recipient, input.email),
              eq(emailDeliveryLog.subject, input.subject)
            )
          )
          .orderBy(desc(emailDeliveryLog.sentAt))
          .limit(1);

        if (!emailLog) {
          return { success: false, message: "Email log not found" };
        }

        // Update status to bounced with complaint type
        await db
          .update(emailDeliveryLog)
          .set({
            status: "bounced",
            // bounceType: "complaint",
            bouncedAt: new Date(input.timestamp),
          })
          .where(eq(emailDeliveryLog.id, emailLog.id));

        // TODO: Automatically unsubscribe user from future emails
        // TODO: Add to suppression list

        console.log(`[EmailWebhook] Spam complaint received for email ${emailLog.id}`);

        return { success: true };
      } catch (error) {
        console.error("[EmailWebhook] Failed to process spam complaint:", error);
        return { success: false };
      }
    }),

  /**
   * Get email delivery statistics
   */
  getDeliveryStats: publicProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        alertType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const stats = await db.execute(sqlTag`
          SELECT 
            COUNT(*) as total_sent,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
            SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked
          FROM email_delivery_log
          WHERE sent_at BETWEEN ${input.startDate} AND ${input.endDate}
            ${input.alertType ? sqlTag`AND email_type = ${input.alertType}` : sqlTag``}
        `);

        return (stats as any).rows?.[0] ?? stats[0];
      } catch (error) {
        console.error("[EmailWebhook] Failed to get delivery stats:", error);
        return null;
      }
    }),
});
