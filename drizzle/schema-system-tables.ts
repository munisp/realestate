import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  index,
  boolean,
} from "drizzle-orm/pg-core";

// ==================== AUDIT LOGS ====================
// Tracks all significant user and system actions for compliance and debugging
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("userId", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resourceId", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  metadata: jsonb("metadata"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("audit_logs_user_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  resourceIdx: index("audit_logs_resource_idx").on(table.resource),
  createdIdx: index("audit_logs_created_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ==================== FLUVIO EVENTS ====================
// Tracks events published to and consumed from Fluvio streaming platform
export const fluvioEvents = pgTable("fluvio_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("eventId", { length: 255 }).notNull().unique(),
  topic: varchar("topic", { length: 255 }).notNull(),
  partition: integer("partition").notNull().default(0),
  offset: integer("offset"),
  payload: jsonb("payload").notNull(),
  source: varchar("source", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("published"),
  processedAt: timestamp("processedAt"),
  errorMessage: text("errorMessage"),
  retryCount: integer("retryCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  topicIdx: index("fluvio_events_topic_idx").on(table.topic),
  statusIdx: index("fluvio_events_status_idx").on(table.status),
  createdIdx: index("fluvio_events_created_idx").on(table.createdAt),
  eventIdIdx: index("fluvio_events_event_id_idx").on(table.eventId),
}));

export type FluvioEvent = typeof fluvioEvents.$inferSelect;
export type InsertFluvioEvent = typeof fluvioEvents.$inferInsert;

// ==================== APP VERSIONS ====================
// Tracks deployed application versions for cache-busting and rollback support
export const appVersions = pgTable("app_versions", {
  id: serial("id").primaryKey(),
  version: varchar("version", { length: 50 }).notNull(),
  buildHash: varchar("buildHash", { length: 64 }).notNull(),
  environment: varchar("environment", { length: 50 }).notNull().default("production"),
  deployedAt: timestamp("deployedAt").defaultNow().notNull(),
  deployedBy: varchar("deployedBy", { length: 255 }),
  changelog: text("changelog"),
  isActive: boolean("isActive").notNull().default(true),
  rollbackVersion: varchar("rollbackVersion", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  versionIdx: index("app_versions_version_idx").on(table.version),
  activeIdx: index("app_versions_active_idx").on(table.isActive),
  deployedIdx: index("app_versions_deployed_idx").on(table.deployedAt),
}));

export type AppVersion = typeof appVersions.$inferSelect;
export type InsertAppVersion = typeof appVersions.$inferInsert;
