import { integer, serial, pgEnum, pgTable, text, timestamp, varchar, index } from "drizzle-orm/pg-core";

// ==================== ENUM DEFINITIONS ====================
// Extracted from inline mysqlEnum declarations
// PostgreSQL requires enums to be declared separately before use

export const roleEnum_dd1e071b = pgEnum("role", ["user", "admin"]);
export const heatmapModeEnum_a9768c75 = pgEnum("heatmapMode", ["density", "price", "combined", "none"]);
export const propertyTypeEnum_d599603a = pgEnum("propertyType", ["single_family", "condo", "townhouse", "multi_family", "land", "commercial"]);
export const listingTypeEnum_cd70c642 = pgEnum("listingType", ["sale", "rent", "sold", "off_market"]);
export const statusEnum_b6bf8e76 = pgEnum("status", ["active", "pending", "sold", "off_market", "archived"]);
export const changeTypeEnum_47a91762 = pgEnum("changeType", ["created", "price_change", "status_change", "updated", "deleted"]);
export const transactionTypeEnum_90d42670 = pgEnum("transactionType", ["sale", "rent", "lease"]);
export const statusEnum_943da8d2 = pgEnum("status_2", ["pending", "in_progress", "completed", "cancelled"]);
export const paymentTypeEnum_fd531f00 = pgEnum("paymentType", ["deposit", "down_payment", "installment", "full_payment", "refund"]);
export const statusEnum_0ad463c6 = pgEnum("status_3", ["pending", "processing", "completed", "failed", "refunded", "escrow", "released"]);
export const boundaryTypeEnum_039a6a9e = pgEnum("boundaryType", ["none", "polygon", "circle", "rectangle"]);
export const frequencyEnum_a6e12b44 = pgEnum("frequency", ["instant", "daily", "weekly"]);
export const typeEnum_7ee49cbd = pgEnum("type", ["search_alert", "price_change", "new_listing", "message", "transaction"]);
export const tourTypeEnum_064ad23d = pgEnum("tourType", ["360_image", "3d_model", "video", "ar_view"]);
export const categoryEnum_9566a384 = pgEnum("category", ["deed", "inspection_report", "contract", "disclosure", "appraisal", "insurance", "tax_document", "id_verification", "title", "other"]);
export const statusEnum_52318bff = pgEnum("status_4", ["draft", "pending_signature", "signed", "archived"]);
export const signatureStatusEnum_c1df8c63 = pgEnum("signatureStatus", ["not_required", "pending", "signed", "rejected"]);
export const companyTypeEnum_a063ecd2 = pgEnum("companyType", ["individual", "llc", "corporation", "partnership"]);
export const verificationStatusEnum_e47d1757 = pgEnum("verificationStatus", ["pending", "in_review", "verified", "rejected"]);
export const projectTypeEnum_cbddd29b = pgEnum("projectType", ["residential", "commercial", "mixed_use"]);
export const constructionStatusEnum_c54de9e8 = pgEnum("constructionStatus", ["pre_construction", "under_construction", "completed"]);
export const statusEnum_1f6b21ef = pgEnum("status_5", ["draft", "published", "sold_out", "archived"]);
export const statusEnum_6ceb5992 = pgEnum("status_6", ["pending", "in_progress", "completed", "verified"]);
export const statusEnum_1b8f2edf = pgEnum("status_7", ["pending", "published", "flagged", "removed"]);
export const statusEnum_db3817aa = pgEnum("status_8", ["active", "inactive", "suspended"]);
export const statusEnum_21170224 = pgEnum("status_9", ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "completed"]);
export const paymentStatusEnum_bec8ddc4 = pgEnum("paymentStatus", ["pending", "paid", "refunded"]);
export const tourTypeEnum_73dc4f3c = pgEnum("tourType_2", ["in_person", "virtual"]);
export const statusEnum_09226ac2 = pgEnum("status_10", ["pending", "confirmed", "cancelled", "completed"]);
export const activityTypeEnum_de0638ae = pgEnum("activityType", ["view", "search", "favorite", "inquiry", "comparison", "download"]);
export const signalTypeEnum_5d5da69b = pgEnum("signalType", ["repeat_view", "long_view", "favorite", "inquiry", "comparison", "download_docs", "mortgage_calc"]);
export const typeEnum_903a92b2 = pgEnum("type_2", ["email", "sms"]);
export const statusEnum_0eb50261 = pgEnum("status_11", ["pending", "sent", "failed"]);
export const permissionEnum_8d5b025f = pgEnum("permission", ["view", "download", "edit"]);
export const reasonEnum_d7522a1a = pgEnum("reason", ["inaccurate_info", "fake_listing", "inappropriate_content", "duplicate", "scam", "other"]);
export const statusEnum_10202e00 = pgEnum("status_12", ["pending", "reviewing", "resolved", "dismissed"]);
export const actionEnum_a773c57e = pgEnum("action", ["none", "warning_sent", "listing_removed", "user_banned"]);
export const reasonEnum_a8630a0d = pgEnum("reason_2", ["harassment", "fraud", "spam", "inappropriate_behavior", "fake_profile", "other"]);
export const actionEnum_0928bcf0 = pgEnum("action_2", ["none", "warning_sent", "account_suspended", "account_banned"]);
export const reasonEnum_dffd74a5 = pgEnum("reason_3", ["fake_review", "offensive_language", "spam", "not_relevant", "other"]);
export const actionEnum_2daade23 = pgEnum("action_3", ["none", "review_removed", "user_warned"]);
export const actionTypeEnum_7fcf78c7 = pgEnum("actionType", ["approve_property", "reject_property", "remove_property", "suspend_user", "ban_user", "remove_review", "warn_user", "restore_content"]);
export const targetTypeEnum_6ec7abd5 = pgEnum("targetType", ["property", "user", "review"]);
export const statusEnum_cc8127f7 = pgEnum("status_13", ["pending", "approved", "rejected", "needs_changes"]);
export const statusEnum_f940248e = pgEnum("status_14", ["created", "funded", "partial_release", "completed", "disputed", "refunded", "cancelled"]);
export const statusEnum_b8826163 = pgEnum("status_15", ["pending", "in_progress", "completed", "approved", "released", "disputed"]);
export const typeEnum_b08902a4 = pgEnum("type_3", ["deposit", "release", "refund", "fee", "adjustment"]);
export const statusEnum_6e6b93a1 = pgEnum("status_16", ["pending", "processing", "completed", "failed"]);
export const disputeTypeEnum_203bc45e = pgEnum("disputeType", ["milestone_not_completed", "quality_issue", "timeline_delay", "contract_breach", "other"]);
export const statusEnum_ff3b7fa2 = pgEnum("status_17", ["open", "under_review", "mediation", "resolved", "closed"]);
export const statusEnum_72733983 = pgEnum("status_18", ["draft", "sent", "in_progress", "completed", "declined", "cancelled", "expired"]);
export const roleEnum_240905b1 = pgEnum("role_2", ["signer", "cc", "approver"]);
export const statusEnum_cf41a591 = pgEnum("status_19", ["pending", "sent", "viewed", "signed", "declined", "completed"]);
export const notificationTypeEnum_3af8f5c6 = pgEnum("notificationType", ["property_alert", "new_message", "offer_update", "showing_reminder", "document_ready", "price_change", "new_listing", "system"]);
export const statusEnum_26f4b70c = pgEnum("status_20", ["sent", "failed", "clicked"]);
export const digestFrequencyEnum_1b6bd51e = pgEnum("digestFrequency", ["weekly", "biweekly", "monthly"]);
export const ratingEnum_a4093356 = pgEnum("rating", ["up", "down"]);
export const statusEnum_9abb842f = pgEnum("status_21", ["draft", "active", "paused", "completed"]);
export const statusEnum_3b88107d = pgEnum("status_22", ["processing", "completed", "failed"]);
export const approverTypeEnum_80d10020 = pgEnum("approverType", ["buyer", "seller", "inspector", "admin"]);
export const statusEnum_9b843ddc = pgEnum("status_23", ["pending", "approved", "rejected"]);
export const riskLevelEnum_4599174f = pgEnum("riskLevel", ["low", "medium", "high", "critical"]);
export const filedByRoleEnum_2e779b5c = pgEnum("filedByRole", ["buyer", "seller"]);
export const disputeTypeEnum_ebefc51f = pgEnum("disputeType_2", ["non_delivery", "quality_issue", "fraud", "contract_breach", "other"]);
export const statusEnum_3463837a = pgEnum("status_24", ["filed", "under_review", "awaiting_response", "arbitration", "resolved_buyer", "resolved_seller", "resolved_split", "cancelled"]);
export const checkTypeEnum_1d9927cc = pgEnum("checkType", ["kyc", "aml", "sanctions", "tax"]);
export const statusEnum_bcd03b05 = pgEnum("status_25", ["pending", "passed", "failed", "manual_review"]);
export const reportStatusEnum_bc011a12 = pgEnum("reportStatus", ["pending", "generated", "filed"]);
export const healthStatusEnum_acecb411 = pgEnum("healthStatus", ["healthy", "degraded", "down"]);
export const accountTypeEnum_ce897c80 = pgEnum("accountType", ["asset", "liability"]);
export const projectTypeEnum_8696925e = pgEnum("projectType_2", ["new_construction", "renovation", "extension", "commercial", "landscaping"]);
export const statusEnum_ca711148 = pgEnum("status_26", ["pending", "quoted", "accepted", "rejected", "expired"]);
export const statusEnum_1452ce00 = pgEnum("status_27", ["pending", "accepted", "rejected", "expired"]);
export const statusEnum_a7608a2d = pgEnum("status_28", ["scheduled", "ongoing", "completed", "cancelled"]);
export const statusEnum_d4b853ae = pgEnum("status_29", ["registered", "confirmed", "attended", "no_show", "cancelled"]);
export const providerEnum_efd1e0ce = pgEnum("provider", ["google", "maplibre"]);
export const eventTypeEnum_93448cfd = pgEnum("eventType", ["load", "interaction", "error", "switch"]);
export const financingTypeEnum_6e4c0e4b = pgEnum("financingType", ["cash", "conventional", "fha", "va", "other"]);
export const statusEnum_3f6b29b6 = pgEnum("status_30", ["pending", "accepted", "rejected", "countered", "withdrawn", "expired"]);
export const statusEnum_307b82e0 = pgEnum("status_31", ["pending", "accepted", "rejected", "withdrawn"]);
export const activityTypeEnum_efd6a2eb = pgEnum("activityType_2", ["created", "viewed", "accepted", "rejected", "countered", "withdrawn", "expired", "signed", "comment"]);
export const statusEnum_ca545ec2 = pgEnum("status_32", ["pending", "sent", "failed", "retrying"]);
export const triggerTypeEnum_4dd2edf2 = pgEnum("triggerType", ["manual", "signup", "property_view", "saved_search", "offer_submitted", "tour_booked", ""]);
export const statusEnum_92b83ad8 = pgEnum("status_33", ["active", "completed", "unsubscribed"]);
export const statusEnum_86ae69a8 = pgEnum("status_34", ["pending", "sent", "delivered", "failed", "bounced"]);
export const testTypeEnum_734ed95c = pgEnum("testType", ["subject_line", "content", "send_time", "from_name"]);
export const statusEnum_a167636b = pgEnum("status_35", ["draft", "running", "completed", "cancelled"]);
export const winnerMetricEnum_e601358a = pgEnum("winnerMetric", ["open_rate", "click_rate", "conversion_rate"]);
export const categoryEnum_70a22095 = pgEnum("category_2", ["header", "text", "image", "cta", "footer", "custom"]);
export const targetSegmentEnum_5efc33b3 = pgEnum("targetSegment", ["all", "buyers", "sellers", "agents"]);
export const statusEnum_a5391fab = pgEnum("status_36", ["scheduled", "sent", "delivered", "opened", "clicked", "failed"]);

