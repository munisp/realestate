import { notifyOwner } from "../_core/notification";
import { logger } from "../_core/logger";

/**
 * Notification Service
 * Handles email and SMS notifications for C of O verification system
 */

interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SMSNotification {
  to: string;
  message: string;
}

export class NotificationService {
  /**
   * Send email notification
   * Uses the built-in notification system to send emails
   */
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      // For now, use the owner notification system
      // In production, this would integrate with a proper email service like SendGrid or AWS SES
      const success = await notifyOwner({
        title: notification.subject,
        content: notification.text || notification.html,
      });

      return success;
    } catch (error: any) {
      logger.error("[NotificationService] Email send failed:", { error: String(error) });
      return false;
    }
  }

  /**
   * Send SMS notification
   * Uses Twilio API for SMS delivery
   */
  async sendSMS(notification: SMSNotification): Promise<boolean> {
    try {
      // Check if Twilio credentials are configured
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        logger.warn("[NotificationService] Twilio credentials not configured");
        return false;
      }

      // Send SMS via Twilio API
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: notification.to,
            From: fromNumber,
            Body: notification.message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error("[NotificationService] Twilio API error:", { error: String(error) });
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error("[NotificationService] SMS send failed:", { error: String(error) });
      return false;
    }
  }

  /**
   * Send bulk verification job started notification
   */
  async notifyJobStarted(params: {
    jobId: string;
    fileName: string;
    totalItems: number;
    email?: string;
    phone?: string;
  }): Promise<void> {
    const { jobId, fileName, totalItems, email, phone } = params;

    // Email notification
    if (email) {
      await this.sendEmail({
        to: email,
        subject: "Bulk C of O Verification Job Started",
        html: `
          <h2>Bulk Verification Job Started</h2>
          <p>Your bulk verification job has been queued and will begin processing shortly.</p>
          <ul>
            <li><strong>Job ID:</strong> ${jobId}</li>
            <li><strong>File:</strong> ${fileName}</li>
            <li><strong>Total Items:</strong> ${totalItems}</li>
          </ul>
          <p>You will receive another notification when the job is completed.</p>
        `,
        text: `Bulk Verification Job Started\n\nJob ID: ${jobId}\nFile: ${fileName}\nTotal Items: ${totalItems}\n\nYou will receive another notification when the job is completed.`,
      });
    }

    // SMS notification
    if (phone) {
      await this.sendSMS({
        to: phone,
        message: `Bulk C of O verification job started. Job ID: ${jobId}. Processing ${totalItems} items. You'll be notified when complete.`,
      });
    }
  }

  /**
   * Send bulk verification job completed notification
   */
  async notifyJobCompleted(params: {
    jobId: string;
    fileName: string;
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    resultsUrl?: string;
    email?: string;
    phone?: string;
  }): Promise<void> {
    const { jobId, fileName, totalItems, successfulItems, failedItems, resultsUrl, email, phone } =
      params;

    const successRate = ((successfulItems / totalItems) * 100).toFixed(1);

    // Email notification
    if (email) {
      await this.sendEmail({
        to: email,
        subject: "Bulk C of O Verification Job Completed",
        html: `
          <h2>Bulk Verification Job Completed</h2>
          <p>Your bulk verification job has been completed successfully.</p>
          <ul>
            <li><strong>Job ID:</strong> ${jobId}</li>
            <li><strong>File:</strong> ${fileName}</li>
            <li><strong>Total Items:</strong> ${totalItems}</li>
            <li><strong>Successful:</strong> ${successfulItems} (${successRate}%)</li>
            <li><strong>Failed:</strong> ${failedItems}</li>
          </ul>
          ${resultsUrl ? `<p><a href="${resultsUrl}">Download Results CSV</a></p>` : ""}
          <p>Thank you for using our bulk verification service.</p>
        `,
        text: `Bulk Verification Job Completed\n\nJob ID: ${jobId}\nFile: ${fileName}\nTotal Items: ${totalItems}\nSuccessful: ${successfulItems} (${successRate}%)\nFailed: ${failedItems}\n\n${resultsUrl ? `Download results: ${resultsUrl}` : ""}`,
      });
    }

    // SMS notification
    if (phone) {
      await this.sendSMS({
        to: phone,
        message: `Bulk C of O verification completed. Job ID: ${jobId}. Success: ${successfulItems}/${totalItems} (${successRate}%). ${resultsUrl ? "Check email for results." : ""}`,
      });
    }
  }

  /**
   * Send bulk verification job failed notification
   */
  async notifyJobFailed(params: {
    jobId: string;
    fileName: string;
    errorMessage: string;
    email?: string;
    phone?: string;
  }): Promise<void> {
    const { jobId, fileName, errorMessage, email, phone } = params;

    // Email notification
    if (email) {
      await this.sendEmail({
        to: email,
        subject: "Bulk C of O Verification Job Failed",
        html: `
          <h2>Bulk Verification Job Failed</h2>
          <p>Unfortunately, your bulk verification job encountered an error and could not be completed.</p>
          <ul>
            <li><strong>Job ID:</strong> ${jobId}</li>
            <li><strong>File:</strong> ${fileName}</li>
            <li><strong>Error:</strong> ${errorMessage}</li>
          </ul>
          <p>Please contact support if you need assistance.</p>
        `,
        text: `Bulk Verification Job Failed\n\nJob ID: ${jobId}\nFile: ${fileName}\nError: ${errorMessage}\n\nPlease contact support if you need assistance.`,
      });
    }

    // SMS notification
    if (phone) {
      await this.sendSMS({
        to: phone,
        message: `Bulk C of O verification failed. Job ID: ${jobId}. Error: ${errorMessage}. Please contact support.`,
      });
    }
  }

  /**
   * Send single C of O verification result notification
   */
  async notifySingleVerification(params: {
    cofONumber: string;
    isVerified: boolean;
    verificationScore: number;
    state: string;
    email?: string;
    phone?: string;
  }): Promise<void> {
    const { cofONumber, isVerified, verificationScore, state, email, phone } = params;

    const status = isVerified ? "VERIFIED" : "NOT VERIFIED";
    const statusColor = isVerified ? "green" : "red";

    // Email notification
    if (email) {
      await this.sendEmail({
        to: email,
        subject: `C of O Verification Result: ${cofONumber}`,
        html: `
          <h2>C of O Verification Result</h2>
          <p>The verification for Certificate of Occupancy <strong>${cofONumber}</strong> has been completed.</p>
          <ul>
            <li><strong>C of O Number:</strong> ${cofONumber}</li>
            <li><strong>State:</strong> ${state}</li>
            <li><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></li>
            <li><strong>Verification Score:</strong> ${verificationScore}/100</li>
          </ul>
          <p>${isVerified ? "This certificate has been successfully verified against government records." : "This certificate could not be verified. Please review the details carefully."}</p>
        `,
        text: `C of O Verification Result\n\nC of O Number: ${cofONumber}\nState: ${state}\nStatus: ${status}\nVerification Score: ${verificationScore}/100\n\n${isVerified ? "This certificate has been successfully verified." : "This certificate could not be verified."}`,
      });
    }

    // SMS notification
    if (phone) {
      await this.sendSMS({
        to: phone,
        message: `C of O ${cofONumber} verification: ${status}. Score: ${verificationScore}/100. State: ${state}.`,
      });
    }
  }

  /**
   * Send scheduled verification reminder
   */
  async notifyScheduledVerification(params: {
    scheduleName: string;
    cofONumbers: string[];
    scheduledDate: Date;
    email?: string;
    phone?: string;
  }): Promise<void> {
    const { scheduleName, cofONumbers, scheduledDate, email, phone } = params;

    const dateStr = scheduledDate.toLocaleDateString();
    const timeStr = scheduledDate.toLocaleTimeString();

    // Email notification
    if (email) {
      await this.sendEmail({
        to: email,
        subject: `Scheduled C of O Verification Reminder: ${scheduleName}`,
        html: `
          <h2>Scheduled Verification Reminder</h2>
          <p>This is a reminder that a scheduled C of O verification is coming up.</p>
          <ul>
            <li><strong>Schedule Name:</strong> ${scheduleName}</li>
            <li><strong>Scheduled Date:</strong> ${dateStr} at ${timeStr}</li>
            <li><strong>Number of Certificates:</strong> ${cofONumbers.length}</li>
          </ul>
          <p><strong>Certificates to verify:</strong></p>
          <ul>
            ${cofONumbers.slice(0, 10).map((num) => `<li>${num}</li>`).join("")}
            ${cofONumbers.length > 10 ? `<li>...and ${cofONumbers.length - 10} more</li>` : ""}
          </ul>
        `,
        text: `Scheduled Verification Reminder\n\nSchedule: ${scheduleName}\nDate: ${dateStr} at ${timeStr}\nCertificates: ${cofONumbers.length}\n\n${cofONumbers.slice(0, 10).join(", ")}${cofONumbers.length > 10 ? ` ...and ${cofONumbers.length - 10} more` : ""}`,
      });
    }

    // SMS notification
    if (phone) {
      await this.sendSMS({
        to: phone,
        message: `Reminder: Scheduled C of O verification "${scheduleName}" on ${dateStr}. ${cofONumbers.length} certificates to verify.`,
      });
    }
  }

  /**
   * Send verification report generated notification
   */
  async notifyReportGenerated(params: {
    reportName: string;
    reportUrl: string;
    totalVerifications: number;
    dateRange: { start: Date; end: Date };
    email?: string;
    phone?: string;
  }): Promise<void> {
    const { reportName, reportUrl, totalVerifications, dateRange, email, phone } = params;

    const startDate = dateRange.start.toLocaleDateString();
    const endDate = dateRange.end.toLocaleDateString();

    // Email notification
    if (email) {
      await this.sendEmail({
        to: email,
        subject: `C of O Verification Report Ready: ${reportName}`,
        html: `
          <h2>Verification Report Generated</h2>
          <p>Your C of O verification report has been generated and is ready for download.</p>
          <ul>
            <li><strong>Report Name:</strong> ${reportName}</li>
            <li><strong>Date Range:</strong> ${startDate} - ${endDate}</li>
            <li><strong>Total Verifications:</strong> ${totalVerifications}</li>
          </ul>
          <p><a href="${reportUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Download Report</a></p>
        `,
        text: `Verification Report Generated\n\nReport: ${reportName}\nDate Range: ${startDate} - ${endDate}\nTotal Verifications: ${totalVerifications}\n\nDownload: ${reportUrl}`,
      });
    }

    // SMS notification
    if (phone) {
      await this.sendSMS({
        to: phone,
        message: `C of O verification report "${reportName}" is ready. ${totalVerifications} verifications. Check email for download link.`,
      });
    }
  }
}

export const notificationService = new NotificationService();
