import { logger } from "../_core/logger";
/**
 * Mock Twilio SMS Service
 * Simulates SMS delivery for testing without requiring actual Twilio credentials
 */

export interface SMSDeliveryResult {
  success: boolean;
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  to: string;
  from: string;
  body: string;
  timestamp: Date;
  error?: string;
}

export interface SMSDeliveryStatus {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  to: string;
  errorCode?: string;
  errorMessage?: string;
  updatedAt: Date;
}

class MockTwilioSMSService {
  private deliveryLog: Map<string, SMSDeliveryStatus> = new Map();
  private fromNumber = '+2348012345678'; // Mock Nigerian number

  /**
   * Validate Nigerian phone number format
   */
  private validateNigerianPhone(phone: string): { valid: boolean; formatted: string; error?: string } {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Nigerian numbers: +234 followed by 10 digits (starting with 7, 8, or 9)
    if (cleaned.startsWith('234') && cleaned.length === 13) {
      const localPart = cleaned.substring(3);
      if (/^[789]\d{9}$/.test(localPart)) {
        return { valid: true, formatted: `+${cleaned}` };
      }
    }
    
    // Also accept local format: 0 followed by 10 digits
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      const localPart = cleaned.substring(1);
      if (/^[789]\d{9}$/.test(localPart)) {
        return { valid: true, formatted: `+234${localPart}` };
      }
    }
    
    // Accept 10 digits starting with 7, 8, or 9
    if (cleaned.length === 10 && /^[789]\d{9}$/.test(cleaned)) {
      return { valid: true, formatted: `+234${cleaned}` };
    }
    
    return {
      valid: false,
      formatted: phone,
      error: 'Invalid Nigerian phone number format. Expected: +234XXXXXXXXXX or 0XXXXXXXXXX'
    };
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, body: string, options?: { from?: string }): Promise<SMSDeliveryResult> {
    console.log('[MockTwilio] Sending SMS:', { to, body: body.substring(0, 50) + '...' });

    // Validate phone number
    const validation = this.validateNigerianPhone(to);
    if (!validation.valid) {
      return {
        success: false,
        messageId: '',
        status: 'failed',
        to,
        from: options?.from || this.fromNumber,
        body,
        timestamp: new Date(),
        error: validation.error
      };
    }

    // Generate mock message ID
    const messageId = `SM${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    const status = success ? 'sent' : 'failed';
    
    const result: SMSDeliveryResult = {
      success,
      messageId,
      status,
      to: validation.formatted,
      from: options?.from || this.fromNumber,
      body,
      timestamp: new Date(),
      error: success ? undefined : 'Network error (simulated)'
    };

    // Store delivery status
    this.deliveryLog.set(messageId, {
      messageId,
      status: success ? 'delivered' : 'failed',
      to: validation.formatted,
      errorCode: success ? undefined : '30001',
      errorMessage: success ? undefined : 'Network error (simulated)',
      updatedAt: new Date()
    });

    console.log('[MockTwilio] SMS result:', { messageId, status, to: validation.formatted });
    
    return result;
  }

  /**
   * Send SMS with retry logic
   */
  async sendSMSWithRetry(
    to: string,
    body: string,
    options?: { from?: string; maxRetries?: number; retryDelay?: number }
  ): Promise<SMSDeliveryResult> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;
    
    let lastError: string | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`[MockTwilio] Attempt ${attempt}/${maxRetries} to send SMS to ${to}`);
      
      const result = await this.sendSMS(to, body, options);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
    
    return {
      success: false,
      messageId: '',
      status: 'failed',
      to,
      from: options?.from || this.fromNumber,
      body,
      timestamp: new Date(),
      error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`
    };
  }

  /**
   * Get delivery status for a message
   */
  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus | null> {
    const status = this.deliveryLog.get(messageId);
    
    if (!status) {
      return null;
    }
    
    // Simulate status updates over time
    if (status.status === 'sent') {
      const elapsed = Date.now() - status.updatedAt.getTime();
      if (elapsed > 5000) {
        status.status = 'delivered';
        status.updatedAt = new Date();
      }
    }
    
    return status;
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(
    recipients: Array<{ to: string; body: string }>,
    options?: { from?: string; batchSize?: number }
  ): Promise<SMSDeliveryResult[]> {
    const batchSize = options?.batchSize || 10;
    const results: SMSDeliveryResult[] = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(recipient => this.sendSMS(recipient.to, recipient.body, options))
      );
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
  } {
    const statuses = Array.from(this.deliveryLog.values());
    const total = statuses.length;
    const delivered = statuses.filter(s => s.status === 'delivered').length;
    const failed = statuses.filter(s => s.status === 'failed' || s.status === 'undelivered').length;
    const pending = statuses.filter(s => s.status === 'queued' || s.status === 'sent').length;
    
    return {
      total,
      delivered,
      failed,
      pending,
      successRate: total > 0 ? (delivered / total) * 100 : 0
    };
  }

  /**
   * Clear delivery log (for testing)
   */
  clearLog(): void {
    this.deliveryLog.clear();
  }
}

// Export singleton instance
export const mockTwilioSMS = new MockTwilioSMSService();
