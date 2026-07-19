import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';

const createCaller = appRouter.createCaller;

describe('Competitor Tracking System', () => {
  const caller = createCaller({
    user: {
      id: 1,
      openId: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    },
    req: {} as any,
    res: {} as any,
  });

  describe('Market Analysis', () => {
    it('should fetch market analysis for Lagos 2-bedroom properties', async () => {
      const result = await caller.competitorTracking.getMarketAnalysis({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
      });

      expect(result).toBeDefined();
      expect(result.averagePrice).toBeGreaterThan(0);
      expect(result.medianPrice).toBeGreaterThan(0);
      expect(result.totalListings).toBeGreaterThan(0);
      expect(result.demandScore).toBeGreaterThanOrEqual(0);
      expect(result.demandScore).toBeLessThanOrEqual(100);
      expect(result.competitorCount).toBeDefined();
      expect(result.competitorCount.airbnb).toBeGreaterThanOrEqual(0);
      expect(result.competitorCount.booking).toBeGreaterThanOrEqual(0);
    });

    it('should fetch market analysis for Abuja 3-bedroom properties', async () => {
      const result = await caller.competitorTracking.getMarketAnalysis({
        city: 'Abuja',
        bedrooms: 3,
        bathrooms: 2,
        guests: 6,
      });

      expect(result).toBeDefined();
      expect(result.averagePrice).toBeGreaterThan(0);
      expect(result.priceRange.min).toBeLessThan(result.priceRange.max);
    });
  });

  describe('Pricing Recommendations', () => {
    it('should provide pricing recommendation for standard property', async () => {
      const result = await caller.competitorTracking.getPricingRecommendation({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
        currentPrice: 30000,
        propertyQuality: 'standard',
      });

      expect(result).toBeDefined();
      expect(result.recommendedPrice).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.priceAdjustments).toBeDefined();
      expect(result.priceAdjustments.weekendMultiplier).toBeGreaterThan(1);
      expect(result.competitivePosition).toMatch(/below_market|at_market|above_market/);
    });

    it('should recommend price increase for underpriced property', async () => {
      const result = await caller.competitorTracking.getPricingRecommendation({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
        currentPrice: 15000, // Intentionally low
        propertyQuality: 'standard',
      });

      expect(result.recommendedPrice).toBeGreaterThan(15000);
      expect(result.competitivePosition).toBe('below_market');
    });

    it('should adjust recommendation for premium property', async () => {
      const standardResult = await caller.competitorTracking.getPricingRecommendation({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
        propertyQuality: 'standard',
      });

      const premiumResult = await caller.competitorTracking.getPricingRecommendation({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
        propertyQuality: 'premium',
      });

      expect(premiumResult.recommendedPrice).toBeGreaterThan(standardResult.recommendedPrice);
    });
  });

  describe('Competitor Listings', () => {
    it('should fetch competitor listings', async () => {
      const result = await caller.competitorTracking.getCompetitorListings({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
        limit: 10,
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);

      const firstListing = result[0];
      expect(firstListing.source).toMatch(/airbnb|booking/);
      expect(firstListing.id).toBeDefined();
      expect(firstListing.name).toBeDefined();
      expect(firstListing.price).toBeGreaterThan(0);
      expect(firstListing.bedrooms).toBeGreaterThanOrEqual(1);
      expect(firstListing.rating).toBeGreaterThanOrEqual(0);
      expect(firstListing.url).toBeDefined();
    });

    it('should limit results correctly', async () => {
      const result = await caller.competitorTracking.getCompetitorListings({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
        limit: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Service Status', () => {
    it('should return service status', async () => {
      const result = await caller.competitorTracking.getServiceStatus();

      expect(result).toBeDefined();
      expect(result.airbnb).toBeDefined();
      expect(result.airbnb.available).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.booking.available).toBe(true);
    });
  });

  describe('Scheduler Status', () => {
    it('should return scheduler status', async () => {
      const result = await caller.competitorTracking.getSchedulerStatus();

      expect(result).toBeDefined();
      expect(result.dailyRefresh).toBeDefined();
      expect(result.dailyRefresh.schedule).toBeDefined();
      expect(result.weeklyAnalysis).toBeDefined();
      expect(result.weeklyAnalysis.schedule).toBeDefined();
    });
  });

  describe('Integration Test', () => {
    it('should run complete integration test', async () => {
      const publicCaller = createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await publicCaller.competitorTracking.testIntegration({
        city: 'Lagos',
        bedrooms: 2,
      });

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(result.competitorSample).toBeInstanceOf(Array);
      expect(result.serviceStatus).toBeDefined();

      // Verify analysis
      expect(result.analysis.averagePrice).toBeGreaterThan(0);
      expect(result.analysis.totalListings).toBeGreaterThan(0);

      // Verify recommendation
      expect(result.recommendation.recommendedPrice).toBeGreaterThan(0);
      expect(result.recommendation.reasoning.length).toBeGreaterThan(0);

      // Verify competitor sample
      expect(result.competitorSample.length).toBeGreaterThan(0);
      expect(result.competitorSample.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Manual Refresh', () => {
    it('should trigger manual refresh without errors', async () => {
      const result = await caller.competitorTracking.triggerManualRefresh();

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      
      if (result.success) {
        expect(result.result).toBeDefined();
        expect(result.result?.processed).toBeGreaterThanOrEqual(0);
        expect(result.result?.updated).toBeGreaterThanOrEqual(0);
        expect(result.result?.errors).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Notifications', () => {
    it('should send price alerts without errors', async () => {
      const result = await caller.competitorTracking.sendPriceAlerts();

      expect(result).toBeDefined();
      expect(result.sent).toBeGreaterThanOrEqual(0);
      expect(result.alerts).toBeInstanceOf(Array);
    });

    it('should send optimization alerts without errors', async () => {
      const result = await caller.competitorTracking.sendOptimizationAlerts();

      expect(result).toBeDefined();
      expect(result.sent).toBeGreaterThanOrEqual(0);
      expect(result.opportunities).toBeInstanceOf(Array);
    });

    it('should send weekly summary without errors', async () => {
      const result = await caller.competitorTracking.sendWeeklySummary();

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate price ranges are reasonable', async () => {
      const result = await caller.competitorTracking.getMarketAnalysis({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
      });

      // Prices should be in reasonable range for Nigerian market
      expect(result.averagePrice).toBeGreaterThan(10000); // Min ₦10k
      expect(result.averagePrice).toBeLessThan(500000); // Max ₦500k
      expect(result.priceRange.min).toBeGreaterThan(0);
      expect(result.priceRange.max).toBeGreaterThan(result.priceRange.min);
    });

    it('should validate demand scores are in valid range', async () => {
      const result = await caller.competitorTracking.getMarketAnalysis({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
      });

      expect(result.demandScore).toBeGreaterThanOrEqual(0);
      expect(result.demandScore).toBeLessThanOrEqual(100);
    });

    it('should validate occupancy rates are in valid range', async () => {
      const result = await caller.competitorTracking.getMarketAnalysis({
        city: 'Lagos',
        bedrooms: 2,
        bathrooms: 1,
        guests: 4,
      });

      expect(result.occupancyRate).toBeGreaterThanOrEqual(0);
      expect(result.occupancyRate).toBeLessThanOrEqual(1);
    });
  });
});
