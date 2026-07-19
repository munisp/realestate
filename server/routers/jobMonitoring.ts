import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { JobMonitoringService } from "../services/jobMonitoringService";

export const jobMonitoringRouter = router({
  /**
   * Get all jobs with optional filters
   */
  getJobs: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        jobType: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await JobMonitoringService.getJobs(input);
    }),

  /**
   * Get running jobs
   */
  getRunningJobs: protectedProcedure.query(async () => {
    return await JobMonitoringService.getRunningJobs();
  }),

  /**
   * Get job by ID
   */
  getJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      return await JobMonitoringService.getJob(input.jobId);
    }),

  /**
   * Cancel a job
   */
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      await JobMonitoringService.cancelJob(input.jobId);
      return { success: true };
    }),

  /**
   * Get job statistics
   */
  getJobStats: protectedProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      return await JobMonitoringService.getJobStats(input.days);
    }),

  /**
   * Get pending jobs from queue
   */
  getPendingJobs: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return await JobMonitoringService.getPendingJobs(input.limit);
    }),

  /**
   * Manually trigger a competitor tracking job
   */
  triggerJob: protectedProcedure
    .input(
      z.object({
        jobType: z.enum(['price_check', 'competitor_scan', 'market_summary']),
        propertyId: z.number().optional(),
        priority: z.number().min(1).max(10).default(5),
      })
    )
    .mutation(async ({ input }) => {
      // Create job in monitoring table
      const jobId = await JobMonitoringService.createJob({
        jobType: input.jobType,
        status: 'pending',
        propertyId: input.propertyId,
        progress: 0,
        totalItems: 0,
        processedItems: 0,
      });

      // Add to queue
      const queueId = await JobMonitoringService.enqueueJob({
        jobType: input.jobType,
        priority: input.priority,
        scheduledFor: new Date(),
        payload: JSON.stringify({ propertyId: input.propertyId }),
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
      });

      return { jobId, queueId, success: true };
    }),

  /**
   * Retry a failed job
   */
  retryJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      const job = await JobMonitoringService.getJob(input.jobId);
      if (!job) {
        throw new Error("Job not found");
      }

      if (job.status !== 'failed') {
        throw new Error("Only failed jobs can be retried");
      }

      // Reset job status
      await JobMonitoringService.updateStatus(input.jobId, 'pending');

      // Add to queue again
      const metadata = job.metadata ? JSON.parse(job.metadata) : {};
      const queueId = await JobMonitoringService.enqueueJob({
        jobType: job.jobType,
        priority: 5,
        scheduledFor: new Date(),
        payload: JSON.stringify({ propertyId: job.propertyId, ...metadata }),
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
      });

      return { jobId: input.jobId, queueId, success: true };
    }),
});
