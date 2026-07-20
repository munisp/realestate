// @ts-nocheck
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";

/**
 * Email Notification Service
 * Handles sending branded email notifications for appointments, offers, and alerts
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface AppointmentConfirmationData {
  recipientName: string;
  recipientEmail: string;
  propertyAddress: string;
  appointmentDate: Date;
  appointmentTime: string;
  tourType: "in_person" | "virtual";
  agentName?: string;
  agentPhone?: string;
  meetingLink?: string;
  notes?: string;
}

interface OfferUpdateData {
  recipientName: string;
  recipientEmail: string;
  propertyAddress: string;
  offerAmount: number;
  status: string;
  updateMessage: string;
  actionUrl?: string;
}

interface SavedSearchAlertData {
  recipientName: string;
  recipientEmail: string;
  searchName: string;
  newProperties: Array<{
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    propertyUrl: string;
  }>;
}

/**
 * Generate base HTML template with branding
 */
function getBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ENV.appTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 24px;
      font-weight: bold;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666666;
      font-size: 14px;
    }
    .property-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
    }
    .property-price {
      color: #667eea;
      font-size: 20px;
      font-weight: bold;
      margin: 8px 0;
    }
    h1 { color: #333333; margin: 0 0 20px 0; }
    h2 { color: #667eea; margin: 20px 0 10px 0; }
    p { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">${ENV.appTitle}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${ENV.appTitle}. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate appointment confirmation email
 */
export function generateAppointmentConfirmationEmail(
  data: AppointmentConfirmationData
): EmailTemplate {
  const formattedDate = data.appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tourTypeLabel = data.tourType === "virtual" ? "Virtual Tour" : "In-Person Tour";

  const content = `
    <h1>Your Property Tour is Confirmed!</h1>
    <p>Hi ${data.recipientName},</p>
    <p>Great news! Your property tour has been scheduled and confirmed.</p>
    
    <div class="info-box">
      <h2>Tour Details</h2>
      <p><strong>Property:</strong> ${data.propertyAddress}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${data.appointmentTime}</p>
      <p><strong>Type:</strong> ${tourTypeLabel}</p>
      ${data.agentName ? `<p><strong>Agent:</strong> ${data.agentName}</p>` : ""}
      ${data.agentPhone ? `<p><strong>Contact:</strong> ${data.agentPhone}</p>` : ""}
    </div>
    
    ${
      data.tourType === "virtual" && data.meetingLink
        ? `
    <p>Join your virtual tour using the link below:</p>
    <a href="${data.meetingLink}" class="button">Join Virtual Tour</a>
    `
        : ""
    }
    
    ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
    
    <p>We look forward to showing you this property!</p>
    <p>If you need to reschedule or cancel, please visit your appointments page.</p>
  `;

  return {
    subject: `Tour Confirmed: ${data.propertyAddress}`,
    html: getBaseTemplate(content),
    text: `Your Property Tour is Confirmed!\n\nProperty: ${data.propertyAddress}\nDate: ${formattedDate}\nTime: ${data.appointmentTime}\nType: ${tourTypeLabel}${data.agentName ? `\nAgent: ${data.agentName}` : ""}${data.meetingLink ? `\n\nJoin: ${data.meetingLink}` : ""}`,
  };
}

/**
 * Generate offer status update email
 */
export function generateOfferUpdateEmail(data: OfferUpdateData): EmailTemplate {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(data.offerAmount);

  const statusColors: Record<string, string> = {
    accepted: "#10b981",
    rejected: "#ef4444",
    countered: "#f59e0b",
    pending: "#6366f1",
  };

  const statusColor = statusColors[data.status.toLowerCase()] || "#6366f1";

  const content = `
    <h1>Offer Update</h1>
    <p>Hi ${data.recipientName},</p>
    <p>${data.updateMessage}</p>
    
    <div class="info-box">
      <h2>Offer Details</h2>
      <p><strong>Property:</strong> ${data.propertyAddress}</p>
      <p><strong>Offer Amount:</strong> ${formattedAmount}</p>
      <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${data.status.toUpperCase()}</span></p>
    </div>
    
    ${
      data.actionUrl
        ? `
    <a href="${data.actionUrl}" class="button">View Offer Details</a>
    `
        : ""
    }
    
    <p>Thank you for using our platform!</p>
  `;

  return {
    subject: `Offer ${data.status}: ${data.propertyAddress}`,
    html: getBaseTemplate(content),
    text: `Offer Update\n\n${data.updateMessage}\n\nProperty: ${data.propertyAddress}\nOffer Amount: ${formattedAmount}\nStatus: ${data.status.toUpperCase()}${data.actionUrl ? `\n\nView details: ${data.actionUrl}` : ""}`,
  };
}

/**
 * Generate saved search alert email
 */
export function generateSavedSearchAlertEmail(
  data: SavedSearchAlertData
): EmailTemplate {
  const propertyCount = data.newProperties.length;
  const propertyLabel = propertyCount === 1 ? "property" : "properties";

  const propertiesHtml = data.newProperties
    .map(
      (property) => `
    <div class="property-card">
      <div class="property-price">${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(property.price)}</div>
      <p><strong>${property.address}</strong></p>
      <p>${property.bedrooms} bed • ${property.bathrooms} bath • ${property.squareFeet.toLocaleString()} sq ft</p>
      <a href="${property.propertyUrl}" class="button">View Property</a>
    </div>
  `
    )
    .join("");

  const content = `
    <h1>New Properties Match Your Search!</h1>
    <p>Hi ${data.recipientName},</p>
    <p>We found ${propertyCount} new ${propertyLabel} matching your saved search "<strong>${data.searchName}</strong>".</p>
    
    ${propertiesHtml}
    
    <p>Don't miss out on these opportunities!</p>
    <p>You can manage your saved searches and notification preferences in your account settings.</p>
  `;

  const propertiesText = data.newProperties
    .map(
      (property) =>
        `${property.address}\n${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(property.price)} • ${property.bedrooms} bed • ${property.bathrooms} bath • ${property.squareFeet.toLocaleString()} sq ft\n${property.propertyUrl}`
    )
    .join("\n\n");

  return {
    subject: `${propertyCount} New ${propertyLabel.charAt(0).toUpperCase() + propertyLabel.slice(1)} Match "${data.searchName}"`,
    html: getBaseTemplate(content),
    text: `New Properties Match Your Search!\n\nWe found ${propertyCount} new ${propertyLabel} matching "${data.searchName}":\n\n${propertiesText}`,
  };
}

/**
 * Send email using built-in notification API
 * Note: This is a placeholder - actual implementation would use the Manus notification API
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  try {
    // TODO: Integrate with actual email service (Manus notification API or external provider)
    logger.info(`[Email] Sending to ${to}: ${subject}`);
    logger.info(`[Email] HTML length: ${html.length}, Text length: ${text.length}`);
    
    // For now, just log the email
    // In production, this would call the notification API
    return true;
  } catch (error) {
    logger.error("[Email] Failed to send:", { error: String(error) });
    return false;
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(
  data: AppointmentConfirmationData
): Promise<boolean> {
  const template = generateAppointmentConfirmationEmail(data);
  return sendEmail(data.recipientEmail, template.subject, template.html, template.text);
}

/**
 * Send offer update email
 */
export async function sendOfferUpdate(data: OfferUpdateData): Promise<boolean> {
  const template = generateOfferUpdateEmail(data);
  return sendEmail(data.recipientEmail, template.subject, template.html, template.text);
}

/**
 * Send saved search alert email
 */
export async function sendSavedSearchAlert(
  data: SavedSearchAlertData
): Promise<boolean> {
  const template = generateSavedSearchAlertEmail(data);
  return sendEmail(data.recipientEmail, template.subject, template.html, template.text);
}
