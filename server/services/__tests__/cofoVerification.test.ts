import { describe, it, expect, beforeEach } from 'vitest';
import { cofoVerificationService } from '../cofoVerification';
import { mockGovernmentRegistry } from '../mockGovernmentRegistry';
import { mockTwilioSMS } from '../mockTwilioSms';

describe('C of O Verification Service', () => {
  beforeEach(() => {
    // Clear history before each test
    cofoVerificationService.clearHistory();
    mockTwilioSMS.clearLog();
  });

  describe('verifyCertificate', () => {
    it('should verify a valid Lagos certificate', async () => {
      const result = await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2023/001234',
        ownerName: 'Adebayo Ogunlesi',
        propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos'
      });

      expect(result.status).toBe('verified');
      expect(result.registryVerification.verified).toBe(true);
      expect(result.registryVerification.registry).toBe('lagos');
      expect(result.registryVerification.details?.ownerName).toBe('Adebayo Ogunlesi');
      expect(result.summary).toContain('verified successfully');
    });

    it('should verify a valid FCT Abuja certificate', async () => {
      const result = await cofoVerificationService.verifyCertificate({
        certificateNumber: 'FCT/2023/009876',
        ownerName: 'Ibrahim Yusuf',
        propertyAddress: 'Plot 123, Maitama District, Abuja'
      });

      expect(result.status).toBe('verified');
      expect(result.registryVerification.verified).toBe(true);
      expect(result.registryVerification.registry).toBe('fct-abuja');
      expect(result.registryVerification.details?.ownerName).toBe('Ibrahim Yusuf');
    });

    it('should not verify an invalid certificate', async () => {
      const result = await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2023/999999',
        ownerName: 'Unknown Owner',
        propertyAddress: 'Unknown Address'
      });

      expect(result.status).toBe('not_verified');
      expect(result.registryVerification.verified).toBe(false);
      expect(result.summary).toContain('not found');
    });

    it('should handle invalid certificate format', async () => {
      const result = await cofoVerificationService.verifyCertificate({
        certificateNumber: 'INVALID/FORMAT',
        ownerName: 'Test Owner',
        propertyAddress: 'Test Address'
      });

      expect(result.status).toBe('error');
      expect(result.registryVerification.registry).toBe('unknown');
      expect(result.registryVerification.error).toContain('Invalid certificate number format');
    });

    it('should send SMS notification when phone number provided', async () => {
      const result = await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2023/001234',
        ownerName: 'Adebayo Ogunlesi',
        propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
        phoneNumber: '+2348012345678'
      });

      expect(result.smsNotification).toBeDefined();
      expect(result.smsNotification?.to).toBe('+2348012345678');
      // SMS may succeed or fail due to mock randomness, just check it was attempted
      expect(['sent', 'failed']).toContain(result.smsNotification?.status);
    });

    it('should detect expired certificates', async () => {
      const result = await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2000/001111',
        ownerName: 'Old Owner Name',
        propertyAddress: 'Old Property Address'
      });

      // Expired certificates are still found but marked as expired
      expect(result.registryVerification.details?.status).toBe('expired');
      expect(result.registryVerification.confidence).toBeLessThan(95);
    });
  });

  describe('batchVerify', () => {
    it('should verify multiple certificates in batch', async () => {
      const requests = [
        {
          certificateNumber: 'LAG/2023/001234',
          ownerName: 'Adebayo Ogunlesi',
          propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos'
        },
        {
          certificateNumber: 'FCT/2023/009876',
          ownerName: 'Ibrahim Yusuf',
          propertyAddress: 'Plot 123, Maitama District, Abuja'
        },
        {
          certificateNumber: 'LAG/2023/999999',
          ownerName: 'Unknown',
          propertyAddress: 'Unknown'
        }
      ];

      const results = await cofoVerificationService.batchVerify(requests);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('verified');
      expect(results[1].status).toBe('verified');
      expect(results[2].status).toBe('not_verified');
    });
  });

  describe('getVerificationHistory', () => {
    it('should store and retrieve verification history', async () => {
      await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2023/001234',
        ownerName: 'Adebayo Ogunlesi',
        propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos'
      });

      const history = cofoVerificationService.getVerificationHistory(10);

      expect(history).toHaveLength(1);
      expect(history[0].certificateNumber).toBe('LAG/2023/001234');
      expect(history[0].status).toBe('verified');
    });

    it('should limit history results', async () => {
      // Create multiple verifications
      for (let i = 0; i < 10; i++) {
        await cofoVerificationService.verifyCertificate({
          certificateNumber: `LAG/2023/00${i}`,
          ownerName: `Owner ${i}`,
          propertyAddress: `Address ${i}`
        });
      }

      const history = cofoVerificationService.getVerificationHistory(5);

      expect(history).toHaveLength(5);
    });
  });

  describe('searchHistory', () => {
    it('should search history by certificate number', async () => {
      await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2023/001234',
        ownerName: 'Adebayo Ogunlesi',
        propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos'
      });

      await cofoVerificationService.verifyCertificate({
        certificateNumber: 'FCT/2023/009876',
        ownerName: 'Ibrahim Yusuf',
        propertyAddress: 'Plot 123, Maitama District, Abuja'
      });

      const results = cofoVerificationService.searchHistory('LAG/2023');

      expect(results).toHaveLength(1);
      expect(results[0].certificateNumber).toBe('LAG/2023/001234');
    });
  });

  describe('getVerificationStats', () => {
    it('should calculate verification statistics', async () => {
      // Verify some certificates
      await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2023/001234',
        ownerName: 'Adebayo Ogunlesi',
        propertyAddress: '15 Admiralty Way, Lekki Phase 1, Lagos'
      });

      await cofoVerificationService.verifyCertificate({
        certificateNumber: 'LAG/2023/999999',
        ownerName: 'Unknown',
        propertyAddress: 'Unknown'
      });

      const stats = cofoVerificationService.getVerificationStats();

      expect(stats.total).toBe(2);
      expect(stats.verified).toBe(1);
      expect(stats.notVerified).toBe(1);
      expect(stats.successRate).toBe(50);
    });
  });
});

