import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  boolean,
  text,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

// Enums
export const verificationFrequencyEnum = pgEnum("verification_frequency", [
  "monthly",
  "quarterly",
  "annually",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

/**
 * Scheduled Verifications
 * Tracks automated re-verification schedules for properties
 */
export const scheduledVerifications = pgTable("scheduled_verifications", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  userId: integer("userId"), // User who set up the schedule
  frequency: verificationFrequencyEnum("frequency").notNull(),
  nextVerificationDate: timestamp("nextVerificationDate").notNull(),
  lastVerificationDate: timestamp("lastVerificationDate"),
  lastVerificationId: integer("lastVerificationId"), // FK to cofOVerificationRequests
  alertOnChange: boolean("alertOnChange").default(true).notNull(),
  notificationEmail: varchar("notificationEmail", { length: 255 }),
  notificationPhone: varchar("notificationPhone", { length: 20 }),
  enabled: boolean("enabled").default(true).notNull(),
  verificationCount: integer("verificationCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Verification Change Alerts
 * Records when verification results change for scheduled verifications
 */
export const verificationChangeAlerts = pgTable("verification_change_alerts", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  scheduledVerificationId: integer("scheduledVerificationId").notNull(),
  previousVerificationId: integer("previousVerificationId").notNull(),
  currentVerificationId: integer("currentVerificationId").notNull(),
  previousStatus: varchar("previousStatus", { length: 50 }).notNull(),
  currentStatus: varchar("currentStatus", { length: 50 }).notNull(),
  changedFields: jsonb("changedFields").notNull(), // Array of field names
  severity: alertSeverityEnum("severity").notNull(),
  notificationSent: boolean("notificationSent").default(false).notNull(),
  notificationSentAt: timestamp("notificationSentAt"),
  acknowledgedBy: integer("acknowledgedBy"), // User who acknowledged the alert
  acknowledgedAt: timestamp("acknowledgedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Bulk Verification Jobs
 * Tracks batch verification requests from institutions
 */
export const bulkVerificationJobs = pgTable("bulk_verification_jobs", {
  id: serial("id").primaryKey(),
  requestedBy: integer("requestedBy").notNull(), // User/institution ID
  institutionName: varchar("institutionName", { length: 255 }),
  totalRecords: integer("totalRecords").notNull(),
  processedRecords: integer("processedRecords").default(0).notNull(),
  successfulVerifications: integer("successfulVerifications").default(0).notNull(),
  failedVerifications: integer("failedVerifications").default(0).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, processing, completed, failed
  priority: integer("priority").default(5).notNull(), // 1-10, higher = more urgent
  estimatedCompletionTime: timestamp("estimatedCompletionTime"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  errorMessage: text("errorMessage"),
  resultFileUrl: varchar("resultFileUrl", { length: 500 }), // S3 URL for results CSV
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Bulk Verification Items
 * Individual verification requests within a bulk job
 */
export const bulkVerificationItems = pgTable("bulk_verification_items", {
  id: serial("id").primaryKey(),
  bulkJobId: integer("bulkJobId").notNull(),
  rowNumber: integer("rowNumber").notNull(), // Original row in uploaded file
  cofONumber: varchar("cofONumber", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  ownerName: varchar("ownerName", { length: 255 }),
  parcelId: varchar("parcelId", { length: 100 }),
  verificationRequestId: integer("verificationRequestId"), // FK to cofOVerificationRequests
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, processing, completed, failed
  overallResult: varchar("overallResult", { length: 50 }), // verified, failed, suspicious
  errorMessage: text("errorMessage"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduledVerification = typeof scheduledVerifications.$inferSelect;
export type InsertScheduledVerification = typeof scheduledVerifications.$inferInsert;
export type VerificationChangeAlert = typeof verificationChangeAlerts.$inferSelect;
export type InsertVerificationChangeAlert = typeof verificationChangeAlerts.$inferInsert;
export type BulkVerificationJob = typeof bulkVerificationJobs.$inferSelect;
export type InsertBulkVerificationJob = typeof bulkVerificationJobs.$inferInsert;
export type BulkVerificationItem = typeof bulkVerificationItems.$inferSelect;
export type InsertBulkVerificationItem = typeof bulkVerificationItems.$inferInsert;

/**
 * Verification Report Templates
 * Stores customizable report templates for white-labeling
 */
export const verificationReportTemplates = pgTable("verification_report_templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // Owner of the template
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  companyName: varchar("companyName", { length: 255 }),
  primaryColor: varchar("primaryColor", { length: 7 }), // Hex color
  secondaryColor: varchar("secondaryColor", { length: 7 }), // Hex color
  footerText: text("footerText"),
  includeWatermark: boolean("includeWatermark").default(false).notNull(),
  watermarkText: varchar("watermarkText", { length: 100 }),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Generated Verification Reports
 * Tracks all generated PDF reports
 */
export const generatedVerificationReports = pgTable("generated_verification_reports", {
  id: serial("id").primaryKey(),
  verificationRequestId: integer("verificationRequestId").notNull(),
  templateId: integer("templateId"), // FK to verificationReportTemplates
  generatedBy: integer("generatedBy").notNull(), // User who generated the report
  reportUrl: varchar("reportUrl", { length: 500 }).notNull(), // S3 URL
  fileSize: integer("fileSize"), // Size in bytes
  downloadCount: integer("downloadCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerificationReportTemplate = typeof verificationReportTemplates.$inferSelect;
export type InsertVerificationReportTemplate = typeof verificationReportTemplates.$inferInsert;
export type GeneratedVerificationReport = typeof generatedVerificationReports.$inferSelect;
export type InsertGeneratedVerificationReport = typeof generatedVerificationReports.$inferInsert;
