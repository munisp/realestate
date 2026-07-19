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
import { properties } from "./schema";

// ==================== ENUM DEFINITIONS ====================

export const landUseTypeEnum = pgEnum("landUseType", [
  "residential",
  "commercial",
  "industrial",
  "agricultural",
  "mixed_use",
  "recreational",
  "institutional",
]);

export const cofOStatusEnum = pgEnum("cofOStatus", [
  "valid",
  "expired",
  "pending_renewal",
  "revoked",
  "suspended",
  "under_review",
]);

export const verificationStatusEnum = pgEnum("landVerificationStatus", [
  "pending",
  "in_progress",
  "verified",
  "rejected",
  "requires_documents",
  "escalated",
]);

export const documentTypeEnum = pgEnum("landDocumentType", [
  "certificate_of_occupancy",
  "deed_of_assignment",
  "survey_plan",
  "building_approval",
  "tax_clearance",
  "development_permit",
  "land_purchase_receipt",
  "power_of_attorney",
  "governor_consent",
  "other",
]);

export const ownershipTypeEnum = pgEnum("ownershipType", [
  "individual",
  "corporate",
  "government",
  "cooperative",
  "trust",
  "joint_ownership",
]);

export const transferTypeEnum = pgEnum("transferType", [
  "sale",
  "gift",
  "inheritance",
  "court_order",
  "government_acquisition",
  "lease",
]);

export const syncStatusEnum = pgEnum("syncStatus", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "partial",
]);

export const registrySourceEnum = pgEnum("registrySource", [
  "lagos_state",
  "fct_abuja",
  "rivers_state",
  "kano_state",
  "oyo_state",
  "manual_entry",
]);

// ==================== TABLE DEFINITIONS ====================

/**
 * Land Records - Core land parcel information
 */
export const landRecords = pgTable(
  "land_records",
  {
    id: serial("id").primaryKey(),
    parcelId: varchar("parcel_id", { length: 100 }).notNull().unique(), // Unique government parcel ID
    propertyId: integer("property_id").references(() => properties.id), // Link to properties table if listed
    
    // Location Details
    address: text("address").notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    lga: varchar("lga", { length: 100 }), // Local Government Area
    ward: varchar("ward", { length: 100 }),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    
    // Land Details
    landSize: decimal("land_size", { precision: 12, scale: 2 }), // in square meters
    landSizeUnit: varchar("land_size_unit", { length: 20 }).default("sqm"),
    landUseType: landUseTypeEnum("land_use_type").notNull(),
    zoning: varchar("zoning", { length: 100 }),
    
    // Ownership
    currentOwnerId: integer("current_owner_id").references(() => users.id),
    ownershipType: ownershipTypeEnum("ownership_type").notNull(),
    
    // Verification
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by").references(() => users.id),
    
    // Blockchain
    blockchainHash: varchar("blockchain_hash", { length: 255 }),
    blockchainTransactionId: varchar("blockchain_transaction_id", { length: 255 }),
    isOnBlockchain: boolean("is_on_blockchain").default(false),
    
    // Metadata
    description: text("description"),
    metadata: json("metadata"), // Additional flexible data
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    parcelIdIdx: index("land_records_parcel_id_idx").on(table.parcelId),
    ownerIdx: index("land_records_owner_idx").on(table.currentOwnerId),
    cityIdx: index("land_records_city_idx").on(table.city),
    verifiedIdx: index("land_records_verified_idx").on(table.isVerified),
  })
);

/**
 * Certificate of Occupancy (C of O) Records
 */
export const certificateOfOccupancy = pgTable(
  "certificate_of_occupancy",
  {
    id: serial("id").primaryKey(),
    landRecordId: integer("land_record_id")
      .references(() => landRecords.id)
      .notNull(),
    
    // C of O Details
    cofONumber: varchar("cofo_number", { length: 100 }).notNull().unique(),
    fileNumber: varchar("file_number", { length: 100 }),
    issueDate: timestamp("issue_date").notNull(),
    expiryDate: timestamp("expiry_date"),
    issuingAuthority: varchar("issuing_authority", { length: 255 }).notNull(),
    registrySource: registrySourceEnum("registry_source").notNull(),
    
    // Status
    status: cofOStatusEnum("status").notNull().default("pending_renewal"),
    lastVerifiedDate: timestamp("last_verified_date"),
    
    // Holder Information
    holderName: varchar("holder_name", { length: 255 }).notNull(),
    holderAddress: text("holder_address"),
    holderIdNumber: varchar("holder_id_number", { length: 100 }),
    
    // Document
    documentUrl: varchar("document_url", { length: 500 }), // S3 URL to scanned C of O
    documentHash: varchar("document_hash", { length: 255 }), // SHA-256 hash for verification
    
    // Terms
    term: varchar("term", { length: 100 }), // e.g., "99 years"
    purpose: text("purpose"), // Purpose of grant
    conditions: text("conditions"), // Special conditions
    
    // Verification
    isAuthentic: boolean("is_authentic").default(false),
    verificationScore: integer("verification_score"), // 0-100
    verificationNotes: text("verification_notes"),
    
    // Blockchain
    blockchainHash: varchar("blockchain_hash", { length: 255 }),
    isOnBlockchain: boolean("is_on_blockchain").default(false),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    cofONumberIdx: index("cofo_number_idx").on(table.cofONumber),
    landRecordIdx: index("cofo_land_record_idx").on(table.landRecordId),
    statusIdx: index("cofo_status_idx").on(table.status),
  })
);

