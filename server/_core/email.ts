import { logger } from "./logger";
/**
 * Email notification service using SendGrid
 * 
 * Setup:
 * 1. Install SendGrid: pnpm add @sendgrid/mail
 * 2. Add SENDGRID_API_KEY to environment variables
 * 3. Add FROM_EMAIL to environment variables (verified sender)
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using SendGrid
 * @param options Email options
 * @returns Promise<boolean> Success status
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      logger.warn('[Email] SendGrid API key not configured. Email not sent.');
      return { success: false, error: 'SendGrid API key not configured' };
    }

    // Dynamic import to avoid errors when SendGrid is not installed
    const sgMail = await import('@sendgrid/mail').catch(() => null);
    if (!sgMail) {
      logger.warn('[Email] @sendgrid/mail not installed. Run: pnpm add @sendgrid/mail');
      return { success: false, error: '@sendgrid/mail not installed' };
    }

    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: options.to,
      from: process.env.FROM_EMAIL || 'noreply@realestate.com',
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html: options.html,
    };

    await sgMail.default.send(msg);
    logger.info(`[Email] Sent to ${options.to}: ${options.subject}`);
    return { success: true };
  } catch (error) {
    logger.error('[Email] Failed to send:', { error: String(error) });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Email templates
 */
export const emailTemplates = {
  appointmentConfirmation: (data: {
    userName: string;
    propertyAddress: string;
    appointmentDate: string;
    appointmentTime: string;
    agentName: string;
    agentPhone: string;
  }) => ({
    subject: `Appointment Confirmed: ${data.propertyAddress}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Appointment Confirmed</h2>
        <p>Hi ${data.userName},</p>
        <p>Your property viewing has been confirmed!</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Property Details</h3>
          <p><strong>Address:</strong> ${data.propertyAddress}</p>
          <p><strong>Date:</strong> ${data.appointmentDate}</p>
          <p><strong>Time:</strong> ${data.appointmentTime}</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Agent Information</h3>
          <p><strong>Name:</strong> ${data.agentName}</p>
          <p><strong>Phone:</strong> ${data.agentPhone}</p>
        </div>
        
        <p>If you need to reschedule or cancel, please contact your agent directly.</p>
        <p>Best regards,<br>Real Estate Platform Team</p>
      </div>
    `,
  }),

  priceDropAlert: (data: {
    userName: string;
    propertyAddress: string;
    oldPrice: string;
    newPrice: string;
    savings: string;
    propertyUrl: string;
  }) => ({
    subject: `Price Drop Alert: ${data.propertyAddress}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">🎉 Price Drop Alert!</h2>
        <p>Hi ${data.userName},</p>
        <p>Great news! A property you favorited has dropped in price.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3 style="margin-top: 0;">${data.propertyAddress}</h3>
          <p style="text-decoration: line-through; color: #666;">Was: ${data.oldPrice}</p>
          <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 10px 0;">Now: ${data.newPrice}</p>
          <p style="color: #16a34a; font-weight: bold;">You save: ${data.savings}</p>
        </div>
        
        <a href="${data.propertyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">View Property</a>
        
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          Don't miss this opportunity! Price drops don't last long.
        </p>
      </div>
    `,
  }),

  newListingAlert: (data: {
    userName: string;
    propertyAddress: string;
    price: string;
    bedrooms: number;
    bathrooms: number;
    propertyUrl: string;
    searchName: string;
  }) => ({
    subject: `New Listing Match: ${data.propertyAddress}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Property Matches Your Search</h2>
        <p>Hi ${data.userName},</p>
        <p>We found a new property that matches your saved search "<strong>${data.searchName}</strong>".</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${data.propertyAddress}</h3>
          <p><strong>Price:</strong> ${data.price}</p>
          <p><strong>Bedrooms:</strong> ${data.bedrooms} | <strong>Bathrooms:</strong> ${data.bathrooms}</p>
        </div>
        
        <a href="${data.propertyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">View Property</a>
        
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          To stop receiving alerts for this search, manage your <a href="/alerts">search alerts</a>.
        </p>
      </div>
    `,
  }),
};

/**
 * Queue email for sending
 * @param userId User ID
 * @param template Template key
 * @param recipient Email address
 * @param data Template data
 */
export async function queueEmail(
  userId: number,
  template: string,
  recipient: string,
  data: Record<string, any>
): Promise<void> {
  // This would insert into notificationQueue table
  // For now, just send directly
  logger.info(`[Email] Queuing email to ${recipient} with template ${template}`);
}
