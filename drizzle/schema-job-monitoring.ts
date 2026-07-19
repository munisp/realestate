import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

/**
 * Job Monitoring Schema
 * Tracks real-time progress of competitor tracking jobs
 */

export const jobMonitoring = pgTable("job_monitoring", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // 'price_check', 'competitor_scan', 'market_summary'
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  propertyId: integer("property_id"), // null for batch jobs
  progress: integer("progress").notNull().default(0), // 0-100
  totalItems: integer("total_items").notNull().default(0),
  processedItems: integer("processed_items").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional job-specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobQueue = pgTable("job_queue", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  priority: integer("priority").notNull().default(5), // 1-10, higher = more important
  scheduledFor: timestamp("scheduled_for").notNull(),
  payload: jsonb("payload").notNull(), // Job parameters
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobExecutionMetrics = pgTable("job_execution_metrics", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  executionTime: integer("execution_time"), // milliseconds
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsFailed: integer("items_failed").notNull().default(0),
  averageItemTime: integer("average_item_time"), // milliseconds per item
  peakMemoryUsage: integer("peak_memory_usage"), // MB
  cpuUsage: integer("cpu_usage"), // percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JobMonitoring = typeof jobMonitoring.$inferSelect;
export type InsertJobMonitoring = typeof jobMonitoring.$inferInsert;
export type JobQueue = typeof jobQueue.$inferSelect;
export type InsertJobQueue = typeof jobQueue.$inferInsert;
export type JobExecutionMetrics = typeof jobExecutionMetrics.$inferSelect;
export type InsertJobExecutionMetrics = typeof jobExecutionMetrics.$inferInsert;
