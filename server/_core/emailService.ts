/**
 * Email Service with SendGrid integration and mock fallback
 * Automatically uses mock service when SENDGRID_API_KEY is not configured
 */

import { ENV } from './env';
import { logger } from "./logger";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Mock email service for development
 * Logs emails to console instead of sending
 */
class MockEmailService {
  async send(options: EmailOptions): Promise<EmailResult> {
    logger.info('\n📧 [Mock Email Service] Email would be sent:');
    console.log('  To:', Array.isArray(options.to) ? options.to.join(', ') : options.to);
    console.log('  From:', options.from || 'noreply@realestate-platform.com');
    console.log('  Subject:', options.subject);
    console.log('  HTML Length:', options.html.length, 'characters');
    if (options.text) {
      console.log('  Text Preview:', options.text.substring(0, 100) + '...');
    }
    if (options.attachments) {
      console.log('  Attachments:', options.attachments.length);
    }
    logger.info('  Status: ✅ Logged (not actually sent)\n');

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendBulk(emails: EmailOptions[]): Promise<EmailResult[]> {
    logger.info(`\n📧 [Mock Email Service] Bulk email (${emails.length} emails) would be sent`);
    return emails.map((email, index) => ({
      success: true,
      messageId: `mock-bulk-${Date.now()}-${index}`,
    }));
  }
}

/**
 * Real SendGrid email service
 * Requires SENDGRID_API_KEY environment variable
 */
class SendGridEmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: Array.isArray(options.to)
                ? options.to.map(email => ({ email }))
                : [{ email: options.to }],
            },
          ],
          from: {
            email: options.from || this.fromEmail,
          },
          reply_to: options.replyTo ? { email: options.replyTo } : undefined,
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
            ...(options.text
              ? [{ type: 'text/plain', value: options.text }]
              : []),
          ],
          attachments: options.attachments,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('[SendGrid] Error sending email:', { error: String(error) });
        return {
          success: false,
          error: `SendGrid API error: ${response.status}`,
        };
      }

      const messageId = response.headers.get('x-message-id') || undefined;

      logger.info('✅ [SendGrid] Email sent successfully:', { detail: String(messageId) });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      logger.error('[SendGrid] Error sending email:', { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBulk(emails: EmailOptions[]): Promise<EmailResult[]> {
    // SendGrid supports batch sending, but for simplicity we'll send individually
    const results = await Promise.all(emails.map(email => this.send(email)));
    return results;
  }
}

/**
 * Email service factory
 * Returns SendGrid service if API key is configured, otherwise returns mock service
 */
function createEmailService() {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@realestate-platform.com';

  if (sendGridApiKey && sendGridApiKey !== 'mock') {
    logger.info('📧 [Email Service] Using SendGrid (real emails)');
    return new SendGridEmailService(sendGridApiKey, fromEmail);
  } else {
    logger.info('📧 [Email Service] Using Mock Service (emails logged to console)');
    return new MockEmailService();
  }
}

// Export singleton instance
export const emailService = createEmailService();

/**
 * Helper function to send property alert email
 */
export async function sendPropertyAlertEmail(
  to: string,
  propertyTitle: string,
  propertyUrl: string,
  alertType: 'price_drop' | 'new_listing' | 'similar_property'
): Promise<EmailResult> {
  const subjects = {
    price_drop: `Price Drop Alert: ${propertyTitle}`,
    new_listing: `New Listing Alert: ${propertyTitle}`,
    similar_property: `Similar Property Found: ${propertyTitle}`,
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subjects[alertType]}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Property Alert</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">${subjects[alertType]}</h2>
        
        <p style="font-size: 16px; color: #4b5563;">
          ${alertType === 'price_drop' ? 'Great news! A property you\'re watching has dropped in price.' : ''}
          ${alertType === 'new_listing' ? 'A new property matching your criteria has been listed.' : ''}
          ${alertType === 'similar_property' ? 'We found a property similar to one you\'ve viewed.' : ''}
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin-top: 0; color: #1f2937;">${propertyTitle}</h3>
          <a href="${propertyUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: bold;">View Property</a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          You're receiving this email because you set up property alerts. 
          <a href="#" style="color: #667eea;">Manage your alerts</a> or 
          <a href="#" style="color: #667eea;">unsubscribe</a>.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>© 2025 Real Estate Platform. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
${subjects[alertType]}

${propertyTitle}

View property: ${propertyUrl}

You're receiving this email because you set up property alerts.
  `.trim();

  return emailService.send({
    to,
    subject: subjects[alertType],
    html,
    text,
  });
}

/**
 * Helper function to send booking confirmation email
 */
export async function sendBookingConfirmationEmail(
  to: string,
  propertyTitle: string,
  bookingDate: Date,
  bookingTime: string
): Promise<EmailResult> {
  const formattedDate = bookingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✓ Booking Confirmed</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #4b5563;">
          Your property viewing has been confirmed!
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">${propertyTitle}</h3>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">
          Please arrive 5 minutes early. If you need to reschedule or cancel, please contact us at least 24 hours in advance.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>© 2025 Real Estate Platform. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return emailService.send({
    to,
    subject: `Booking Confirmed: ${propertyTitle}`,
    html,
  });
}

/**
 * Helper function to send admin digest email
 */
export async function sendAdminDigestEmail(
  to: string,
  stats: {
    newProperties: number;
    newUsers: number;
    newTransactions: number;
    totalRevenue: number;
  }
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Admin Digest</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Platform Digest</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">This Week's Highlights</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #667eea;">${stats.newProperties}</div>
            <div style="color: #6b7280; font-size: 14px;">New Properties</div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #10b981;">${stats.newUsers}</div>
            <div style="color: #6b7280; font-size: 14px;">New Users</div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${stats.newTransactions}</div>
            <div style="color: #6b7280; font-size: 14px;">Transactions</div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">$${stats.totalRevenue.toLocaleString()}</div>
            <div style="color: #6b7280; font-size: 14px;">Revenue</div>
          </div>
        </div>
        
        <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold;">View Full Dashboard</a>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>© 2025 Real Estate Platform. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return emailService.send({
    to,
    subject: 'Weekly Platform Digest',
    html,
  });
}
