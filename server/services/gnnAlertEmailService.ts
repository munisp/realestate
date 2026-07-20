import { sendEmail } from "../_core/email";
import { logger } from "../_core/logger";

interface PropertyMatch {
  propertyId: number;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  primaryImage?: string;
  investmentScore?: number;
  undervaluedPercentage?: number;
  trendStrength?: number;
  reason: string;
}

interface AlertEmailData {
  userName: string;
  alertName: string;
  matchCount: number;
  properties: PropertyMatch[];
  alertUrl: string;
}

/**
 * Generate HTML email for GNN alert notifications
 */
function generateAlertEmailHTML(data: AlertEmailData): string {
  const propertyCards = data.properties.map(prop => `
    <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
      ${prop.primaryImage ? `
        <img src="${prop.primaryImage}" alt="${prop.address}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px; margin-bottom: 12px;">
      ` : ''}
      <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">${prop.address}</h3>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">${prop.city}</p>
      
      <div style="display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap;">
        <div style="font-size: 14px; color: #374151;">
          <strong>₦${prop.price.toLocaleString()}</strong>
        </div>
        <div style="font-size: 14px; color: #6b7280;">
          ${prop.bedrooms} beds • ${prop.bathrooms} baths • ${prop.squareFeet.toLocaleString()} sqft
        </div>
      </div>
      
      ${prop.investmentScore ? `
        <div style="background: #f0fdf4; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px;">
          <strong style="color: #15803d;">Investment Score: ${prop.investmentScore}/100</strong>
        </div>
      ` : ''}
      
      ${prop.undervaluedPercentage ? `
        <div style="background: #fef3c7; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px;">
          <strong style="color: #b45309;">Undervalued by ${prop.undervaluedPercentage}%</strong>
        </div>
      ` : ''}
      
      ${prop.trendStrength ? `
        <div style="background: #dbeafe; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px;">
          <strong style="color: #1e40af;">Market Trend: ${prop.trendStrength > 0 ? '+' : ''}${prop.trendStrength}%</strong>
        </div>
      ` : ''}
      
      <p style="margin: 12px 0 0 0; font-size: 14px; color: #374151;">
        <strong>Why this matches:</strong> ${prop.reason}
      </p>
      
      <a href="${process.env.VITE_APP_URL || 'http://localhost:3000'}/property/${prop.propertyId}" 
         style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
        View Property
      </a>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GNN Alert: ${data.alertName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
            🎯 GNN Alert Triggered
          </h1>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
            ${data.alertName}
          </p>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 32px 24px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
            Hi ${data.userName},
          </p>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
            Great news! Your GNN alert <strong>"${data.alertName}"</strong> has found <strong>${data.matchCount} ${data.matchCount === 1 ? 'property' : 'properties'}</strong> matching your criteria.
          </p>
          
          <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
              <strong>💡 AI-Powered Insights:</strong> These properties were identified using our Graph Neural Network technology, which analyzes spatial relationships, market trends, and neighborhood intelligence to find the best investment opportunities.
            </p>
          </div>
          
          <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #111827;">
            Matching Properties
          </h2>
          
          ${propertyCards}
          
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <a href="${data.alertUrl}" 
               style="display: inline-block; padding: 14px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View All Alerts
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 24px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">
            You're receiving this because you subscribed to GNN alerts.
          </p>
          <p style="margin: 0;">
            <a href="${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings/notifications" style="color: #2563eb; text-decoration: none;">
              Manage Preferences
            </a>
            •
            <a href="${process.env.VITE_APP_URL || 'http://localhost:3000'}/gnn-alerts" style="color: #2563eb; text-decoration: none;">
              Manage Alerts
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text version of alert email
 */
function generateAlertEmailText(data: AlertEmailData): string {
  const propertyList = data.properties.map((prop, index) => `
${index + 1}. ${prop.address}, ${prop.city}
   Price: ₦${prop.price.toLocaleString()}
   ${prop.bedrooms} beds • ${prop.bathrooms} baths • ${prop.squareFeet.toLocaleString()} sqft
   ${prop.investmentScore ? `Investment Score: ${prop.investmentScore}/100` : ''}
   ${prop.undervaluedPercentage ? `Undervalued by ${prop.undervaluedPercentage}%` : ''}
   ${prop.trendStrength ? `Market Trend: ${prop.trendStrength > 0 ? '+' : ''}${prop.trendStrength}%` : ''}
   Why this matches: ${prop.reason}
   View: ${process.env.VITE_APP_URL || 'http://localhost:3000'}/property/${prop.propertyId}
  `).join('\n');

  return `
GNN ALERT TRIGGERED: ${data.alertName}

Hi ${data.userName},

Great news! Your GNN alert "${data.alertName}" has found ${data.matchCount} ${data.matchCount === 1 ? 'property' : 'properties'} matching your criteria.

💡 AI-Powered Insights: These properties were identified using our Graph Neural Network technology, which analyzes spatial relationships, market trends, and neighborhood intelligence to find the best investment opportunities.

MATCHING PROPERTIES:
${propertyList}

View all your alerts: ${data.alertUrl}

---
You're receiving this because you subscribed to GNN alerts.
Manage Preferences: ${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings/notifications
Manage Alerts: ${process.env.VITE_APP_URL || 'http://localhost:3000'}/gnn-alerts
  `.trim();
}

/**
 * Send GNN alert notification email
 */
export async function sendGNNAlertEmail(
  toEmail: string,
  data: AlertEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = generateAlertEmailHTML(data);
    const text = generateAlertEmailText(data);

    const result = await sendEmail({
      to: toEmail,
      subject: `🎯 GNN Alert: ${data.matchCount} ${data.matchCount === 1 ? 'Property' : 'Properties'} Found - ${data.alertName}`,
      html,
      text,
    });

    return { success: result.success, error: result.error };
  } catch (error) {
    logger.error('[GNN Alert Email] Error sending email:', { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send SMS notification for GNN alert (mock implementation)
 */
export async function sendGNNAlertSMS(
  phoneNumber: string,
  data: {
    alertName: string;
    matchCount: number;
    topProperty: string;
    alertUrl: string;
  }
): Promise<{ success: boolean; error?: string }> {
  // Mock SMS implementation - replace with actual SMS service (Twilio, etc.)
  logger.info('[GNN Alert SMS] Sending SMS to:', { detail: String(phoneNumber) });
  console.log('[GNN Alert SMS] Message:', `
🎯 GNN Alert: ${data.alertName}
Found ${data.matchCount} ${data.matchCount === 1 ? 'property' : 'properties'}!
Top match: ${data.topProperty}
View: ${data.alertUrl}
  `.trim());

  // Simulate success
  return { success: true };
}
