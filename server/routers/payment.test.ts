import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import type { Context } from '../_core/context';

describe('Payment Router', () => {
  // Mock context for authenticated user
  const mockContext: Context = {
    user: {
      id: 1,
      openId: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: 'email',
    },
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockContext);

  describe('calculatePrice', () => {
    it('should calculate booking price correctly', async () => {
      const result = await caller.payment.calculatePrice({
        nightlyRate: 10000,
        nights: 3,
        cleaningFee: 2000,
      });

      expect(result).toBeDefined();
      expect(result.nightlyTotal).toBe(30000); // 10000 * 3
      expect(result.cleaningFee).toBe(2000);
      expect(result.serviceFee).toBe(3000); // 10% of 30000
      expect(result.totalAmount).toBe(35000); // 30000 + 2000 + 3000
      expect(result.breakdown.serviceFeePercentage).toBe(10);
    });

    it('should calculate price without cleaning fee', async () => {
      const result = await caller.payment.calculatePrice({
        nightlyRate: 5000,
        nights: 2,
      });

      expect(result.nightlyTotal).toBe(10000);
      expect(result.cleaningFee).toBe(0);
      expect(result.serviceFee).toBe(1000);
      expect(result.totalAmount).toBe(11000);
    });

    it('should handle single night booking', async () => {
      const result = await caller.payment.calculatePrice({
        nightlyRate: 15000,
        nights: 1,
        cleaningFee: 3000,
      });

      expect(result.nightlyTotal).toBe(15000);
      expect(result.serviceFee).toBe(1500);
      expect(result.totalAmount).toBe(19500);
    });
  });

  describe('Payment Integration', () => {
    it('should have Stripe environment variables configured', () => {
      // Check if Stripe keys are available
      const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
      const hasPublishableKey = !!process.env.VITE_STRIPE_PUBLISHABLE_KEY;

      expect(hasStripeKey || hasPublishableKey).toBe(true);
      
      if (!hasStripeKey) {
        console.warn('⚠️  STRIPE_SECRET_KEY not configured - payment processing will fail in production');
      }
      if (!hasPublishableKey) {
        console.warn('⚠️  VITE_STRIPE_PUBLISHABLE_KEY not configured - frontend payment UI will fail');
      }
    });

    it('should validate payment router is accessible', async () => {
      // Test that we can call payment endpoints through the router
      try {
        const result = await caller.payment.calculatePrice({
          nightlyRate: 1000,
          nights: 1,
        });
        expect(result).toBeDefined();
        console.log('✅ Payment router is accessible and functional');
      } catch (error) {
        throw new Error('Payment router not properly registered');
      }
    });
  });

  describe('Payment Service', () => {
    it('should have payment service functions available', async () => {
      // Import payment service to verify it's properly configured
      const { calculateServiceFee, calculateTotalAmount } = await import('../services/stripePaymentService');

      expect(calculateServiceFee).toBeDefined();
      expect(calculateTotalAmount).toBeDefined();

      // Test service fee calculation
      const serviceFee = calculateServiceFee(10000, 0.1);
      expect(serviceFee).toBe(1000);

      // Test total amount calculation
      const total = calculateTotalAmount(5000, 3, 2000);
      expect(total.nightlyTotal).toBe(15000);
      expect(total.serviceFee).toBe(1500);
      expect(total.totalAmount).toBe(18500);
    });
  });
});
