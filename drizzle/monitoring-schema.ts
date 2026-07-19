import { integer, pgTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/pg-core";

/**
 * Data Services Monitoring Schema
 * Tracks API usage, performance metrics, costs, and health status
 */

// Service health status tracking
export const serviceHealth = pgTable("serviceHealth", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceName: varchar("serviceName", { length: 64 }).notNull(), // earth_engine, worldbank, propertypro
  status: varchar("status", { length: 32 }).notNull(), // healthy, degraded, down
  mockMode: boolean("mockMode").default(true).notNull(),
  initialized: boolean("initialized").default(false).notNull(),
  lastCheckAt: timestamp("lastCheckAt").defaultNow().notNull(),
  responseTimeMs: integer("responseTimeMs"), // Last response time
  errorMessage: text("errorMessage"),
  metadata: json("metadata"), // Additional service-specific data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// API usage tracking
export const apiUsage = pgTable("apiUsage", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceName: varchar("serviceName", { length: 64 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(), // GET, POST
  statusCode: integer("statusCode").notNull(),
  responseTimeMs: integer("responseTimeMs").notNull(),
  cacheHit: boolean("cacheHit").default(false).notNull(),
  mockData: boolean("mockData").default(true).notNull(),
  requestSize: integer("requestSize"), // bytes
  responseSize: integer("responseSize"), // bytes
  errorMessage: text("errorMessage"),
  userId: integer("userId"), // Track which user made the request
  propertyId: integer("propertyId"), // Track which property was being valued
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata"), // Request parameters, etc.
});

// Aggregated metrics (hourly rollups)
export const metricsHourly = pgTable("metricsHourly", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceName: varchar("serviceName", { length: 64 }).notNull(),
  hour: timestamp("hour").notNull(), // Start of the hour
  totalRequests: integer("totalRequests").default(0).notNull(),
  successfulRequests: integer("successfulRequests").default(0).notNull(),
  failedRequests: integer("failedRequests").default(0).notNull(),
  cacheHits: integer("cacheHits").default(0).notNull(),
  cacheMisses: integer("cacheMisses").default(0).notNull(),
  avgResponseTimeMs: integer("avgResponseTimeMs").default(0).notNull(),
  p50ResponseTimeMs: integer("p50ResponseTimeMs").default(0).notNull(),
  p95ResponseTimeMs: integer("p95ResponseTimeMs").default(0).notNull(),
  p99ResponseTimeMs: integer("p99ResponseTimeMs").default(0).notNull(),
  totalDataTransferMB: decimal("totalDataTransferMB", { precision: 10, scale: 2 }).default("0").notNull(),
  estimatedCostUSD: decimal("estimatedCostUSD", { precision: 10, scale: 4 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Daily aggregated metrics
export const metricsDaily = pgTable("metricsDaily", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceName: varchar("serviceName", { length: 64 }).notNull(),
  date: timestamp("date").notNull(), // Start of the day
  totalRequests: integer("totalRequests").default(0).notNull(),
  successfulRequests: integer("successfulRequests").default(0).notNull(),
  failedRequests: integer("failedRequests").default(0).notNull(),
  cacheHits: integer("cacheHits").default(0).notNull(),
  cacheMisses: integer("cacheMisses").default(0).notNull(),
  avgResponseTimeMs: integer("avgResponseTimeMs").default(0).notNull(),
  totalDataTransferMB: decimal("totalDataTransferMB", { precision: 10, scale: 2 }).default("0").notNull(),
  estimatedCostUSD: decimal("estimatedCostUSD", { precision: 10, scale: 4 }).default("0").notNull(),
  uniqueUsers: integer("uniqueUsers").default(0).notNull(),
  uniqueProperties: integer("uniqueProperties").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Cost tracking
export const costTracking = pgTable("costTracking", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceName: varchar("serviceName", { length: 64 }).notNull(),
  costType: varchar("costType", { length: 64 }).notNull(), // api_call, data_transfer, storage
  amount: decimal("amount", { precision: 10, scale: 4 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  billingPeriod: varchar("billingPeriod", { length: 32 }).notNull(), // 2025-11, 2025-Q4
  description: text("description"),
  metadata: json("metadata"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

// Alerts and anomalies
export const monitoringAlerts = pgTable("monitoringAlerts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceName: varchar("serviceName", { length: 64 }).notNull(),
  alertType: varchar("alertType", { length: 64 }).notNull(), // high_error_rate, slow_response, cost_spike, service_down
  severity: varchar("severity", { length: 32 }).notNull(), // info, warning, critical
  message: text("message").notNull(),
  threshold: varchar("threshold", { length: 255 }), // e.g., "error_rate > 5%"
  actualValue: varchar("actualValue", { length: 255 }), // e.g., "error_rate = 12%"
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Export types
export type ServiceHealth = typeof serviceHealth.$inferSelect;
export type InsertServiceHealth = typeof serviceHealth.$inferInsert;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = typeof apiUsage.$inferInsert;

export type MetricsHourly = typeof metricsHourly.$inferSelect;
export type InsertMetricsHourly = typeof metricsHourly.$inferInsert;

export type MetricsDaily = typeof metricsDaily.$inferSelect;
export type InsertMetricsDaily = typeof metricsDaily.$inferInsert;

export type CostTracking = typeof costTracking.$inferSelect;
export type InsertCostTracking = typeof costTracking.$inferInsert;

export type MonitoringAlert = typeof monitoringAlerts.$inferSelect;
export type InsertMonitoringAlert = typeof monitoringAlerts.$inferInsert;
