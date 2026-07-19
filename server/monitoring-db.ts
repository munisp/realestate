// @ts-nocheck
import { eq, and, gte, lte, desc, sql, count, avg, sum } from "drizzle-orm";
import { getDb } from "./db";
import {
  serviceHealth,
  apiUsage,
  metricsHourly,
  metricsDaily,
  costTracking,
  monitoringAlerts,
} from "../drizzle/schema";
import {
  InsertServiceHealth,
  InsertApiUsage,
  InsertMetricsHourly,
  InsertMetricsDaily,
  InsertCostTracking,
  InsertMonitoringAlert,
} from "../drizzle/monitoring-schema";

// ==================== Service Health ====================

export async function updateServiceHealth(data: InsertServiceHealth) {
  const db = await getDb();
  if (!db) return null;

  // Upsert based on serviceName
  const existing = await db
    .select()
    .from(serviceHealth)
    .where(eq(serviceHealth.serviceName, data.serviceName))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(serviceHealth)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(serviceHealth.serviceName, data.serviceName));
    return existing[0].id;
  } else {
    const [row] = await db.insert(serviceHealth).values(data).returning({ id: serviceHealth.id });
    return row?.id ?? null;
  }
}

export async function getServiceHealth(serviceName?: string) {
  const db = await getDb();
  if (!db) return [];

  if (serviceName) {
    return db
      .select()
      .from(serviceHealth)
      .where(eq(serviceHealth.serviceName, serviceName))
      .limit(1);
  }

  return db.select().from(serviceHealth).orderBy(desc(serviceHealth.lastCheckAt));
}

// ==================== API Usage Tracking ====================

export async function trackApiUsage(data: InsertApiUsage) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db.insert(apiUsage).values(data).returning({ id: apiUsage.id });
  return row?.id ?? null;
}

export async function getApiUsage(params: {
  serviceName?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(apiUsage);

  const conditions = [];
  if (params.serviceName) {
    conditions.push(eq(apiUsage.serviceName, params.serviceName));
  }
  if (params.startTime) {
    conditions.push(gte(apiUsage.timestamp, params.startTime));
  }
  if (params.endTime) {
    conditions.push(lte(apiUsage.timestamp, params.endTime));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(apiUsage.timestamp)) as any;

  if (params.limit) {
    query = query.limit(params.limit) as any;
  }

  return query;
}

export async function getApiUsageStats(params: {
  serviceName?: string;
  startTime: Date;
  endTime: Date;
}) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [
    gte(apiUsage.timestamp, params.startTime),
    lte(apiUsage.timestamp, params.endTime),
  ];

  if (params.serviceName) {
    conditions.push(eq(apiUsage.serviceName, params.serviceName));
  }

  const stats = await db
    .select({
      totalRequests: count(),
      successfulRequests: sum(
        sql`CASE WHEN ${apiUsage.statusCode} >= 200 AND ${apiUsage.statusCode} < 300 THEN 1 ELSE 0 END`
      ),
      failedRequests: sum(
        sql`CASE WHEN ${apiUsage.statusCode} >= 400 THEN 1 ELSE 0 END`
      ),
      cacheHits: sum(sql`CASE WHEN ${apiUsage.cacheHit} = 1 THEN 1 ELSE 0 END`),
      avgResponseTime: avg(apiUsage.responseTimeMs),
    })
    .from(apiUsage)
    .where(and(...conditions));

  return stats[0];
}

// ==================== Hourly Metrics ====================