// ==================== TABLE DEFINITIONS ====================


/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum_dd1e071b("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Saved Map Views
export const savedMapViews = pgTable("savedMapViews", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Map state
  centerLat: varchar("centerLat", { length: 20 }).notNull(),
  centerLng: varchar("centerLng", { length: 20 }).notNull(),
  zoom: integer("zoom").notNull(),
  // Filters (stored as JSON)
  filters: text("filters"), // { priceMin, priceMax, bedrooms, bathrooms, propertyType, etc. }
  // Heatmap preferences
  heatmapMode: heatmapModeEnum_a9768c75("heatmapMode").default("none"),
  heatmapIntensity: integer("heatmapIntensity").default(100), // 0-200 (stored as percentage)
  heatmapRadius: integer("heatmapRadius").default(25), // 10-50px
  // Cluster preferences
  clusteringEnabled: integer("clusteringEnabled").default(1), // boolean as int
  minClusterSize: integer("minClusterSize").default(2),
  // Metadata
  isDefault: integer("isDefault").default(0), // boolean as int
  shareToken: varchar("shareToken", { length: 64 }), // for sharing views
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type SavedMapView = typeof savedMapViews.$inferSelect;
export type InsertSavedMapView = typeof savedMapViews.$inferInsert;

// Property-related tables
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  externalId: varchar("externalId", { length: 128 }),
  // Address fields
  addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zipCode", { length: 20 }).notNull(),
  country: varchar("country", { length: 50 }).default("USA").notNull(),
  // Geospatial coordinates
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),
  // Property details
  propertyType: propertyTypeEnum_d599603a("propertyType").notNull(),
  listingType: listingTypeEnum_cd70c642("listingType").notNull(),
  status: statusEnum_b6bf8e76("status").default("active").notNull(),
  // Property specifications
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  squareFeet: integer("squareFeet"),
  lotSize: integer("lotSize"),
  yearBuilt: integer("yearBuilt"),
  // Pricing
  price: integer("price").notNull(),
  pricePerSqFt: integer("pricePerSqFt"),
  // Listing details
  title: varchar("title", { length: 255 }),
  description: text("description"),
  features: text("features"), // JSON array of features
  // Media
  primaryImage: text("primaryImage"),
  images: text("images"), // JSON array of image URLs
  virtualTourUrl: text("virtualTourUrl"),
  // Metadata
  listDate: timestamp("listDate"),
  soldDate: timestamp("soldDate"),
  daysOnMarket: integer("daysOnMarket"),
  viewCount: integer("viewCount").default(0),
  // Ownership
  ownerId: integer("ownerId"),
  agentId: integer("agentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// Property History (for historical playback)
export const propertyHistory = pgTable("propertyHistory", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  // Snapshot data
  price: integer("price").notNull(),
  status: statusEnum_b6bf8e76("status").notNull(),
  listingType: listingTypeEnum_cd70c642("listingType").notNull(),
  // Geospatial (in case property moved or coordinates updated)
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),
  // Metadata
  snapshotDate: timestamp("snapshotDate").notNull(),
  changeType: changeTypeEnum_47a91762("changeType").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyHistory = typeof propertyHistory.$inferSelect;
export type InsertPropertyHistory = typeof propertyHistory.$inferInsert;

// Property valuations
export const valuations = pgTable("valuations", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  estimatedValue: integer("estimatedValue").notNull(),
  confidenceLower: integer("confidenceLower"),
  confidenceUpper: integer("confidenceUpper"),
  confidenceScore: integer("confidenceScore"), // 0-100
  valuationMethod: varchar("valuationMethod", { length: 50 }), // "ml", "comparative", "manual"
  comparables: text("comparables"), // JSON array of comparable property IDs
  factors: text("factors"), // JSON object of valuation factors
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Valuation = typeof valuations.$inferSelect;
export type InsertValuation = typeof valuations.$inferInsert;

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  buyerId: integer("buyerId"),
  sellerId: integer("sellerId"),
  agentId: integer("agentId"),
  transactionType: transactionTypeEnum_90d42670("transactionType").notNull(),
  status: statusEnum_943da8d2("status_2").default("pending").notNull(),
  amount: integer("amount").notNull(),
  depositAmount: integer("depositAmount"),
  closingDate: timestamp("closingDate"),
  notes: text("notes"),
  documents: text("documents"), // JSON array of document URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  transactionId: integer("transactionId").notNull(),
  userId: integer("userId").notNull(),
  amount: integer("amount").notNull(),
  paymentType: paymentTypeEnum_fd531f00("paymentType").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // "card", "bank_transfer", "crypto"
  status: statusEnum_0ad463c6("status_3").default("pending").notNull(),
  paymentGateway: varchar("paymentGateway", { length: 50 }),
  gatewayTransactionId: varchar("gatewayTransactionId", { length: 255 }),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  metadata: text("metadata"), // JSON object
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// User favorites
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  propertyId: integer("propertyId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Saved searches
export const savedSearches = pgTable("savedSearches", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  searchCriteria: text("searchCriteria").notNull(), // JSON object
  
  // Map drawing boundaries
  boundaryType: boundaryTypeEnum_039a6a9e("boundaryType").default("none"),
  boundaryData: text("boundaryData"), // JSON: polygon coordinates, circle center/radius, etc.
  
  notificationsEnabled: integer("notificationsEnabled").default(1), // 0 or 1 for boolean
  lastNotified: timestamp("lastNotified"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;

// Property views analytics
export const propertyViews = pgTable("propertyViews", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  userId: integer("userId"),
  sessionId: varchar("sessionId", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  referrer: text("referrer"),
  viewDuration: integer("viewDuration"), // in seconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyView = typeof propertyViews.$inferSelect;
export type InsertPropertyView = typeof propertyViews.$inferInsert;

// Agent/Developer profiles
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  agency: varchar("agency", { length: 255 }),
  specialization: text("specialization"), // JSON array
  bio: text("bio"),
  phone: varchar("phone", { length: 20 }),
  website: text("website"),
  rating: integer("rating"), // 0-100
  totalSales: integer("totalSales").default(0),
  activeListings: integer("activeListings").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// Property comparisons
export const propertyComparisons = pgTable("propertyComparisons", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }),
  propertyIds: text("propertyIds").notNull(), // JSON array of property IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type PropertyComparison = typeof propertyComparisons.$inferSelect;
export type InsertPropertyComparison = typeof propertyComparisons.$inferInsert;

// Messages between users and agents
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  receiverId: integer("receiverId").notNull(),
  propertyId: integer("propertyId"), // Optional reference to property being discussed
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  isRead: integer("isRead").default(0), // 0 or 1 for boolean
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Search alerts for notifications
export const searchAlerts = pgTable("searchAlerts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  savedSearchId: integer("savedSearchId"),
  alertName: varchar("alertName", { length: 255 }).notNull(),
  searchCriteria: text("searchCriteria").notNull(), // JSON object
  frequency: frequencyEnum_a6e12b44("frequency").default("daily").notNull(),
  isActive: integer("isActive").default(1), // 0 or 1
  lastTriggered: timestamp("lastTriggered"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type SearchAlert = typeof searchAlerts.$inferSelect;
export type InsertSearchAlert = typeof searchAlerts.$inferInsert;

// Notification history
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: typeEnum_7ee49cbd("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: integer("relatedId"), // Property ID, message ID, etc.
  isRead: integer("isRead").default(0),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Virtual tours
export const virtualTours = pgTable("virtualTours", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  tourType: tourTypeEnum_064ad23d("tourType").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  mediaUrl: text("mediaUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  viewCount: integer("viewCount").default(0),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type VirtualTour = typeof virtualTours.$inferSelect;
export type InsertVirtualTour = typeof virtualTours.$inferInsert;

// Document Management System
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  propertyId: integer("propertyId"), // Optional: link to property
  transactionId: integer("transactionId"), // Optional: link to transaction
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(),
  fileSize: integer("fileSize"), // bytes
  mimeType: varchar("mimeType", { length: 100 }),
  category: categoryEnum_9566a384("category").notNull(),
  tags: text("tags"), // JSON array of tags
  title: varchar("title", { length: 255 }),
  description: text("description"),
  version: integer("version").default(1).notNull(),
  parentDocumentId: integer("parentDocumentId"), // For versioning
  status: statusEnum_52318bff("status_4").default("draft").notNull(),
  signatureStatus: signatureStatusEnum_c1df8c63("signatureStatus"),
  docusignEnvelopeId: varchar("docusignEnvelopeId", { length: 255 }),
  signedBy: text("signedBy"), // JSON array of user IDs
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
// ============================================================================
// Builder Platform Extension
// ============================================================================

// Builder profiles (extends agents table for builders/developers)
export const builders = pgTable("builders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  agentId: integer("agentId"), // Link to agents table if they're also a regular agent
  companyName: varchar("companyName", { length: 255 }).notNull(),
  cacNumber: varchar("cacNumber", { length: 100 }), // Corporate Affairs Commission registration
  companyType: companyTypeEnum_a063ecd2("companyType"),
  
  // Verification
  verificationStatus: verificationStatusEnum_e47d1757("verificationStatus").default("pending").notNull(),
  verificationDocuments: text("verificationDocuments"), // JSON array of document URLs
  verifiedAt: timestamp("verifiedAt"),
  verifiedBy: integer("verifiedBy"), // Admin user ID
  
  // Trust & Reputation
  trustScore: integer("trustScore").default(0), // 0-100
  totalProjects: integer("totalProjects").default(0),
  completedProjects: integer("completedProjects").default(0),
  activeProjects: integer("activeProjects").default(0),
  averageRating: integer("averageRating").default(0), // 0-100
  totalReviews: integer("totalReviews").default(0),
  
  // Contact & Profile
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: text("website"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  bio: text("bio"),
  logo: text("logo"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Builder = typeof builders.$inferSelect;
export type InsertBuilder = typeof builders.$inferInsert;

// Builder projects (new construction)
export const builderProjects = pgTable("builderProjects", {
  id: serial("id").primaryKey(),
  builderId: integer("builderId").notNull(),
  propertyId: integer("propertyId"), // Link to properties table for unified search
  
  // Project details
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectType: projectTypeEnum_cbddd29b("projectType").notNull(),
  description: text("description"),
  
  // Construction status
  constructionStatus: constructionStatusEnum_c54de9e8("constructionStatus").notNull(),
  startDate: timestamp("startDate"),
  estimatedCompletionDate: timestamp("estimatedCompletionDate"),
  actualCompletionDate: timestamp("actualCompletionDate"),
  completionPercentage: integer("completionPercentage").default(0), // 0-100
  
  // Pricing
  originalPrice: integer("originalPrice").notNull(),
  currentPrice: integer("currentPrice").notNull(),
  pricePerSqFt: integer("pricePerSqFt"),
  
  // Units/Properties
  totalUnits: integer("totalUnits").default(1),
  availableUnits: integer("availableUnits"),
  soldUnits: integer("soldUnits").default(0),
  
  // Media & Documents
  floorPlans: text("floorPlans"), // JSON array
  images: text("images"), // JSON array
  videos: text("videos"), // JSON array
  brochure: text("brochure"),
  legalDocuments: text("legalDocuments"), // JSON: C of O, survey, approvals
  
  // Status
  status: statusEnum_1f6b21ef("status_5").default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  views: integer("views").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type BuilderProject = typeof builderProjects.$inferSelect;
export type InsertBuilderProject = typeof builderProjects.$inferInsert;

// Project milestones for construction tracking
export const projectMilestones = pgTable("projectMilestones", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  
  milestoneNumber: integer("milestoneNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Payment tied to milestone
  paymentPercentage: integer("paymentPercentage"), // % of total price
  paymentAmount: integer("paymentAmount"),
  
  // Status
  status: statusEnum_6ceb5992("status_6").default("pending").notNull(),
  targetDate: timestamp("targetDate"),
  completedDate: timestamp("completedDate"),
  verifiedDate: timestamp("verifiedDate"),
  verifiedBy: integer("verifiedBy"), // Inspector user ID
  
  // Progress documentation
  progressPhotos: text("progressPhotos"), // JSON array
  inspectionReport: text("inspectionReport"),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = typeof projectMilestones.$inferInsert;

// Builder reviews
export const builderReviews = pgTable("builderReviews", {
  id: serial("id").primaryKey(),
  builderId: integer("builderId").notNull(),
  projectId: integer("projectId"),
  reviewerId: integer("reviewerId").notNull(),
  
  // Ratings (0-100)
  overallRating: integer("overallRating").notNull(),
  qualityRating: integer("qualityRating"),
  timelinessRating: integer("timelinessRating"),
  communicationRating: integer("communicationRating"),
  valueRating: integer("valueRating"),
  
  // Review content
  title: varchar("title", { length: 255 }),
  review: text("review"),
  pros: text("pros"),
  cons: text("cons"),
  
  // Media
  photos: text("photos"), // JSON array
  
  // Status
  status: statusEnum_1b8f2edf("status_7").default("pending").notNull(),
  verifiedPurchase: integer("verifiedPurchase").default(0), // 0 or 1
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type BuilderReview = typeof builderReviews.$inferSelect;
export type InsertBuilderReview = typeof builderReviews.$inferInsert;

// Property reviews
export const propertyReviews = pgTable("propertyReviews", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  reviewerId: integer("reviewerId").notNull(),
  
  // Ratings (1-5 stars, stored as 20-100 for consistency)
  overallRating: integer("overallRating").notNull(), // 20, 40, 60, 80, 100 for 1-5 stars
  locationRating: integer("locationRating"),
  valueRating: integer("valueRating"),
  conditionRating: integer("conditionRating"),
  
  // Review content
  title: varchar("title", { length: 255 }),
  review: text("review").notNull(),
  pros: text("pros"),
  cons: text("cons"),
  
  // Media
  photos: text("photos"), // JSON array of photo URLs
  
  // Status
  status: statusEnum_1b8f2edf("status_7").default("pending").notNull(),
  verifiedPurchase: integer("verifiedPurchase").default(0), // 0 or 1
  helpfulCount: integer("helpfulCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type PropertyReview = typeof propertyReviews.$inferSelect;
export type InsertPropertyReview = typeof propertyReviews.$inferInsert;

// ============================================================================
// Short-let Rental Extension
// ============================================================================

// Short-let properties (extends properties table)
export const shortLetProperties = pgTable("shortLetProperties", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(), // Link to main properties table
  hostId: integer("hostId").notNull(), // User ID of host
  
  // Rental details
  nightlyRate: integer("nightlyRate").notNull(),
  weeklyRate: integer("weeklyRate"),
  monthlyRate: integer("monthlyRate"),
  cleaningFee: integer("cleaningFee"),
  securityDeposit: integer("securityDeposit"),
  
  // Availability
  minimumStay: integer("minimumStay").default(1), // nights
  maximumStay: integer("maximumStay"),
  instantBooking: integer("instantBooking").default(0), // 0 or 1
  
  // Amenities
  amenities: text("amenities"), // JSON array
  houseRules: text("houseRules"),
  
  // Capacity
  maxGuests: integer("maxGuests").notNull(),
  
  // Calendar & Availability
  availabilityCalendar: text("availabilityCalendar"), // JSON object
  blockedDates: text("blockedDates"), // JSON array
  
  // Status
  status: statusEnum_db3817aa("status_8").default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type ShortLetProperty = typeof shortLetProperties.$inferSelect;
export type InsertShortLetProperty = typeof shortLetProperties.$inferInsert;

// Short-let bookings
export const shortLetBookings = pgTable("shortLetBookings", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  guestId: integer("guestId").notNull(),
  hostId: integer("hostId").notNull(),
  
  // Booking dates
  checkIn: timestamp("checkIn").notNull(),
  checkOut: timestamp("checkOut").notNull(),
  nights: integer("nights").notNull(),
  
  // Guests
  numberOfGuests: integer("numberOfGuests").notNull(),
  
  // Pricing
  nightlyRate: integer("nightlyRate").notNull(),
  totalNights: integer("totalNights").notNull(),
  cleaningFee: integer("cleaningFee"),
  serviceFee: integer("serviceFee"),
  totalAmount: integer("totalAmount").notNull(),
  
  // Status
  status: statusEnum_21170224("status_9").default("pending").notNull(),
  
  // Payment
  paymentStatus: paymentStatusEnum_bec8ddc4("paymentStatus").default("pending").notNull(),
  paymentId: integer("paymentId"),
  
  // Communication
  specialRequests: text("specialRequests"),
  hostNotes: text("hostNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type ShortLetBooking = typeof shortLetBookings.$inferSelect;
export type InsertShortLetBooking = typeof shortLetBookings.$inferInsert;

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  buyerId: integer("buyerId").notNull(),
  agentId: integer("agentId"),
  
  // Appointment details
  appointmentDate: timestamp("appointmentDate").notNull(),
  duration: integer("duration").default(60).notNull(), // minutes
  tourType: tourTypeEnum_73dc4f3c("tourType_2").default("in_person").notNull(),
  status: statusEnum_09226ac2("status_10").default("pending").notNull(),
  meetingLink: text("meetingLink"), // For virtual tours
  
  // Additional info
  notes: text("notes"),
  cancellationReason: text("cancellationReason"),
  reminderSent: integer("reminderSent").default(0).notNull(), // boolean
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// Agent Availability
export const agentAvailability = pgTable("agentAvailability", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull(),
  
  // Schedule
  dayOfWeek: integer("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM format
  isAvailable: integer("isAvailable").default(1).notNull(), // boolean
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type AgentAvailability = typeof agentAvailability.$inferSelect;
export type InsertAgentAvailability = typeof agentAvailability.$inferInsert;

// User Activity Tracking
export const userActivity = pgTable("userActivity", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  sessionId: varchar("sessionId", { length: 255 }),
  
  // Activity details
  activityType: activityTypeEnum_de0638ae("activityType").notNull(),
  propertyId: integer("propertyId"),
  searchQuery: text("searchQuery"), // JSON string
  metadata: text("metadata"), // JSON string
  duration: integer("duration"), // seconds
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = typeof userActivity.$inferInsert;

// Buyer Profiles
export const buyerProfiles = pgTable("buyerProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  
  // Preferences
  preferredLocations: text("preferredLocations"), // JSON array
  priceRange: text("priceRange"), // JSON object {min, max}
  preferredPropertyTypes: text("preferredPropertyTypes"), // JSON array
  minBedrooms: integer("minBedrooms"),
  minBathrooms: integer("minBathrooms"),
  preferredAmenities: text("preferredAmenities"), // JSON array
  
  // Intent scoring
  intentScore: integer("intentScore").default(0).notNull(), // 0-100
  lastActive: timestamp("lastActive"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type BuyerProfile = typeof buyerProfiles.$inferSelect;
export type InsertBuyerProfile = typeof buyerProfiles.$inferInsert;

// Buyer Intent Signals
export const buyerIntentSignals = pgTable("buyerIntentSignals", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  
  // Signal details
  signalType: signalTypeEnum_5d5da69b("signalType").notNull(),
  propertyId: integer("propertyId"),
  weight: integer("weight").default(1).notNull(), // Signal strength
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type BuyerIntentSignal = typeof buyerIntentSignals.$inferSelect;
export type InsertBuyerIntentSignal = typeof buyerIntentSignals.$inferInsert;

// ============================================================================
// Notification System
// ============================================================================

import { boolean } from "drizzle-orm/pg-core";


export const notificationPreferences = pgTable("notificationPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  smsNotifications: boolean("smsNotifications").default(false).notNull(),
  priceDropAlerts: boolean("priceDropAlerts").default(true).notNull(),
  newListingAlerts: boolean("newListingAlerts").default(true).notNull(),
  appointmentReminders: boolean("appointmentReminders").default(true).notNull(),
  messageNotifications: boolean("messageNotifications").default(true).notNull(),
  marketingEmails: boolean("marketingEmails").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export const notificationQueue = pgTable("notificationQueue", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: typeEnum_903a92b2("type_2").notNull(),
  template: varchar("template", { length: 100 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  data: text("data"), // JSON string
  status: statusEnum_0eb50261("status_11").default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationQueueItem = typeof notificationQueue.$inferSelect;
export type InsertNotificationQueueItem = typeof notificationQueue.$inferInsert;

export const emailTemplates = pgTable("emailTemplates", {
  id: serial("id").primaryKey(),
  templateKey: varchar("templateKey", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: text("htmlContent").notNull(),
  textContent: text("textContent"),
  variables: text("variables"), // JSON array of variable names
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;



export const documentShares = pgTable("documentShares", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId").notNull(),
  sharedWithUserId: integer("sharedWithUserId").notNull(),
  sharedByUserId: integer("sharedByUserId").notNull(),
  permission: permissionEnum_8d5b025f("permission").default("view").notNull(),
  expiresAt: timestamp("expiresAt"),
  accessCount: integer("accessCount").default(0),
  lastAccessedAt: timestamp("lastAccessedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentShare = typeof documentShares.$inferSelect;
export type InsertDocumentShare = typeof documentShares.$inferInsert;

export const documentFolders = pgTable("documentFolders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentFolderId: integer("parentFolderId"),
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type DocumentFolder = typeof documentFolders.$inferSelect;
export type InsertDocumentFolder = typeof documentFolders.$inferInsert;

export const documentFolderItems = pgTable("documentFolderItems", {
  id: serial("id").primaryKey(),
  folderId: integer("folderId").notNull(),
  documentId: integer("documentId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type DocumentFolderItem = typeof documentFolderItems.$inferSelect;
export type InsertDocumentFolderItem = typeof documentFolderItems.$inferInsert;

// Admin Moderation Panel
export const propertyReports = pgTable("propertyReports", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  reportedByUserId: integer("reportedByUserId").notNull(),
  reason: reasonEnum_d7522a1a("reason").notNull(),
  description: text("description"),
  status: statusEnum_10202e00("status_12").default("pending").notNull(),
  reviewedByAdminId: integer("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  action: actionEnum_a773c57e("action"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type PropertyReport = typeof propertyReports.$inferSelect;
export type InsertPropertyReport = typeof propertyReports.$inferInsert;

export const userReports = pgTable("userReports", {
  id: serial("id").primaryKey(),
  reportedUserId: integer("reportedUserId").notNull(),
  reportedByUserId: integer("reportedByUserId").notNull(),
  reason: reasonEnum_a8630a0d("reason_2").notNull(),
  description: text("description"),
  evidence: text("evidence"), // JSON array of URLs/screenshots
  status: statusEnum_10202e00("status_12").default("pending").notNull(),
  reviewedByAdminId: integer("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  action: actionEnum_0928bcf0("action_2"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = typeof userReports.$inferInsert;

export const reviewReports = pgTable("reviewReports", {
  id: serial("id").primaryKey(),
  reviewId: integer("reviewId").notNull(),
  reportedByUserId: integer("reportedByUserId").notNull(),
  reason: reasonEnum_dffd74a5("reason_3").notNull(),
  description: text("description"),
  status: statusEnum_10202e00("status_12").default("pending").notNull(),
  reviewedByAdminId: integer("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  action: actionEnum_2daade23("action_3"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type ReviewReport = typeof reviewReports.$inferSelect;
export type InsertReviewReport = typeof reviewReports.$inferInsert;

export const moderationActions = pgTable("moderationActions", {
  id: serial("id").primaryKey(),
  adminId: integer("adminId").notNull(),
  actionType: actionTypeEnum_7fcf78c7("actionType").notNull(),
  targetType: targetTypeEnum_6ec7abd5("targetType").notNull(),
  targetId: integer("targetId").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModerationAction = typeof moderationActions.$inferSelect;
export type InsertModerationAction = typeof moderationActions.$inferInsert;

export const propertyApprovals = pgTable("propertyApprovals", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  status: statusEnum_cc8127f7("status_13").default("pending").notNull(),
  reviewedByAdminId: integer("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  rejectionReason: text("rejectionReason"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type PropertyApproval = typeof propertyApprovals.$inferSelect;
export type InsertPropertyApproval = typeof propertyApprovals.$inferInsert;

// Payment Escrow System
export const escrowAccounts = pgTable("escrowAccounts", {
  id: serial("id").primaryKey(),
  transactionId: integer("transactionId").notNull(),
  propertyId: integer("propertyId").notNull(),
  projectId: integer("projectId"), // For builder projects
  buyerId: integer("buyerId").notNull(),
  sellerId: integer("sellerId").notNull(),
  amount: integer("amount").notNull(), // Original amount in dollars
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  totalAmount: integer("totalAmount").notNull(), // cents
  heldAmount: integer("heldAmount").notNull(), // cents
  releasedAmount: integer("releasedAmount").default(0).notNull(), // cents
  refundedAmount: integer("refundedAmount").default(0).notNull(), // cents
  status: statusEnum_f940248e("status_14").default("created").notNull(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  fundedAt: timestamp("fundedAt"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EscrowAccount = typeof escrowAccounts.$inferSelect;
export type InsertEscrowAccount = typeof escrowAccounts.$inferInsert;

export const escrowMilestones = pgTable("escrowMilestones", {
  id: serial("id").primaryKey(),
  escrowAccountId: integer("escrowAccountId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  amount: integer("amount").notNull(), // cents
  percentage: integer("percentage"), // 0-100
  sequence: integer("sequence").notNull(), // order of milestones
  status: statusEnum_b8826163("status_15").default("pending").notNull(),
  requiredDocuments: text("requiredDocuments"), // JSON array
  uploadedDocuments: text("uploadedDocuments"), // JSON array
  approvedByBuyer: integer("approvedByBuyer").default(0), // boolean
  approvedBySeller: integer("approvedBySeller").default(0), // boolean
  approvedByInspector: integer("approvedByInspector").default(0), // boolean
  inspectorId: integer("inspectorId"),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EscrowMilestone = typeof escrowMilestones.$inferSelect;
export type InsertEscrowMilestone = typeof escrowMilestones.$inferInsert;

export const escrowTransactions = pgTable("escrowTransactions", {
  id: serial("id").primaryKey(),
  escrowAccountId: integer("escrowAccountId").notNull(),
  milestoneId: integer("milestoneId"),
  type: typeEnum_b08902a4("type_3").notNull(),
  amount: integer("amount").notNull(), // cents
  status: statusEnum_6e6b93a1("status_16").default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  description: text("description"),
  metadata: text("metadata"), // JSON
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrowTransaction = typeof escrowTransactions.$inferInsert;

export const escrowDisputes = pgTable("escrowDisputes", {
  id: serial("id").primaryKey(),
  escrowAccountId: integer("escrowAccountId").notNull(),
  milestoneId: integer("milestoneId"),
  initiatedByUserId: integer("initiatedByUserId").notNull(),
  disputeType: disputeTypeEnum_203bc45e("disputeType").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"), // JSON array of document URLs
  requestedAmount: integer("requestedAmount"), // cents
  status: statusEnum_ff3b7fa2("status_17").default("open").notNull(),
  resolution: text("resolution"),
  resolvedByAdminId: integer("resolvedByAdminId"),
  resolvedAmount: integer("resolvedAmount"), // cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EscrowDispute = typeof escrowDisputes.$inferSelect;
export type InsertEscrowDispute = typeof escrowDisputes.$inferInsert;


// ============================================================================
// E-Signature System Tables
// ============================================================================

export const signatureRequests = pgTable("signatureRequests", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId").notNull(),
  transactionId: integer("transactionId"),
  propertyId: integer("propertyId"),
  createdByUserId: integer("createdByUserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  status: statusEnum_72733983("status_18").default("draft").notNull(),
  expiresAt: timestamp("expiresAt"),
  completedAt: timestamp("completedAt"),
  // External e-signature provider details
  provider: varchar("provider", { length: 50 }), // 'docusign', 'hellosign', 'internal'
  externalEnvelopeId: varchar("externalEnvelopeId", { length: 255 }),
  externalStatus: varchar("externalStatus", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type InsertSignatureRequest = typeof signatureRequests.$inferInsert;

export const signatureRecipients = pgTable("signatureRecipients", {
  id: serial("id").primaryKey(),
  signatureRequestId: integer("signatureRequestId").notNull(),
  userId: integer("userId"),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum_240905b1("role_2").default("signer").notNull(),
  routingOrder: integer("routingOrder").default(1).notNull(),
  status: statusEnum_cf41a591("status_19").default("pending").notNull(),
  signedAt: timestamp("signedAt"),
  declinedAt: timestamp("declinedAt"),
  declineReason: text("declineReason"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  // External provider details
  externalRecipientId: varchar("externalRecipientId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type SignatureRecipient = typeof signatureRecipients.$inferSelect;
export type InsertSignatureRecipient = typeof signatureRecipients.$inferInsert;

export const signatureAuditLog = pgTable("signatureAuditLog", {
  id: serial("id").primaryKey(),
  signatureRequestId: integer("signatureRequestId").notNull(),
  recipientId: integer("recipientId"),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SignatureAuditLog = typeof signatureAuditLog.$inferSelect;
export type InsertSignatureAuditLog = typeof signatureAuditLog.$inferInsert;

// ============================================================================
// Notification System Tables
// ============================================================================

// Using existing notificationQueue and emailTemplates tables

export const userNotificationPreferences = pgTable("userNotificationPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  emailEnabled: integer("emailEnabled").default(1).notNull(),
  smsEnabled: integer("smsEnabled").default(0).notNull(),
  pushEnabled: integer("pushEnabled").default(1).notNull(),
  // Category preferences
  escrowUpdates: integer("escrowUpdates").default(1).notNull(),
  documentSigning: integer("documentSigning").default(1).notNull(),
  propertyAlerts: integer("propertyAlerts").default(1).notNull(),
  messageNotifications: integer("messageNotifications").default(1).notNull(),
  marketingEmails: integer("marketingEmails").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = typeof userNotificationPreferences.$inferInsert;

// ============================================================================
// Analytics and Metrics Tables
// ============================================================================

export const adminMetrics = pgTable("adminMetrics", {
  id: serial("id").primaryKey(),
  metricDate: timestamp("metricDate").notNull(),
  metricType: varchar("metricType", { length: 50 }).notNull(),
  // Moderation metrics
  totalReports: integer("totalReports").default(0).notNull(),
  pendingReports: integer("pendingReports").default(0).notNull(),
  resolvedReports: integer("resolvedReports").default(0).notNull(),
  averageResponseTimeMinutes: integer("averageResponseTimeMinutes").default(0).notNull(),
  // Property metrics
  totalProperties: integer("totalProperties").default(0).notNull(),
  activeProperties: integer("activeProperties").default(0).notNull(),
  pendingApprovals: integer("pendingApprovals").default(0).notNull(),
  // User metrics
  totalUsers: integer("totalUsers").default(0).notNull(),
  activeUsers: integer("activeUsers").default(0).notNull(),
  newUsers: integer("newUsers").default(0).notNull(),
  // Transaction metrics
  totalTransactions: integer("totalTransactions").default(0).notNull(),
  completedTransactions: integer("completedTransactions").default(0).notNull(),
  totalVolume: integer("totalVolume").default(0).notNull(), // cents
  // Escrow metrics
  activeEscrows: integer("activeEscrows").default(0).notNull(),
  completedEscrows: integer("completedEscrows").default(0).notNull(),
  disputedEscrows: integer("disputedEscrows").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminMetrics = typeof adminMetrics.$inferSelect;
export type InsertAdminMetrics = typeof adminMetrics.$inferInsert;

export const platformHealthMetrics = pgTable("platformHealthMetrics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  // System health
  apiResponseTimeMs: integer("apiResponseTimeMs").default(0).notNull(),
  errorRate: integer("errorRate").default(0).notNull(), // percentage * 100
  uptime: integer("uptime").default(100).notNull(), // percentage * 100
  // User engagement
  dailyActiveUsers: integer("dailyActiveUsers").default(0).notNull(),
  avgSessionDurationMinutes: integer("avgSessionDurationMinutes").default(0).notNull(),
  pageViewsPerSession: integer("pageViewsPerSession").default(0).notNull(),
  // Content metrics
  newListingsToday: integer("newListingsToday").default(0).notNull(),
  searchesPerformed: integer("searchesPerformed").default(0).notNull(),
  messagesExchanged: integer("messagesExchanged").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlatformHealthMetrics = typeof platformHealthMetrics.$inferSelect;
export type InsertPlatformHealthMetrics = typeof platformHealthMetrics.$inferInsert;

// ============================================================================
// Push Notification Tables
// ============================================================================

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("pushSubscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  
  // Web Push subscription details
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  
  // Device/browser info
  userAgent: text("userAgent"),
  deviceType: varchar("deviceType", { length: 50 }), // "desktop", "mobile", "tablet"
  
  // Status
  isActive: integer("isActive").default(1).notNull(),
  lastUsed: timestamp("lastUsed"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// Push Notification Log
export const pushNotificationLog = pgTable("pushNotificationLog", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  subscriptionId: integer("subscriptionId"),
  
  // Notification details
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  badge: text("badge"),
  data: text("data"), // JSON string with action data
  
  // Notification type
  notificationType: notificationTypeEnum_3af8f5c6("notificationType").notNull(),
  
  // Status
  status: statusEnum_26f4b70c("status_20").default("sent").notNull(),
  errorMessage: text("errorMessage"),
  clickedAt: timestamp("clickedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushNotificationLog = typeof pushNotificationLog.$inferSelect;
export type InsertPushNotificationLog = typeof pushNotificationLog.$inferInsert;

// Recommendation Email Preferences
export const recommendationPreferences = pgTable("recommendationPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  
  // Email digest preferences
  digestFrequency: digestFrequencyEnum_1b6bd51e("digestFrequency").default("weekly").notNull(),
  
  // Match score threshold (70, 80, or 90)
  matchScoreThreshold: integer("matchScoreThreshold").default(70).notNull(),
  
  // Enable/disable email digests
  emailEnabled: integer("emailEnabled").default(1).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type RecommendationPreferences = typeof recommendationPreferences.$inferSelect;
export type InsertRecommendationPreferences = typeof recommendationPreferences.$inferInsert;

// Recommendation Feedback
export const recommendationFeedback = pgTable("recommendationFeedback", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  propertyId: integer("propertyId").notNull(),
  
  // Rating: thumbs up or thumbs down
  rating: ratingEnum_a4093356("rating").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;
export type InsertRecommendationFeedback = typeof recommendationFeedback.$inferInsert;

// A/B Testing Framework
export const recommendationExperiments = pgTable("recommendationExperiments", {
  id: serial("id").primaryKey(),
  
  // Experiment details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Experiment status
  status: statusEnum_9abb842f("status_21").default("draft").notNull(),
  
  // Variant configuration (JSON)
  // Example: {"control": {"algorithm": "llm"}, "variant_a": {"algorithm": "collaborative"}}
  variants: text("variants").notNull(),
  
  // Traffic allocation (percentage for each variant)
  trafficAllocation: text("trafficAllocation").notNull(),
  
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export const experimentAssignments = pgTable("experimentAssignments", {
  id: serial("id").primaryKey(),
  
  experimentId: integer("experimentId").notNull(),
  userId: integer("userId").notNull(),
  
  // Which variant the user was assigned to
  variant: varchar("variant", { length: 50 }).notNull(),
  
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export const experimentMetrics = pgTable("experimentMetrics", {
  id: serial("id").primaryKey(),
  
  experimentId: integer("experimentId").notNull(),
  userId: integer("userId").notNull(),
  variant: varchar("variant", { length: 50 }).notNull(),
  
  // Metric type (click, favorite, feedback_positive, feedback_negative, etc.)
  metricType: varchar("metricType", { length: 50 }).notNull(),
  
  // Related property ID (if applicable)
  propertyId: integer("propertyId"),
  
  // Metric value (1 for binary events, or custom value)
  value: integer("value").default(1).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecommendationExperiment = typeof recommendationExperiments.$inferSelect;
export type InsertRecommendationExperiment = typeof recommendationExperiments.$inferInsert;
export type ExperimentAssignment = typeof experimentAssignments.$inferSelect;
export type InsertExperimentAssignment = typeof experimentAssignments.$inferInsert;
export type ExperimentMetric = typeof experimentMetrics.$inferSelect;
export type InsertExperimentMetric = typeof experimentMetrics.$inferInsert;


// ============================================================================
// ENHANCED ESCROW SYSTEM TABLES
// ============================================================================

// Idempotency protection for webhooks and API calls
export const idempotencyKeys = pgTable("idempotencyKeys", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  requestHash: varchar("requestHash", { length: 64 }).notNull(),
  response: text("response"),
  status: statusEnum_3b88107d("status_22").notNull(),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type InsertIdempotencyKey = typeof idempotencyKeys.$inferInsert;

// Comprehensive audit trail for escrow operations
export const escrowAuditLogs = pgTable("escrowAuditLogs", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // created, funded, released, disputed, etc.
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }),
  amount: integer("amount"), // Amount involved in this action (cents)
  performedBy: integer("performedBy"), // User ID who performed action
  performedByRole: varchar("performedByRole", { length: 50 }), // buyer, seller, admin, system
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  reason: text("reason"), // Reason for action
  metadata: text("metadata"), // JSON for additional context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowAuditLog = typeof escrowAuditLogs.$inferSelect;
export type InsertEscrowAuditLog = typeof escrowAuditLogs.$inferInsert;

// State history for escrow accounts
export const escrowStateHistory = pgTable("escrowStateHistory", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  heldAmount: integer("heldAmount").notNull(),
  releasedAmount: integer("releasedAmount").notNull(),
  refundedAmount: integer("refundedAmount").notNull(),
  snapshot: text("snapshot"), // Full JSON snapshot of escrow state
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowStateHistory = typeof escrowStateHistory.$inferSelect;
export type InsertEscrowStateHistory = typeof escrowStateHistory.$inferInsert;

// Multi-signature approval system
export const escrowApprovals = pgTable("escrowApprovals", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  approverType: approverTypeEnum_80d10020("approverType").notNull(),
  approverId: integer("approverId").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // release, refund, dispute
  status: statusEnum_9b843ddc("status_23").default("pending").notNull(),
  signature: text("signature"), // Digital signature or approval token
  approvedAt: timestamp("approvedAt"),
  rejectedAt: timestamp("rejectedAt"),
  reason: text("reason"),
  metadata: text("metadata"), // JSON for additional context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowApproval = typeof escrowApprovals.$inferSelect;
export type InsertEscrowApproval = typeof escrowApprovals.$inferInsert;

// Fraud detection and risk assessment
export const escrowFraudChecks = pgTable("escrowFraudChecks", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  checkType: varchar("checkType", { length: 50 }).notNull(), // velocity, amount, pattern, ip, etc.
  riskScore: integer("riskScore").notNull(), // 0-100
  riskLevel: riskLevelEnum_4599174f("riskLevel").notNull(),
  flags: text("flags"), // JSON array of fraud flags
  passed: boolean("passed").notNull(),
  blockedReason: text("blockedReason"),
  metadata: text("metadata"), // JSON for check details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowFraudCheck = typeof escrowFraudChecks.$inferSelect;
export type InsertEscrowFraudCheck = typeof escrowFraudChecks.$inferInsert;

// Enhanced dispute resolution system
export const escrowDisputesEnhanced = pgTable("escrowDisputesEnhanced", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  filedBy: integer("filedBy").notNull(), // User ID
  filedByRole: filedByRoleEnum_2e779b5c("filedByRole").notNull(),
  disputeType: disputeTypeEnum_ebefc51f("disputeType_2").notNull(),
  description: text("description").notNull(),
  status: statusEnum_3463837a("status_24").default("filed").notNull(),
  assignedArbitrator: integer("assignedArbitrator"),
  resolution: text("resolution"),
  resolutionAmount: integer("resolutionAmount"), // Amount to refund/release (cents)
  splitPercentage: integer("splitPercentage"), // For split resolutions (0-100)
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EscrowDisputeEnhanced = typeof escrowDisputesEnhanced.$inferSelect;
export type InsertEscrowDisputeEnhanced = typeof escrowDisputesEnhanced.$inferInsert;

// Dispute messages and communication
export const disputeMessages = pgTable("disputeMessages", {
  id: serial("id").primaryKey(),
  disputeId: integer("disputeId").notNull(),
  senderId: integer("senderId").notNull(),
  senderRole: varchar("senderRole", { length: 50 }).notNull(), // buyer, seller, arbitrator, admin
  message: text("message").notNull(),
  attachments: text("attachments"), // JSON array of attachment URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DisputeMessage = typeof disputeMessages.$inferSelect;
export type InsertDisputeMessage = typeof disputeMessages.$inferInsert;

// Dispute evidence management
export const disputeEvidence = pgTable("disputeEvidence", {
  id: serial("id").primaryKey(),
  disputeId: integer("disputeId").notNull(),
  uploadedBy: integer("uploadedBy").notNull(),
  evidenceType: varchar("evidenceType", { length: 50 }).notNull(), // document, photo, video, audio, etc.
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: integer("fileSize"), // bytes
  mimeType: varchar("mimeType", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DisputeEvidence = typeof disputeEvidence.$inferSelect;
export type InsertDisputeEvidence = typeof disputeEvidence.$inferInsert;

// Compliance checks (KYC/AML/Sanctions)
export const escrowComplianceChecks = pgTable("escrowComplianceChecks", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  userId: integer("userId").notNull(),
  checkType: checkTypeEnum_1d9927cc("checkType").notNull(),
  status: statusEnum_bcd03b05("status_25").notNull(),
  provider: varchar("provider", { length: 50 }), // e.g., "ballerine", "onfido", "sumsub"
  providerCheckId: varchar("providerCheckId", { length: 255 }),
  result: text("result"), // JSON result from provider
  riskScore: integer("riskScore"), // 0-100
  flags: text("flags"), // JSON array of compliance flags
  reviewedBy: integer("reviewedBy"), // Admin user ID
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type EscrowComplianceCheck = typeof escrowComplianceChecks.$inferSelect;
export type InsertEscrowComplianceCheck = typeof escrowComplianceChecks.$inferInsert;

// Tax reporting (1099-K, etc.)
export const taxReporting = pgTable("taxReporting", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  year: integer("year").notNull(),
  totalEscrowVolume: integer("totalEscrowVolume").notNull(), // Total $ volume in cents
  transactionCount: integer("transactionCount").notNull(),
  reportType: varchar("reportType", { length: 50 }), // 1099-K, etc.
  reportStatus: reportStatusEnum_bc011a12("reportStatus").notNull(),
  reportUrl: text("reportUrl"), // S3 URL to generated report
  filedAt: timestamp("filedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaxReport = typeof taxReporting.$inferSelect;
export type InsertTaxReport = typeof taxReporting.$inferInsert;

// Webhook retry mechanism
export const webhookRetries = pgTable("webhookRetries", {
  id: serial("id").primaryKey(),
  webhookId: varchar("webhookId", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // stripe, mojaloop, tigerbeetle, etc.
  eventType: varchar("eventType", { length: 100 }).notNull(),
  payload: text("payload").notNull(), // JSON payload
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(3).notNull(),
  status: statusEnum_6e6b93a1("status_16").notNull(),
  lastError: text("lastError"),
  nextRetryAt: timestamp("nextRetryAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type WebhookRetry = typeof webhookRetries.$inferSelect;
export type InsertWebhookRetry = typeof webhookRetries.$inferInsert;

// Payment provider configuration
export const paymentProviders = pgTable("paymentProviders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // stripe, mojaloop, tigerbeetle, flutterwave, paystack
  displayName: varchar("displayName", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  priority: integer("priority").default(0).notNull(), // Higher priority = preferred provider
  capabilities: text("capabilities"), // JSON array: ["escrow", "instant_transfer", "cross_border", etc.]
  supportedCurrencies: text("supportedCurrencies"), // JSON array: ["USD", "NGN", "KES", etc.]
  configuration: text("configuration"), // JSON config (encrypted)
  healthStatus: healthStatusEnum_acecb411("healthStatus").default("healthy").notNull(),
  lastHealthCheck: timestamp("lastHealthCheck"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type PaymentProvider = typeof paymentProviders.$inferSelect;
export type InsertPaymentProvider = typeof paymentProviders.$inferInsert;

// Provider transaction mapping
export const providerTransactions = pgTable("providerTransactions", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  providerId: integer("providerId").notNull(),
  providerTransactionId: varchar("providerTransactionId", { length: 255 }).notNull(),
  transactionType: varchar("transactionType", { length: 50 }).notNull(), // hold, release, refund
  amount: integer("amount").notNull(), // cents
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  metadata: text("metadata"), // JSON for provider-specific data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type ProviderTransaction = typeof providerTransactions.$inferSelect;
export type InsertProviderTransaction = typeof providerTransactions.$inferInsert;

// TigerBeetle account mapping
export const tigerBeetleAccounts = pgTable("tigerBeetleAccounts", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrowId").notNull(),
  accountId: varchar("accountId", { length: 128 }).notNull().unique(), // TigerBeetle account ID (128-bit)
  accountType: accountTypeEnum_ce897c80("accountType").notNull(),
  ledger: integer("ledger").notNull(), // Ledger ID
  code: integer("code").notNull(), // Account code
  balance: varchar("balance", { length: 50 }).default("0").notNull(), // BigInt as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TigerBeetleAccount = typeof tigerBeetleAccounts.$inferSelect;
export type InsertTigerBeetleAccount = typeof tigerBeetleAccounts.$inferInsert;

// Mojaloop party mapping
export const mojaLoopParties = pgTable("mojaLoopParties", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  partyIdType: varchar("partyIdType", { length: 50 }).notNull(), // MSISDN, ACCOUNT_ID, etc.
  partyIdentifier: varchar("partyIdentifier", { length: 255 }).notNull(),
  partySubIdOrType: varchar("partySubIdOrType", { length: 255 }),
  fspId: varchar("fspId", { length: 100 }), // Financial Service Provider ID
  displayName: varchar("displayName", { length: 255 }),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  dateOfBirth: varchar("dateOfBirth", { length: 10 }),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type MojaLoopParty = typeof mojaLoopParties.$inferSelect;
export type InsertMojaLoopParty = typeof mojaLoopParties.$inferInsert;

// Builder quote requests
export const builderQuotes = pgTable("builderQuotes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  builderId: integer("builderId"),
  
  projectType: projectTypeEnum_8696925e("projectType_2").notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }),
  budget: integer("budget"),
  timeline: varchar("timeline", { length: 100 }),
  
  attachments: text("attachments"), // JSON array of S3 URLs
  
  status: statusEnum_ca711148("status_26").default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type BuilderQuote = typeof builderQuotes.$inferSelect;
export type InsertBuilderQuote = typeof builderQuotes.$inferInsert;

// Builder quote responses
export const builderQuoteResponses = pgTable("builderQuoteResponses", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  builderId: integer("builderId").notNull(),
  
  estimatedCost: integer("estimatedCost").notNull(),
  timeline: varchar("timeline", { length: 255 }).notNull(),
  breakdown: text("breakdown"), // JSON array of cost breakdown
  terms: text("terms"),
  validUntil: timestamp("validUntil"),
  
  status: statusEnum_1452ce00("status_27").default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type BuilderQuoteResponse = typeof builderQuoteResponses.$inferSelect;
export type InsertBuilderQuoteResponse = typeof builderQuoteResponses.$inferInsert;

// Open house events
export const openHouseEvents = pgTable("openHouseEvents", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  agentId: integer("agentId").notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  
  maxAttendees: integer("maxAttendees"),
  registrationRequired: integer("registrationRequired").default(1), // boolean
  
  status: statusEnum_a7608a2d("status_28").default("scheduled").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type OpenHouseEvent = typeof openHouseEvents.$inferSelect;
export type InsertOpenHouseEvent = typeof openHouseEvents.$inferInsert;

// Open house registrations
export const openHouseRegistrations = pgTable("openHouseRegistrations", {
  id: serial("id").primaryKey(),
  eventId: integer("eventId").notNull(),
  userId: integer("userId"),
  
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  numberOfGuests: integer("numberOfGuests").default(1),
  
  status: statusEnum_d4b853ae("status_29").default("registered").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type OpenHouseRegistration = typeof openHouseRegistrations.$inferSelect;
export type InsertOpenHouseRegistration = typeof openHouseRegistrations.$inferInsert;

// Open house attendees (check-in tracking)
export const openHouseAttendees = pgTable("openHouseAttendees", {
  id: serial("id").primaryKey(),
  eventId: integer("eventId").notNull(),
  registrationId: integer("registrationId"),
  
  checkInTime: timestamp("checkInTime").notNull(),
  checkOutTime: timestamp("checkOutTime"),
  
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OpenHouseAttendee = typeof openHouseAttendees.$inferSelect;
export type InsertOpenHouseAttendee = typeof openHouseAttendees.$inferInsert;

// Open house feedback
export const openHouseFeedback = pgTable("openHouseFeedback", {
  id: serial("id").primaryKey(),
  eventId: integer("eventId").notNull(),
  userId: integer("userId"),
  
  rating: integer("rating").notNull(), // 1-5
  feedback: text("feedback"),
  interestedInProperty: integer("interestedInProperty").default(0), // boolean
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OpenHouseFeedback = typeof openHouseFeedback.$inferSelect;
export type InsertOpenHouseFeedback = typeof openHouseFeedback.$inferInsert;

// Shortlet reviews
export const shortletReviews = pgTable("shortletReviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull(),
  propertyId: integer("propertyId").notNull(),
  guestId: integer("guestId").notNull(),
  hostId: integer("hostId").notNull(),
  
  // Ratings (1-5 scale)
  overallRating: integer("overallRating").notNull(),
  cleanlinessRating: integer("cleanlinessRating"),
  accuracyRating: integer("accuracyRating"),
  communicationRating: integer("communicationRating"),
  locationRating: integer("locationRating"),
  valueRating: integer("valueRating"),
  
  // Review content
  reviewText: text("reviewText"),
  
  // Host response
  hostResponse: text("hostResponse"),
  hostRespondedAt: timestamp("hostRespondedAt"),
  
  // Moderation
  status: statusEnum_1b8f2edf("status_7").default("published").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type ShortletReview = typeof shortletReviews.$inferSelect;
export type InsertShortletReview = typeof shortletReviews.$inferInsert;

// Map Analytics (A/B Testing)
export const mapAnalytics = pgTable("mapAnalytics", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  provider: providerEnum_efd1e0ce("provider").notNull(),
  eventType: eventTypeEnum_93448cfd("eventType").notNull(),
  loadTime: integer("loadTime"), // milliseconds
  errorMessage: text("errorMessage"),
  metadata: text("metadata"), // JSON string for additional event data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MapAnalytics = typeof mapAnalytics.$inferSelect;
export type InsertMapAnalytics = typeof mapAnalytics.$inferInsert;

// Zestimate Valuation Tables
export * from "./schema-valuations";

// Valuation Analytics Tables
export * from "./schema-valuation-analytics";

// Valuation Alerts Tables
export * from "./schema-valuation-alerts";

// Email Delivery Log
export * from "./schema-email-delivery";

// Offers Management
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  buyerId: integer("buyerId").notNull(),
  sellerId: integer("sellerId").notNull(),
  agentId: integer("agentId"),
  
  // Offer details
  offerAmount: integer("offerAmount").notNull(),
  earnestMoney: integer("earnestMoney"), // deposit amount
  downPayment: integer("downPayment"),
  financingType: financingTypeEnum_6e4c0e4b("financingType").default("conventional").notNull(),
  
  // Contingencies
  inspectionContingency: integer("inspectionContingency").default(1).notNull(), // boolean
  appraisalContingency: integer("appraisalContingency").default(1).notNull(), // boolean
  financingContingency: integer("financingContingency").default(1).notNull(), // boolean
  
  // Timeline
  proposedClosingDate: timestamp("proposedClosingDate"),
  inspectionPeriod: integer("inspectionPeriod").default(10), // days
  
  // Status
  status: statusEnum_3f6b29b6("status_30").default("pending").notNull(),
  
  // Additional terms
  additionalTerms: text("additionalTerms"),
  notes: text("notes"),
  
  // Documents
  documents: text("documents"), // JSON array of document URLs
  
  // E-signature
  buyerSignature: text("buyerSignature"),
  buyerSignedAt: timestamp("buyerSignedAt"),
  sellerSignature: text("sellerSignature"),
  sellerSignedAt: timestamp("sellerSignedAt"),
  
  // Expiration
  expiresAt: timestamp("expiresAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

// Counteroffers
export const counteroffers = pgTable("counteroffers", {
  id: serial("id").primaryKey(),
  offerId: integer("offerId").notNull(),
  counterpartyId: integer("counterpartyId").notNull(), // who made the counteroffer
  
  // Counteroffer details
  counterAmount: integer("counterAmount").notNull(),
  earnestMoney: integer("earnestMoney"),
  downPayment: integer("downPayment"),
  proposedClosingDate: timestamp("proposedClosingDate"),
  inspectionPeriod: integer("inspectionPeriod"),
  
  // Contingencies
  inspectionContingency: integer("inspectionContingency").default(1).notNull(),
  appraisalContingency: integer("appraisalContingency").default(1).notNull(),
  financingContingency: integer("financingContingency").default(1).notNull(),
  
  // Terms
  additionalTerms: text("additionalTerms"),
  notes: text("notes"),
  
  // Status
  status: statusEnum_307b82e0("status_31").default("pending").notNull(),
  
  // Expiration
  expiresAt: timestamp("expiresAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type Counteroffer = typeof counteroffers.$inferSelect;
export type InsertCounteroffer = typeof counteroffers.$inferInsert;

// Offer Activity Log
export const offerActivityLog = pgTable("offerActivityLog", {
  id: serial("id").primaryKey(),
  offerId: integer("offerId").notNull(),
  userId: integer("userId").notNull(),
  activityType: activityTypeEnum_efd6a2eb("activityType_2").notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OfferActivityLog = typeof offerActivityLog.$inferSelect;
export type InsertOfferActivityLog = typeof offerActivityLog.$inferInsert;

// ============================================================================
// Email Delivery Logs
// ============================================================================

export const emailDeliveryLogs = pgTable("emailDeliveryLogs", {
  id: serial("id").primaryKey(),
  
  // Email details
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  
  // Delivery status
  status: statusEnum_ca545ec2("status_32").notNull().default("pending"),
  
  // Retry tracking
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("lastAttemptAt").notNull(),
  
  // Success/failure details
  messageId: varchar("messageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  
  // Metadata
  emailType: varchar("emailType", { length: 100 }), // e.g., "appointment-confirmation", "offer-update"
  userId: integer("userId"), // Optional: link to user who triggered the email
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailDeliveryLog = typeof emailDeliveryLogs.$inferSelect;
export type InsertEmailDeliveryLog = typeof emailDeliveryLogs.$inferInsert;

// Webhook Activity Log
export const webhookActivityLog = pgTable("webhookActivityLog", {
  id: serial("id").primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  emailId: varchar("emailId", { length: 255 }).notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  eventData: text("eventData"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookActivityLog = typeof webhookActivityLog.$inferSelect;
export type InsertWebhookActivityLog = typeof webhookActivityLog.$inferInsert;

// ============================================================================
// Email Campaigns and Scheduled Emails
// ============================================================================

export const emailCampaigns = pgTable("emailCampaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: statusEnum_9abb842f("status_21").notNull().default("draft"),
  triggerType: triggerTypeEnum_4dd2edf2("triggerType").notNull().default("manual"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;

export const emailCampaignSequences = pgTable("emailCampaignSequences", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  sequenceOrder: integer("sequenceOrder").notNull(),
  templateId: integer("templateId").notNull(),
  delayDays: integer("delayDays").notNull().default(0),
  delayHours: integer("delayHours").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailCampaignSequence = typeof emailCampaignSequences.$inferSelect;
export type InsertEmailCampaignSequence = typeof emailCampaignSequences.$inferInsert;

export const emailCampaignSubscribers = pgTable("emailCampaignSubscribers", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  userId: integer("userId").notNull(),
  status: statusEnum_92b83ad8("status_33").notNull().default("active"),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  lastSentSequence: integer("lastSentSequence").default(0),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailCampaignSubscriber = typeof emailCampaignSubscribers.$inferSelect;
export type InsertEmailCampaignSubscriber = typeof emailCampaignSubscribers.$inferInsert;

// Update emailDeliveryLogs to include tracking fields for analytics
export const emailDeliveryLog = pgTable("emailDeliveryLog", {
  id: serial("id").primaryKey(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: statusEnum_86ae69a8("status_34").notNull().default("pending"),
  templateId: integer("templateId"),
  userId: integer("userId"),
  emailType: varchar("emailType", { length: 100 }),
  
  // Tracking fields for analytics
  opened: integer("opened").default(0).notNull(),
  clicked: integer("clicked").default(0).notNull(),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  
  // Delivery tracking
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
  
  // Error tracking
  errorMessage: text("errorMessage"),
  attempts: integer("attempts").notNull().default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailDeliveryLogEntry = typeof emailDeliveryLog.$inferSelect;
export type InsertEmailDeliveryLogEntry = typeof emailDeliveryLog.$inferInsert;


// ============================================================================
// A/B Testing for Email Campaigns
// ============================================================================

export const emailAbTests = pgTable("emailAbTests", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  testType: testTypeEnum_734ed95c("testType").notNull(),
  status: statusEnum_a167636b("status_35").notNull().default("draft"),
  
  // Test configuration
  trafficSplit: integer("trafficSplit").notNull().default(50), // Percentage for variant A (0-100)
  sampleSize: integer("sampleSize"), // Total subscribers to include in test
  confidenceLevel: integer("confidenceLevel").notNull().default(95), // 90, 95, 99
  
  // Winner selection
  winnerMetric: winnerMetricEnum_e601358a("winnerMetric").notNull().default("open_rate"),
  winnerVariant: varchar("winnerVariant", { length: 1 }), // 'A' or 'B', null if no winner yet
  autoPromoteWinner: integer("autoPromoteWinner").notNull().default(1), // boolean as int
  
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailAbTest = typeof emailAbTests.$inferSelect;
export type InsertEmailAbTest = typeof emailAbTests.$inferInsert;

export const emailAbTestVariants = pgTable("emailAbTestVariants", {
  id: serial("id").primaryKey(),
  testId: integer("testId").notNull(),
  variant: varchar("variant", { length: 1 }).notNull(), // 'A' or 'B'
  
  // Variant content
  subjectLine: varchar("subjectLine", { length: 255 }),
  fromName: varchar("fromName", { length: 255 }),
  content: text("content"), // HTML content
  sendTime: varchar("sendTime", { length: 5 }), // HH:MM format
  
  // Performance metrics
  sentCount: integer("sentCount").notNull().default(0),
  deliveredCount: integer("deliveredCount").notNull().default(0),
  openedCount: integer("openedCount").notNull().default(0),
  clickedCount: integer("clickedCount").notNull().default(0),
  convertedCount: integer("convertedCount").notNull().default(0),
  
  // Calculated rates (stored for performance)
  deliveryRate: integer("deliveryRate").notNull().default(0), // Percentage * 100
  openRate: integer("openRate").notNull().default(0), // Percentage * 100
  clickRate: integer("clickRate").notNull().default(0), // Percentage * 100
  conversionRate: integer("conversionRate").notNull().default(0), // Percentage * 100
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailAbTestVariant = typeof emailAbTestVariants.$inferSelect;
export type InsertEmailAbTestVariant = typeof emailAbTestVariants.$inferInsert;

export const emailAbTestResults = pgTable("emailAbTestResults", {
  id: serial("id").primaryKey(),
  testId: integer("testId").notNull(),
  
  // Statistical analysis
  pValue: varchar("pValue", { length: 20 }), // Stored as string for precision
  isSignificant: integer("isSignificant").notNull().default(0), // boolean as int
  confidenceInterval: varchar("confidenceInterval", { length: 50 }), // e.g., "95% CI: [0.12, 0.18]"
  
  // Winner determination
  winnerVariant: varchar("winnerVariant", { length: 1 }), // 'A', 'B', or null for tie
  improvementPercentage: integer("improvementPercentage"), // How much better winner is (percentage * 100)
  
  // Recommendations
  recommendation: text("recommendation"),
  shouldPromote: integer("shouldPromote").notNull().default(0), // boolean as int
  
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type EmailAbTestResult = typeof emailAbTestResults.$inferSelect;
export type InsertEmailAbTestResult = typeof emailAbTestResults.$inferInsert;

// ============================================================================
// Email Template Builder
// ============================================================================

export const emailTemplateBlocks = pgTable("emailTemplateBlocks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: categoryEnum_70a22095("category_2").notNull(),
  
  // Block content
  htmlContent: text("htmlContent").notNull(),
  cssStyles: text("cssStyles"),
  
  // Preview
  thumbnailUrl: text("thumbnailUrl"),
  
  // Variables that can be used in this block
  variables: text("variables"), // JSON array of variable names
  
  // Metadata
  isPublic: integer("isPublic").notNull().default(1), // boolean as int
  createdBy: integer("createdBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type EmailTemplateBlock = typeof emailTemplateBlocks.$inferSelect;
export type InsertEmailTemplateBlock = typeof emailTemplateBlocks.$inferInsert;

export const customEmailTemplates = pgTable("customEmailTemplates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Template structure (array of block IDs in order)
  blockSequence: text("blockSequence").notNull(), // JSON array of block IDs
  
  // Customizations per block
  blockCustomizations: text("blockCustomizations"), // JSON object with block-specific overrides
  
  // Variables
  availableVariables: text("availableVariables"), // JSON array of variable definitions
  
  // Metadata
  isActive: integer("isActive").notNull().default(1), // boolean as int
  createdBy: integer("createdBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type CustomEmailTemplate = typeof customEmailTemplates.$inferSelect;
export type InsertCustomEmailTemplate = typeof customEmailTemplates.$inferInsert;

// ============================================================================
// Automated Re-engagement Campaigns
// ============================================================================

export const reEngagementCampaigns = pgTable("reEngagementCampaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Trigger conditions
  inactivityDays: integer("inactivityDays").notNull().default(30), // Days of inactivity to trigger
  targetSegment: targetSegmentEnum_5efc33b3("targetSegment").notNull().default("all"),
  
  // Campaign configuration
  emailSequence: text("emailSequence").notNull(), // JSON array of email templates
  delayBetweenEmails: integer("delayBetweenEmails").notNull().default(3), // Days between emails
  maxEmails: integer("maxEmails").notNull().default(3), // Maximum emails in sequence
  
  // Status
  status: statusEnum_9abb842f("status_21").notNull().default("draft"),
  
  // Performance tracking
  totalTriggered: integer("totalTriggered").notNull().default(0),
  totalReEngaged: integer("totalReEngaged").notNull().default(0), // Users who became active again
  totalUnsubscribed: integer("totalUnsubscribed").notNull().default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type ReEngagementCampaign = typeof reEngagementCampaigns.$inferSelect;
export type InsertReEngagementCampaign = typeof reEngagementCampaigns.$inferInsert;

export const userActivityTracking = pgTable("userActivityTracking", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  
  // Activity metrics
  lastLoginAt: timestamp("lastLoginAt"),
  lastPropertyViewAt: timestamp("lastPropertyViewAt"),
  lastSearchAt: timestamp("lastSearchAt"),
  lastOfferAt: timestamp("lastOfferAt"),
  lastMessageAt: timestamp("lastMessageAt"),
  
  // Engagement score (0-100)
  engagementScore: integer("engagementScore").notNull().default(50),
  
  // Re-engagement tracking
  isInactive: integer("isInactive").notNull().default(0), // boolean as int
  inactiveSince: timestamp("inactiveSince"),
  reEngagementCampaignId: integer("reEngagementCampaignId"),
  reEngagementEmailsSent: integer("reEngagementEmailsSent").notNull().default(0),
  lastReEngagementEmailAt: timestamp("lastReEngagementEmailAt"),
  
  // Re-engagement outcome
  wasReEngaged: integer("wasReEngaged").notNull().default(0), // boolean as int
  reEngagedAt: timestamp("reEngagedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(), // Note: Auto-update removed - handle in application or use trigger
});

export type UserActivityTracking = typeof userActivityTracking.$inferSelect;
export type InsertUserActivityTracking = typeof userActivityTracking.$inferInsert;

export const reEngagementCampaignLogs = pgTable("reEngagementCampaignLogs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  userId: integer("userId").notNull(),
  
  // Email details
  emailSequenceIndex: integer("emailSequenceIndex").notNull(), // Which email in the sequence (0-based)
  emailSubject: varchar("emailSubject", { length: 255 }),
  
  // Status
  status: statusEnum_a5391fab("status_36").notNull(),
  
  // Timestamps
  scheduledFor: timestamp("scheduledFor"),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  
  // Error tracking
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReEngagementCampaignLog = typeof reEngagementCampaignLogs.$inferSelect;
export type InsertReEngagementCampaignLog = typeof reEngagementCampaignLogs.$inferInsert;
