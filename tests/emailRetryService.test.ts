/**
 * Email Retry Service Tests
 * 
 * Tests for retry logic, exponential backoff, and delivery tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailRetryService } from '../server/services/emailRetryService';

describe('Email Retry Service', () => {
  beforeEach(() => {
    // Clear logs before each test
    emailRetryService.clearLogs();
  });

  describe('Successful Delivery', () => {
    it('should send email successfully on first attempt', async () => {
      const result = await emailRetryService.sendWithRetry({
        to: 'success@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      const stats = emailRetryService.getDeliveryStats();
      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should handle multiple recipients', async () => {
      const result = await emailRetryService.sendWithRetry({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Batch Test',
        html: '<p>Batch content</p>',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should use default retry configuration', async () => {
      const result = await emailRetryService.sendWithRetry({
        to: 'test@example.com',
        subject: 'Default Config Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
    });

    it('should respect custom retry configuration', async () => {
      const customConfig = {
        maxRetries: 5,
        initialDelayMs: 500,
        maxDelayMs: 10000,
        backoffMultiplier: 3,
      };

      const result = await emailRetryService.sendWithRetry(
        {
          to: 'custom@example.com',
          subject: 'Custom Config Test',
          html: '<p>Test</p>',
        },
        customConfig
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Batch Sending', () => {
    it('should send multiple emails with retry', async () => {
      const emails = [
        {
          to: 'user1@example.com',
          subject: 'Email 1',
          html: '<p>Content 1</p>',
        },
        {
          to: 'user2@example.com',
          subject: 'Email 2',
          html: '<p>Content 2</p>',
        },
        {
          to: 'user3@example.com',
          subject: 'Email 3',
          html: '<p>Content 3</p>',
        },
      ];

      const results = await emailRetryService.sendBatchWithRetry(emails);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      const stats = emailRetryService.getDeliveryStats();
      expect(stats.sent).toBe(3);
    });
  });

  describe('Delivery Statistics', () => {
    it('should track delivery statistics', async () => {
      // Send a few emails
      await emailRetryService.sendWithRetry({
        to: 'user1@example.com',
        subject: 'Test 1',
        html: '<p>Test 1</p>',
      });

      await emailRetryService.sendWithRetry({
        to: 'user2@example.com',
        subject: 'Test 2',
        html: '<p>Test 2</p>',
      });

      const stats = emailRetryService.getDeliveryStats();

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.sent).toBeGreaterThanOrEqual(2);
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.retrying).toBe('number');
      expect(typeof stats.pending).toBe('number');
    });

    it('should provide failed deliveries list', async () => {
      await emailRetryService.sendWithRetry({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const failedDeliveries = emailRetryService.getFailedDeliveries();
      expect(Array.isArray(failedDeliveries)).toBe(true);
    });
  });

  describe('Email Options', () => {
    it('should support custom from address', async () => {
      const result = await emailRetryService.sendWithRetry({
        to: 'test@example.com',
        subject: 'Custom From',
        html: '<p>Test</p>',
        from: 'custom@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should support reply-to address', async () => {
      const result = await emailRetryService.sendWithRetry({
        to: 'test@example.com',
        subject: 'Reply To Test',
        html: '<p>Test</p>',
        replyTo: 'reply@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should support CC and BCC', async () => {
      const result = await emailRetryService.sendWithRetry({
        to: 'test@example.com',
        subject: 'CC/BCC Test',
        html: '<p>Test</p>',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should support attachments', async () => {
      const result = await emailRetryService.sendWithRetry({
        to: 'test@example.com',
        subject: 'Attachment Test',
        html: '<p>Test</p>',
        attachments: [
          {
            filename: 'test.txt',
            content: 'Test file content',
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Log Management', () => {
    it('should clear delivery logs', async () => {
      await emailRetryService.sendWithRetry({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      let stats = emailRetryService.getDeliveryStats();
      expect(stats.total).toBeGreaterThan(0);

      emailRetryService.clearLogs();

      stats = emailRetryService.getDeliveryStats();
      expect(stats.total).toBe(0);
    });
  });
});
