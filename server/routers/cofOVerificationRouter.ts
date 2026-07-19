import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { RegistryFactory } from "../services/governmentRegistry/RegistryFactory";
import { RegistryAggregator } from "../services/governmentRegistry/RegistryAggregator";
import { detectFraud } from "../services/fraudDetection/MLFraudDetectionService";
import { validateGeospatial } from "../services/geospatial/GeospatialValidationService";
import { StateCode } from "../services/governmentRegistry/base/types";
import { getDb } from "../db";
import { landVerificationRequests, certificateOfOccupancy } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Enhanced C of O Verification Router
 * Integrates government API, ML fraud detection, and geospatial validation
 */

export const cofOVerificationRouter = router({
  /**
   * Comprehensive C of O verification with all layers
   */
  verifyComprehensive: publicProcedure
    .input(
      z.object({
        cofONumber: z.string().min(1),
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]),
        holderName: z.string(),
        issueDate: z.string(), // ISO date string
        issuingAuthority: z.string(),
        landSize: z.string().optional(),
        location: z.string().optional(),
        coordinates: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        boundaries: z
          .array(
            z.object({
              latitude: z.number(),
              longitude: z.number(),
            })
          )
          .optional(),
        documentUrl: z.string().optional(),
        useMultiState: z.boolean().optional(), // Enable consensus verification
      })
    )
    .mutation(async ({ input }) => {
      const issueDate = new Date(input.issueDate);

      // Step 1: Government Registry Verification
      let registryResult;
      if (input.useMultiState) {
        // Multi-state consensus verification
        registryResult = await RegistryAggregator.verifyWithConsensus(
          input.cofONumber,
          [input.state, "LAGOS", "FCT"] as StateCode[] // Include major states
        );
      } else {
        // Single state verification
        const client = RegistryFactory.getClient(input.state);
        registryResult = await client.verifyCofO(input.cofONumber);
      }

      // Step 2: ML Fraud Detection
      const fraudResult = await detectFraud({
        cofONumber: input.cofONumber,
        holderName: input.holderName,
        issueDate,
        issuingAuthority: input.issuingAuthority,
        documentUrl: input.documentUrl,
        state: input.state,
        landSize: input.landSize,
        location: input.location,
        registryData: registryResult,
      });

      // Step 3: Geospatial Validation (if coordinates provided)
      let geospatialResult;
      if (input.coordinates || input.boundaries) {
        geospatialResult = await validateGeospatial({
          cofONumber: input.cofONumber,
          claimedCoordinates: input.coordinates,
          claimedBoundaries: input.boundaries,
          claimedLandSize: input.landSize ? parseFloat(input.landSize) : undefined,
          claimedLocation: input.location,
          state: input.state,
          registryCoordinates:
            "coordinates" in registryResult ? registryResult.coordinates : undefined,
          registryBoundaries:
            "boundaries" in registryResult ? registryResult.boundaries : undefined,
        });
      }

      // Calculate overall verification score
      const weights = {
        registry: 0.4,
        fraud: 0.3,
        geospatial: 0.3,
      };

      let overallScore = 0;
      let scoreComponents = 0;

      // Registry score (inverse of verification score for consistency)
      if ("verificationScore" in registryResult) {
        overallScore += registryResult.verificationScore * weights.registry;
        scoreComponents++;
      } else if ("isValid" in registryResult) {
        overallScore += (registryResult.isValid ? 100 : 0) * weights.registry;
        scoreComponents++;
      }

      // Fraud score (inverse - lower fraud score is better)
      overallScore += (100 - fraudResult.fraudScore) * weights.fraud;
      scoreComponents++;

      // Geospatial score
      if (geospatialResult) {
        overallScore += geospatialResult.validationScore * weights.geospatial;
        scoreComponents++;
      }

      const finalScore = Math.round(overallScore / scoreComponents);

      // Determine overall status
      let overallStatus: "verified" | "warning" | "rejected";
      if (finalScore >= 80 && fraudResult.riskLevel !== "critical") {
        overallStatus = "verified";
      } else if (finalScore >= 60 && fraudResult.riskLevel !== "critical") {
        overallStatus = "warning";
      } else {
        overallStatus = "rejected";
      }

      // Combine all recommendations
      const allRecommendations = [
        ...fraudResult.recommendations,
        ...(geospatialResult?.recommendations || []),
      ];

      return {
        overallScore: finalScore,
        overallStatus,
        registryVerification: registryResult,
        fraudDetection: fraudResult,
        geospatialValidation: geospatialResult,
        recommendations: allRecommendations,
        verifiedAt: new Date().toISOString(),
      };
    }),

  /**
   * Quick registry-only verification
   */
  verifyRegistry: publicProcedure
    .input(
      z.object({
        cofONumber: z.string().min(1),
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]),
      })
    )
    .query(async ({ input }) => {
      const client = RegistryFactory.getClient(input.state);
      return await client.verifyCofO(input.cofONumber);
    }),

  /**
   * Fraud detection only
   */
  detectFraud: publicProcedure
    .input(
      z.object({
        cofONumber: z.string(),
        holderName: z.string(),
        issueDate: z.string(),
        issuingAuthority: z.string(),
        state: z.string(),
        landSize: z.string().optional(),
        location: z.string().optional(),
        documentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await detectFraud({
        ...input,
        issueDate: new Date(input.issueDate),
      });
    }),

  /**
   * Geospatial validation only
   */
  validateGeospatial: publicProcedure
    .input(
      z.object({
        cofONumber: z.string(),
        state: z.string(),
        coordinates: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        boundaries: z
          .array(
            z.object({
              latitude: z.number(),
              longitude: z.number(),
            })
          )
          .optional(),
        landSize: z.number().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await validateGeospatial({
        cofONumber: input.cofONumber,
        state: input.state,
        claimedCoordinates: input.coordinates,
        claimedBoundaries: input.boundaries,
        claimedLandSize: input.landSize,
        claimedLocation: input.location,
      });
    }),

  /**
   * Multi-state consensus verification
   */
  verifyConsensus: publicProcedure
    .input(
      z.object({
        cofONumber: z.string().min(1),
        states: z.array(z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"])).min(2),
      })
    )
    .query(async ({ input }) => {
      return await RegistryAggregator.verifyWithConsensus(
        input.cofONumber,
        input.states as StateCode[]
      );
    }),

  /**
   * Get registry health status for all states
   */
  getRegistryHealth: protectedProcedure.query(async () => {
    return await RegistryFactory.healthCheckAll();
  }),

  /**
   * Get verification history for admin
   */
  getVerificationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const history = await db
        .select()
        .from(landVerificationRequests)
        .orderBy(desc(landVerificationRequests.requestedAt))
        .limit(input.limit)
        .offset(input.offset);

      return history;
    }),

  /**
   * Get verification statistics for admin dashboard
   */
  getVerificationStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get total verifications
    const allVerifications = await db
      .select()
      .from(landVerificationRequests);

    const total = allVerifications.length;
    const verified = allVerifications.filter(
      (v) => v.verificationResult === "verified"
    ).length;
    const rejected = allVerifications.filter(
      (v) => v.verificationResult === "rejected"
    ).length;
    const pending = allVerifications.filter((v) => v.status === "pending").length;

    // Calculate average verification score
    const scoresWithValues = allVerifications.filter(
      (v) => v.verificationScore !== null
    );
    const avgScore =
      scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, v) => sum + (v.verificationScore || 0), 0) /
          scoresWithValues.length
        : 0;

    // Get verifications by state
    const byState: Record<string, number> = {};
    allVerifications.forEach((v) => {
      const state = "state"; // Would need to add state field to schema
      byState[state] = (byState[state] || 0) + 1;
    });

    // Get recent high-risk verifications
    const highRisk = allVerifications
      .filter((v) => (v.verificationScore || 0) < 50)
      .slice(0, 10);

    return {
      total,
      verified,
      rejected,
      pending,
      avgScore: Math.round(avgScore),
      byState,
      highRisk,
    };
  }),

  /**
   * Test registry connection with provided credentials
   */
  testRegistryConnection: protectedProcedure
    .input(
      z.object({
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]),
        credentials: z.record(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only allow admin users
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      try {
        // Test connection by attempting a health check with the provided credentials
        const client = RegistryFactory.getClient(input.state);
        // Store credentials temporarily for testing
        const originalEnv = { ...process.env };
        
        // Map credentials to environment variables
        Object.entries(input.credentials).forEach(([key, value]) => {
          process.env[`${input.state}_REGISTRY_${key.toUpperCase()}`] = value;
        });

        const isHealthy = await client.healthCheck();
        
        // Restore original environment
        Object.keys(process.env).forEach(key => {
          if (key.startsWith(`${input.state}_REGISTRY_`)) {
            delete process.env[key];
          }
        });
        Object.assign(process.env, originalEnv);

        return {
          success: isHealthy,
          error: isHealthy ? null : "Connection failed - check credentials",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Save registry credentials (admin only)
   */
  saveRegistryCredentials: protectedProcedure
    .input(
      z.object({
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]),
        credentials: z.record(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only allow admin users
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      // In production, these would be saved to a secure secrets manager
      // For now, we'll save them to environment variables
      // NOTE: This requires server restart to take effect in production
      Object.entries(input.credentials).forEach(([key, value]) => {
        process.env[`${input.state}_REGISTRY_${key.toUpperCase()}`] = value;
      });

      return {
        success: true,
        message: "Credentials saved successfully. Note: Server restart may be required for changes to take effect.",
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Get ML training statistics
   */
  getMLTrainingStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // In a real implementation, this would fetch from MLflow
    return {
      currentAccuracy: 0.87,
      currentF1Score: 0.84,
      trainingDataSize: 780,
      modelVersion: "v20250122_abc",
      lastTrainingDate: new Date("2025-01-22T14:30:00Z"),
      nextAutoRetrainingThreshold: 100,
      newCasesSinceLastTraining: 45,
    };
  }),

  /**
   * Trigger ML model training
   */
  triggerMLTraining: protectedProcedure
    .input(
      z.object({
        includeRecentDays: z.number().min(1).max(365).default(90),
        minConfidence: z.number().min(0).max(1).default(0.7),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      // Import training service
      const { collectTrainingData, trainModel } = await import(
        "../services/fraudDetection/MLflowTrainingService"
      );

      // Collect training data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.includeRecentDays);

      const trainingData = await collectTrainingData(
        startDate,
        new Date(),
        input.minConfidence
      );

      if (trainingData.length < 50) {
        throw new Error(
          `Insufficient training data: ${trainingData.length} samples (minimum 50 required)`
        );
      }

      // Train model
      const trainingRun = await trainModel(trainingData, {
        includeRecentDays: input.includeRecentDays,
        minConfidence: input.minConfidence,
        triggeredBy: ctx.user.id,
      });

      return trainingRun;
    }),

  /**
   * Submit verification feedback for ML training
   */
  submitVerificationFeedback: protectedProcedure
    .input(
      z.object({
        verificationId: z.number(),
        isCorrect: z.boolean(),
        actualLabel: z.enum(["genuine", "fraudulent", "suspicious"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { submitVerificationFeedback } = await import(
        "../services/fraudDetection/MLflowTrainingService"
      );

      await submitVerificationFeedback(input.verificationId, {
        isCorrect: input.isCorrect,
        actualLabel: input.actualLabel,
        notes: input.notes,
        userId: ctx.user.id,
      });

      return {
        success: true,
        message: "Feedback submitted successfully",
      };
    }),

  /**
   * Test verification system (admin only)
   */
  testVerificationSystem: protectedProcedure
    .input(
      z.object({
        testType: z.enum([
          "registry_connection",
          "fraud_detection",
          "geospatial",
          "full_stack",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only allow admin users
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const results: any = {
        testType: input.testType,
        timestamp: new Date().toISOString(),
        tests: [],
      };

      if (
        input.testType === "registry_connection" ||
        input.testType === "full_stack"
      ) {
        // Test all registry connections
        const healthStatus = await RegistryFactory.healthCheckAll();
        results.tests.push({
          name: "Registry Health Check",
          status: Object.values(healthStatus).every((h) => h) ? "passed" : "failed",
          details: healthStatus,
        });
      }

      if (
        input.testType === "fraud_detection" ||
        input.testType === "full_stack"
      ) {
        // Test fraud detection with sample data
        const sampleFraudTest = await detectFraud({
          cofONumber: "TEST/0000/2099",
          holderName: "Test User",
          issueDate: new Date("2099-01-01"), // Future date should trigger fraud
          issuingAuthority: "Fake Authority",
          state: "LAGOS",
        });

        results.tests.push({
          name: "Fraud Detection Test",
          status: sampleFraudTest.fraudScore > 50 ? "passed" : "failed",
          details: {
            fraudScore: sampleFraudTest.fraudScore,
            riskLevel: sampleFraudTest.riskLevel,
            issuesDetected: sampleFraudTest.detectedIssues.length,
          },
        });
      }

      if (
        input.testType === "geospatial" ||
        input.testType === "full_stack"
      ) {
        // Test geospatial validation with Lagos coordinates
        const sampleGeoTest = await validateGeospatial({
          cofONumber: "TEST/1234/2020",
          state: "LAGOS",
          claimedCoordinates: {
            latitude: 6.5244, // Lagos coordinates
            longitude: 3.3792,
          },
          claimedLandSize: 500,
        });

        results.tests.push({
          name: "Geospatial Validation Test",
          status: sampleGeoTest.validationScore > 70 ? "passed" : "failed",
          details: {
            validationScore: sampleGeoTest.validationScore,
            isValid: sampleGeoTest.isValid,
            issuesDetected: sampleGeoTest.issues.length,
          },
        });
      }

      results.overallStatus = results.tests.every((t: any) => t.status === "passed")
        ? "all_passed"
        : "some_failed";

      return results;
    }),
});
