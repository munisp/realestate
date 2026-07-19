// @ts-nocheck
import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { alertConfigurations, alertHistory } from '../../drizzle/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { getJobStatuses, triggerJob } from '../jobs/scheduledJobs';
import { TRPCError } from '@trpc/server';

/**
 * Monitoring Router
 * 
 * Provides endpoints for monitoring dashboard, alert stats, and job management
 */

export const monitoringRouter = router({
  /**
   * Get alert statistics for overview dashboard
   */
  getAlertStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not available',
      });
    }

    try {
      // Count active alert configurations
      const activeAlertsResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(alertConfigurations)
        .where(eq(alertConfigurations.enabled, 1));

      // Count alerts triggered today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const triggeredTodayResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(alertHistory)
        .where(
          and(
            eq(alertHistory.status, 'triggered'),
            gte(alertHistory.triggeredAt, today)
          )
        );

      // Count critical alerts triggered in last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const criticalAlertsResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(alertHistory)
        .where(
          and(
            eq(alertHistory.severity, 'critical'),
            eq(alertHistory.status, 'triggered'),
            gte(alertHistory.triggeredAt, last24Hours)
          )
        );

      return {
        activeAlerts: activeAlertsResult[0]?.count || 0,
        triggeredToday: triggeredTodayResult[0]?.count || 0,
        criticalAlerts: criticalAlertsResult[0]?.count || 0,
      };
    } catch (error) {
      console.error('[Monitoring] Error getting alert stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch alert statistics',
      });
    }
  }),

  /**
   * Get scheduled job statuses
   */
  getJobStatuses: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }

    try {
      const statuses = getJobStatuses();
      return statuses;
    } catch (error) {
      console.error('[Monitoring] Error getting job statuses:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch job statuses',
      });
    }
  }),

  /**
   * Manually trigger a scheduled job
   */
  triggerJob: protectedProcedure
    .input(
      z.object({
        jobName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      try {
        await triggerJob(input.jobName);
        return {
          success: true,
          message: `Job ${input.jobName} triggered successfully`,
        };
      } catch (error: any) {
        console.error('[Monitoring] Error triggering job:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to trigger job',
        });
      }
    }),

  /**
   * Get data quality overview
   */
  getDataQualityOverview: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not available',
      });
    }

    try {
      // Get data quality metrics from dataQualityMetrics table
      // This is a simplified version - expand based on your schema
      
      // Mock data for now
      return {
        averageAccuracy: 85,
        totalValuations: 1250,
        freshDataPercentage: 92,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('[Monitoring] Error getting data quality overview:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch data quality overview',
      });
    }
  }),

  /**
   * Get recent alert history
   */
  getRecentAlerts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const alerts = await db
          .select()
          .from(alertHistory)
          .orderBy(desc(alertHistory.triggeredAt))
          .limit(input.limit);

        return alerts;
      } catch (error) {
        console.error('[Monitoring] Error getting recent alerts:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recent alerts',
        });
      }
    }),
});
