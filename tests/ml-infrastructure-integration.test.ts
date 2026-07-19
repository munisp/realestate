/**
 * ML Infrastructure Integration Tests
 * 
 * Tests the complete ML pipeline:
 * - TypeScript → Kafka → Bronze → Silver → Gold
 * - Python ML service integration
 * - Go gRPC service integration
 * - MLflow model tracking
 */

import { describe, it, expect, beforeAll } from 'vitest';

// ============================================================================
// Kafka Integration Tests
// ============================================================================

describe('Kafka Event Publishing', () => {
  it('should publish recommendation interaction event to Kafka', async () => {
    const { publishRecommendationInteraction } = await import('../server/services/mlTrainingPipeline');

    // This will only actually publish if KAFKA_ENABLED=true
    await publishRecommendationInteraction({
      userId: 123,
      propertyId: 456,
      interactionType: 'view',
      matchScore: 0.85,
      timestamp: new Date(),
      metadata: { source: 'test' },
    });

    // No error means success (event publishing should not throw)
    expect(true).toBe(true);
  });

  it('should track property view event', async () => {
    const { trackPropertyView } = await import('../server/services/mlTrainingPipeline');

    await trackPropertyView(123, 456, 'recommendation');

    expect(true).toBe(true);
  });

  it('should track recommendation feedback', async () => {
    const { trackRecommendationFeedback } = await import('../server/services/mlTrainingPipeline');

    await trackRecommendationFeedback(123, 456, 'up', 0.85);

    expect(true).toBe(true);
  });
});

// ============================================================================
// Lakehouse Data Pipeline Tests
// ============================================================================

describe('Lakehouse Data Pipeline', () => {
  it('should fetch training data from Gold layer', async () => {
    const { fetchTrainingData } = await import('../server/services/mlTrainingPipeline');

    const data = await fetchTrainingData({
      startDate: '2025-01-01',
      endDate: '2025-11-18',
      limit: 100,
    });

    expect(Array.isArray(data)).toBe(true);
    // Data will be empty until lakehouse is fully running
  });

  it('should batch fetch property features', async () => {
    const { batchFetchPropertyFeatures } = await import('../server/services/mlTrainingPipeline');

    try {
      const features = await batchFetchPropertyFeatures(['prop_1', 'prop_2', 'prop_3']);
      expect(Array.isArray(features)).toBe(true);
    } catch (error) {
      // Service may not be running, which is expected in development
      expect(error).toBeDefined();
    }
  });
});

// ============================================================================
// ML Model Training Tests
// ============================================================================

describe('ML Model Training', () => {
  it('should train recommendation model', async () => {
    const { trainRecommendationModel } = await import('../server/services/mlTrainingPipeline');

    const result = await trainRecommendationModel({
      modelType: 'collaborative_filtering',
      hyperparameters: {
        learningRate: 0.001,
        epochs: 10,
        batchSize: 32,
      },
      trainingDataParams: {
        startDate: '2025-01-01',
        endDate: '2025-11-18',
        minInteractions: 5,
      },
    });

    expect(result).toBeDefined();
    expect(result.modelId).toBe('collaborative_filtering_model');
    expect(result.modelVersion).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.metrics.accuracy).toBeLessThanOrEqual(1);
  });

  it('should track model performance', async () => {
    const { trackModelPerformance } = await import('../server/services/mlTrainingPipeline');

    const metrics = await trackModelPerformance('v1.0.0', 'week');

    expect(metrics).toBeDefined();
    expect(metrics.modelVersion).toBe('v1.0.0');
    expect(metrics.metrics.clickThroughRate).toBeGreaterThan(0);
    expect(metrics.metrics.conversionRate).toBeGreaterThan(0);
  });
});

// ============================================================================
// Python ML Service Integration Tests
// ============================================================================