/**
 * Land Ownership History - Track all ownership transfers
 */
export const landOwnershipHistory = pgTable(
  "land_ownership_history",
  {
    id: serial("id").primaryKey(),
    landRecordId: integer("land_record_id")
      .references(() => landRecords.id)
      .notNull(),
    
    // Transfer Details
    transferType: transferTypeEnum("transfer_type").notNull(),
    transferDate: timestamp("transfer_date").notNull(),
    
    // Parties
    previousOwnerId: integer("previous_owner_id").references(() => users.id),
    previousOwnerName: varchar("previous_owner_name", { length: 255 }),
    newOwnerId: integer("new_owner_id").references(() => users.id),
    newOwnerName: varchar("new_owner_name", { length: 255 }).notNull(),
    
    // Transaction Details
    salePrice: decimal("sale_price", { precision: 15, scale: 2 }),
    currency: varchar("currency", { length: 10 }).default("NGN"),
    
    // Documentation
    deedOfAssignmentUrl: varchar("deed_of_assignment_url", { length: 500 }),
    governorConsentUrl: varchar("governor_consent_url", { length: 500 }),
    receiptUrl: varchar("receipt_url", { length: 500 }),
    
    // Legal
    lawyerName: varchar("lawyer_name", { length: 255 }),
    lawyerFirmName: varchar("lawyer_firm_name", { length: 255 }),
    registrationNumber: varchar("registration_number", { length: 100 }),
    
    // Blockchain
    blockchainTransactionHash: varchar("blockchain_transaction_hash", { length: 255 }),
    isOnBlockchain: boolean("is_on_blockchain").default(false),
    
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    landRecordIdx: index("ownership_history_land_idx").on(table.landRecordId),
    dateIdx: index("ownership_history_date_idx").on(table.transferDate),
    ownerIdx: index("ownership_history_owner_idx").on(table.newOwnerId),
  })
);

/**
 * Land Documents - Document vault for all land-related documents
 */
export const landDocuments = pgTable(
  "land_documents",
  {
    id: serial("id").primaryKey(),
    landRecordId: integer("land_record_id")
      .references(() => landRecords.id)
      .notNull(),
    
    // Document Details
    documentType: documentTypeEnum("document_type").notNull(),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    documentNumber: varchar("document_number", { length: 100 }),
    
    // File
    fileUrl: varchar("file_url", { length: 500 }).notNull(),
    fileSize: integer("file_size"), // in bytes
    fileType: varchar("file_type", { length: 50 }), // PDF, JPG, PNG
    fileHash: varchar("file_hash", { length: 255 }), // SHA-256 hash
    
    // Metadata
    issueDate: timestamp("issue_date"),
    expiryDate: timestamp("expiry_date"),
    issuingAuthority: varchar("issuing_authority", { length: 255 }),
    
    // Verification
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by").references(() => users.id),
    
    // Access Control
    uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
    isPublic: boolean("is_public").default(false),
    
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    landRecordIdx: index("land_documents_land_idx").on(table.landRecordId),
    typeIdx: index("land_documents_type_idx").on(table.documentType),
  })
);

/**
 * Land Verification Requests - Track verification workflow
 */
export const landVerificationRequests = pgTable(
  "land_verification_requests",
  {
    id: serial("id").primaryKey(),
    landRecordId: integer("land_record_id")
      .references(() => landRecords.id)
      .notNull(),
    cofOId: integer("cofo_id").references(() => certificateOfOccupancy.id),
    
    // Request Details
    requestType: varchar("request_type", { length: 50 }).notNull(), // "full_verification", "cofo_only", "ownership_only"
    status: verificationStatusEnum("status").notNull().default("pending"),
    
    // Requester
    requestedBy: integer("requested_by").references(() => users.id).notNull(),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    
    // Assignment
    assignedTo: integer("assigned_to").references(() => users.id),
    assignedAt: timestamp("assigned_at"),
    
    // Progress
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    
    // Results
    verificationResult: varchar("verification_result", { length: 50 }), // "verified", "rejected", "partial"
    verificationScore: integer("verification_score"), // 0-100
    verificationReport: text("verification_report"),
    verificationReportUrl: varchar("verification_report_url", { length: 500 }), // PDF report
    
    // Issues Found
    issuesFound: json("issues_found"), // Array of issues
    recommendedActions: text("recommended_actions"),
    
    // Documents Checked
    documentsChecked: json("documents_checked"), // Array of document IDs
    
    // Government Registry Check
    registryCheckPerformed: boolean("registry_check_performed").default(false),
    registryCheckResult: json("registry_check_result"),
    
    // Blockchain Check
    blockchainCheckPerformed: boolean("blockchain_check_performed").default(false),
    blockchainCheckResult: json("blockchain_check_result"),
    
    // Fees
    verificationFee: decimal("verification_fee", { precision: 10, scale: 2 }),
    paymentStatus: varchar("payment_status", { length: 50 }),
    
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    landRecordIdx: index("verification_requests_land_idx").on(table.landRecordId),
    statusIdx: index("verification_requests_status_idx").on(table.status),
    requesterIdx: index("verification_requests_requester_idx").on(table.requestedBy),
  })
);

