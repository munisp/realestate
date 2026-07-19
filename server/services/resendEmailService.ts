/**
 * Resend Email Service
 * 
 * Production-ready email delivery service using Resend API.
 * Automatically falls back to mock service when RESEND_API_KEY is not configured.
 */

import { Resend } from 'resend';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class ResendEmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@realestate.com';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      console.log('[ResendEmailService] Initialized with API key');
    } else {
      console.warn('[ResendEmailService] RESEND_API_KEY not configured, using mock mode');
    }
  }

  /**
   * Send an email using Resend API
   */
  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      // Use mock service if not configured
      if (!this.isConfigured || !this.resend) {
        return this.sendMockEmail(options);
      }

      // Send email via Resend
      const response = await this.resend.emails.send({
        from: options.from || this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      });

      console.log('[ResendEmailService] Email sent successfully:', response.data?.id);

      return {
        success: true,
        messageId: response.data?.id || 'unknown',
      };
    } catch (error) {
      console.error('[ResendEmailService] Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send multiple emails in batch
   */
  async sendBatch(emails: EmailOptions[]): Promise<EmailResponse[]> {
    const results = await Promise.all(
      emails.map(email => this.sendEmail(email))
    );
    return results;
  }

  /**
   * Mock email service for development/testing
   */
  private async sendMockEmail(options: EmailOptions): Promise<EmailResponse> {
    const mockId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[ResendEmailService] MOCK EMAIL SENT:');
    console.log('  To:', options.to);
    console.log('  Subject:', options.subject);
    console.log('  From:', options.from || this.fromEmail);
    if (options.replyTo) console.log('  Reply-To:', options.replyTo);
    if (options.cc) console.log('  CC:', options.cc);
    if (options.bcc) console.log('  BCC:', options.bcc);
    console.log('  Message ID:', mockId);
    console.log('  HTML Preview (first 200 chars):', options.html.substring(0, 200));

    return {
      success: true,
      messageId: mockId,
    };
  }

  /**
   * Verify email configuration
   */
  async verifyConfiguration(): Promise<{ configured: boolean; domain?: string }> {
    if (!this.isConfigured || !this.resend) {
      return { configured: false };
    }

    try {
      // Extract domain from fromEmail
      const domain = this.fromEmail.split('@')[1];
      return { configured: true, domain };
    } catch (error) {
      console.error('[ResendEmailService] Configuration verification failed:', error);
      return { configured: false };
    }
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; fromEmail: string; mode: 'production' | 'mock' } {
    return {
      configured: this.isConfigured,
      fromEmail: this.fromEmail,
      mode: this.isConfigured ? 'production' : 'mock',
    };
  }
}

// Export singleton instance
export const resendEmailService = new ResendEmailService();

// Export types
export type { EmailOptions, EmailResponse };
