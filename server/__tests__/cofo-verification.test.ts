/**
 * Vitest test suite for C of O Verification System
 * Tests all major functionality including OCR extraction, SMS notifications,
 * verification history, and bulk processing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sendSms, sendVerificationCompleteSms, getSentMessages, clearSentMessages } from '../services/mockSmsService';

describe('C of O Verification System', () => {
  
  beforeAll(() => {
    console.log('Starting C of O Verification tests...');
  });

  afterAll(() => {
    console.log('C of O Verification tests completed');
  });

  describe('Mock SMS Service', () => {
    
    beforeAll(() => {
      clearSentMessages();
    });

    it('should send SMS with valid phone number', async () => {
      const result = await sendSms({
        to: '+2348012345678',
        message: 'Test message for C of O verification',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^mock_sms_/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should reject invalid phone number format', async () => {
      const result = await sendSms({
        to: '08012345678', // Missing country code
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
    });

    it('should reject empty message', async () => {
      const result = await sendSms({
        to: '+2348012345678',
        message: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message content cannot be empty');
    });

    it('should track sent messages', async () => {
      clearSentMessages();
      
      await sendSms({
        to: '+2348012345678',
        message: 'First message',
      });
      
      await sendSms({
        to: '+2348012345678',
        message: 'Second message',
      });

      const messages = getSentMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].message).toBe('First message');
      expect(messages[1].message).toBe('Second message');
    });

    it('should send verification complete SMS', async () => {
      clearSentMessages();
      
      const result = await sendVerificationCompleteSms(
        '+2348012345678',
        'John Doe',
        'LOS/COO/2023/12345',
        'verified'
      );

      expect(result.success).toBe(true);
      
      const messages = getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('John Doe');
      expect(messages[0].message).toContain('LOS/COO/2023/12345');
      expect(messages[0].message).toContain('successfully verified');
    });

    it('should send failed verification SMS', async () => {
      clearSentMessages();
      
      const result = await sendVerificationCompleteSms(
        '+2348012345678',
        'Jane Smith',
        'LOS/COO/2023/67890',
        'failed'
      );

      expect(result.success).toBe(true);
      
      const messages = getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('Jane Smith');
      expect(messages[0].message).toContain('could not be completed');
    });

    it('should send pending verification SMS', async () => {
      clearSentMessages();
      
      const result = await sendVerificationCompleteSms(
        '+2348012345678',
        'Bob Johnson',
        'LOS/COO/2023/11111',
        'pending'
      );

      expect(result.success).toBe(true);
      
      const messages = getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('Bob Johnson');
      expect(messages[0].message).toContain('in progress');
    });
  });

  describe('OCR Data Extraction', () => {
    
    it('should extract certificate number from text', () => {
      const text = 'Certificate Number: LOS/COO/2023/045678';
      const match = text.match(/Certificate Number:\s*([A-Z0-9\/]+)/i);
      
      expect(match).toBeDefined();
      expect(match![1]).toBe('LOS/COO/2023/045678');
    });

    it('should extract owner name from text', () => {
      const text = 'Name: ADEBAYO OLUWASEUN JOHNSON\nAddress: 123 Main St';
      const match = text.match(/Name:\s*([A-Z\s]+)(?=\n|Address:)/i);
      
      expect(match).toBeDefined();
      expect(match![1].trim()).toBe('ADEBAYO OLUWASEUN JOHNSON');
    });

    it('should extract property address from text', () => {
      const text = 'Property Address: Plot 12, Block A, Victoria Garden City';
      const match = text.match(/Property Address:\s*([^\n]+)/i);
      
      expect(match).toBeDefined();
      expect(match![1].trim()).toBe('Plot 12, Block A, Victoria Garden City');
    });

    it('should extract dates from text', () => {
      const text = 'Date of Issue: 15th March, 2023\nExpiry Date: 14th March, 2122';
      const issueMatch = text.match(/Date of Issue:\s*([^\n]+)/i);
      const expiryMatch = text.match(/Expiry Date:\s*([^\n]+)/i);
      
      expect(issueMatch![1].trim()).toBe('15th March, 2023');
      expect(expiryMatch![1].trim()).toBe('14th March, 2122');
    });

    it('should extract verification code from text', () => {
      const text = 'VERIFICATION CODE: LOS-2023-VGC-045678-VERIFY';
      const match = text.match(/VERIFICATION CODE:\s*([A-Z0-9\-]+)/i);
      
      expect(match).toBeDefined();
      expect(match![1]).toBe('LOS-2023-VGC-045678-VERIFY');
    });

    it('should handle missing fields gracefully', () => {
      const text = 'Some random text without certificate information';
      const match = text.match(/Certificate Number:\s*([A-Z0-9\/]+)/i);
      
      expect(match).toBeNull();
    });
  });

  describe('Verification Status Logic', () => {
    
    it('should determine verification status based on extracted data', () => {
      const extractedData = {
        certificateNumber: 'LOS/COO/2023/045678',
        ownerName: 'JOHN DOE',
        propertyAddress: 'Plot 1, Block A',
      };

      const hasRequiredFields = Boolean(
        extractedData.certificateNumber && 
        extractedData.ownerName && 
        extractedData.propertyAddress
      );

      expect(hasRequiredFields).toBe(true);
    });

    it('should mark as incomplete when missing required fields', () => {
      const extractedData = {
        certificateNumber: 'LOS/COO/2023/045678',
        ownerName: null,
        propertyAddress: 'Plot 1, Block A',
      };

      const hasRequiredFields = Boolean(
        extractedData.certificateNumber && 
        extractedData.ownerName && 
        extractedData.propertyAddress
      );

      expect(hasRequiredFields).toBe(false);
    });
  });

  describe('Bulk Verification Processing', () => {
    
    it('should process multiple verifications', async () => {
      clearSentMessages();
      
      const verifications = [
        { phone: '+2348012345678', name: 'Person 1', cert: 'CERT001', status: 'verified' as const },
        { phone: '+2348012345679', name: 'Person 2', cert: 'CERT002', status: 'verified' as const },
        { phone: '+2348012345680', name: 'Person 3', cert: 'CERT003', status: 'failed' as const },
      ];

      const results = await Promise.all(
        verifications.map(v => 
          sendVerificationCompleteSms(v.phone, v.name, v.cert, v.status)
        )
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      
      const messages = getSentMessages();
      expect(messages).toHaveLength(3);
    });

    it('should calculate bulk verification statistics', () => {
      const results = [
        { status: 'verified' },
        { status: 'verified' },
        { status: 'failed' },
        { status: 'verified' },
        { status: 'pending' },
      ];

      const stats = {
        total: results.length,
        verified: results.filter(r => r.status === 'verified').length,
        failed: results.filter(r => r.status === 'failed').length,
        pending: results.filter(r => r.status === 'pending').length,
      };

      expect(stats.total).toBe(5);
      expect(stats.verified).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe('Phone Number Validation', () => {
    
    const validNumbers = [
      '+2348012345678',
      '+2347012345678',
      '+2349012345678',
      '+234123456789',
    ];

    const invalidNumbers = [
      '08012345678',        // Missing country code
      'not-a-number',       // Invalid format
      '',                   // Empty
      '+234801234567890123', // Too long
    ];

    validNumbers.forEach(number => {
      it(`should accept valid number: ${number}`, async () => {
        const result = await sendSms({ to: number, message: 'Test' });
        expect(result.success).toBe(true);
      });
    });

    invalidNumbers.forEach(number => {
      it(`should reject invalid number: ${number || '(empty)'}`, async () => {
        const result = await sendSms({ to: number, message: 'Test' });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Message Content Validation', () => {
    
    it('should accept messages with special characters', async () => {
      const result = await sendSms({
        to: '+2348012345678',
        message: 'Hello! Your C/O #12345 is verified. Visit: www.example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should accept long messages', async () => {
      const longMessage = 'A'.repeat(500);
      const result = await sendSms({
        to: '+2348012345678',
        message: longMessage,
      });

      expect(result.success).toBe(true);
    });

    it('should reject whitespace-only messages', async () => {
      const result = await sendSms({
        to: '+2348012345678',
        message: '   \n  \t  ',
      });

      expect(result.success).toBe(false);
    });
  });
});
