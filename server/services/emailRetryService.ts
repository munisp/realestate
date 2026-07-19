/**
 * Email Retry Service
 * 
 * Implements retry logic for failed email deliveries with exponential backoff,
 * delivery tracking, and failure logging.
 */

import { resendEmailService, EmailOptions, EmailResponse } from './resendEmailService';
import * as db from '../db';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface EmailDeliveryLog {
  id?: number;
  recipient: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttemptAt: Date;
  errorMessage?: string;
  messageId?: string;
  createdAt: Date;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

class EmailRetryService {
  private retryConfig: RetryConfig;
  private deliveryLogs: Map<string, EmailDeliveryLog> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Send email with automatic retry on failure
   */
  async sendWithRetry(
    options: EmailOptions,
    customConfig?: Partial<RetryConfig>
  ): Promise<EmailResponse> {
    const config = customConfig ? { ...this.retryConfig, ...customConfig } : this.retryConfig;
    const logId = this.generateLogId(options);

    // Initialize delivery log
    const deliveryLog: EmailDeliveryLog = {
      recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: new Date(),
      createdAt: new Date(),
    };

    this.deliveryLogs.set(logId, deliveryLog);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Update delivery log
        deliveryLog.attempts = attempt + 1;
        deliveryLog.lastAttemptAt = new Date();
        deliveryLog.status = attempt > 0 ? 'retrying' : 'pending';

        console.log(
          `[EmailRetryService] Attempt ${attempt + 1}/${config.maxRetries + 1} for email to ${deliveryLog.recipient}`
        );

        // Attempt to send email
        const result = await resendEmailService.sendEmail(options);

        if (result.success) {
          // Success - update log and return
          deliveryLog.status = 'sent';
          deliveryLog.messageId = result.messageId;
          
          console.log(
            `[EmailRetryService] Email sent successfully to ${deliveryLog.recipient} (messageId: ${result.messageId})`
          );

          // Persist to database (if available)
          await this.persistDeliveryLog(deliveryLog);

          return result;
        } else {
          // Failed but returned error
          lastError = new Error(result.error || 'Unknown error');
          deliveryLog.errorMessage = result.error;
        }
      } catch (error) {
        // Exception thrown
        lastError = error instanceof Error ? error : new Error(String(error));
        deliveryLog.errorMessage = lastError.message;
        
        console.error(
          `[EmailRetryService] Attempt ${attempt + 1} failed for ${deliveryLog.recipient}:`,
          lastError.message
        );
      }

      // If not the last attempt, wait before retrying
      if (attempt < config.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt, config);
        console.log(`[EmailRetryService] Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    // All retries exhausted - mark as failed
    deliveryLog.status = 'failed';
    
    console.error(
      `[EmailRetryService] All ${config.maxRetries + 1} attempts failed for ${deliveryLog.recipient}`
    );

    // Persist failure to database
    await this.persistDeliveryLog(deliveryLog);

    return {
      success: false,
      error: lastError?.message || 'All retry attempts failed',
    };
  }

  /**
   * Send batch emails with retry logic
   */
  async sendBatchWithRetry(
    emails: EmailOptions[],
    customConfig?: Partial<RetryConfig>
  ): Promise<EmailResponse[]> {
    const results = await Promise.all(
      emails.map(email => this.sendWithRetry(email, customConfig))
    );
    return results;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique log ID for email
   */
  private generateLogId(options: EmailOptions): string {
    const recipient = Array.isArray(options.to) ? options.to[0] : options.to;
    return `${recipient}-${options.subject}-${Date.now()}`;
  }

  /**
   * Persist delivery log to database
   */
  private async persistDeliveryLog(log: EmailDeliveryLog): Promise<void> {
    try {
      console.log('[EmailRetryService] Delivery log:', {
        recipient: log.recipient,
        subject: log.subject,
        status: log.status,
        attempts: log.attempts,
        messageId: log.messageId,
        errorMessage: log.errorMessage,
      });

      // Persist to database
      const database = await db.getDb();
      if (database) {
        const { emailDeliveryLogs } = await import('../../drizzle/schema');
        await database.insert(emailDeliveryLogs).values({
          recipient: log.recipient,
          subject: log.subject,
          status: log.status,
          attempts: log.attempts,
          lastAttemptAt: log.lastAttemptAt,
          errorMessage: log.errorMessage || null,
          messageId: log.messageId || null,
        });
      }
    } catch (error) {
      console.error('[EmailRetryService] Failed to persist delivery log:', error);
    }
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): {
    total: number;
    sent: number;
    failed: number;
    retrying: number;
    pending: number;
  } {
    const stats = {
      total: this.deliveryLogs.size,
      sent: 0,
      failed: 0,
      retrying: 0,
      pending: 0,
    };

    for (const log of this.deliveryLogs.values()) {
      stats[log.status]++;
    }

    return stats;
  }

  /**
   * Get failed deliveries for manual review
   */
  getFailedDeliveries(): EmailDeliveryLog[] {
    return Array.from(this.deliveryLogs.values()).filter(log => log.status === 'failed');
  }

  /**
   * Clear delivery logs (for testing/cleanup)
   */
  clearLogs(): void {
    this.deliveryLogs.clear();
  }
}

// Export singleton instance
export const emailRetryService = new EmailRetryService();

// Export types
export type { RetryConfig, EmailDeliveryLog };
