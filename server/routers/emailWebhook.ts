/**
 * Email Webhook Router
 * 
 * Handles webhook events from Resend for real-time email tracking
 * Events: delivered, bounced, opened, clicked, complained, unsubscribed
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import crypto from 'crypto';

// Webhook event schema
const webhookEventSchema = z.object({
  type: z.enum(['email.sent', 'email.delivered', 'email.bounced', 'email.opened', 'email.clicked', 'email.complained', 'email.unsubscribed']),
  created_at: z.string(),
  data: z.object({
    email_id: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    subject: z.string(),
    // Additional fields based on event type
    bounce_type: z.string().optional(),
    bounce_reason: z.string().optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
    link: z.string().optional(),
  }),
});

export const emailWebhookRouter = router({
  /**
   * Handle incoming webhook from Resend
   * This is a public endpoint that Resend will call
   */
  handleWebhook: publicProcedure
    .input(z.object({
      signature: z.string(),
      timestamp: z.string(),
      payload: z.any(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Verify webhook signature
        const isValid = verifyWebhookSignature(
          input.signature,
          input.timestamp,
          JSON.stringify(input.payload)
        );

        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid webhook signature',
          });
        }

        // Parse and validate event
        const event = webhookEventSchema.parse(input.payload);

        // Process event based on type
        await processWebhookEvent(event);

        return { success: true, processed: true };
      } catch (error) {
        console.error('[EmailWebhook] Error processing webhook:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process webhook',
        });
      }
    }),

  /**
   * Get webhook activity log
   */
  getWebhookLog: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) {
        return { logs: [], total: 0 };
      }

      try {
        const { webhookActivityLog } = await import('../../drizzle/schema');
        const { desc } = await import('drizzle-orm');

        const logs = await database
          .select()
          .from(webhookActivityLog)
          .orderBy(desc(webhookActivityLog.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          logs,
          total: logs.length,
        };
      } catch (error) {
        console.error('[EmailWebhook] Error fetching webhook log:', error);
        return { logs: [], total: 0 };
      }
    }),

  /**
   * Get webhook statistics
   */
  getWebhookStats: protectedProcedure.query(async () => {
    const database = await db.getDb();
    if (!database) {
      return {
        totalEvents: 0,
        eventsByType: {},
        recentEvents: [],
      };
    }

    try {
      const { webhookActivityLog } = await import('../../drizzle/schema');
      const { desc, sql } = await import('drizzle-orm');

      // Get total events
      const totalResult = await database
        .select({ count: sql<number>`count(*)` })
        .from(webhookActivityLog);

      const total = totalResult[0]?.count || 0;

      // Get recent events
      const recent = await database
        .select()
        .from(webhookActivityLog)
        .orderBy(desc(webhookActivityLog.createdAt))
        .limit(10);

      return {
        totalEvents: total,
        eventsByType: {
          delivered: 0,
          bounced: 0,
          opened: 0,
          clicked: 0,
          complained: 0,
        },
        recentEvents: recent,
      };
    } catch (error) {
      console.error('[EmailWebhook] Error fetching webhook stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        recentEvents: [],
      };
    }
  }),
});

/**
 * Verify webhook signature from Resend
 */
function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  payload: string
): boolean {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('[EmailWebhook] RESEND_WEBHOOK_SECRET not configured, skipping verification');
      return true; // Allow in development
    }

    // Construct the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Compute HMAC
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[EmailWebhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Process webhook event and update database
 */
async function processWebhookEvent(event: z.infer<typeof webhookEventSchema>): Promise<void> {
  const database = await db.getDb();
  if (!database) {
    console.warn('[EmailWebhook] Database not available');
    return;
  }

  try {
    const { emailDeliveryLogs, webhookActivityLog } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');

    // Log webhook activity
    await database.insert(webhookActivityLog).values({
      eventType: event.type,
      emailId: event.data.email_id,
      recipient: event.data.to[0],
      eventData: JSON.stringify(event.data),
    });

    // Update email delivery log based on event type
    const recipient = event.data.to[0];
    const messageId = event.data.email_id;

    switch (event.type) {
      case 'email.delivered':
        await database
          .update(emailDeliveryLogs)
          .set({ status: 'sent' })
          .where(eq(emailDeliveryLogs.messageId, messageId));
        console.log(`[EmailWebhook] Email delivered: ${recipient}`);
        break;

      case 'email.bounced':
        await database
          .update(emailDeliveryLogs)
          .set({
            status: 'failed',
            errorMessage: event.data.bounce_reason || 'Email bounced',
          })
          .where(eq(emailDeliveryLogs.messageId, messageId));
        console.log(`[EmailWebhook] Email bounced: ${recipient} - ${event.data.bounce_reason}`);
        break;

      case 'email.opened':
        console.log(`[EmailWebhook] Email opened: ${recipient}`);
        // Could track open events in a separate table
        break;

      case 'email.clicked':
        console.log(`[EmailWebhook] Email link clicked: ${recipient} - ${event.data.link}`);
        // Could track click events in a separate table
        break;

      case 'email.complained':
        console.log(`[EmailWebhook] Spam complaint: ${recipient}`);
        // Could add recipient to suppression list
        break;

      case 'email.unsubscribed':
        console.log(`[EmailWebhook] Unsubscribed: ${recipient}`);
        // Could update user preferences
        break;

      default:
        console.log(`[EmailWebhook] Unknown event type: ${event.type}`);
    }
  } catch (error) {
    console.error('[EmailWebhook] Error processing event:', error);
    throw error;
  }
}
