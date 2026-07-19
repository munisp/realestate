import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
  json,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ==================== ENUM DEFINITIONS ====================

export const bulkJobStatusEnum = pgEnum("bulkJobStatus", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const bulkItemStatusEnum = pgEnum("bulkItemStatus", [
  "pending",
  "processing",
  "completed",
  "failed",
  "skipped",
]);

// ==================== BULK VERIFICATION TABLES ====================

/**
 * Bulk Verification Jobs
 * Tracks batch verification requests from institutional clients
 */
export const bulkVerificationJobs = pgTable(
  "bulk_verification_jobs",
  {
    id: serial("id").primaryKey(),
    jobId: varchar("jobId", { length: 100 }).notNull().unique(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Job metadata
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(), // S3 URL of uploaded CSV
    totalItems: integer("totalItems").notNull().default(0),
    processedItems: integer("processedItems").notNull().default(0),
    successfulItems: integer("successfulItems").notNull().default(0),
    failedItems: integer("failedItems").notNull().default(0),
    
    // Status and progress
    status: bulkJobStatusEnum("status").notNull().default("pending"),
    progress: decimal("progress", { precision: 5, scale: 2 }).notNull().default("0.00"), // 0-100%
    
    // Results
    resultsFileUrl: text("resultsFileUrl"), // S3 URL of results CSV
    errorLog: json("errorLog").$type<Array<{ row: number; error: string }>>(),
    
    // Timing
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    estimatedCompletionAt: timestamp("estimatedCompletionAt"),
    
    // Configuration
    priority: integer("priority").notNull().default(0), // Higher = more priority
    rateLimitPerMinute: integer("rateLimitPerMinute").notNull().default(10),
    
    // Metadata
    metadata: json("metadata").$type<{
      clientName?: string;
      department?: string;
      requestReference?: string;
      notificationEmail?: string;
      notificationPhone?: string;
    }>(),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("bulk_jobs_user_id_idx").on(table.userId),
    statusIdx: index("bulk_jobs_status_idx").on(table.status),
    createdAtIdx: index("bulk_jobs_created_at_idx").on(table.createdAt),
  })
);

/**
 * Bulk Verification Items
 * Individual verification requests within a bulk job
 */
export const bulkVerificationItems = pgTable(
  "bulk_verification_items",
  {
    id: serial("id").primaryKey(),
    jobId: integer("jobId")
      .notNull()
      .references(() => bulkVerificationJobs.id, { onDelete: "cascade" }),
    
    // Item identification
    rowNumber: integer("rowNumber").notNull(), // Row in CSV file
    itemId: varchar("itemId", { length: 100 }), // Optional client reference ID
    
    // C of O details from CSV
    cofONumber: varchar("cofONumber", { length: 100 }).notNull(),
    state: varchar("state", { length: 50 }).notNull(),
    lga: varchar("lga", { length: 100 }),
    propertyAddress: text("propertyAddress"),
    ownerName: varchar("ownerName", { length: 255 }),
    
    // Verification status
    status: bulkItemStatusEnum("status").notNull().default("pending"),
    
    // Verification results
    verificationScore: integer("verificationScore"), // 0-100
    isVerified: boolean("isVerified"),
    verificationDetails: json("verificationDetails").$type<{
      governmentVerification?: {
        status: string;
        confidence: number;
        registryData?: any;
      };
      fraudDetection?: {
        riskLevel: string;
        riskScore: number;
        flags: string[];
      };
      geospatialValidation?: {
        coordinatesMatch: boolean;
        distanceMeters?: number;
        boundaryOverlap?: number;
      };
    }>(),
    
    // Error handling
    errorMessage: text("errorMessage"),
    retryCount: integer("retryCount").notNull().default(0),
    
    // Timing
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    processingTimeMs: integer("processingTimeMs"),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index("bulk_items_job_id_idx").on(table.jobId),
    statusIdx: index("bulk_items_status_idx").on(table.status),
    cofONumberIdx: index("bulk_items_cofo_number_idx").on(table.cofONumber),
  })
);

// ==================== TYPE EXPORTS ====================

export type BulkVerificationJob = typeof bulkVerificationJobs.$inferSelect;
export type InsertBulkVerificationJob = typeof bulkVerificationJobs.$inferInsert;

export type BulkVerificationItem = typeof bulkVerificationItems.$inferSelect;
export type InsertBulkVerificationItem = typeof bulkVerificationItems.$inferInsert;
