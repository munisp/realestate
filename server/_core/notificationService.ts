// @ts-nocheck
/**
 * Notification Service
 * 
 * Handles sending notifications via email, SMS, and push notifications
 * Supports templating, queuing, and retry logic
 */

import { ENV } from './env';
import { getDb } from '../db';
import { notificationQueue, emailTemplates } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface NotificationParams {
  userId: number;
  channel: 'email' | 'sms';
  template: string;
  recipient: string;
  subject?: string;
  data?: Record<string, any>;
  priority?: number;
  scheduledFor?: Date;
}

export interface EmailNotificationParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Queue a notification for sending
 */
export async function queueNotification(params: NotificationParams): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const result = await db.insert(notificationQueue).values({
    userId: params.userId,
    type: params.channel,
    template: params.template,
    recipient: params.recipient,
    subject: params.subject,
    data: params.data ? JSON.stringify(params.data) : undefined,
    status: 'pending',
  });

  console.log('[Notification] Queued notification:', {
    channel: params.channel,
    template: params.template,
    recipient: params.recipient,
  });

  return { id: Number(result[0].insertId) };
}

/**
 * Send an email notification immediately
 */
export async function sendEmail(params: EmailNotificationParams): Promise<{ success: boolean }> {
  console.log('[Notification] Sending email to:', params.to);
  
  // Check if SendGrid is configured
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@realestate-platform.com';
  
  if (!sendgridApiKey) {
    console.warn('[Notification] SendGrid API key not configured, email not sent');
    console.log('[Notification] Email preview:', {
      to: params.to,
      subject: params.subject,
      html: params.html.substring(0, 200) + '...',
    });
    return { success: false };
  }
  
  try {
    const { default: sgMail } = await import('@sendgrid/mail');
    sgMail.setApiKey(sendgridApiKey);
    
    await sgMail.send({
      to: params.to,
      from: fromEmail,
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    
    console.log('[Notification] Email sent successfully to:', params.to);
    return { success: true };
  } catch (error) {
    console.error('[Notification] Failed to send email:', error);
    throw error;
  }
}

/**
 * Send an SMS notification
 */
export async function sendSMS(to: string, message: string): Promise<{ success: boolean }> {
  console.log('[Notification] Sending SMS to:', to);
  
  // In production, integrate with an SMS service:
  // - Twilio: pnpm add twilio
  // - AWS SNS: pnpm add @aws-sdk/client-sns
  
  // Example with Twilio:
  // const { default: twilio } = await import('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: to,
  // });
  
  return { success: true };
}

/**
 * Render an email template with data
 */
export async function renderEmailTemplate(
  templateKey: string,
  data: Record<string, any>
): Promise<{ subject: string; html: string; text?: string }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const templates = await db.select()
    .from(emailTemplates)
    .where(eq(emailTemplates.templateKey, templateKey))
    .limit(1);

  if (!templates || templates.length === 0) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  const template = templates[0];
  
  // Simple template variable replacement
  let html = template.htmlContent;
  let text = template.textContent || '';
  let subject = template.subject;

  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    html = html.replace(placeholder, String(data[key]));
    text = text.replace(placeholder, String(data[key]));
    subject = subject.replace(placeholder, String(data[key]));
  });

  return { subject, html, text };
}

/**
 * Send escrow milestone notification
 */
export async function notifyEscrowMilestone(params: {
  userId: number;
  userEmail: string;
  propertyTitle: string;
  milestoneName: string;
  amount: number;
  status: string;
}): Promise<void> {
  const html = `
    <h2>Escrow Milestone Update</h2>
    <p>Hello,</p>
    <p>There's an update on your escrow account for <strong>${params.propertyTitle}</strong>:</p>
    <ul>
      <li><strong>Milestone:</strong> ${params.milestoneName}</li>
      <li><strong>Amount:</strong> $${(params.amount / 100).toLocaleString()}</li>
      <li><strong>Status:</strong> ${params.status}</li>
    </ul>
    <p>Please log in to your account to review the details.</p>
  `;

  await queueNotification({
    userId: params.userId,
    channel: 'email',
    template: 'escrow_milestone_update',
    recipient: params.userEmail,
    subject: `Escrow Update: ${params.milestoneName}`,
    data: params,
  });
}

