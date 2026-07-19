import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  triggerDailyPriceCheck,
  triggerWeeklySummary,
  getSchedulerStatus,
} from "../schedulers/competitorTrackingScheduler";

/**
 * Job Management Router
 * 
 * Provides admin endpoints for managing scheduled jobs
 * - Manual job triggers for testing
 * - Job status monitoring
 * - Job history and logs
 */

export const jobManagementRouter = router({
  // Get scheduler status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can view job status
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can view job status",
      });
    }

    return getSchedulerStatus();
  }),

  // Manually trigger daily price check
  triggerDailyPriceCheck: protectedProcedure.mutation(async ({ ctx }) => {
    // Only admins can trigger jobs
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can trigger jobs",
      });
    }

    console.log(`[JobManagement] Daily price check triggered by admin ${ctx.user.id}`);
    
    const result = await triggerDailyPriceCheck();
    
    return {
      success: result.success,
      message: `Price check completed: ${result.propertiesChecked} properties checked, ${result.priceChangesDetected} changes detected, ${result.emailsSent} emails sent`,
      details: result,
    };
  }),

  // Manually trigger weekly summary
  triggerWeeklySummary: protectedProcedure.mutation(async ({ ctx }) => {
    // Only admins can trigger jobs
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can trigger jobs",
      });
    }

    console.log(`[JobManagement] Weekly summary triggered by admin ${ctx.user.id}`);
    
    const result = await triggerWeeklySummary();
    
    return {
      success: result.success,
      message: `Weekly summary completed: ${result.usersProcessed} users processed, ${result.emailsSent} emails sent`,
      details: result,
    };
  }),
});
