// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getSchedulerStatus,
  runValuationCheckNow,
} from "../jobs/valuationAlertScheduler";
import { TRPCError } from "@trpc/server";

/**
 * Scheduler Management Router
 * 
 * Provides endpoints for managing and monitoring the valuation alert scheduler
 */

export const schedulerManagementRouter = router({
  /**
   * Get scheduler status
   */
  getStatus: protectedProcedure.query(() => {
    return getSchedulerStatus();
  }),

  /**
   * Run valuation check immediately (admin only)
   */
  runNow: protectedProcedure.mutation(async ({ ctx }) => {
    // Only admins can trigger immediate checks
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can trigger immediate valuation checks",
      });
    }

    try {
      const result = await runValuationCheckNow();
      return {
        success: true,
        alertsSent: result.alertsSent,
        totalFailed: result.totalFailed,
        message: `Valuation check completed: ${result.alertsSent} alerts sent, ${result.totalFailed} failed`,
      };
    } catch (error) {
      console.error("[SchedulerManagement] Error running immediate check:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to run valuation check",
      });
    }
  }),

  /**
   * Get recent scheduler runs (from logs)
   * In production, this would query a scheduler_runs table
   */
  getRecentRuns: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(({ input }) => {
      // Mock data - in production, query from database
      return {
        runs: [
          {
            id: 1,
            startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
            status: "completed",
            alertsSent: 15,
            totalFailed: 0,
            duration: 5 * 60,
          },
          {
            id: 2,
            startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 4 * 60 * 1000),
            status: "completed",
            alertsSent: 12,
            totalFailed: 1,
            duration: 4 * 60,
          },
        ].slice(0, input.limit),
      };
    }),
});