export async function upsertHourlyMetrics(data: InsertMetricsHourly) {
  const db = await getDb();
  if (!db) return null;

  // Check if record exists for this service and hour
  const existing = await db
    .select()
    .from(metricsHourly)
    .where(
      and(
        eq(metricsHourly.serviceName, data.serviceName),
        eq(metricsHourly.hour, data.hour)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(metricsHourly)
      .set(data)
      .where(
        and(
          eq(metricsHourly.serviceName, data.serviceName),
          eq(metricsHourly.hour, data.hour)
        )
      );
    return existing[0].id;
  } else {
    const [row] = await db.insert(metricsHourly).values(data).returning({ id: metricsHourly.id });
    return row?.id ?? null;
  }
}

export async function getHourlyMetrics(params: {
  serviceName?: string;
  startHour: Date;
  endHour: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    gte(metricsHourly.hour, params.startHour),
    lte(metricsHourly.hour, params.endHour),
  ];

  if (params.serviceName) {
    conditions.push(eq(metricsHourly.serviceName, params.serviceName));
  }

  return db
    .select()
    .from(metricsHourly)
    .where(and(...conditions))
    .orderBy(desc(metricsHourly.hour));
}

// ==================== Daily Metrics ====================

export async function upsertDailyMetrics(data: InsertMetricsDaily) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db
    .select()
    .from(metricsDaily)
    .where(
      and(
        eq(metricsDaily.serviceName, data.serviceName),
        eq(metricsDaily.date, data.date)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(metricsDaily)
      .set(data)
      .where(
        and(
          eq(metricsDaily.serviceName, data.serviceName),
          eq(metricsDaily.date, data.date)
        )
      );
    return existing[0].id;
  } else {
    const [row] = await db.insert(metricsDaily).values(data).returning({ id: metricsDaily.id });
    return row?.id ?? null;
  }
}

export async function getDailyMetrics(params: {
  serviceName?: string;
  startDate: Date;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    gte(metricsDaily.date, params.startDate),
    lte(metricsDaily.date, params.endDate),
  ];

  if (params.serviceName) {
    conditions.push(eq(metricsDaily.serviceName, params.serviceName));
  }

  return db
    .select()
    .from(metricsDaily)
    .where(and(...conditions))
    .orderBy(desc(metricsDaily.date));
}

// ==================== Cost Tracking ====================

export async function trackCost(data: InsertCostTracking) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db.insert(costTracking).values(data).returning({ id: costTracking.id });
  return row?.id ?? null;
}

export async function getCostsByPeriod(params: {
  serviceName?: string;
  billingPeriod?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (params.serviceName) {
    conditions.push(eq(costTracking.serviceName, params.serviceName));
  }
  if (params.billingPeriod) {
    conditions.push(eq(costTracking.billingPeriod, params.billingPeriod));
  }
  if (params.startDate) {
    conditions.push(gte(costTracking.recordedAt, params.startDate));
  }
  if (params.endDate) {
    conditions.push(lte(costTracking.recordedAt, params.endDate));
  }

  let query = db.select().from(costTracking);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(costTracking.recordedAt));
}

export async function getTotalCostByService(params: {
  startDate: Date;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      serviceName: costTracking.serviceName,
      totalCost: sum(costTracking.amount),
      currency: costTracking.currency,
    })
    .from(costTracking)
    .where(
      and(
        gte(costTracking.recordedAt, params.startDate),
        lte(costTracking.recordedAt, params.endDate)
      )
    )
    .groupBy(costTracking.serviceName, costTracking.currency);
}

// ==================== Monitoring Alerts ====================

export async function createAlert(data: InsertMonitoringAlert) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db.insert(monitoringAlerts).values(data).returning({ id: monitoringAlerts.id });
  return row?.id ?? null;
}

export async function getAlerts(params: {
  serviceName?: string;
  resolved?: boolean;
  severity?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (params.serviceName) {
    conditions.push(eq(monitoringAlerts.serviceName, params.serviceName));
  }
  if (params.resolved !== undefined) {
    conditions.push(eq(monitoringAlerts.resolved, params.resolved));
  }
  if (params.severity) {
    conditions.push(eq(monitoringAlerts.severity, params.severity));
  }

  let query = db.select().from(monitoringAlerts);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(monitoringAlerts.createdAt)) as any;

  if (params.limit) {
    query = query.limit(params.limit) as any;
  }

  return query;
}

export async function resolveAlert(alertId: number) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(monitoringAlerts)
    .set({
      resolved: true,
      resolvedAt: new Date(),
    })
    .where(eq(monitoringAlerts.id, alertId));

  return true;
}

// ==================== Aggregation Helpers ====================

