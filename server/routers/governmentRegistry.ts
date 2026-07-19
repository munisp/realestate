import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { RegistryFactory } from "../services/governmentRegistry/RegistryFactory";
import { RegistryAggregator } from "../services/governmentRegistry/RegistryAggregator";
import { verificationCache } from "../services/governmentRegistry/VerificationCacheService";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Government Registry tRPC Router
 * Provides endpoints for C of O verification, land records, and ownership history
 * Uses caching to reduce API calls and improve performance
 */

const aggregator = new RegistryAggregator();

export const governmentRegistryRouter = router({
  /**
   * Verify Certificate of Occupancy
   * Supports single-state or multi-state verification with consensus
   */
  verifyCofO: publicProcedure
    .input(
      z.object({
        cofoNumber: z.string().min(1, "C of O number is required"),
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]).optional(),
        multiState: z.boolean().default(false),
        useCache: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      try {
        // Check cache first if enabled
        if (input.useCache && !input.multiState && input.state) {
          const cached = verificationCache.getCofOVerification(
            input.cofoNumber,
            input.state
          );
          if (cached) {
            return {
              success: true,
              result: cached,
              cached: true,
            };
          }
        }

        // Single-state verification
        if (!input.multiState && input.state) {
          const client = RegistryFactory.getClient(input.state);
          const result = await client.verifyCofO(input.cofoNumber);

        // Cache the result
        if (input.useCache) {
          verificationCache.setCofOVerification(
            input.cofoNumber,
            result,
            input.state
          );
        }

        // Save to history
        const responseTime = Date.now() - startTime;
        if (ctx.user) {
          await db.saveVerificationHistory({
            userId: ctx.user.id,
            cofONumber: input.cofoNumber,
            state: input.state,
            multiState: input.multiState,
            isValid: result.isValid,
            verificationScore: result.verificationScore,
            status: result.status,
            resultData: result as any,
            cached: false,
            responseTime,
            apiCallCount: 1,
            sources: input.state ? [input.state] : null,
          });
        }

        return {
          success: true,
          result,
          cached: false,
        };
        }

        // Multi-state verification with consensus
        const states = input.state
          ? [input.state]
          : RegistryFactory.getAvailableStates();

        const aggregatedResult = await aggregator.verifyCofOAcrossStates(
          input.cofoNumber,
          states
        );

        // Cache the primary result
        if (input.useCache) {
          verificationCache.setCofOVerification(
            input.cofoNumber,
            aggregatedResult.primaryResult,
            aggregatedResult.primaryResult.parcelId
          );
        }

        return {
          success: true,
          result: aggregatedResult.primaryResult,
          aggregated: aggregatedResult,
          cached: false,
        };
      } catch (error: any) {
        console.error("[GovernmentRegistry] Verification failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to verify C of O",
          cause: error,
        });
      }
    }),

  /**
   * Get land record by parcel ID
   */
  getLandRecord: publicProcedure
    .input(
      z.object({
        parcelId: z.string().min(1, "Parcel ID is required"),
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]),
        useCache: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      try {
        // Check cache first
        if (input.useCache) {
          const cached = verificationCache.getLandRecord(
            input.parcelId,
            input.state
          );
          if (cached) {
            return {
              success: true,
              data: cached,
              cached: true,
            };
          }
        }

        const client = RegistryFactory.getClient(input.state);
        const record = await client.getLandRecord(input.parcelId);

        // Cache the result
        if (input.useCache) {
          verificationCache.setLandRecord(input.parcelId, record, input.state);
        }

        return {
          success: true,
          data: record,
          cached: false,
        };
      } catch (error: any) {
        console.error("[GovernmentRegistry] Failed to get land record:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve land record",
          cause: error,
        });
      }
    }),

  /**
   * Get ownership history for a parcel
   */
  getOwnershipHistory: publicProcedure
    .input(
      z.object({
        parcelId: z.string().min(1, "Parcel ID is required"),
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]),
        useCache: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      try {
        // Check cache first
        if (input.useCache) {
          const cached = verificationCache.getOwnershipHistory(
            input.parcelId,
            input.state
          );
          if (cached) {
            return {
              success: true,
              data: cached,
              cached: true,
            };
          }
        }

        const client = RegistryFactory.getClient(input.state);
        const history = await client.getOwnershipHistory(input.parcelId);

        // Cache the result
        if (input.useCache) {
          verificationCache.setOwnershipHistory(
            input.parcelId,
            history,
            input.state
          );
        }

        return {
          success: true,
          data: history,
          cached: false,
        };
      } catch (error: any) {
        console.error(
          "[GovernmentRegistry] Failed to get ownership history:",
          error
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve ownership history",
          cause: error,
        });
      }
    }),

  /**
   * Submit verification request for manual review
   */
  submitVerificationRequest: protectedProcedure
    .input(
      z.object({
        parcelId: z.string().optional(),
        cofoNumber: z.string().optional(),
        ownerName: z.string().optional(),
        requestType: z.enum([
          "cofo_verification",
          "ownership_verification",
          "encumbrance_check",
          "full_verification",
        ]),
        state: z.enum(["LAGOS", "FCT", "RIVERS", "KANO", "OYO"]),
        phone: z.string().optional(),
        organization: z.string().optional(),
        additionalInfo: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const client = RegistryFactory.getClient(input.state);

        const result = await client.submitVerificationRequest({
          parcelId: input.parcelId,
          cofoNumber: input.cofoNumber,
          ownerName: input.ownerName,
          requestType: input.requestType,
          requesterInfo: {
            name: ctx.user.name || "Unknown",
            email: ctx.user.email || "",
            phone: input.phone,
            organization: input.organization,
          },
          additionalInfo: input.additionalInfo,
        });

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        console.error(
          "[GovernmentRegistry] Failed to submit verification request:",
          error
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Failed to submit verification request",
          cause: error,
        });
      }
    }),

  /**
   * Health check for all available registries
   */
  healthCheckAll: publicProcedure.query(async () => {
    try {
      const results = await RegistryFactory.healthCheckAll();
      return {
        success: true,
        data: results,
      };
    } catch (error: any) {
      console.error("[GovernmentRegistry] Health check failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to check registry health",
        cause: error,
      });
    }
  }),

  /**
   * Get cache statistics
   */
  getCacheStats: publicProcedure.query(() => {
    const stats = verificationCache.getStats();
    return {
      success: true,
      data: stats,
    };
  }),

  /**
   * Clear cache (admin only)
   */
  clearCache: protectedProcedure
    .input(
      z.object({
        type: z.enum(["all", "cofo", "land_record"]).default("all"),
        identifier: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only allow admin users to clear cache
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can clear the cache",
        });
      }

      try {
        if (input.type === "all") {
          verificationCache.clear();
        } else if (input.type === "cofo" && input.identifier) {
          verificationCache.invalidateCofO(input.identifier);
        } else if (input.type === "land_record" && input.identifier) {
          verificationCache.invalidateLandRecord(input.identifier);
        }

        return {
          success: true,
          message: "Cache cleared successfully",
        };
      } catch (error: any) {
        console.error("[GovernmentRegistry] Failed to clear cache:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to clear cache",
          cause: error,
        });
      }
    }),

  /**
   * Get available states
   */
  getAvailableStates: publicProcedure.query(() => {
    const states = RegistryFactory.getAvailableStates();
    return {
      success: true,
      data: states,
    };
  }),

  /**
   * Get user's verification history
   */
  getUserVerificationHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        search: z.string().optional(),
        state: z.string().optional(),
        status: z.string().optional(),
        sortBy: z.enum(["date", "state", "status"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const history = await db.getUserVerificationHistory(
          ctx.user.id,
          input
        );
        return history;
      } catch (error: any) {
        console.error(
          "[GovernmentRegistry] Failed to get verification history:",
          error
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve verification history",
          cause: error,
        });
      }
    }),

  /**
   * Get all verification history (admin only)
   */
  getAllVerificationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      // Only allow admin users
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can access all verification history",
        });
      }

      try {
        const history = await db.getAllVerificationHistory(input.limit);
        return {
          success: true,
          data: history,
        };
      } catch (error: any) {
        console.error(
          "[GovernmentRegistry] Failed to get all verification history:",
          error
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve verification history",
          cause: error,
        });
      }
    }),

  /**
   * Get verification statistics
   */
  getVerificationStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await db.getVerificationStats(ctx.user.id);
      return {
        success: true,
        data: stats,
      };
    } catch (error: any) {
      console.error(
        "[GovernmentRegistry] Failed to get verification stats:",
        error
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to retrieve verification statistics",
        cause: error,
      });
    }
  }),

  /**
   * Get all verification statistics (admin only)
   */
  getAllVerificationStats: protectedProcedure.query(async ({ ctx }) => {
    // Only allow admin users
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can access global statistics",
      });
    }

    try {
      const stats = await db.getVerificationStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error: any) {
      console.error(
        "[GovernmentRegistry] Failed to get all verification stats:",
        error
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to retrieve global statistics",
        cause: error,
      });
    }
  }),
});
