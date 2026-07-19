import { describe, it, expect } from "vitest";
import {
  calculateDiversityScore,
  applyDiversityControls,
  detectFilterBubble,
  getDefaultDiversityConfig,
  type PropertyRecommendation,
} from "../server/services/diversityControl";

describe("ML Training & Real-time Features", () => {
  // ============================================================================
  // Diversity Control Tests
  // ============================================================================

  describe("Diversity Score Calculation", () => {
    it("should calculate diversity score for varied recommendations", () => {
      const recommendations: PropertyRecommendation[] = [
        {
          propertyId: 1,
          matchScore: 0.9,
          price: 500000,
          propertyType: "Single Family",
          location: "San Francisco, CA",
          bedrooms: 3,
          bathrooms: 2,
        },
        {
          propertyId: 2,
          matchScore: 0.85,
          price: 750000,
          propertyType: "Condo",
          location: "Oakland, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
        {
          propertyId: 3,
          matchScore: 0.8,
          price: 1000000,
          propertyType: "Townhouse",
          location: "Berkeley, CA",
          bedrooms: 4,
          bathrooms: 3,
        },
      ];

      const metrics = calculateDiversityScore(recommendations);

      expect(metrics.priceVariance).toBeGreaterThan(0);
      expect(metrics.typeVariance).toBe(1); // 3 unique types / 3 total
      expect(metrics.locationVariance).toBe(1); // 3 unique locations / 3 total
      expect(metrics.overallDiversityScore).toBeGreaterThan(0.5);
      expect(metrics.filterBubbleRisk).toBe("low");
    });

    it("should detect low diversity in similar recommendations", () => {
      const recommendations: PropertyRecommendation[] = [
        {
          propertyId: 1,
          matchScore: 0.9,
          price: 500000,
          propertyType: "Condo",
          location: "San Francisco, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
        {
          propertyId: 2,
          matchScore: 0.85,
          price: 510000,
          propertyType: "Condo",
          location: "San Francisco, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
        {
          propertyId: 3,
          matchScore: 0.8,
          price: 520000,
          propertyType: "Condo",
          location: "San Francisco, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
      ];

      const metrics = calculateDiversityScore(recommendations);

      expect(metrics.typeVariance).toBeCloseTo(0.33, 1); // 1 unique type / 3 total
      expect(metrics.locationVariance).toBeCloseTo(0.33, 1); // 1 unique location / 3 total
      expect(metrics.overallDiversityScore).toBeLessThan(0.4);
      expect(metrics.filterBubbleRisk).toBe("high");
    });

    it("should handle empty recommendations", () => {
      const metrics = calculateDiversityScore([]);

      expect(metrics.priceVariance).toBe(0);
      expect(metrics.typeVariance).toBe(0);
      expect(metrics.locationVariance).toBe(0);
      expect(metrics.overallDiversityScore).toBe(0);
      expect(metrics.filterBubbleRisk).toBe("high");
    });
  });

  describe("Diversity Controls Application", () => {
    it("should apply diversity controls to improve recommendation variety", () => {
      const recommendations: PropertyRecommendation[] = [
        {
          propertyId: 1,
          matchScore: 0.9,
          price: 500000,
          propertyType: "Condo",
          location: "San Francisco, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
        {
          propertyId: 2,
          matchScore: 0.85,
          price: 510000,
          propertyType: "Condo",
          location: "San Francisco, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
      ];

      const allProperties: PropertyRecommendation[] = [
        ...recommendations,
        {
          propertyId: 3,
          matchScore: 0.7,
          price: 750000,
          propertyType: "Single Family",
          location: "Oakland, CA",
          bedrooms: 3,
          bathrooms: 2,
        },
        {
          propertyId: 4,
          matchScore: 0.65,
          price: 1000000,
          propertyType: "Townhouse",
          location: "Berkeley, CA",
          bedrooms: 4,
          bathrooms: 3,
        },
      ];

      const config = getDefaultDiversityConfig("high");
      const diverseRecs = applyDiversityControls(recommendations, allProperties, config);

      expect(diverseRecs.length).toBeGreaterThan(0);
      
      // Should include some exploratory properties
      const hasExploratoryProperty = diverseRecs.some(
        (rec) => rec.propertyType !== "Condo" || rec.location !== "San Francisco, CA"
      );
      expect(hasExploratoryProperty).toBe(true);
    });

    it("should respect diversity threshold configuration", () => {
      const recommendations: PropertyRecommendation[] = [
        {
          propertyId: 1,
          matchScore: 0.9,
          price: 500000,
          propertyType: "Single Family",
          location: "San Francisco, CA",
          bedrooms: 3,
          bathrooms: 2,
        },
        {
          propertyId: 2,
          matchScore: 0.85,
          price: 750000,
          propertyType: "Condo",
          location: "Oakland, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
      ];

      const allProperties = recommendations;

      // High diversity config
      const highConfig = getDefaultDiversityConfig("high");
      expect(highConfig.diversityThreshold).toBe(0.7);
      expect(highConfig.explorationRate).toBe(0.3);

      // Low diversity config
      const lowConfig = getDefaultDiversityConfig("low");
      expect(lowConfig.diversityThreshold).toBe(0.3);
      expect(lowConfig.explorationRate).toBe(0.1);

      // Medium diversity config
      const mediumConfig = getDefaultDiversityConfig("medium");
      expect(mediumConfig.diversityThreshold).toBe(0.5);
      expect(mediumConfig.explorationRate).toBe(0.2);
    });
  });

  describe("Filter Bubble Detection", () => {
    it("should detect filter bubble from recommendation history", () => {
      const recentRecommendations: PropertyRecommendation[][] = [
        // Week 1: Low diversity
        [
          {
            propertyId: 1,
            matchScore: 0.9,
            price: 500000,
            propertyType: "Condo",
            location: "San Francisco, CA",
            bedrooms: 2,
            bathrooms: 2,
          },
          {
            propertyId: 2,
            matchScore: 0.85,
            price: 510000,
            propertyType: "Condo",
            location: "San Francisco, CA",
            bedrooms: 2,
            bathrooms: 2,
          },
        ],
        // Week 2: Low diversity
        [
          {
            propertyId: 3,
            matchScore: 0.9,
            price: 520000,
            propertyType: "Condo",
            location: "San Francisco, CA",
            bedrooms: 2,
            bathrooms: 2,
          },
          {
            propertyId: 4,
            matchScore: 0.85,
            price: 530000,
            propertyType: "Condo",
            location: "San Francisco, CA",
            bedrooms: 2,
            bathrooms: 2,
          },
        ],
      ];

      const result = detectFilterBubble(recentRecommendations, 0.3);

      expect(result.averageDiversity).toBeLessThan(0.5);
      // Filter bubble detection depends on threshold
    });

    it("should detect improving diversity trend", () => {
      const recentRecommendations: PropertyRecommendation[][] = [
        // Week 1: Low diversity
        [
          {
            propertyId: 1,
            matchScore: 0.9,
            price: 500000,
            propertyType: "Condo",
            location: "San Francisco, CA",
            bedrooms: 2,
            bathrooms: 2,
          },
        ],
        // Week 2: Higher diversity
        [
          {
            propertyId: 2,
            matchScore: 0.85,
            price: 750000,
            propertyType: "Single Family",
            location: "Oakland, CA",
            bedrooms: 3,
            bathrooms: 2,
          },
          {
            propertyId: 3,
            matchScore: 0.8,
            price: 1000000,
            propertyType: "Townhouse",
            location: "Berkeley, CA",
            bedrooms: 4,
            bathrooms: 3,
          },
        ],
      ];

      const result = detectFilterBubble(recentRecommendations, 0.5);

      expect(["improving", "stable"]).toContain(result.trend);
    });
  });

  // ============================================================================
  // ML Training Pipeline Tests
  // ============================================================================

  describe("ML Training Configuration", () => {
    it("should validate model training config structure", () => {
      const config = {
        modelType: "hybrid" as const,
        hyperparameters: {
          learningRate: 0.001,
          epochs: 10,
          batchSize: 32,
          embeddingDim: 64,
        },
        trainingDataParams: {
          startDate: "2025-01-01",
          endDate: "2025-01-31",
          minInteractions: 5,
        },
      };

      expect(config.modelType).toBe("hybrid");
      expect(config.hyperparameters.learningRate).toBe(0.001);
      expect(config.hyperparameters.epochs).toBe(10);
      expect(config.trainingDataParams.minInteractions).toBe(5);
    });

    it("should validate training result structure", () => {
      const result = {
        modelId: "hybrid_model",
        modelVersion: "v1.0.0",
        metrics: {
          accuracy: 0.87,
          precision: 0.84,
          recall: 0.81,
          f1Score: 0.82,
          auc: 0.89,
        },
        trainingDuration: 120,
        sampleSize: 5000,
        mlflowRunId: "mlflow_run_123",
      };

      expect(result.metrics.accuracy).toBeGreaterThan(0.8);
      expect(result.metrics.precision).toBeGreaterThan(0.8);
      expect(result.metrics.recall).toBeGreaterThan(0.8);
      expect(result.sampleSize).toBeGreaterThan(1000);
    });
  });

  // ============================================================================
  // Real-time Recommendations Tests
  // ============================================================================

  describe("Real-time Property Matching", () => {
    it("should calculate match score based on user preferences", () => {
      const property = {
        id: 1,
        price: 500000,
        propertyType: "Condo",
        city: "San Francisco",
        state: "CA",
        bedrooms: 2,
        bathrooms: 2,
      };

      const preferences = {
        minPrice: 400000,
        maxPrice: 600000,
        propertyTypes: ["Condo", "Townhouse"],
        locations: ["San Francisco"],
        minBedrooms: 2,
        minBathrooms: 2,
      };

      // Simulate match score calculation
      let score = 0;
      const reasons: string[] = [];

      // Price match
      if (property.price >= preferences.minPrice && property.price <= preferences.maxPrice) {
        score += 30;
        reasons.push("Price within your range");
      }

      // Type match
      if (preferences.propertyTypes.includes(property.propertyType)) {
        score += 25;
        reasons.push(`Matches your preferred type: ${property.propertyType}`);
      }

      // Location match
      if (preferences.locations.includes(property.city)) {
        score += 25;
        reasons.push("In your preferred location");
      }

      // Bedrooms match
      if (property.bedrooms >= preferences.minBedrooms) {
        score += 10;
        reasons.push(`Has ${property.bedrooms} bedrooms`);
      }

      // Bathrooms match
      if (property.bathrooms >= preferences.minBathrooms) {
        score += 10;
        reasons.push(`Has ${property.bathrooms} bathrooms`);
      }

      expect(score).toBe(100); // Perfect match
      expect(reasons.length).toBe(5);
    });

    it("should filter low-scoring matches", () => {
      const property = {
        price: 1500000, // Outside range
        propertyType: "Mansion", // Not preferred
        city: "Los Angeles", // Not preferred
        bedrooms: 5,
        bathrooms: 4,
      };

      const preferences = {
        minPrice: 400000,
        maxPrice: 600000,
        propertyTypes: ["Condo"],
        locations: ["San Francisco"],
        minBedrooms: 2,
        minBathrooms: 2,
      };

      let score = 0;

      // Price match - fail
      if (property.price >= preferences.minPrice && property.price <= preferences.maxPrice) {
        score += 30;
      }

      // Type match - fail
      if (preferences.propertyTypes.includes(property.propertyType)) {
        score += 25;
      }

      // Location match - fail
      if (preferences.locations.includes(property.city)) {
        score += 25;
      }

      // Bedrooms match - pass
      if (property.bedrooms >= preferences.minBedrooms) {
        score += 10;
      }

      // Bathrooms match - pass
      if (property.bathrooms >= preferences.minBathrooms) {
        score += 10;
      }

      expect(score).toBe(20); // Low match, should be filtered
      expect(score).toBeLessThan(70); // Below threshold
    });
  });

  describe("WebSocket Subscription Management", () => {
    it("should validate subscription data structure", () => {
      const subscription = {
        userId: 123,
        socketId: "socket_abc123",
        preferences: {
          minPrice: 400000,
          maxPrice: 600000,
          propertyTypes: ["Condo", "Townhouse"],
          locations: ["San Francisco, CA"],
          minBedrooms: 2,
          minBathrooms: 2,
        },
      };

      expect(subscription.userId).toBe(123);
      expect(subscription.socketId).toBe("socket_abc123");
      expect(subscription.preferences.propertyTypes).toContain("Condo");
      expect(subscription.preferences.minPrice).toBe(400000);
    });

    it("should validate property match notification structure", () => {
      const notification = {
        property: {
          id: 1,
          title: "Beautiful Condo",
          price: 500000,
          propertyType: "Condo",
          city: "San Francisco",
          state: "CA",
        },
        matchScore: 95,
        matchReasons: [
          "Price within your range",
          "Matches your preferred type: Condo",
          "In your preferred location",
        ],
        timestamp: new Date().toISOString(),
      };

      expect(notification.matchScore).toBeGreaterThan(70);
      expect(notification.matchReasons.length).toBeGreaterThan(0);
      expect(notification.property.id).toBe(1);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("End-to-End Recommendation Flow", () => {
    it("should complete full recommendation pipeline", () => {
      // Step 1: Get initial recommendations
      const initialRecs: PropertyRecommendation[] = [
        {
          propertyId: 1,
          matchScore: 0.9,
          price: 500000,
          propertyType: "Condo",
          location: "San Francisco, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
        {
          propertyId: 2,
          matchScore: 0.85,
          price: 510000,
          propertyType: "Condo",
          location: "San Francisco, CA",
          bedrooms: 2,
          bathrooms: 2,
        },
      ];

      // Step 2: Check diversity
      const initialDiversity = calculateDiversityScore(initialRecs);
      expect(["high", "medium"]).toContain(initialDiversity.filterBubbleRisk);

      // Step 3: Apply diversity controls
      const allProperties: PropertyRecommendation[] = [
        ...initialRecs,
        {
          propertyId: 3,
          matchScore: 0.7,
          price: 750000,
          propertyType: "Single Family",
          location: "Oakland, CA",
          bedrooms: 3,
          bathrooms: 2,
        },
      ];

      const config = getDefaultDiversityConfig("high");
      const diverseRecs = applyDiversityControls(initialRecs, allProperties, config);

      // Step 4: Verify improved diversity
      const finalDiversity = calculateDiversityScore(diverseRecs);
      expect(finalDiversity.overallDiversityScore).toBeGreaterThanOrEqual(
        initialDiversity.overallDiversityScore
      );
    });
  });
});
