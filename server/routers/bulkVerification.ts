import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { bulkVerificationService } from "../services/bulkVerificationService";
import { TRPCError } from "@trpc/server";

export const bulkVerificationRouter = router({
  /**
   * Upload CSV and create bulk verification job
   */
  uploadCSV: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileBase64: z.string(), // Base64 encoded CSV file
        metadata: z
          .object({
            clientName: z.string().optional(),
            department: z.string().optional(),
            requestReference: z.string().optional(),
            notificationEmail: z.string().email().optional(),
            notificationPhone: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Decode base64
        const fileBuffer = Buffer.from(input.fileBase64, "base64");

        // Validate file size (max 10MB)
        if (fileBuffer.length > 10 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size exceeds 10MB limit",
          });
        }

        // Create bulk job
        const jobId = await bulkVerificationService.createBulkJob(
          ctx.user.id,
          input.fileName,
          fileBuffer,
          input.metadata
        );

        return {
          success: true,
          jobId,
          message: "Bulk verification job created successfully",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create bulk verification job",
        });
      }
    }),

  /**
   * Get job status and progress
   */
  getJobStatus: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const status = await bulkVerificationService.getJobStatus(input.jobId);

        // Verify user owns this job
        if (status.job.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this job",
          });
        }

        return status;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to get job status",
        });
      }
    }),

  /**
   * List user's bulk verification jobs
   */
  listJobs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z
          .enum(["pending", "processing", "completed", "failed", "cancelled"])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { bulkVerificationJobs } = await import(
          "../../drizzle/schema-bulk-verification"
        );
        const { eq, and, desc } = await import("drizzle-orm");

        let query = db
          .select()
          .from(bulkVerificationJobs)
          .where(eq(bulkVerificationJobs.userId, ctx.user.id))
          .orderBy(desc(bulkVerificationJobs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        if (input.status) {
          query = db
            .select()
            .from(bulkVerificationJobs)
            .where(
              and(
                eq(bulkVerificationJobs.userId, ctx.user.id),
                eq(bulkVerificationJobs.status, input.status)
              )
            )
            .orderBy(desc(bulkVerificationJobs.createdAt))
            .limit(input.limit)
            .offset(input.offset);
        }

        const jobs = await query;

        return {
          jobs,
          hasMore: jobs.length === input.limit,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to list jobs",
        });
      }
    }),

  /**
   * Cancel a bulk verification job
   */
  cancelJob: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify ownership
        const status = await bulkVerificationService.getJobStatus(input.jobId);
        if (status.job.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this job",
          });
        }

        // Cancel job
        await bulkVerificationService.cancelJob(input.jobId);

        return {
          success: true,
          message: "Job cancelled successfully",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to cancel job",
        });
      }
    }),

  /**
   * Download results CSV
   */
  getResultsUrl: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const status = await bulkVerificationService.getJobStatus(input.jobId);

        // Verify ownership
        if (status.job.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this job",
          });
        }

        if (!status.job.resultsFileUrl) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Results not yet available",
          });
        }

        return {
          url: status.job.resultsFileUrl,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to get results URL",
        });
      }
    }),

  /**
   * Get bulk verification statistics
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { bulkVerificationJobs } = await import(
        "../../drizzle/schema-bulk-verification"
      );
      const { eq, sql, and, gte } = await import("drizzle-orm");

      // Get total jobs
      const totalJobsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(bulkVerificationJobs)
        .where(eq(bulkVerificationJobs.userId, ctx.user.id));

      const totalJobs = Number(totalJobsResult[0]?.count || 0);

      // Get jobs in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentJobsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(bulkVerificationJobs)
        .where(
          and(
            eq(bulkVerificationJobs.userId, ctx.user.id),
            gte(bulkVerificationJobs.createdAt, thirtyDaysAgo)
          )
        );

      const recentJobs = Number(recentJobsResult[0]?.count || 0);

      // Get total items processed
      const totalItemsResult = await db
        .select({
          total: sql<number>`sum(${bulkVerificationJobs.totalItems})`,
          successful: sql<number>`sum(${bulkVerificationJobs.successfulItems})`,
          failed: sql<number>`sum(${bulkVerificationJobs.failedItems})`,
        })
        .from(bulkVerificationJobs)
        .where(eq(bulkVerificationJobs.userId, ctx.user.id));

      const stats = totalItemsResult[0] || {
        total: 0,
        successful: 0,
        failed: 0,
      };

      return {
        totalJobs,
        recentJobs,
        totalItemsProcessed: Number(stats.total || 0),
        successfulItems: Number(stats.successful || 0),
        failedItems: Number(stats.failed || 0),
        successRate:
          Number(stats.total || 0) > 0
            ? ((Number(stats.successful || 0) / Number(stats.total || 0)) * 100).toFixed(2)
            : "0.00",
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to get statistics",
      });
    }
  }),
});
