// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as monitoringDb from "../monitoring-db";

/**
 * Monitoring Dashboard Router
 * Provides API endpoints for tracking data service metrics, costs, and health
 */

export const monitoringRouter = router({
  // ==================== Service Health ====================

  getServiceHealth: protectedProcedure
    .input(
      z
        .object({
          serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const health = await monitoringDb.getServiceHealth(input?.serviceName);
      return health;
    }),

  // ==================== API Usage Stats ====================

  getApiUsageStats: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        startTime: z.date(),
        endTime: z.date(),
      })
    )
    .query(async ({ input }) => {
      const stats = await monitoringDb.getApiUsageStats(input);
      return stats;
    }),

  getRecentApiCalls: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const calls = await monitoringDb.getApiUsage({
        serviceName: input.serviceName,
        limit: input.limit,
      });
      return calls;
    }),

  // ==================== Metrics ====================

  getHourlyMetrics: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        startHour: z.date(),
        endHour: z.date(),
      })
    )
    .query(async ({ input }) => {
      const metrics = await monitoringDb.getHourlyMetrics(input);
      return metrics;
    }),

  getDailyMetrics: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const metrics = await monitoringDb.getDailyMetrics(input);
      return metrics;
    }),

  // ==================== Cost Tracking ====================

  getCostsByPeriod: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        billingPeriod: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const costs = await monitoringDb.getCostsByPeriod(input);
      return costs;
    }),

  getTotalCostByService: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const costs = await monitoringDb.getTotalCostByService(input);
      return costs;
    }),

  // ==================== Alerts ====================

  getAlerts: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        resolved: z.boolean().optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const alerts = await monitoringDb.getAlerts(input);
      return alerts;
    }),

  resolveAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admins can resolve alerts
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can resolve alerts",
        });
      }

      await monitoringDb.resolveAlert(input.alertId);
      return { success: true };
    }),

  // ==================== Dashboard Overview ====================

  getDashboardOverview: protectedProcedure.query(async () => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get health status for all services
    const health = await monitoringDb.getServiceHealth();

    // Get 24-hour stats for each service
    const services = ["earth_engine", "worldbank", "propertypro"] as const;
    const stats24h = await Promise.all(
      services.map(async (serviceName) => {
        const stats = await monitoringDb.getApiUsageStats({
          serviceName,
          startTime: last24Hours,
          endTime: now,
        });
        return {
          serviceName,
          ...stats,
        };
      })
    );

    // Get total costs for last 7 days
    const costs = await monitoringDb.getTotalCostByService({
      startDate: last7Days,
      endDate: now,
    });

    // Get unresolved alerts
    const unresolvedAlerts = await monitoringDb.getAlerts({
      resolved: false,
      limit: 10,
    });

    return {
      health,
      stats24h,
      costs,
      unresolvedAlerts,
      timestamp: now,
    };
  }),

  // ==================== Performance Metrics ====================

  getPerformanceMetrics: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]),
        hours: z.number().min(1).max(168).default(24), // Up to 7 days
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      const startTime = new Date(now.getTime() - input.hours * 60 * 60 * 1000);

      // Round to start of hour
      startTime.setMinutes(0, 0, 0);

      const metrics = await monitoringDb.getHourlyMetrics({
        serviceName: input.serviceName,
        startHour: startTime,
        endHour: now,
      });

      return metrics;
    }),

  // ==================== Cache Performance ====================

  getCachePerformance: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]).optional(),
        days: z.number().min(1).max(30).default(7),
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const metrics = await monitoringDb.getDailyMetrics({
        serviceName: input.serviceName,
        startDate,
        endDate: now,
      });

      // Calculate cache hit rate for each day
      const cachePerformance = metrics.map((m) => ({
        date: m.date,
        serviceName: m.serviceName,
        cacheHitRate:
          m.totalRequests > 0
            ? Math.round((m.cacheHits / m.totalRequests) * 100)
            : 0,
        cacheHits: m.cacheHits,
        cacheMisses: m.cacheMisses,
        totalRequests: m.totalRequests,
      }));

      return cachePerformance;
    }),

  // ==================== Cost Projections ====================

  getCostProjections: protectedProcedure
    .input(
      z.object({
        serviceName: z.enum(["earth_engine", "worldbank", "propertypro"]),
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get daily metrics for last 30 days
      const metrics = await monitoringDb.getDailyMetrics({
        serviceName: input.serviceName,
        startDate: last30Days,
        endDate: now,
      });

      if (metrics.length === 0) {
        return {
          dailyAverage: 0,
          monthlyProjection: 0,
          yearlyProjection: 0,
        };
      }

      // Calculate average daily cost
      const totalCost = metrics.reduce((sum, m) => sum + m.estimatedCostUSD, 0);
      const dailyAverage = totalCost / metrics.length;

      return {
        dailyAverage: dailyAverage / 100, // Convert cents to dollars
        monthlyProjection: (dailyAverage * 30) / 100,
        yearlyProjection: (dailyAverage * 365) / 100,
        dataPoints: metrics.length,
      };
    }),

  // ==================== Usage Trends ====================

  getUsageTrends: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const services = ["earth_engine", "worldbank", "propertypro"] as const;

      const trends = await Promise.all(
        services.map(async (serviceName) => {
          const metrics = await monitoringDb.getDailyMetrics({
            serviceName,
            startDate,
            endDate: now,
          });

          return {
            serviceName,
            data: metrics.map((m) => ({
              date: m.date,
              totalRequests: m.totalRequests,
              successRate:
                m.totalRequests > 0
                  ? Math.round((m.successfulRequests / m.totalRequests) * 100)
                  : 0,
              avgResponseTime: m.avgResponseTimeMs,
              cacheHitRate:
                m.totalRequests > 0
                  ? Math.round((m.cacheHits / m.totalRequests) * 100)
                  : 0,
            })),
          };
        })
      );

      return trends;
    }),
});
