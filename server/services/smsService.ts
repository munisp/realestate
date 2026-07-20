import { ENV } from '../_core/env';
import { logger } from "../_core/logger";

interface SMSMessage {
  to: string;
  body: string;
}

interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS Service for sending text notifications
 * 
 * Configuration:
 * - TWILIO_ACCOUNT_SID: Twilio account SID
 * - TWILIO_AUTH_TOKEN: Twilio auth token
 * - TWILIO_PHONE_NUMBER: Twilio phone number (from)
 * 
 * If credentials are not configured, falls back to mock mode
 */
class SMSService {
  private twilioClient: any = null;
  private mockMode: boolean = false;
  private fromNumber: string;

  constructor() {
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
    this.mockMode = true; // default until async init completes
    // Initialize Twilio asynchronously
    this.initTwilio().catch(() => {});
  }

  private async initTwilio(): Promise<void> {
    // Check if Twilio credentials are configured
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      try {
        // Dynamically import Twilio only if credentials are present
        // @ts-ignore - twilio is an optional peer dependency
        const { default: twilio } = await import('twilio');
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.mockMode = false;
        logger.info('[SMS Service] Initialized with Twilio');
      } catch (error) {
        logger.warn('[SMS Service] Twilio package not installed, using mock mode');
        this.mockMode = true;
      }
    } else {
      logger.info('[SMS Service] No Twilio credentials found, using mock mode');
      this.mockMode = true;
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSDeliveryResult> {
    // Validate phone number format (basic check)
    if (!this.isValidPhoneNumber(message.to)) {
      return {
        success: false,
        error: 'Invalid phone number format. Must include country code (e.g., +1234567890)',
      };
    }

    if (this.mockMode) {
      return this.sendMockSMS(message);
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message.body,
        from: this.fromNumber,
        to: message.to,
      });

      logger.info(`[SMS Service] Sent SMS to ${message.to}, SID: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      logger.error('[SMS Service] Failed to send SMS:', { error: String(error) });
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send SMS in mock mode (for development/testing)
   */
  private async sendMockSMS(message: SMSMessage): Promise<SMSDeliveryResult> {
    const mockMessageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('[SMS Service] Mock SMS sent:');
    logger.info(`  To: ${message.to}`);
    logger.info(`  From: ${this.fromNumber}`);
    logger.info(`  Body: ${message.body}`);
    logger.info(`  Message ID: ${mockMessageId}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      messageId: mockMessageId,
    };
  }

  /**
   * Validate phone number format
   * Basic validation - should start with + and contain 10-15 digits
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If doesn't start with +, assume US number and add +1
    if (!cleaned.startsWith('+')) {
      cleaned = '+1' + cleaned;
    }

    return cleaned;
  }

  /**
   * Check if SMS service is in mock mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }
}

// Export singleton instance
export const smsService = new SMSService();

/**
 * Send alert notification via SMS
 */
export async function sendAlertSMS(
  phoneNumber: string,
  alertTitle: string,
  alertMessage: string
): Promise<SMSDeliveryResult> {
  const body = `🚨 ${alertTitle}\n\n${alertMessage}`;

  return smsService.sendSMS({
    to: smsService.formatPhoneNumber(phoneNumber),
    body: body.substring(0, 1600), // SMS limit
  });
}

/**
 * Send valuation change notification via SMS
 */
export async function sendValuationChangeSMS(
  phoneNumber: string,
  propertyAddress: string,
  oldValue: number,
  newValue: number,
  changePercent: number
): Promise<SMSDeliveryResult> {
  const direction = newValue > oldValue ? '📈' : '📉';
  const body = `${direction} Property Valuation Update\n\n${propertyAddress}\n\nOld: $${oldValue.toLocaleString()}\nNew: $${newValue.toLocaleString()}\nChange: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`;

  return smsService.sendSMS({
    to: smsService.formatPhoneNumber(phoneNumber),
    body,
  });
}

/**
 * Send appointment reminder via SMS
 */
export async function sendAppointmentReminderSMS(
  phoneNumber: string,
  propertyAddress: string,
  appointmentTime: Date
): Promise<SMSDeliveryResult> {
  const body = `📅 Appointment Reminder\n\nProperty: ${propertyAddress}\nTime: ${appointmentTime.toLocaleString()}\n\nSee you soon!`;

  return smsService.sendSMS({
    to: smsService.formatPhoneNumber(phoneNumber),
    body,
  });
}