describe('Mock Government Registry Service', () => {
  describe('verifyCertificate', () => {
    it('should verify Lagos certificates', async () => {
      const result = await mockGovernmentRegistry.verifyCertificate('LAG/2023/001234');

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.registry).toBe('lagos');
      expect(result.details?.ownerName).toBe('Adebayo Ogunlesi');
    });

    it('should verify FCT Abuja certificates', async () => {
      const result = await mockGovernmentRegistry.verifyCertificate('FCT/2023/009876');

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.registry).toBe('fct-abuja');
      expect(result.details?.ownerName).toBe('Ibrahim Yusuf');
    });

    it('should detect unknown registry format', async () => {
      const result = await mockGovernmentRegistry.verifyCertificate('INVALID/2023/001234');

      expect(result.success).toBe(false);
      expect(result.registry).toBe('unknown');
      expect(result.error).toContain('Invalid certificate number format');
    });
  });

  describe('searchByOwner', () => {
    it('should search certificates by owner name', async () => {
      const result = await mockGovernmentRegistry.searchByOwner('Adebayo');

      expect(result.found).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].ownerName).toContain('Adebayo');
    });

    it('should filter by registry', async () => {
      const result = await mockGovernmentRegistry.searchByOwner('Ibrahim', 'fct-abuja');

      expect(result.found).toBe(true);
      expect(result.matches.every(m => m.certificateNumber.startsWith('FCT/'))).toBe(true);
    });
  });

  describe('searchByAddress', () => {
    it('should search certificates by property address', async () => {
      const result = await mockGovernmentRegistry.searchByAddress('Lekki');

      expect(result.found).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].propertyAddress).toContain('Lekki');
    });
  });

  describe('batchVerify', () => {
    it('should verify multiple certificates', async () => {
      const certificates = [
        'LAG/2023/001234',
        'FCT/2023/009876',
        'LAG/2023/999999'
      ];

      const results = await mockGovernmentRegistry.batchVerify(certificates);

      expect(results).toHaveLength(3);
      expect(results[0].verified).toBe(true);
      expect(results[1].verified).toBe(true);
      expect(results[2].verified).toBe(false);
    });
  });
});

describe('Mock Twilio SMS Service', () => {
  beforeEach(() => {
    mockTwilioSMS.clearLog();
  });

  describe('sendSMS', () => {
    it('should send SMS to valid Nigerian number', async () => {
      const result = await mockTwilioSMS.sendSMS(
        '+2348012345678',
        'Test message'
      );

      expect(result.to).toBe('+2348012345678');
      expect(['sent', 'failed']).toContain(result.status);
      expect(result.messageId).toBeTruthy();
    });

    it('should validate Nigerian phone number format', async () => {
      const result = await mockTwilioSMS.sendSMS(
        'invalid-number',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Nigerian phone number format');
    });

    it('should normalize phone number formats', async () => {
      // Test international format
      const result1 = await mockTwilioSMS.sendSMS('+2348012345678', 'Test');
      expect(result1.to).toBe('+2348012345678');

      // Test local format
      const result2 = await mockTwilioSMS.sendSMS('08012345678', 'Test');
      expect(result2.to).toBe('+2348012345678');

      // Test short format
      const result3 = await mockTwilioSMS.sendSMS('8012345678', 'Test');
      expect(result3.to).toBe('+2348012345678');
    });
  });

  describe('sendSMSWithRetry', () => {
    it('should retry failed SMS deliveries', async () => {
      const result = await mockTwilioSMS.sendSMSWithRetry(
        '+2348012345678',
        'Test message',
        { maxRetries: 3 }
      );

      // Should eventually succeed or fail after retries
      expect(result.messageId).toBeDefined();
      expect(['sent', 'failed']).toContain(result.status);
    });
  });

  describe('getDeliveryStats', () => {
    it('should track delivery statistics', async () => {
      // Send multiple SMS
      await mockTwilioSMS.sendSMS('+2348012345678', 'Test 1');
      await mockTwilioSMS.sendSMS('+2348012345679', 'Test 2');
      await mockTwilioSMS.sendSMS('+2348012345680', 'Test 3');

      const stats = mockTwilioSMS.getDeliveryStats();

      expect(stats.total).toBe(3);
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });
});
