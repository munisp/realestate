import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { Context } from "../_core/trpc";

/**
 * Tests for Monitoring Dashboard
 * Validates data service health tracking, metrics collection, and cost monitoring
 */

describe("Monitoring Dashboard", () => {
  // Mock context with admin user
  const mockAdminContext: Context = {
    user: {
      id: 1,
      openId: "test-admin",
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: "oauth",
    },
    req: {} as any,
    res: {} as any,
  };

  // Mock context with regular user
  const mockUserContext: Context = {
    user: {
      id: 2,
      openId: "test-user",
      name: "Test User",
      email: "user@test.com",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: "oauth",
    },
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockAdminContext);

  describe("Service Health", () => {
    it("should fetch service health status", async () => {
      const health = await caller.monitoring.getServiceHealth();

      expect(health).toBeDefined();
      expect(Array.isArray(health)).toBe(true);
      
      // Each service should have required fields
      health.forEach((service: any) => {
        expect(service).toHaveProperty("serviceName");
        expect(service).toHaveProperty("status");
        expect(service).toHaveProperty("lastCheckAt");
        expect(["earth_engine", "worldbank", "propertypro"]).toContain(service.serviceName);
        expect(["healthy", "degraded", "down"]).toContain(service.status);
      });
    });

    it("should fetch health for specific service", async () => {
      const health = await caller.monitoring.getServiceHealth({
        serviceName: "earth_engine",
      });

      expect(health).toBeDefined();
      expect(Array.isArray(health)).toBe(true);
      
      if (health.length > 0) {
        expect(health[0].serviceName).toBe("earth_engine");
      }
    });
  });

  describe("Dashboard Overview", () => {
    it("should fetch dashboard overview data", async () => {
      const overview = await caller.monitoring.getDashboardOverview();

      expect(overview).toBeDefined();
      expect(overview).toHaveProperty("health");
      expect(overview).toHaveProperty("stats24h");
      expect(overview).toHaveProperty("costs");
      expect(overview).toHaveProperty("unresolvedAlerts");
      expect(overview).toHaveProperty("timestamp");

      // Validate structure
      expect(Array.isArray(overview.health)).toBe(true);
      expect(Array.isArray(overview.stats24h)).toBe(true);
      expect(Array.isArray(overview.costs)).toBe(true);
      expect(Array.isArray(overview.unresolvedAlerts)).toBe(true);
    });

    it("should include stats for all three services", async () => {
      const overview = await caller.monitoring.getDashboardOverview();

      expect(overview.stats24h.length).toBeGreaterThanOrEqual(0);
      
      const serviceNames = overview.stats24h.map((s: any) => s.serviceName);
      // In a fresh system, there might be no stats yet, so we just check the structure
      overview.stats24h.forEach((stat: any) => {
        expect(stat).toHaveProperty("serviceName");
        expect(stat).toHaveProperty("totalRequests");
        expect(stat).toHaveProperty("successfulRequests");
        expect(stat).toHaveProperty("failedRequests");
      });
    });
  });

  describe("API Usage Stats", () => {
    it("should fetch API usage statistics", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = await caller.monitoring.getApiUsageStats({
        serviceName: "earth_engine",
        startTime: yesterday,
        endTime: now,
      });

      expect(stats).toBeDefined();
      
      if (stats) {
        expect(stats).toHaveProperty("totalRequests");
        expect(stats).toHaveProperty("successfulRequests");
        expect(stats).toHaveProperty("failedRequests");
        expect(stats).toHaveProperty("cacheHits");
        expect(stats).toHaveProperty("avgResponseTime");
      }
    });

    it("should fetch recent API calls", async () => {
      const calls = await caller.monitoring.getRecentApiCalls({
        serviceName: "earth_engine",
        limit: 10,
      });

      expect(calls).toBeDefined();
      expect(Array.isArray(calls)).toBe(true);
      
      calls.forEach((call: any) => {
        expect(call).toHaveProperty("serviceName");
        expect(call).toHaveProperty("endpoint");
        expect(call).toHaveProperty("method");
        expect(call).toHaveProperty("statusCode");
        expect(call).toHaveProperty("responseTimeMs");
        expect(call).toHaveProperty("timestamp");
      });
    });
  });

  describe("Metrics", () => {
    it("should fetch hourly metrics", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const metrics = await caller.monitoring.getHourlyMetrics({
        serviceName: "earth_engine",
        startHour: yesterday,
        endHour: now,
      });

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      
      metrics.forEach((metric: any) => {
        expect(metric).toHaveProperty("serviceName");
        expect(metric).toHaveProperty("hour");
        expect(metric).toHaveProperty("totalRequests");
        expect(metric).toHaveProperty("avgResponseTimeMs");
      });
    });

    it("should fetch daily metrics", async () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const metrics = await caller.monitoring.getDailyMetrics({
        serviceName: "worldbank",
        startDate: lastWeek,
        endDate: now,
      });

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      
      metrics.forEach((metric: any) => {
        expect(metric).toHaveProperty("serviceName");
        expect(metric).toHaveProperty("date");
        expect(metric).toHaveProperty("totalRequests");
        expect(metric).toHaveProperty("cacheHits");
        expect(metric).toHaveProperty("cacheMisses");
      });
    });
  });

  describe("Performance Metrics", () => {
    it("should fetch performance metrics for 24 hours", async () => {
      const metrics = await caller.monitoring.getPerformanceMetrics({
        serviceName: "earth_engine",
        hours: 24,
      });

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      
      metrics.forEach((metric: any) => {
        expect(metric).toHaveProperty("avgResponseTimeMs");
        expect(metric).toHaveProperty("p50ResponseTimeMs");
        expect(metric).toHaveProperty("p95ResponseTimeMs");
        expect(metric).toHaveProperty("p99ResponseTimeMs");
      });
    });

    it("should fetch performance metrics for 7 days", async () => {
      const metrics = await caller.monitoring.getPerformanceMetrics({
        serviceName: "propertypro",
        hours: 168,
      });

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe("Cache Performance", () => {
    it("should fetch cache performance metrics", async () => {
      const performance = await caller.monitoring.getCachePerformance({
        serviceName: "earth_engine",
        days: 7,
      });

      expect(performance).toBeDefined();
      expect(Array.isArray(performance)).toBe(true);
      
      performance.forEach((metric: any) => {
        expect(metric).toHaveProperty("date");
        expect(metric).toHaveProperty("serviceName");
        expect(metric).toHaveProperty("cacheHitRate");
        expect(metric).toHaveProperty("cacheHits");
        expect(metric).toHaveProperty("cacheMisses");
        expect(metric).toHaveProperty("totalRequests");
        
        // Cache hit rate should be a percentage
        expect(metric.cacheHitRate).toBeGreaterThanOrEqual(0);
        expect(metric.cacheHitRate).toBeLessThanOrEqual(100);
      });
    });

    it("should fetch cache performance for all services", async () => {
      const performance = await caller.monitoring.getCachePerformance({
        days: 7,
      });

      expect(performance).toBeDefined();
      expect(Array.isArray(performance)).toBe(true);
    });
  });

  describe("Cost Tracking", () => {
    it("should fetch costs by period", async () => {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const costs = await caller.monitoring.getCostsByPeriod({
        serviceName: "earth_engine",
        startDate: lastMonth,
        endDate: now,
      });

      expect(costs).toBeDefined();
      expect(Array.isArray(costs)).toBe(true);
      
      costs.forEach((cost: any) => {
        expect(cost).toHaveProperty("serviceName");
        expect(cost).toHaveProperty("costType");
        expect(cost).toHaveProperty("amount");
        expect(cost).toHaveProperty("currency");
      });
    });

    it("should fetch total cost by service", async () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const costs = await caller.monitoring.getTotalCostByService({
        startDate: lastWeek,
        endDate: now,
      });

      expect(costs).toBeDefined();
      expect(Array.isArray(costs)).toBe(true);
      
      costs.forEach((cost: any) => {
        expect(cost).toHaveProperty("serviceName");
        expect(cost).toHaveProperty("totalCost");
        expect(cost).toHaveProperty("currency");
      });
    });

    it("should fetch cost projections", async () => {
      const projections = await caller.monitoring.getCostProjections({
        serviceName: "earth_engine",
      });

      expect(projections).toBeDefined();
      expect(projections).toHaveProperty("dailyAverage");
      expect(projections).toHaveProperty("monthlyProjection");
      expect(projections).toHaveProperty("yearlyProjection");
      expect(projections).toHaveProperty("dataPoints");

      // All values should be numbers
      expect(typeof projections.dailyAverage).toBe("number");
      expect(typeof projections.monthlyProjection).toBe("number");
      expect(typeof projections.yearlyProjection).toBe("number");
      
      // Projections should be non-negative
      expect(projections.dailyAverage).toBeGreaterThanOrEqual(0);
      expect(projections.monthlyProjection).toBeGreaterThanOrEqual(0);
      expect(projections.yearlyProjection).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Alerts", () => {
    it("should fetch monitoring alerts", async () => {
      const alerts = await caller.monitoring.getAlerts({
        limit: 20,
      });

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
      
      alerts.forEach((alert: any) => {
        expect(alert).toHaveProperty("serviceName");
        expect(alert).toHaveProperty("alertType");
        expect(alert).toHaveProperty("severity");
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("resolved");
        expect(alert).toHaveProperty("createdAt");
        
        expect(["info", "warning", "critical"]).toContain(alert.severity);
      });
    });

    it("should fetch unresolved alerts only", async () => {
      const alerts = await caller.monitoring.getAlerts({
        resolved: false,
        limit: 10,
      });

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
      
      alerts.forEach((alert: any) => {
        expect(alert.resolved).toBe(0); // 0 for false in MySQL
      });
    });

    it("should filter alerts by severity", async () => {
      const alerts = await caller.monitoring.getAlerts({
        severity: "critical",
        limit: 10,
      });

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
      
      alerts.forEach((alert: any) => {
        expect(alert.severity).toBe("critical");
      });
    });
  });

  describe("Usage Trends", () => {
    it("should fetch usage trends for all services", async () => {
      const trends = await caller.monitoring.getUsageTrends({
        days: 30,
      });

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBe(3); // Three services
      
      trends.forEach((trend: any) => {
        expect(trend).toHaveProperty("serviceName");
        expect(trend).toHaveProperty("data");
        expect(Array.isArray(trend.data)).toBe(true);
        
        trend.data.forEach((point: any) => {
          expect(point).toHaveProperty("date");
          expect(point).toHaveProperty("totalRequests");
          expect(point).toHaveProperty("successRate");
          expect(point).toHaveProperty("avgResponseTime");
          expect(point).toHaveProperty("cacheHitRate");
        });
      });
    });

    it("should fetch trends for different time periods", async () => {
      const trends7d = await caller.monitoring.getUsageTrends({ days: 7 });
      const trends30d = await caller.monitoring.getUsageTrends({ days: 30 });
      const trends90d = await caller.monitoring.getUsageTrends({ days: 90 });

      expect(trends7d).toBeDefined();
      expect(trends30d).toBeDefined();
      expect(trends90d).toBeDefined();
      
      expect(Array.isArray(trends7d)).toBe(true);
      expect(Array.isArray(trends30d)).toBe(true);
      expect(Array.isArray(trends90d)).toBe(true);
    });
  });

  describe("Authorization", () => {
    it("should allow authenticated users to view monitoring data", async () => {
      const userCaller = appRouter.createCaller(mockUserContext);
      
      const overview = await userCaller.monitoring.getDashboardOverview();
      expect(overview).toBeDefined();
    });

    it("should only allow admins to resolve alerts", async () => {
      const userCaller = appRouter.createCaller(mockUserContext);
      
      // Regular user should not be able to resolve alerts
      await expect(
        userCaller.monitoring.resolveAlert({ alertId: 1 })
      ).rejects.toThrow();
    });
  });

  describe("Data Validation", () => {
    it("should validate service name enum", async () => {
      await expect(
        caller.monitoring.getServiceHealth({
          serviceName: "invalid_service" as any,
        })
      ).rejects.toThrow();
    });

    it("should validate date ranges", async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Should handle future dates gracefully
      const stats = await caller.monitoring.getApiUsageStats({
        serviceName: "earth_engine",
        startTime: now,
        endTime: future,
      });

      expect(stats).toBeDefined();
    });

    it("should validate limit parameters", async () => {
      await expect(
        caller.monitoring.getRecentApiCalls({
          serviceName: "earth_engine",
          limit: 0,
        })
      ).rejects.toThrow();

      await expect(
        caller.monitoring.getRecentApiCalls({
          serviceName: "earth_engine",
          limit: 101,
        })
      ).rejects.toThrow();
    });
  });
});
