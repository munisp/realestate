/**
 * Email Service Tests
 * 
 * Tests for Resend email integration and email configuration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resendEmailService } from '../server/services/resendEmailService';

describe('Email Service', () => {
  describe('Service Status', () => {
    it('should return service status', () => {
      const status = resendEmailService.getStatus();
      
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('fromEmail');
      expect(status).toHaveProperty('mode');
      expect(['production', 'mock']).toContain(status.mode);
    });

    it('should verify configuration', async () => {
      const verification = await resendEmailService.verifyConfiguration();
      
      expect(verification).toHaveProperty('configured');
      expect(typeof verification.configured).toBe('boolean');
    });
  });

  describe('Email Sending', () => {
    it('should send test email successfully', async () => {
      const result = await resendEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1><p>This is a test email.</p>',
      });

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('messageId');
    });

    it('should handle multiple recipients', async () => {
      const result = await resendEmailService.sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Email',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
    });

    it('should send batch emails', async () => {
      const emails = [
        {
          to: 'test1@example.com',
          subject: 'Test 1',
          html: '<p>Test 1</p>',
        },
        {
          to: 'test2@example.com',
          subject: 'Test 2',
          html: '<p>Test 2</p>',
        },
      ];

      const results = await resendEmailService.sendBatch(emails);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Email Options', () => {
    it('should support custom from address', async () => {
      const result = await resendEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        from: 'custom@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should support reply-to address', async () => {
      const result = await resendEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        replyTo: 'reply@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should support CC and BCC', async () => {
      const result = await resendEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      });

      expect(result.success).toBe(true);
    });
  });
});
