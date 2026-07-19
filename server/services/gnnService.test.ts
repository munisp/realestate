import { describe, it, expect } from 'vitest';
import {
  getMarketTrends,
  getNeighborhoodIntel,
  getTransitAccessibility,
  getInvestmentScore,
} from './gnnService';

describe('GNN Service', () => {
  describe('getMarketTrends', () => {
    it('should return market trend data for a neighborhood', async () => {
      const result = await getMarketTrends('Lekki Phase 1', 'Lagos');
      
      expect(result).toBeDefined();
      expect(result.neighborhood).toBe('Lekki Phase 1');
      expect(result.currentPrice).toBeGreaterThan(0);
      expect(result.predictedPrice3Months).toBeGreaterThan(0);
      expect(result.predictedPrice6Months).toBeGreaterThan(0);
      expect(result.predictedPrice12Months).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['up', 'down', 'stable']).toContain(result.trendDirection);
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should return different data for different neighborhoods', async () => {
      const lekki = await getMarketTrends('Lekki Phase 1', 'Lagos');
      const vi = await getMarketTrends('Victoria Island', 'Lagos');
      
      // Prices should be different (with high probability due to randomization)
      expect(lekki.currentPrice).not.toBe(vi.currentPrice);
    });
  });

  describe('getNeighborhoodIntel', () => {
    it('should return neighborhood intelligence data', async () => {
      const result = await getNeighborhoodIntel('Lekki Phase 1', 'Lagos');
      
      expect(result).toBeDefined();
      expect(result.neighborhood).toBe('Lekki Phase 1');
      expect(result.walkabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.walkabilityScore).toBeLessThanOrEqual(100);
      expect(result.transitScore).toBeGreaterThanOrEqual(0);
      expect(result.transitScore).toBeLessThanOrEqual(100);
      expect(result.amenitiesScore).toBeGreaterThanOrEqual(0);
      expect(result.amenitiesScore).toBeLessThanOrEqual(100);
      expect(result.safetyScore).toBeGreaterThanOrEqual(0);
      expect(result.safetyScore).toBeLessThanOrEqual(100);
      expect(result.schoolRating).toBeGreaterThanOrEqual(0);
      expect(result.schoolRating).toBeLessThanOrEqual(10);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.nearbyAmenities)).toBe(true);
      expect(result.nearbyAmenities.length).toBeGreaterThan(0);
      expect(result.demographics).toBeDefined();
      expect(result.demographics.medianIncome).toBeGreaterThan(0);
    });

    it('should include amenity details', async () => {
      const result = await getNeighborhoodIntel('Lekki Phase 1', 'Lagos');
      
      const amenity = result.nearbyAmenities[0];
      expect(amenity.type).toBeDefined();
      expect(amenity.count).toBeGreaterThan(0);
      expect(amenity.averageDistance).toBeGreaterThan(0);
    });
  });

  describe('getTransitAccessibility', () => {
    it('should return transit accessibility data for a property', async () => {
      const result = await getTransitAccessibility(1);
      
      expect(result).toBeDefined();
      expect(result.propertyId).toBe(1);
      expect(result.transitScore).toBeGreaterThanOrEqual(0);
      expect(result.transitScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.nearestStations)).toBe(true);
      expect(result.nearestStations.length).toBeGreaterThan(0);
      expect(Array.isArray(result.commuteEstimates)).toBe(true);
      expect(result.commuteEstimates.length).toBeGreaterThan(0);
      expect(result.peakHourFrequency).toBeGreaterThan(0);
      expect(result.offPeakFrequency).toBeGreaterThan(0);
    });

    it('should include station details', async () => {
      const result = await getTransitAccessibility(1);
      
      const station = result.nearestStations[0];
      expect(station.name).toBeDefined();
      expect(station.type).toBeDefined();
      expect(station.distance).toBeGreaterThan(0);
      expect(station.walkTime).toBeGreaterThan(0);
      expect(Array.isArray(station.lines)).toBe(true);
    });

    it('should include commute estimates', async () => {
      const result = await getTransitAccessibility(1);
      
      const commute = result.commuteEstimates[0];
      expect(commute.destination).toBeDefined();
      expect(commute.duration).toBeGreaterThan(0);
      expect(commute.transfers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getInvestmentScore', () => {
    it('should return investment score data for a property', async () => {
      const result = await getInvestmentScore(1);
      
      expect(result).toBeDefined();
      expect(result.propertyId).toBe(1);
      expect(result.investmentScore).toBeGreaterThanOrEqual(0);
      expect(result.investmentScore).toBeLessThanOrEqual(100);
      expect(result.roiEstimate).toBeGreaterThan(0);
      expect(result.appreciationPotential).toBeGreaterThan(0);
      expect(result.rentalYield).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(result.riskLevel);
      expect(result.timeHorizon).toBeDefined();
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.risks)).toBe(true);
      expect(result.recommendation).toBeDefined();
    });

    it('should have at least one strength and one risk', async () => {
      const result = await getInvestmentScore(1);
      
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.risks.length).toBeGreaterThan(0);
    });

    it('should return different scores for different properties', async () => {
      const prop1 = await getInvestmentScore(1);
      const prop2 = await getInvestmentScore(2);
      
      // Scores should be different (with high probability due to randomization)
      expect(prop1.investmentScore).not.toBe(prop2.investmentScore);
    });
  });
});