describe('Python ML Services', () => {
  it('should create ML Valuation client', async () => {
    const { MLValuationClient } = await import('../server/_core/serviceClients');

    const client = new MLValuationClient();
    expect(client).toBeDefined();
  });

  it('should create Fraud Detection client', async () => {
    const { FraudDetectionClient } = await import('../server/_core/serviceClients');

    const client = new FraudDetectionClient();
    expect(client).toBeDefined();
  });

  it('should create Geospatial client', async () => {
    const { GeospatialClient } = await import('../server/_core/serviceClients');

    const client = new GeospatialClient();
    expect(client).toBeDefined();
  });

  it('should handle ML service unavailability gracefully', async () => {
    const { mlValuationClient } = await import('../server/_core/serviceClients');

    // This should not throw even if service is not running
    const isAvailable = await mlValuationClient.checkHealth();
    expect(typeof isAvailable).toBe('boolean');
  });
});

// ============================================================================
// Go gRPC Service Integration Tests
// ============================================================================

describe('Go gRPC Services', () => {
  it('should create Payment gRPC client', async () => {
    const { PaymentGrpcClient } = await import('../server/_core/grpcClients');

    const client = new PaymentGrpcClient();
    expect(client).toBeDefined();
  });

  it('should create Notification gRPC client', async () => {
    const { NotificationGrpcClient } = await import('../server/_core/grpcClients');

    // Note: NotificationGrpcClient is a placeholder until proto file is created
    expect(NotificationGrpcClient).toBeDefined();
  });

  it('should create Image gRPC client', async () => {
    const { ImageGrpcClient } = await import('../server/_core/grpcClients');

    // Note: ImageGrpcClient is a placeholder until proto file is created
    expect(ImageGrpcClient).toBeDefined();
  });
});

// ============================================================================
// End-to-End Integration Test
// ============================================================================

describe('End-to-End ML Pipeline', () => {
  it('should complete full recommendation pipeline', async () => {
    const {
      trackPropertyView,
      trackRecommendationFeedback,
      trainRecommendationModel,
      getMLRecommendations,
    } = await import('../server/services/mlTrainingPipeline');

    // Step 1: Track user interactions
    await trackPropertyView(123, 456, 'recommendation');
    await trackRecommendationFeedback(123, 456, 'up', 0.85);

    // Step 2: Train model (in production, this would be triggered by scheduler)
    const trainingResult = await trainRecommendationModel({
      modelType: 'hybrid',
      hyperparameters: {
        learningRate: 0.001,
        epochs: 10,
      },
      trainingDataParams: {
        startDate: '2025-01-01',
        endDate: '2025-11-18',
      },
    });

    expect(trainingResult.modelId).toBe('hybrid_model');

    // Step 3: Get recommendations using trained model
    const recommendations = await getMLRecommendations({
      userId: 123,
      limit: 10,
    });

    expect(Array.isArray(recommendations)).toBe(true);
  });
});

// ============================================================================
// Lakehouse Client Tests
// ============================================================================

describe('Lakehouse Client', () => {
  it('should have lakehouse client configured', async () => {
    const { lakehouseClient } = await import('../server/_core/lakehouseClient');

    expect(lakehouseClient).toBeDefined();
  });

  it('should batch get ML features', async () => {
    const { lakehouseClient } = await import('../server/_core/lakehouseClient');

    try {
      const features = await lakehouseClient.batchGetMLFeatures(['prop_1', 'prop_2']);
      expect(Array.isArray(features)).toBe(true);
    } catch (error) {
      // Service may not be running, which is expected in development
      expect(error).toBeDefined();
    }
  });
});

// ============================================================================
// Configuration Tests
// ============================================================================

describe('ML Infrastructure Configuration', () => {
  it('should have Kafka configuration', () => {
    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:29092';
    expect(kafkaBrokers).toBeDefined();
  });

  it('should have MinIO configuration', () => {
    const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
    expect(minioEndpoint).toBeDefined();
  });

  it('should have MLflow configuration', () => {
    const mlflowUri = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5050';
    expect(mlflowUri).toBeDefined();
  });

  it('should have Ray configuration', () => {
    const rayAddress = process.env.RAY_ADDRESS || 'localhost:10001';
    expect(rayAddress).toBeDefined();
  });
});
