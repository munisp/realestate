/**
 * Email Service using Resend
 * 
 * Provides email sending functionality with HTML templates
 * for various notification types across the platform.
 */

import { getDb } from "../db";
import { emailDeliveryLog } from "../../drizzle/schema";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

interface EmailTrackingData {
  userId?: number;
  propertyId?: number;
  alertType?: string;
}

const DEFAULT_FROM = process.env.EMAIL_FROM || 'noreply@realestate-platform.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MOCK_MODE = !RESEND_API_KEY || process.env.EMAIL_MOCK_MODE === 'true';

/**
 * Send email using Resend API with tracking
 */
export async function sendEmail(
  options: EmailOptions & Partial<EmailTrackingData>
): Promise<boolean> {
  const { userId, propertyId, alertType, ...emailOptions } = options;
  // Mock mode: log email instead of sending
  if (MOCK_MODE) {
    console.log('[Email] MOCK MODE - Email would be sent:');
    console.log('  To:', options.to);
    console.log('  Subject:', options.subject);
    console.log('  From:', options.from || DEFAULT_FROM);
    console.log('  HTML length:', options.html.length, 'characters');
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || DEFAULT_FROM,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Failed to send email:', error);
      return false;
    }

    console.log('[Email] Email sent successfully to:', emailOptions.to);
    
    // Track delivery
    await trackEmailDelivery({
      userId,
      propertyId,
      alertType,
      recipientEmail: Array.isArray(emailOptions.to) ? emailOptions.to[0] : emailOptions.to,
      subject: emailOptions.subject,
      status: "delivered",
    });
    
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    
    // Track failure
    await trackEmailDelivery({
      userId,
      propertyId,
      alertType,
      recipientEmail: Array.isArray(emailOptions.to) ? emailOptions.to[0] : emailOptions.to,
      subject: emailOptions.subject,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    
    return false;
  }
}

/**
 * Track email delivery in database
 */
async function trackEmailDelivery(data: {
  userId?: number;
  propertyId?: number;
  alertType?: string;
  recipientEmail: string;
  subject: string;
  status: "delivered" | "failed" | "bounced";
  errorMessage?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(emailDeliveryLog).values({
      userId: data.userId || null,
      propertyId: data.propertyId || null,
      alertType: data.alertType || null,
      recipientEmail: data.recipientEmail,
      subject: data.subject,
      status: data.status,
      sentAt: new Date(),
      deliveredAt: data.status === "delivered" ? new Date() : null,
      bouncedAt: data.status === "bounced" ? new Date() : null,
      errorMessage: data.errorMessage || null,
    });
  } catch (error) {
    console.error("[Email] Failed to track delivery:", error);
  }
}

/**
 * Email Templates
 */

export const emailTemplates = {
  /**
   * Application Submission Confirmation
   */
  applicationSubmission: (data: {
    name: string;
    applicationType: 'shortlet-host' | 'builder';
    applicationId: string;
  }) => ({
    subject: 'Application Received - Real Estate Platform',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Received!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name},</p>
              <p>Thank you for submitting your ${data.applicationType === 'shortlet-host' ? 'Shortlet Host' : 'Builder'} application!</p>
              <p>Your application ID is: <strong>${data.applicationId}</strong></p>
              <p>Our team will review your application within 2-3 business days. We'll notify you as soon as there's an update.</p>
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Document verification (1-2 days)</li>
                <li>Background checks (1-2 days)</li>
                <li>Final approval decision</li>
              </ul>
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© 2025 Real Estate Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Verification Status Update
   */
  verificationStatusUpdate: (data: {
    name: string;
    status: 'approved' | 'rejected' | 'needs-info';
    applicationType: 'shortlet-host' | 'builder';
    message?: string;
  }) => ({
    subject: `Application ${data.status === 'approved' ? 'Approved' : data.status === 'rejected' ? 'Update Required' : 'Information Needed'} - Real Estate Platform`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${data.status === 'approved' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : data.status === 'rejected' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .message-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${data.status === 'approved' ? '🎉 Congratulations!' : data.status === 'rejected' ? '⚠️ Application Update' : '📋 Information Needed'}</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name},</p>
              ${data.status === 'approved' ? `
                <p>Great news! Your ${data.applicationType === 'shortlet-host' ? 'Shortlet Host' : 'Builder'} application has been <strong>approved</strong>!</p>
                <p>You can now start listing properties and managing your account.</p>
                <a href="${process.env.VITE_APP_URL || 'https://realestate-platform.com'}/dashboard" class="button">Go to Dashboard</a>
              ` : data.status === 'rejected' ? `
                <p>We've reviewed your ${data.applicationType === 'shortlet-host' ? 'Shortlet Host' : 'Builder'} application and need some additional information before we can proceed.</p>
                ${data.message ? `<div class="message-box"><strong>Feedback:</strong><br>${data.message}</div>` : ''}
                <p>Please update your application with the requested information and resubmit.</p>
                <a href="${process.env.VITE_APP_URL || 'https://realestate-platform.com'}/dashboard" class="button">Update Application</a>
              ` : `
                <p>We're reviewing your ${data.applicationType === 'shortlet-host' ? 'Shortlet Host' : 'Builder'} application and need some additional information.</p>
                ${data.message ? `<div class="message-box">${data.message}</div>` : ''}
                <p>Please provide the requested information to continue the verification process.</p>
                <a href="${process.env.VITE_APP_URL || 'https://realestate-platform.com'}/dashboard" class="button">Provide Information</a>
              `}
            </div>
            <div class="footer">
              <p>© 2025 Real Estate Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Property Match Alert
   */
  propertyMatchAlert: (data: {
    name: string;
    properties: Array<{
      title: string;
      price: number;
      location: string;
      bedrooms: number;
      bathrooms: number;
      url: string;
    }>;
    searchCriteria: string;
  }) => ({
    subject: `${data.properties.length} New Properties Match Your Search - Real Estate Platform`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .property-card { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .property-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
            .property-details { color: #6b7280; font-size: 14px; }
            .property-price { font-size: 20px; font-weight: bold; color: #667eea; margin: 10px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏡 New Properties for You!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name},</p>
              <p>We found <strong>${data.properties.length} new ${data.properties.length === 1 ? 'property' : 'properties'}</strong> matching your search: <em>${data.searchCriteria}</em></p>
              ${data.properties.map(property => `
                <div class="property-card">
                  <div class="property-title">${property.title}</div>
                  <div class="property-details">
                    📍 ${property.location}<br>
                    🛏️ ${property.bedrooms} bed • 🚿 ${property.bathrooms} bath
                  </div>
                  <div class="property-price">₦${property.price.toLocaleString()}</div>
                  <a href="${property.url}" class="button">View Details</a>
                </div>
              `).join('')}
              <p style="margin-top: 30px;">Don't miss out on these opportunities!</p>
            </div>
            <div class="footer">
              <p>© 2025 Real Estate Platform. All rights reserved.</p>
              <p><a href="${process.env.VITE_APP_URL || 'https://realestate-platform.com'}/saved-searches" style="color: #667eea;">Manage your saved searches</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Virtual Tour Reminder
   */
  virtualTourReminder: (data: {
    name: string;
    propertyTitle: string;
    tourDate: string;
    tourTime: string;
    meetingLink: string;
    agentName: string;
  }) => ({
    subject: `Reminder: Virtual Tour Tomorrow - ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏡 Virtual Tour Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name},</p>
              <p>This is a friendly reminder about your upcoming virtual tour!</p>
              <div class="info-box">
                <strong>Property:</strong> ${data.propertyTitle}<br>
                <strong>Date:</strong> ${data.tourDate}<br>
                <strong>Time:</strong> ${data.tourTime}<br>
                <strong>Agent:</strong> ${data.agentName}
              </div>
              <p>Make sure you have a stable internet connection and your camera/microphone ready.</p>
              <a href="${data.meetingLink}" class="button">Join Virtual Tour</a>
              <p><small>The link will be active 15 minutes before the scheduled time.</small></p>
            </div>
            <div class="footer">
              <p>© 2025 Real Estate Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};

/**
 * Convenience functions for common email types
 */

export async function sendApplicationSubmissionEmail(
  to: string,
  data: Parameters<typeof emailTemplates.applicationSubmission>[0]
): Promise<boolean> {
  const template = emailTemplates.applicationSubmission(data);
  return sendEmail({ to, ...template });
}

export async function sendVerificationStatusEmail(
  to: string,
  data: Parameters<typeof emailTemplates.verificationStatusUpdate>[0]
): Promise<boolean> {
  const template = emailTemplates.verificationStatusUpdate(data);
  return sendEmail({ to, ...template });
}

export async function sendPropertyMatchAlertEmail(
  to: string,
  data: Parameters<typeof emailTemplates.propertyMatchAlert>[0]
): Promise<boolean> {
  const template = emailTemplates.propertyMatchAlert(data);
  return sendEmail({ to, ...template });
}

export async function sendVirtualTourReminderEmail(
  to: string,
  data: Parameters<typeof emailTemplates.virtualTourReminder>[0]
): Promise<boolean> {
  const template = emailTemplates.virtualTourReminder(data);
  return sendEmail({ to, ...template });
}

/**
 * Send Valuation Alert Email
 */
export async function sendValuationAlertEmail(
  to: string,
  data: {
    propertyId: number;
    propertyTitle?: string;
    propertyAddress: string;
    propertyImage?: string;
    previousValuation: number;
    newValuation: number;
    changeAmount: number;
    changePercentage: number;
    changeReason?: string;
    valuationUrl: string;
    unsubscribeUrl: string;
    userName?: string;
  }
): Promise<boolean> {
  const { generateValuationAlertEmail } = await import('../templates/valuationAlertEmail');
  const html = generateValuationAlertEmail(data);
  
  const isIncrease = data.changeAmount > 0;
  const direction = isIncrease ? "increased" : "decreased";
  
  return sendEmail({
    to,
    subject: `Property Valuation Alert: ${direction} by ${Math.abs(data.changePercentage).toFixed(1)}%`,
    html,
  });
}


/**
 * Shortlet Pricing Email Templates
 */

/**
 * Send Shortlet Price Alert Email
 */
export async function sendShortletPriceAlertEmail(
  to: string,
  data: {
    propertyName: string;
    currentPrice: number;
    recommendedPrice: number;
    priceChange: number;
    changePercent: number;
    competitorCount: number;
    marketPosition: string;
    reasoning: string[];
    dashboardUrl: string;
  }
): Promise<boolean> {
  const priceDirection = data.priceChange > 0 ? 'increase' : 'decrease';
  const priceColor = data.priceChange > 0 ? '#10b981' : '#ef4444';
  const arrow = data.priceChange > 0 ? '↑' : '↓';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📊 Pricing Alert</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Market conditions have changed</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 20px;">
              <h2 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 600;">${data.propertyName}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 500;">Current Price</p>
                    <p style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 700;">₦${data.currentPrice.toLocaleString()}</p>
                  </td>
                  <td width="50%" style="padding: 20px; background-color: ${priceColor}10; border-radius: 8px;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 500;">Recommended Price</p>
                    <p style="margin: 0; color: ${priceColor}; font-size: 28px; font-weight: 700;">₦${data.recommendedPrice.toLocaleString()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <div style="display: inline-block; padding: 12px 24px; background-color: ${priceColor}; border-radius: 24px;">
                <span style="color: #ffffff; font-size: 20px; font-weight: 700;">${arrow} ${Math.abs(data.changePercent).toFixed(1)}%</span>
                <span style="color: #ffffff; font-size: 14px; margin-left: 8px;">(₦${Math.abs(data.priceChange).toLocaleString()})</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">Market Position</p>
                <p style="margin: 0; color: #1e3a8a; font-size: 16px;">Your property is currently <strong>${data.marketPosition}</strong></p>
                <p style="margin: 8px 0 0; color: #3730a3; font-size: 14px;">Based on ${data.competitorCount} similar listings in your area</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 18px; font-weight: 600;">Why this recommendation?</h3>
              ${data.reasoning.map(reason => `
                <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0; color: #667eea;">•</span>
                  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">${reason}</p>
                </div>
              `).join('')}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="${data.dashboardUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">View Full Analysis</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">This is an automated alert from your Market Intelligence dashboard</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">You can manage your notification preferences in your account settings</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `💰 Price ${priceDirection === 'increase' ? 'Increase' : 'Decrease'} Recommended for ${data.propertyName}`,
    html,
  });
}

/**
 * Send Shortlet Optimization Opportunity Email
 */
export async function sendShortletOptimizationEmail(
  to: string,
  data: {
    propertyName: string;
    currentPrice: number;
    potentialRevenue: number;
    opportunities: Array<{
      title: string;
      description: string;
      impact: string;
    }>;
    dashboardUrl: string;
  }
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Optimization Opportunities</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🚀 Revenue Opportunities</h1>
              <p style="margin: 10px 0 0; color: #d1fae5; font-size: 16px;">Maximize your property's potential</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 20px;">
              <h2 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 600;">${data.propertyName}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="padding: 24px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; text-align: center;">
                <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Potential Additional Revenue</p>
                <p style="margin: 0; color: #047857; font-size: 36px; font-weight: 700;">+₦${data.potentialRevenue.toLocaleString()}</p>
                <p style="margin: 8px 0 0; color: #059669; font-size: 14px;">per month with optimizations</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600;">Recommended Actions</h3>
              ${data.opportunities.map((opp, index) => `
                <div style="margin-bottom: 20px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 4px;">
                  <div style="margin-bottom: 8px;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #10b981; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px; margin-right: 12px;">${index + 1}</span>
                    <h4 style="display: inline; margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">${opp.title}</h4>
                  </div>
                  <p style="margin: 8px 0 0; padding-left: 40px; color: #4b5563; font-size: 15px; line-height: 1.6;">${opp.description}</p>
                  <div style="margin: 12px 0 0; padding-left: 40px;">
                    <span style="display: inline-block; padding: 4px 12px; background-color: #d1fae5; color: #065f46; border-radius: 12px; font-size: 13px; font-weight: 600;">${opp.impact}</span>
                  </div>
                </div>
              `).join('')}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="${data.dashboardUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">Optimize My Listing</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">These recommendations are based on real-time market analysis</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">You can manage your notification preferences in your account settings</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `🚀 ${data.opportunities.length} Ways to Boost Revenue for ${data.propertyName}`,
    html,
  });
}

/**
 * Send Weekly Summary Email
 */
export async function sendShortletWeeklySummaryEmail(
  to: string,
  data: {
    ownerName: string;
    weekStart: string;
    weekEnd: string;
    properties: Array<{
      name: string;
      bookings: number;
      revenue: number;
      occupancyRate: number;
      averagePrice: number;
    }>;
    totalRevenue: number;
    totalBookings: number;
    averageOccupancy: number;
    marketInsights: string[];
    dashboardUrl: string;
  }
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📈 Weekly Performance Summary</h1>
              <p style="margin: 10px 0 0; color: #dbeafe; font-size: 16px;">${data.weekStart} - ${data.weekEnd}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #1f2937; font-size: 18px;">Hi ${data.ownerName},</p>
              <p style="margin: 12px 0 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Here's how your properties performed this week:</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <table width="100%" cellpadding="8" cellspacing="8">
                <tr>
                  <td width="33%" style="padding: 16px; background-color: #eff6ff; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase;">Total Revenue</p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 24px; font-weight: 700;">₦${data.totalRevenue.toLocaleString()}</p>
                  </td>
                  <td width="33%" style="padding: 16px; background-color: #f0fdf4; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #15803d; font-size: 12px; font-weight: 600; text-transform: uppercase;">Bookings</p>
                    <p style="margin: 0; color: #166534; font-size: 24px; font-weight: 700;">${data.totalBookings}</p>
                  </td>
                  <td width="33%" style="padding: 16px; background-color: #fef3c7; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase;">Avg Occupancy</p>
                    <p style="margin: 0; color: #78350f; font-size: 24px; font-weight: 700;">${data.averageOccupancy.toFixed(0)}%</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 18px; font-weight: 600;">Property Performance</h3>
              ${data.properties.map(prop => `
                <div style="margin-bottom: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
                  <h4 style="margin: 0 0 12px; color: #1f2937; font-size: 16px; font-weight: 600;">${prop.name}</h4>
                  <table width="100%" cellpadding="4" cellspacing="0">
                    <tr>
                      <td width="25%">
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">Bookings</p>
                        <p style="margin: 4px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">${prop.bookings}</p>
                      </td>
                      <td width="25%">
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">Revenue</p>
                        <p style="margin: 4px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">₦${prop.revenue.toLocaleString()}</p>
                      </td>
                      <td width="25%">
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">Occupancy</p>
                        <p style="margin: 4px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">${(prop.occupancyRate * 100).toFixed(0)}%</p>
                      </td>
                      <td width="25%">
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">Avg Price</p>
                        <p style="margin: 4px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">₦${prop.averagePrice.toLocaleString()}</p>
                      </td>
                    </tr>
                  </table>
                </div>
              `).join('')}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <h4 style="margin: 0 0 12px; color: #92400e; font-size: 16px; font-weight: 600;">💡 Market Insights</h4>
                ${data.marketInsights.map(insight => `
                  <p style="margin: 0 0 8px; color: #78350f; font-size: 14px; line-height: 1.6;">• ${insight}</p>
                `).join('')}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="${data.dashboardUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">View Full Dashboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Keep up the great work! 🎉</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">You can manage your notification preferences in your account settings</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `📊 Your Weekly Property Performance Summary (${data.weekStart} - ${data.weekEnd})`,
    html,
  });
}