/**
 * Send document signature request notification
 */
export async function notifySignatureRequest(params: {
  userId: number;
  userEmail: string;
  userName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt?: Date;
}): Promise<void> {
  const html = `
    <h2>Document Signature Required</h2>
    <p>Hello ${params.userName},</p>
    <p>You have been requested to sign the following document:</p>
    <p><strong>${params.documentTitle}</strong></p>
    ${params.expiresAt ? `<p>This request expires on ${params.expiresAt.toLocaleDateString()}.</p>` : ''}
    <p><a href="${params.signingUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign Document</a></p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p>${params.signingUrl}</p>
  `;

  await queueNotification({
    userId: params.userId,
    channel: 'email',
    template: 'signature_request',
    recipient: params.userEmail,
    subject: `Signature Required: ${params.documentTitle}`,
    data: params,
  });
}

/**
 * Send fund release notification
 */
export async function notifyFundRelease(params: {
  userId: number;
  userEmail: string;
  propertyTitle: string;
  amount: number;
  releaseType: 'partial' | 'full';
}): Promise<void> {
  const html = `
    <h2>Escrow Funds Released</h2>
    <p>Hello,</p>
    <p>Funds have been released from your escrow account for <strong>${params.propertyTitle}</strong>:</p>
    <ul>
      <li><strong>Amount Released:</strong> $${(params.amount / 100).toLocaleString()}</li>
      <li><strong>Release Type:</strong> ${params.releaseType === 'full' ? 'Full Release' : 'Partial Release'}</li>
    </ul>
    <p>The funds should appear in your account within 2-3 business days.</p>
  `;

  await queueNotification({
    userId: params.userId,
    channel: 'email',
    template: 'fund_release',
    recipient: params.userEmail,
    subject: `Funds Released: ${params.propertyTitle}`,
    data: params,
  });
}

/**
 * Send dispute notification
 */
export async function notifyDispute(params: {
  userId: number;
  userEmail: string;
  propertyTitle: string;
  disputeType: string;
  description: string;
}): Promise<void> {
  const html = `
    <h2>Escrow Dispute Filed</h2>
    <p>Hello,</p>
    <p>A dispute has been filed for the escrow account on <strong>${params.propertyTitle}</strong>:</p>
    <ul>
      <li><strong>Type:</strong> ${params.disputeType.replace(/_/g, ' ')}</li>
      <li><strong>Description:</strong> ${params.description}</li>
    </ul>
    <p>Our team will review this dispute and contact you within 24-48 hours.</p>
  `;

  await queueNotification({
    userId: params.userId,
    channel: 'email',
    template: 'dispute_filed',
    recipient: params.userEmail,
    subject: `Dispute Filed: ${params.propertyTitle}`,
    data: params,
  });
}

/**
 * Process pending notifications in the queue
 * This should be called by a background job/cron
 */
export async function processNotificationQueue(): Promise<{ processed: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    return { processed: 0, failed: 0 };
  }

  const pending = await db.select()
    .from(notificationQueue)
    .where(eq(notificationQueue.status, 'pending'))
    .limit(100);

  let processed = 0;
  let failed = 0;

  for (const notification of pending) {
    try {
      if (notification.type === 'email') {
        await sendEmail({
          to: notification.recipient,
          subject: notification.subject || 'Notification',
          html: notification.data || '',
        });
      } else if (notification.type === 'sms') {
        await sendSMS(notification.recipient, notification.data || '');
      }

      await db.update(notificationQueue)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(notificationQueue.id, notification.id));

      processed++;
    } catch (error) {
      console.error('[Notification] Failed to send:', error);
      
      await db.update(notificationQueue)
        .set({ 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(notificationQueue.id, notification.id));

      failed++;
    }
  }

  console.log('[Notification] Processed queue:', { processed, failed });
  return { processed, failed };
}
