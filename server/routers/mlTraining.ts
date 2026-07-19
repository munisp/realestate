import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  trainRecommendationModel,
  trackModelPerformance,
  publishRecommendationInteraction,
  getMLRecommendations,
} from "../services/mlTrainingPipeline";

/**
 * ML Training Router
 * 
 * Manages ML model training, monitoring, and inference for recommendations
 */

export const mlTrainingRouter = router({
  /**
   * Train a new recommendation model
   */
  trainModel: protectedProcedure
    .input(
      z.object({
        modelType: z.enum(["collaborative_filtering", "content_based", "hybrid"]),
        startDate: z.string(),
        endDate: z.string(),
        hyperparameters: z
          .object({
            learningRate: z.number().optional(),
            epochs: z.number().optional(),
            batchSize: z.number().optional(),
            embeddingDim: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await trainRecommendationModel({
        modelType: input.modelType,
        hyperparameters: input.hyperparameters || {},
        trainingDataParams: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });

      return result;
    }),

  /**
   * Get model performance metrics
   */
  getModelMetrics: protectedProcedure
    .input(
      z.object({
        modelVersion: z.string(),
        period: z.enum(["day", "week", "month"]).default("week"),
      })
    )
    .query(async ({ input }) => {
      return await trackModelPerformance(input.modelVersion, input.period);
    }),

  /**
   * Get ML-based recommendations
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        diversityThreshold: z.number().min(0).max(1).optional(),
        excludePropertyIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getMLRecommendations({
        userId: ctx.user.id,
        limit: input.limit,
        diversityThreshold: input.diversityThreshold,
        excludePropertyIds: input.excludePropertyIds,
      });
    }),

  /**
   * Track user interaction for ML training
   */
  trackInteraction: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        interactionType: z.enum(["view", "click", "favorite", "feedback_positive", "feedback_negative"]),
        matchScore: z.number().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await publishRecommendationInteraction({
        userId: ctx.user.id,
        propertyId: input.propertyId,
        interactionType: input.interactionType,
        matchScore: input.matchScore,
        timestamp: new Date(),
        metadata: input.metadata,
      });

      return { success: true };
    }),

  /**
   * Get training history and model versions
   */
  getTrainingHistory: protectedProcedure.query(async () => {
    // This would query MLflow for training history
    // For now, return mock data
    return {
      models: [
        {
          modelId: "hybrid_model",
          modelVersion: "v1.0.0",
          trainedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          metrics: {
            accuracy: 0.87,
            precision: 0.84,
            recall: 0.81,
            f1Score: 0.82,
            auc: 0.89,
          },
          sampleSize: 5000,
          status: "deployed",
        },
        {
          modelId: "collaborative_filtering_model",
          modelVersion: "v1.1.0",
          trainedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          metrics: {
            accuracy: 0.85,
            precision: 0.82,
            recall: 0.79,
            f1Score: 0.80,
            auc: 0.87,
          },
          sampleSize: 4500,
          status: "archived",
        },
      ],
      totalTrainingRuns: 12,
      lastTrainingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    };
  }),

  /**
   * Get lakehouse data quality metrics
   */
  getDataQuality: protectedProcedure.query(async () => {
    // This would query the lakehouse for data quality metrics
    return {
      bronze: {
        totalEvents: 150000,
        eventsToday: 2500,
        latency: "< 1 minute",
        quality: 98.5,
      },
      silver: {
        totalRecords: 145000,
        validationRate: 96.7,
        latency: "< 5 minutes",
        quality: 99.2,
      },
      gold: {
        totalAggregates: 50,
        freshnessScore: 95.0,
        latency: "< 15 minutes",
        quality: 99.8,
      },
      issues: [
        {
          layer: "bronze" as const,
          table: "recommendation_interactions",
          issue: "Missing user_id in 1.5% of events",
          severity: "low" as const,
        },
      ],
    };
  }),
});
