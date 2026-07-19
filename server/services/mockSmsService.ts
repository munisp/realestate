/**
 * Mock SMS Service for C of O Verification
 * 
 * This service simulates SMS sending for testing purposes without requiring
 * real Twilio credentials. In production, replace with actual Twilio integration.
 */

interface SmsMessage {
  to: string;
  message: string;
  timestamp: Date;
  status: 'sent' | 'failed';
}

// In-memory storage for sent messages (for testing/debugging)
const sentMessages: SmsMessage[] = [];

export interface SendSmsOptions {
  to: string;
  message: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Mock SMS sending function
 * Simulates sending an SMS message and logs it for testing
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  const { to, message } = options;

  // Validate phone number format (basic validation)
  if (!to || !to.match(/^\+?[1-9]\d{1,14}$/)) {
    return {
      success: false,
      error: 'Invalid phone number format. Use E.164 format (e.g., +2348012345678)',
      timestamp: new Date(),
    };
  }

  // Validate message content
  if (!message || message.trim().length === 0) {
    return {
      success: false,
      error: 'Message content cannot be empty',
      timestamp: new Date(),
    };
  }

  // Simulate SMS sending delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate mock message ID
  const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Store message in memory
  const smsMessage: SmsMessage = {
    to,
    message,
    timestamp: new Date(),
    status: 'sent',
  };
  sentMessages.push(smsMessage);

  // Log for debugging
  console.log('[Mock SMS Service] Message sent:', {
    messageId,
    to,
    message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
    timestamp: smsMessage.timestamp.toISOString(),
  });

  return {
    success: true,
    messageId,
    timestamp: smsMessage.timestamp,
  };
}

/**
 * Get all sent messages (for testing/debugging)
 */
export function getSentMessages(): SmsMessage[] {
  return [...sentMessages];
}

/**
 * Clear sent messages history (for testing)
 */
export function clearSentMessages(): void {
  sentMessages.length = 0;
  console.log('[Mock SMS Service] Message history cleared');
}

/**
 * Get messages sent to a specific phone number
 */
export function getMessagesByPhone(phoneNumber: string): SmsMessage[] {
  return sentMessages.filter(msg => msg.to === phoneNumber);
}

/**
 * Send C of O verification completion notification
 */
export async function sendVerificationCompleteSms(
  phoneNumber: string,
  ownerName: string,
  certificateNumber: string,
  verificationStatus: 'verified' | 'failed' | 'pending'
): Promise<SendSmsResult> {
  let message: string;

  switch (verificationStatus) {
    case 'verified':
      message = `Hello ${ownerName}, your Certificate of Occupancy (${certificateNumber}) has been successfully verified. You can now view the verification details on our platform.`;
      break;
    case 'failed':
      message = `Hello ${ownerName}, verification of your Certificate of Occupancy (${certificateNumber}) could not be completed. Please contact support for assistance.`;
      break;
    case 'pending':
      message = `Hello ${ownerName}, your Certificate of Occupancy (${certificateNumber}) verification is in progress. You will receive another notification once completed.`;
      break;
    default:
      message = `Hello ${ownerName}, there is an update regarding your Certificate of Occupancy (${certificateNumber}).`;
  }

  return sendSms({ to: phoneNumber, message });
}

/**
 * Send bulk verification status update
 */
export async function sendBulkVerificationSms(
  phoneNumber: string,
  ownerName: string,
  totalVerified: number,
  totalFailed: number
): Promise<SendSmsResult> {
  const message = `Hello ${ownerName}, your bulk C of O verification is complete. Verified: ${totalVerified}, Failed: ${totalFailed}. Check the platform for details.`;
  
  return sendSms({ to: phoneNumber, message });
}

/**
 * Send verification reminder
 */
export async function sendVerificationReminderSms(
  phoneNumber: string,
  ownerName: string,
  certificateNumber: string
): Promise<SendSmsResult> {
  const message = `Reminder: ${ownerName}, your Certificate of Occupancy (${certificateNumber}) verification is pending. Please submit required documents to complete the process.`;
  
  return sendSms({ to: phoneNumber, message });
}