export async function aggregateHourlyMetrics(serviceName: string, hour: Date) {
  const db = await getDb();
  if (!db) return null;

  const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);

  // Get all API usage records for this hour
  const records = await db
    .select()
    .from(apiUsage)
    .where(
      and(
        eq(apiUsage.serviceName, serviceName),
        gte(apiUsage.timestamp, hour),
        lte(apiUsage.timestamp, hourEnd)
      )
    );

  if (records.length === 0) return null;

  // Calculate metrics
  const totalRequests = records.length;
  const successfulRequests = records.filter(
    (r) => r.statusCode >= 200 && r.statusCode < 300
  ).length;
  const failedRequests = records.filter((r) => r.statusCode >= 400).length;
  const cacheHits = records.filter((r) => r.cacheHit === true).length;
  const cacheMisses = totalRequests - cacheHits;

  const responseTimes = records.map((r) => r.responseTimeMs).sort((a, b) => a - b);
  const avgResponseTimeMs = Math.round(
    responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
  );
  const p50ResponseTimeMs = responseTimes[Math.floor(responseTimes.length * 0.5)];
  const p95ResponseTimeMs = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99ResponseTimeMs = responseTimes[Math.floor(responseTimes.length * 0.99)];

  const totalDataTransferMB = Math.round(
    records.reduce((sum, r) => sum + (r.responseSize || 0), 0) / (1024 * 1024)
  );

  // Estimate cost (simplified - adjust based on actual pricing)
  let estimatedCostUSD = 0;
  if (serviceName === "earth_engine") {
    estimatedCostUSD = Math.round((totalRequests * 0.001) * 100); // $0.001 per request, in cents
  } else if (serviceName === "worldbank") {
    estimatedCostUSD = 0; // Free API
  } else if (serviceName === "propertypro") {
    estimatedCostUSD = 0; // Self-hosted scraper
  }

  // Upsert hourly metrics
  await upsertHourlyMetrics({
    serviceName,
    hour,
    totalRequests,
    successfulRequests,
    failedRequests,
    cacheHits,
    cacheMisses,
    avgResponseTimeMs,
    p50ResponseTimeMs,
    p95ResponseTimeMs,
    p99ResponseTimeMs,
    totalDataTransferMB,
    estimatedCostUSD,
  });

  return true;
}

export async function aggregateDailyMetrics(serviceName: string, date: Date) {
  const db = await getDb();
  if (!db) return null;

  const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  // Get all API usage records for this day
  const records = await db
    .select()
    .from(apiUsage)
    .where(
      and(
        eq(apiUsage.serviceName, serviceName),
        gte(apiUsage.timestamp, date),
        lte(apiUsage.timestamp, dayEnd)
      )
    );

  if (records.length === 0) return null;

  const totalRequests = records.length;
  const successfulRequests = records.filter(
    (r) => r.statusCode >= 200 && r.statusCode < 300
  ).length;
  const failedRequests = records.filter((r) => r.statusCode >= 400).length;
  const cacheHits = records.filter((r) => r.cacheHit === true).length;
  const cacheMisses = totalRequests - cacheHits;

  const avgResponseTimeMs = Math.round(
    records.reduce((sum, r) => sum + r.responseTimeMs, 0) / records.length
  );

  const totalDataTransferMB = Math.round(
    records.reduce((sum, r) => sum + (r.responseSize || 0), 0) / (1024 * 1024)
  );

  const uniqueUsers = new Set(records.map((r) => r.userId).filter(Boolean)).size;
  const uniqueProperties = new Set(records.map((r) => r.propertyId).filter(Boolean)).size;

  // Estimate daily cost
  let estimatedCostUSD = 0;
  if (serviceName === "earth_engine") {
    estimatedCostUSD = Math.round((totalRequests * 0.001) * 100);
  }

  await upsertDailyMetrics({
    serviceName,
    date,
    totalRequests,
    successfulRequests,
    failedRequests,
    cacheHits,
    cacheMisses,
    avgResponseTimeMs,
    totalDataTransferMB,
    estimatedCostUSD: estimatedCostUSD.toString(),
    uniqueUsers,
    uniqueProperties,
  });

  return true;
}