/**
 * Government Registry Sync - Track synchronization with government databases
 */
export const governmentRegistrySync = pgTable(
  "government_registry_sync",
  {
    id: serial("id").primaryKey(),
    
    // Registry Details
    registrySource: registrySourceEnum("registry_source").notNull(),
    registryApiEndpoint: varchar("registry_api_endpoint", { length: 500 }),
    
    // Sync Details
    syncType: varchar("sync_type", { length: 50 }).notNull(), // "full", "incremental", "single_record"
    status: syncStatusEnum("status").notNull().default("pending"),
    
    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    nextScheduledSync: timestamp("next_scheduled_sync"),
    
    // Results
    recordsProcessed: integer("records_processed").default(0),
    recordsAdded: integer("records_added").default(0),
    recordsUpdated: integer("records_updated").default(0),
    recordsFailed: integer("records_failed").default(0),
    
    // Errors
    errorCount: integer("error_count").default(0),
    errorLog: json("error_log"), // Array of errors
    
    // Performance
    durationSeconds: integer("duration_seconds"),
    apiCallCount: integer("api_call_count").default(0),
    
    // Metadata
    syncTriggeredBy: integer("sync_triggered_by").references(() => users.id),
    syncMetadata: json("sync_metadata"),
    
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    sourceIdx: index("registry_sync_source_idx").on(table.registrySource),
    statusIdx: index("registry_sync_status_idx").on(table.status),
    dateIdx: index("registry_sync_date_idx").on(table.startedAt),
  })
);

// Type exports for use in application code
export type LandRecord = typeof landRecords.$inferSelect;
export type InsertLandRecord = typeof landRecords.$inferInsert;

export type CertificateOfOccupancy = typeof certificateOfOccupancy.$inferSelect;
export type InsertCertificateOfOccupancy = typeof certificateOfOccupancy.$inferInsert;

export type LandOwnershipHistory = typeof landOwnershipHistory.$inferSelect;
export type InsertLandOwnershipHistory = typeof landOwnershipHistory.$inferInsert;

export type LandDocument = typeof landDocuments.$inferSelect;
export type InsertLandDocument = typeof landDocuments.$inferInsert;

export type LandVerificationRequest = typeof landVerificationRequests.$inferSelect;
export type InsertLandVerificationRequest = typeof landVerificationRequests.$inferInsert;

export type GovernmentRegistrySync = typeof governmentRegistrySync.$inferSelect;
export type InsertGovernmentRegistrySync = typeof governmentRegistrySync.$inferInsert;

// Import properties and users tables (these should exist in main schema)
import { properties } from "./schema";
import { users } from "./schema";

/**
 * C of O Verification History - Track all verification requests and results
 * Used for audit trails, analytics, and user verification history
 */
export const cofOVerificationHistory = pgTable(
  "cofo_verification_history",
  {
    id: serial("id").primaryKey(),
    
    // User who initiated verification
    userId: integer("user_id").references(() => users.id),
    
    // Verification Input
    cofONumber: varchar("cofo_number", { length: 100 }).notNull(),
    state: varchar("state", { length: 50 }), // LAGOS, FCT, etc.
    multiState: boolean("multi_state").default(false),
    
    // Verification Result
    isValid: boolean("is_valid"),
    verificationScore: integer("verification_score"), // 0-100
    status: varchar("status", { length: 50 }), // active, expired, revoked, suspended
    
    // Result Details (stored as JSON for flexibility)
    resultData: json("result_data"), // Full verification result from API
    
    // Consensus Data (for multi-state verifications)
    consensusData: json("consensus_data"), // Aggregated results from multiple states
    sources: json("sources"), // Array of state codes that were queried
    
    // Performance Metrics
    cached: boolean("cached").default(false), // Was result from cache?
    responseTime: integer("response_time"), // milliseconds
    apiCallCount: integer("api_call_count").default(1), // Number of API calls made
    
    // Metadata
    userAgent: varchar("user_agent", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("verification_history_user_idx").on(table.userId),
    cofOIdx: index("verification_history_cofo_idx").on(table.cofONumber),
    dateIdx: index("verification_history_date_idx").on(table.createdAt),
    stateIdx: index("verification_history_state_idx").on(table.state),
  })
);

export type CofOVerificationHistory = typeof cofOVerificationHistory.$inferSelect;
export type InsertCofOVerificationHistory = typeof cofOVerificationHistory.$inferInsert;
