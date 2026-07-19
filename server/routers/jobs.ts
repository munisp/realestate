/**
 * Jobs Router
 * 
 * Endpoints for managing and monitoring scheduled jobs
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getJobStatus, runValuationMonitoringJob } from "../jobs/valuationMonitoringJob";
import { TRPCError } from "@trpc/server";

export const jobsRouter = router({
  // Get valuation monitoring job status
  getValuationJobStatus: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can view job status
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return getJobStatus();
  }),

  // Manually trigger valuation monitoring job
  triggerValuationJob: protectedProcedure.mutation(async ({ ctx }) => {
    // Only admins can trigger jobs
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    // Run job in background
    runValuationMonitoringJob().catch((error) => {
      console.error("[Jobs Router] Error running valuation job:", error);
    });

    return {
      success: true,
      message: "Valuation monitoring job triggered",
    };
  }),
});
