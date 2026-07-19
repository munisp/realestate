/**
 * Resend Email Webhook Handler
 * 
 * Handles delivery status updates from Resend:
 * - email.delivered
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained
 */

import { Request, Response } from "express";
import { getDb } from "../db";
import { emailDeliveryLog } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Resend webhook event types
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    // Additional fields based on event type
    click?: {
      ipAddress: string;
      link: string;
      timestamp: string;
      userAgent: string;
    };
    bounce?: {
      bounceType: string;
    };
  };
}

/**
 * Handle Resend webhook events
 */
export async function handleResendWebhook(req: Request, res: Response) {
  try {
    const payload = req.body as ResendWebhookPayload;

    console.log(`[Resend Webhook] Received event: ${payload.type}`);
    console.log(`[Resend Webhook] Email ID: ${payload.data.email_id}`);

    // Verify webhook signature (if configured)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers["resend-signature"] as string;
      if (!signature || !verifyWebhookSignature(req.body, signature, webhookSecret)) {
        console.warn("[Resend Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    // Update email delivery log based on event type
    await updateEmailDeliveryStatus(payload);

    // Respond quickly to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Resend Webhook] Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Update email delivery status in database
 */
async function updateEmailDeliveryStatus(payload: ResendWebhookPayload) {
  const db = await getDb();
  if (!db) {
    console.warn("[Resend Webhook] Database not available");
    return;
  }

  const emailId = payload.data.email_id;
  const eventType = payload.type;
  const timestamp = new Date(payload.created_at);

  try {
    // Map Resend event types to our status enum
    let status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed" = "sent";
    let updateFields: any = {};

    switch (eventType) {
      case "email.sent":
        status = "sent";
        break;

      case "email.delivered":
        status = "delivered";
        updateFields.deliveredAt = timestamp;
        break;

      case "email.opened":
        status = "opened";
        updateFields.openedAt = timestamp;
        break;

      case "email.clicked":
        status = "clicked";
        updateFields.clickedAt = timestamp;
        if (payload.data.click) {
          updateFields.metadata = JSON.stringify({
            clickedLink: payload.data.click.link,
            clickedAt: payload.data.click.timestamp,
            ipAddress: payload.data.click.ipAddress,
            userAgent: payload.data.click.userAgent,
          });
        }
        break;

      case "email.bounced":
        status = "bounced";
        updateFields.bouncedAt = timestamp;
        if (payload.data.bounce) {
          updateFields.error = `Bounced: ${payload.data.bounce.bounceType}`;
        }
        break;

      case "email.complained":
        status = "complained";
        updateFields.error = "Recipient marked as spam";
        break;

      case "email.delivery_delayed":
        // Don't update status, just log
        console.log(`[Resend Webhook] Delivery delayed for ${emailId}`);
        return;

      default:
        console.warn(`[Resend Webhook] Unknown event type: ${eventType}`);
        return;
    }

    updateFields.status = status;

    // Update the record
    const result = await db
      .update(emailDeliveryLog)
      .set(updateFields)
      .where(eq(emailDeliveryLog.messageId, emailId));

    console.log(`[Resend Webhook] Updated email ${emailId} to status: ${status}`);
  } catch (error) {
    console.error("[Resend Webhook] Error updating database:", error);
  }
}

/**
 * Verify webhook signature from Resend
 * 
 * Note: Resend uses HMAC-SHA256 for webhook signatures
 */
async function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(JSON.stringify(payload)).digest("hex");
    return signature === digest;
  } catch (error) {
    console.error("[Resend Webhook] Error verifying signature:", error);
    return false;
  }
}

/**
 * Test endpoint to simulate webhook events (development only)
 */
export async function testResendWebhook(req: Request, res: Response) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not available in production" });
  }

  const { emailId, eventType } = req.body;

  if (!emailId || !eventType) {
    return res.status(400).json({ error: "emailId and eventType required" });
  }

  const mockPayload: ResendWebhookPayload = {
    type: eventType,
    created_at: new Date().toISOString(),
    data: {
      created_at: new Date().toISOString(),
      email_id: emailId,
      from: "noreply@realestate-platform.com",
      to: ["test@example.com"],
      subject: "Test Email",
    },
  };

  await updateEmailDeliveryStatus(mockPayload);

  res.json({
    success: true,
    message: `Simulated ${eventType} event for email ${emailId}`,
  });
}
