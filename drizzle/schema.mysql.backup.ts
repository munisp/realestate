import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Saved Map Views
export const savedMapViews = mysqlTable("savedMapViews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Map state
  centerLat: varchar("centerLat", { length: 20 }).notNull(),
  centerLng: varchar("centerLng", { length: 20 }).notNull(),
  zoom: int("zoom").notNull(),
  // Filters (stored as JSON)
  filters: text("filters"), // { priceMin, priceMax, bedrooms, bathrooms, propertyType, etc. }
  // Heatmap preferences
  heatmapMode: mysqlEnum("heatmapMode", ["density", "price", "combined", "none"]).default("none"),
  heatmapIntensity: int("heatmapIntensity").default(100), // 0-200 (stored as percentage)
  heatmapRadius: int("heatmapRadius").default(25), // 10-50px
  // Cluster preferences
  clusteringEnabled: int("clusteringEnabled").default(1), // boolean as int
  minClusterSize: int("minClusterSize").default(2),
  // Metadata
  isDefault: int("isDefault").default(0), // boolean as int
  shareToken: varchar("shareToken", { length: 64 }), // for sharing views
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedMapView = typeof savedMapViews.$inferSelect;
export type InsertSavedMapView = typeof savedMapViews.$inferInsert;

// Property-related tables
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
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
  propertyType: mysqlEnum("propertyType", ["single_family", "condo", "townhouse", "multi_family", "land", "commercial"]).notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent", "sold", "off_market"]).notNull(),
  status: mysqlEnum("status", ["active", "pending", "sold", "off_market", "archived"]).default("active").notNull(),
  // Property specifications
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  squareFeet: int("squareFeet"),
  lotSize: int("lotSize"),
  yearBuilt: int("yearBuilt"),
  // Pricing
  price: int("price").notNull(),
  pricePerSqFt: int("pricePerSqFt"),
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
  daysOnMarket: int("daysOnMarket"),
  viewCount: int("viewCount").default(0),
  // Ownership
  ownerId: int("ownerId"),
  agentId: int("agentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// Property History (for historical playback)
export const propertyHistory = mysqlTable("propertyHistory", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  // Snapshot data
  price: int("price").notNull(),
  status: mysqlEnum("status", ["active", "pending", "sold", "off_market", "archived"]).notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent", "sold", "off_market"]).notNull(),
  // Geospatial (in case property moved or coordinates updated)
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),
  // Metadata
  snapshotDate: timestamp("snapshotDate").notNull(),
  changeType: mysqlEnum("changeType", ["created", "price_change", "status_change", "updated", "deleted"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyHistory = typeof propertyHistory.$inferSelect;
export type InsertPropertyHistory = typeof propertyHistory.$inferInsert;

// Property valuations
export const valuations = mysqlTable("valuations", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  estimatedValue: int("estimatedValue").notNull(),
  confidenceLower: int("confidenceLower"),
  confidenceUpper: int("confidenceUpper"),
  confidenceScore: int("confidenceScore"), // 0-100
  valuationMethod: varchar("valuationMethod", { length: 50 }), // "ml", "comparative", "manual"
  comparables: text("comparables"), // JSON array of comparable property IDs
  factors: text("factors"), // JSON object of valuation factors
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Valuation = typeof valuations.$inferSelect;
export type InsertValuation = typeof valuations.$inferInsert;

// Transactions
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  buyerId: int("buyerId"),
  sellerId: int("sellerId"),
  agentId: int("agentId"),
  transactionType: mysqlEnum("transactionType", ["sale", "rent", "lease"]).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  amount: int("amount").notNull(),
  depositAmount: int("depositAmount"),
  closingDate: timestamp("closingDate"),
  notes: text("notes"),
  documents: text("documents"), // JSON array of document URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Payments
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: int("transactionId").notNull(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  paymentType: mysqlEnum("paymentType", ["deposit", "down_payment", "installment", "full_payment", "refund"]).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // "card", "bank_transfer", "crypto"
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "refunded", "escrow", "released"]).default("pending").notNull(),
  paymentGateway: varchar("paymentGateway", { length: 50 }),
  gatewayTransactionId: varchar("gatewayTransactionId", { length: 255 }),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  metadata: text("metadata"), // JSON object
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// User favorites
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  propertyId: int("propertyId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Saved searches
export const savedSearches = mysqlTable("savedSearches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  searchCriteria: text("searchCriteria").notNull(), // JSON object
  
  // Map drawing boundaries
  boundaryType: mysqlEnum("boundaryType", ["none", "polygon", "circle", "rectangle"]).default("none"),
  boundaryData: text("boundaryData"), // JSON: polygon coordinates, circle center/radius, etc.
  
  notificationsEnabled: int("notificationsEnabled").default(1), // 0 or 1 for boolean
  lastNotified: timestamp("lastNotified"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;

// Property views analytics
export const propertyViews = mysqlTable("propertyViews", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  referrer: text("referrer"),
  viewDuration: int("viewDuration"), // in seconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyView = typeof propertyViews.$inferSelect;
export type InsertPropertyView = typeof propertyViews.$inferInsert;

// Agent/Developer profiles
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  agency: varchar("agency", { length: 255 }),
  specialization: text("specialization"), // JSON array
  bio: text("bio"),
  phone: varchar("phone", { length: 20 }),
  website: text("website"),
  rating: int("rating"), // 0-100
  totalSales: int("totalSales").default(0),
  activeListings: int("activeListings").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// Property comparisons
export const propertyComparisons = mysqlTable("propertyComparisons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }),
  propertyIds: text("propertyIds").notNull(), // JSON array of property IDs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyComparison = typeof propertyComparisons.$inferSelect;
export type InsertPropertyComparison = typeof propertyComparisons.$inferInsert;

// Messages between users and agents
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  propertyId: int("propertyId"), // Optional reference to property being discussed
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  isRead: int("isRead").default(0), // 0 or 1 for boolean
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Search alerts for notifications
export const searchAlerts = mysqlTable("searchAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  savedSearchId: int("savedSearchId"),
  alertName: varchar("alertName", { length: 255 }).notNull(),
  searchCriteria: text("searchCriteria").notNull(), // JSON object
  frequency: mysqlEnum("frequency", ["instant", "daily", "weekly"]).default("daily").notNull(),
  isActive: int("isActive").default(1), // 0 or 1
  lastTriggered: timestamp("lastTriggered"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SearchAlert = typeof searchAlerts.$inferSelect;
export type InsertSearchAlert = typeof searchAlerts.$inferInsert;

// Notification history
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["search_alert", "price_change", "new_listing", "message", "transaction"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("relatedId"), // Property ID, message ID, etc.
  isRead: int("isRead").default(0),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Virtual tours
export const virtualTours = mysqlTable("virtualTours", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  tourType: mysqlEnum("tourType", ["360_image", "3d_model", "video", "ar_view"]).notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  mediaUrl: text("mediaUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  viewCount: int("viewCount").default(0),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VirtualTour = typeof virtualTours.$inferSelect;
export type InsertVirtualTour = typeof virtualTours.$inferInsert;

// Document Management System
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  propertyId: int("propertyId"), // Optional: link to property
  transactionId: int("transactionId"), // Optional: link to transaction
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(),
  fileSize: int("fileSize"), // bytes
  mimeType: varchar("mimeType", { length: 100 }),
  category: mysqlEnum("category", [
    "deed", 
    "inspection_report", 
    "contract", 
    "disclosure", 
    "appraisal", 
    "insurance", 
    "tax_document",
    "id_verification",
    "title",
    "other"
  ]).notNull(),
  tags: text("tags"), // JSON array of tags
  title: varchar("title", { length: 255 }),
  description: text("description"),
  version: int("version").default(1).notNull(),
  parentDocumentId: int("parentDocumentId"), // For versioning
  status: mysqlEnum("status", ["draft", "pending_signature", "signed", "archived"]).default("draft").notNull(),
  signatureStatus: mysqlEnum("signatureStatus", ["not_required", "pending", "signed", "rejected"]),
  docusignEnvelopeId: varchar("docusignEnvelopeId", { length: 255 }),
  signedBy: text("signedBy"), // JSON array of user IDs
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
// ============================================================================
// Builder Platform Extension
// ============================================================================

// Builder profiles (extends agents table for builders/developers)
export const builders = mysqlTable("builders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"), // Link to agents table if they're also a regular agent
  companyName: varchar("companyName", { length: 255 }).notNull(),
  cacNumber: varchar("cacNumber", { length: 100 }), // Corporate Affairs Commission registration
  companyType: mysqlEnum("companyType", ["individual", "llc", "corporation", "partnership"]),
  
  // Verification
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "in_review", "verified", "rejected"]).default("pending").notNull(),
  verificationDocuments: text("verificationDocuments"), // JSON array of document URLs
  verifiedAt: timestamp("verifiedAt"),
  verifiedBy: int("verifiedBy"), // Admin user ID
  
  // Trust & Reputation
  trustScore: int("trustScore").default(0), // 0-100
  totalProjects: int("totalProjects").default(0),
  completedProjects: int("completedProjects").default(0),
  activeProjects: int("activeProjects").default(0),
  averageRating: int("averageRating").default(0), // 0-100
  totalReviews: int("totalReviews").default(0),
  
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Builder = typeof builders.$inferSelect;
export type InsertBuilder = typeof builders.$inferInsert;

// Builder projects (new construction)
export const builderProjects = mysqlTable("builderProjects", {
  id: int("id").autoincrement().primaryKey(),
  builderId: int("builderId").notNull(),
  propertyId: int("propertyId"), // Link to properties table for unified search
  
  // Project details
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectType: mysqlEnum("projectType", ["residential", "commercial", "mixed_use"]).notNull(),
  description: text("description"),
  
  // Construction status
  constructionStatus: mysqlEnum("constructionStatus", ["pre_construction", "under_construction", "completed"]).notNull(),
  startDate: timestamp("startDate"),
  estimatedCompletionDate: timestamp("estimatedCompletionDate"),
  actualCompletionDate: timestamp("actualCompletionDate"),
  completionPercentage: int("completionPercentage").default(0), // 0-100
  
  // Pricing
  originalPrice: int("originalPrice").notNull(),
  currentPrice: int("currentPrice").notNull(),
  pricePerSqFt: int("pricePerSqFt"),
  
  // Units/Properties
  totalUnits: int("totalUnits").default(1),
  availableUnits: int("availableUnits"),
  soldUnits: int("soldUnits").default(0),
  
  // Media & Documents
  floorPlans: text("floorPlans"), // JSON array
  images: text("images"), // JSON array
  videos: text("videos"), // JSON array
  brochure: text("brochure"),
  legalDocuments: text("legalDocuments"), // JSON: C of O, survey, approvals
  
  // Status
  status: mysqlEnum("status", ["draft", "published", "sold_out", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  views: int("views").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuilderProject = typeof builderProjects.$inferSelect;
export type InsertBuilderProject = typeof builderProjects.$inferInsert;

// Project milestones for construction tracking
export const projectMilestones = mysqlTable("projectMilestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  milestoneNumber: int("milestoneNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Payment tied to milestone
  paymentPercentage: int("paymentPercentage"), // % of total price
  paymentAmount: int("paymentAmount"),
  
  // Status
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "verified"]).default("pending").notNull(),
  targetDate: timestamp("targetDate"),
  completedDate: timestamp("completedDate"),
  verifiedDate: timestamp("verifiedDate"),
  verifiedBy: int("verifiedBy"), // Inspector user ID
  
  // Progress documentation
  progressPhotos: text("progressPhotos"), // JSON array
  inspectionReport: text("inspectionReport"),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = typeof projectMilestones.$inferInsert;

// Builder reviews
export const builderReviews = mysqlTable("builderReviews", {
  id: int("id").autoincrement().primaryKey(),
  builderId: int("builderId").notNull(),
  projectId: int("projectId"),
  reviewerId: int("reviewerId").notNull(),
  
  // Ratings (0-100)
  overallRating: int("overallRating").notNull(),
  qualityRating: int("qualityRating"),
  timelinessRating: int("timelinessRating"),
  communicationRating: int("communicationRating"),
  valueRating: int("valueRating"),
  
  // Review content
  title: varchar("title", { length: 255 }),
  review: text("review"),
  pros: text("pros"),
  cons: text("cons"),
  
  // Media
  photos: text("photos"), // JSON array
  
  // Status
  status: mysqlEnum("status", ["pending", "published", "flagged", "removed"]).default("pending").notNull(),
  verifiedPurchase: int("verifiedPurchase").default(0), // 0 or 1
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuilderReview = typeof builderReviews.$inferSelect;
export type InsertBuilderReview = typeof builderReviews.$inferInsert;

// Property reviews
export const propertyReviews = mysqlTable("propertyReviews", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  
  // Ratings (1-5 stars, stored as 20-100 for consistency)
  overallRating: int("overallRating").notNull(), // 20, 40, 60, 80, 100 for 1-5 stars
  locationRating: int("locationRating"),
  valueRating: int("valueRating"),
  conditionRating: int("conditionRating"),
  
  // Review content
  title: varchar("title", { length: 255 }),
  review: text("review").notNull(),
  pros: text("pros"),
  cons: text("cons"),
  
  // Media
  photos: text("photos"), // JSON array of photo URLs
  
  // Status
  status: mysqlEnum("status", ["pending", "published", "flagged", "removed"]).default("pending").notNull(),
  verifiedPurchase: int("verifiedPurchase").default(0), // 0 or 1
  helpfulCount: int("helpfulCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyReview = typeof propertyReviews.$inferSelect;
export type InsertPropertyReview = typeof propertyReviews.$inferInsert;

// ============================================================================
// Short-let Rental Extension
// ============================================================================

// Short-let properties (extends properties table)
export const shortLetProperties = mysqlTable("shortLetProperties", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(), // Link to main properties table
  hostId: int("hostId").notNull(), // User ID of host
  
  // Rental details
  nightlyRate: int("nightlyRate").notNull(),
  weeklyRate: int("weeklyRate"),
  monthlyRate: int("monthlyRate"),
  cleaningFee: int("cleaningFee"),
  securityDeposit: int("securityDeposit"),
  
  // Availability
  minimumStay: int("minimumStay").default(1), // nights
  maximumStay: int("maximumStay"),
  instantBooking: int("instantBooking").default(0), // 0 or 1
  
  // Amenities
  amenities: text("amenities"), // JSON array
  houseRules: text("houseRules"),
  
  // Capacity
  maxGuests: int("maxGuests").notNull(),
  
  // Calendar & Availability
  availabilityCalendar: text("availabilityCalendar"), // JSON object
  blockedDates: text("blockedDates"), // JSON array
  
  // Status
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShortLetProperty = typeof shortLetProperties.$inferSelect;
export type InsertShortLetProperty = typeof shortLetProperties.$inferInsert;

// Short-let bookings
export const shortLetBookings = mysqlTable("shortLetBookings", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  guestId: int("guestId").notNull(),
  hostId: int("hostId").notNull(),
  
  // Booking dates
  checkIn: timestamp("checkIn").notNull(),
  checkOut: timestamp("checkOut").notNull(),
  nights: int("nights").notNull(),
  
  // Guests
  numberOfGuests: int("numberOfGuests").notNull(),
  
  // Pricing
  nightlyRate: int("nightlyRate").notNull(),
  totalNights: int("totalNights").notNull(),
  cleaningFee: int("cleaningFee"),
  serviceFee: int("serviceFee"),
  totalAmount: int("totalAmount").notNull(),
  
  // Status
  status: mysqlEnum("status", ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "completed"]).default("pending").notNull(),
  
  // Payment
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending").notNull(),
  paymentId: int("paymentId"),
  
  // Communication
  specialRequests: text("specialRequests"),
  hostNotes: text("hostNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShortLetBooking = typeof shortLetBookings.$inferSelect;
export type InsertShortLetBooking = typeof shortLetBookings.$inferInsert;

// Appointments
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  buyerId: int("buyerId").notNull(),
  agentId: int("agentId"),
  
  // Appointment details
  appointmentDate: timestamp("appointmentDate").notNull(),
  duration: int("duration").default(60).notNull(), // minutes
  tourType: mysqlEnum("tourType", ["in_person", "virtual"]).default("in_person").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  meetingLink: text("meetingLink"), // For virtual tours
  
  // Additional info
  notes: text("notes"),
  cancellationReason: text("cancellationReason"),
  reminderSent: int("reminderSent").default(0).notNull(), // boolean
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// Agent Availability
export const agentAvailability = mysqlTable("agentAvailability", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  
  // Schedule
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM format
  isAvailable: int("isAvailable").default(1).notNull(), // boolean
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentAvailability = typeof agentAvailability.$inferSelect;
export type InsertAgentAvailability = typeof agentAvailability.$inferInsert;

// User Activity Tracking
export const userActivity = mysqlTable("userActivity", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 255 }),
  
  // Activity details
  activityType: mysqlEnum("activityType", ["view", "search", "favorite", "inquiry", "comparison", "download"]).notNull(),
  propertyId: int("propertyId"),
  searchQuery: text("searchQuery"), // JSON string
  metadata: text("metadata"), // JSON string
  duration: int("duration"), // seconds
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = typeof userActivity.$inferInsert;

// Buyer Profiles
export const buyerProfiles = mysqlTable("buyerProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Preferences
  preferredLocations: text("preferredLocations"), // JSON array
  priceRange: text("priceRange"), // JSON object {min, max}
  preferredPropertyTypes: text("preferredPropertyTypes"), // JSON array
  minBedrooms: int("minBedrooms"),
  minBathrooms: int("minBathrooms"),
  preferredAmenities: text("preferredAmenities"), // JSON array
  
  // Intent scoring
  intentScore: int("intentScore").default(0).notNull(), // 0-100
  lastActive: timestamp("lastActive"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuyerProfile = typeof buyerProfiles.$inferSelect;
export type InsertBuyerProfile = typeof buyerProfiles.$inferInsert;

// Buyer Intent Signals
export const buyerIntentSignals = mysqlTable("buyerIntentSignals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Signal details
  signalType: mysqlEnum("signalType", [
    "repeat_view", 
    "long_view", 
    "favorite", 
    "inquiry", 
    "comparison", 
    "download_docs", 
    "mortgage_calc"
  ]).notNull(),
  propertyId: int("propertyId"),
  weight: int("weight").default(1).notNull(), // Signal strength
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type BuyerIntentSignal = typeof buyerIntentSignals.$inferSelect;
export type InsertBuyerIntentSignal = typeof buyerIntentSignals.$inferInsert;

// ============================================================================
// Notification System
// ============================================================================

import { boolean } from "drizzle-orm/mysql-core";

export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  smsNotifications: boolean("smsNotifications").default(false).notNull(),
  priceDropAlerts: boolean("priceDropAlerts").default(true).notNull(),
  newListingAlerts: boolean("newListingAlerts").default(true).notNull(),
  appointmentReminders: boolean("appointmentReminders").default(true).notNull(),
  messageNotifications: boolean("messageNotifications").default(true).notNull(),
  marketingEmails: boolean("marketingEmails").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export const notificationQueue = mysqlTable("notificationQueue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["email", "sms"]).notNull(),
  template: varchar("template", { length: 100 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  data: text("data"), // JSON string
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationQueueItem = typeof notificationQueue.$inferSelect;
export type InsertNotificationQueueItem = typeof notificationQueue.$inferInsert;

export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  templateKey: varchar("templateKey", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: text("htmlContent").notNull(),
  textContent: text("textContent"),
  variables: text("variables"), // JSON array of variable names
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;



export const documentShares = mysqlTable("documentShares", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  sharedWithUserId: int("sharedWithUserId").notNull(),
  sharedByUserId: int("sharedByUserId").notNull(),
  permission: mysqlEnum("permission", ["view", "download", "edit"]).default("view").notNull(),
  expiresAt: timestamp("expiresAt"),
  accessCount: int("accessCount").default(0),
  lastAccessedAt: timestamp("lastAccessedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentShare = typeof documentShares.$inferSelect;
export type InsertDocumentShare = typeof documentShares.$inferInsert;

export const documentFolders = mysqlTable("documentFolders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentFolderId: int("parentFolderId"),
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentFolder = typeof documentFolders.$inferSelect;
export type InsertDocumentFolder = typeof documentFolders.$inferInsert;

export const documentFolderItems = mysqlTable("documentFolderItems", {
  id: int("id").autoincrement().primaryKey(),
  folderId: int("folderId").notNull(),
  documentId: int("documentId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type DocumentFolderItem = typeof documentFolderItems.$inferSelect;
export type InsertDocumentFolderItem = typeof documentFolderItems.$inferInsert;

// Admin Moderation Panel
export const propertyReports = mysqlTable("propertyReports", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  reportedByUserId: int("reportedByUserId").notNull(),
  reason: mysqlEnum("reason", [
    "inaccurate_info",
    "fake_listing",
    "inappropriate_content",
    "duplicate",
    "scam",
    "other"
  ]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewing", "resolved", "dismissed"]).default("pending").notNull(),
  reviewedByAdminId: int("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  action: mysqlEnum("action", ["none", "warning_sent", "listing_removed", "user_banned"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type PropertyReport = typeof propertyReports.$inferSelect;
export type InsertPropertyReport = typeof propertyReports.$inferInsert;

export const userReports = mysqlTable("userReports", {
  id: int("id").autoincrement().primaryKey(),
  reportedUserId: int("reportedUserId").notNull(),
  reportedByUserId: int("reportedByUserId").notNull(),
  reason: mysqlEnum("reason", [
    "harassment",
    "fraud",
    "spam",
    "inappropriate_behavior",
    "fake_profile",
    "other"
  ]).notNull(),
  description: text("description"),
  evidence: text("evidence"), // JSON array of URLs/screenshots
  status: mysqlEnum("status", ["pending", "reviewing", "resolved", "dismissed"]).default("pending").notNull(),
  reviewedByAdminId: int("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  action: mysqlEnum("action", ["none", "warning_sent", "account_suspended", "account_banned"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = typeof userReports.$inferInsert;

export const reviewReports = mysqlTable("reviewReports", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  reportedByUserId: int("reportedByUserId").notNull(),
  reason: mysqlEnum("reason", [
    "fake_review",
    "offensive_language",
    "spam",
    "not_relevant",
    "other"
  ]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewing", "resolved", "dismissed"]).default("pending").notNull(),
  reviewedByAdminId: int("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  action: mysqlEnum("action", ["none", "review_removed", "user_warned"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type ReviewReport = typeof reviewReports.$inferSelect;
export type InsertReviewReport = typeof reviewReports.$inferInsert;

export const moderationActions = mysqlTable("moderationActions", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  actionType: mysqlEnum("actionType", [
    "approve_property",
    "reject_property",
    "remove_property",
    "suspend_user",
    "ban_user",
    "remove_review",
    "warn_user",
    "restore_content"
  ]).notNull(),
  targetType: mysqlEnum("targetType", ["property", "user", "review"]).notNull(),
  targetId: int("targetId").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModerationAction = typeof moderationActions.$inferSelect;
export type InsertModerationAction = typeof moderationActions.$inferInsert;

export const propertyApprovals = mysqlTable("propertyApprovals", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "needs_changes"]).default("pending").notNull(),
  reviewedByAdminId: int("reviewedByAdminId"),
  reviewNotes: text("reviewNotes"),
  rejectionReason: text("rejectionReason"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type PropertyApproval = typeof propertyApprovals.$inferSelect;
export type InsertPropertyApproval = typeof propertyApprovals.$inferInsert;

// Payment Escrow System
export const escrowAccounts = mysqlTable("escrowAccounts", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: int("transactionId").notNull(),
  propertyId: int("propertyId").notNull(),
  projectId: int("projectId"), // For builder projects
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  amount: int("amount").notNull(), // Original amount in dollars
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  totalAmount: int("totalAmount").notNull(), // cents
  heldAmount: int("heldAmount").notNull(), // cents
  releasedAmount: int("releasedAmount").default(0).notNull(), // cents
  refundedAmount: int("refundedAmount").default(0).notNull(), // cents
  status: mysqlEnum("status", [
    "created",
    "funded",
    "partial_release",
    "completed",
    "disputed",
    "refunded",
    "cancelled"
  ]).default("created").notNull(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  fundedAt: timestamp("fundedAt"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscrowAccount = typeof escrowAccounts.$inferSelect;
export type InsertEscrowAccount = typeof escrowAccounts.$inferInsert;

export const escrowMilestones = mysqlTable("escrowMilestones", {
  id: int("id").autoincrement().primaryKey(),
  escrowAccountId: int("escrowAccountId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  amount: int("amount").notNull(), // cents
  percentage: int("percentage"), // 0-100
  sequence: int("sequence").notNull(), // order of milestones
  status: mysqlEnum("status", [
    "pending",
    "in_progress",
    "completed",
    "approved",
    "released",
    "disputed"
  ]).default("pending").notNull(),
  requiredDocuments: text("requiredDocuments"), // JSON array
  uploadedDocuments: text("uploadedDocuments"), // JSON array
  approvedByBuyer: int("approvedByBuyer").default(0), // boolean
  approvedBySeller: int("approvedBySeller").default(0), // boolean
  approvedByInspector: int("approvedByInspector").default(0), // boolean
  inspectorId: int("inspectorId"),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscrowMilestone = typeof escrowMilestones.$inferSelect;
export type InsertEscrowMilestone = typeof escrowMilestones.$inferInsert;

export const escrowTransactions = mysqlTable("escrowTransactions", {
  id: int("id").autoincrement().primaryKey(),
  escrowAccountId: int("escrowAccountId").notNull(),
  milestoneId: int("milestoneId"),
  type: mysqlEnum("type", [
    "deposit",
    "release",
    "refund",
    "fee",
    "adjustment"
  ]).notNull(),
  amount: int("amount").notNull(), // cents
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  description: text("description"),
  metadata: text("metadata"), // JSON
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrowTransaction = typeof escrowTransactions.$inferInsert;

export const escrowDisputes = mysqlTable("escrowDisputes", {
  id: int("id").autoincrement().primaryKey(),
  escrowAccountId: int("escrowAccountId").notNull(),
  milestoneId: int("milestoneId"),
  initiatedByUserId: int("initiatedByUserId").notNull(),
  disputeType: mysqlEnum("disputeType", [
    "milestone_not_completed",
    "quality_issue",
    "timeline_delay",
    "contract_breach",
    "other"
  ]).notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"), // JSON array of document URLs
  requestedAmount: int("requestedAmount"), // cents
  status: mysqlEnum("status", [
    "open",
    "under_review",
    "mediation",
    "resolved",
    "closed"
  ]).default("open").notNull(),
  resolution: text("resolution"),
  resolvedByAdminId: int("resolvedByAdminId"),
  resolvedAmount: int("resolvedAmount"), // cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscrowDispute = typeof escrowDisputes.$inferSelect;
export type InsertEscrowDispute = typeof escrowDisputes.$inferInsert;


// ============================================================================
// E-Signature System Tables
// ============================================================================

export const signatureRequests = mysqlTable("signatureRequests", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  transactionId: int("transactionId"),
  propertyId: int("propertyId"),
  createdByUserId: int("createdByUserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  status: mysqlEnum("status", [
    "draft",
    "sent",
    "in_progress",
    "completed",
    "declined",
    "cancelled",
    "expired"
  ]).default("draft").notNull(),
  expiresAt: timestamp("expiresAt"),
  completedAt: timestamp("completedAt"),
  // External e-signature provider details
  provider: varchar("provider", { length: 50 }), // 'docusign', 'hellosign', 'internal'
  externalEnvelopeId: varchar("externalEnvelopeId", { length: 255 }),
  externalStatus: varchar("externalStatus", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type InsertSignatureRequest = typeof signatureRequests.$inferInsert;

export const signatureRecipients = mysqlTable("signatureRecipients", {
  id: int("id").autoincrement().primaryKey(),
  signatureRequestId: int("signatureRequestId").notNull(),
  userId: int("userId"),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["signer", "cc", "approver"]).default("signer").notNull(),
  routingOrder: int("routingOrder").default(1).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "sent",
    "viewed",
    "signed",
    "declined",
    "completed"
  ]).default("pending").notNull(),
  signedAt: timestamp("signedAt"),
  declinedAt: timestamp("declinedAt"),
  declineReason: text("declineReason"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  // External provider details
  externalRecipientId: varchar("externalRecipientId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SignatureRecipient = typeof signatureRecipients.$inferSelect;
export type InsertSignatureRecipient = typeof signatureRecipients.$inferInsert;

export const signatureAuditLog = mysqlTable("signatureAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  signatureRequestId: int("signatureRequestId").notNull(),
  recipientId: int("recipientId"),
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

export const userNotificationPreferences = mysqlTable("userNotificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailEnabled: int("emailEnabled").default(1).notNull(),
  smsEnabled: int("smsEnabled").default(0).notNull(),
  pushEnabled: int("pushEnabled").default(1).notNull(),
  // Category preferences
  escrowUpdates: int("escrowUpdates").default(1).notNull(),
  documentSigning: int("documentSigning").default(1).notNull(),
  propertyAlerts: int("propertyAlerts").default(1).notNull(),
  messageNotifications: int("messageNotifications").default(1).notNull(),
  marketingEmails: int("marketingEmails").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = typeof userNotificationPreferences.$inferInsert;

// ============================================================================
// Analytics and Metrics Tables
// ============================================================================

export const adminMetrics = mysqlTable("adminMetrics", {
  id: int("id").autoincrement().primaryKey(),
  metricDate: timestamp("metricDate").notNull(),
  metricType: varchar("metricType", { length: 50 }).notNull(),
  // Moderation metrics
  totalReports: int("totalReports").default(0).notNull(),
  pendingReports: int("pendingReports").default(0).notNull(),
  resolvedReports: int("resolvedReports").default(0).notNull(),
  averageResponseTimeMinutes: int("averageResponseTimeMinutes").default(0).notNull(),
  // Property metrics
  totalProperties: int("totalProperties").default(0).notNull(),
  activeProperties: int("activeProperties").default(0).notNull(),
  pendingApprovals: int("pendingApprovals").default(0).notNull(),
  // User metrics
  totalUsers: int("totalUsers").default(0).notNull(),
  activeUsers: int("activeUsers").default(0).notNull(),
  newUsers: int("newUsers").default(0).notNull(),
  // Transaction metrics
  totalTransactions: int("totalTransactions").default(0).notNull(),
  completedTransactions: int("completedTransactions").default(0).notNull(),
  totalVolume: int("totalVolume").default(0).notNull(), // cents
  // Escrow metrics
  activeEscrows: int("activeEscrows").default(0).notNull(),
  completedEscrows: int("completedEscrows").default(0).notNull(),
  disputedEscrows: int("disputedEscrows").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminMetrics = typeof adminMetrics.$inferSelect;
export type InsertAdminMetrics = typeof adminMetrics.$inferInsert;

export const platformHealthMetrics = mysqlTable("platformHealthMetrics", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  // System health
  apiResponseTimeMs: int("apiResponseTimeMs").default(0).notNull(),
  errorRate: int("errorRate").default(0).notNull(), // percentage * 100
  uptime: int("uptime").default(100).notNull(), // percentage * 100
  // User engagement
  dailyActiveUsers: int("dailyActiveUsers").default(0).notNull(),
  avgSessionDurationMinutes: int("avgSessionDurationMinutes").default(0).notNull(),
  pageViewsPerSession: int("pageViewsPerSession").default(0).notNull(),
  // Content metrics
  newListingsToday: int("newListingsToday").default(0).notNull(),
  searchesPerformed: int("searchesPerformed").default(0).notNull(),
  messagesExchanged: int("messagesExchanged").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlatformHealthMetrics = typeof platformHealthMetrics.$inferSelect;
export type InsertPlatformHealthMetrics = typeof platformHealthMetrics.$inferInsert;

// ============================================================================
// Push Notification Tables
// ============================================================================

// Push Notification Subscriptions
export const pushSubscriptions = mysqlTable("pushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Web Push subscription details
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  
  // Device/browser info
  userAgent: text("userAgent"),
  deviceType: varchar("deviceType", { length: 50 }), // "desktop", "mobile", "tablet"
  
  // Status
  isActive: int("isActive").default(1).notNull(),
  lastUsed: timestamp("lastUsed"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// Push Notification Log
export const pushNotificationLog = mysqlTable("pushNotificationLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),
  
  // Notification details
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  badge: text("badge"),
  data: text("data"), // JSON string with action data
  
  // Notification type
  notificationType: mysqlEnum("notificationType", [
    "property_alert",
    "new_message",
    "offer_update",
    "showing_reminder",
    "document_ready",
    "price_change",
    "new_listing",
    "system"
  ]).notNull(),
  
  // Status
  status: mysqlEnum("status", ["sent", "failed", "clicked"]).default("sent").notNull(),
  errorMessage: text("errorMessage"),
  clickedAt: timestamp("clickedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushNotificationLog = typeof pushNotificationLog.$inferSelect;
export type InsertPushNotificationLog = typeof pushNotificationLog.$inferInsert;

// Recommendation Email Preferences
export const recommendationPreferences = mysqlTable("recommendationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Email digest preferences
  digestFrequency: mysqlEnum("digestFrequency", ["weekly", "biweekly", "monthly"]).default("weekly").notNull(),
  
  // Match score threshold (70, 80, or 90)
  matchScoreThreshold: int("matchScoreThreshold").default(70).notNull(),
  
  // Enable/disable email digests
  emailEnabled: int("emailEnabled").default(1).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecommendationPreferences = typeof recommendationPreferences.$inferSelect;
export type InsertRecommendationPreferences = typeof recommendationPreferences.$inferInsert;

// Recommendation Feedback
export const recommendationFeedback = mysqlTable("recommendationFeedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  propertyId: int("propertyId").notNull(),
  
  // Rating: thumbs up or thumbs down
  rating: mysqlEnum("rating", ["up", "down"]).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;
export type InsertRecommendationFeedback = typeof recommendationFeedback.$inferInsert;

// A/B Testing Framework
export const recommendationExperiments = mysqlTable("recommendationExperiments", {
  id: int("id").autoincrement().primaryKey(),
  
  // Experiment details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Experiment status
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  
  // Variant configuration (JSON)
  // Example: {"control": {"algorithm": "llm"}, "variant_a": {"algorithm": "collaborative"}}
  variants: text("variants").notNull(),
  
  // Traffic allocation (percentage for each variant)
  trafficAllocation: text("trafficAllocation").notNull(),
  
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const experimentAssignments = mysqlTable("experimentAssignments", {
  id: int("id").autoincrement().primaryKey(),
  
  experimentId: int("experimentId").notNull(),
  userId: int("userId").notNull(),
  
  // Which variant the user was assigned to
  variant: varchar("variant", { length: 50 }).notNull(),
  
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export const experimentMetrics = mysqlTable("experimentMetrics", {
  id: int("id").autoincrement().primaryKey(),
  
  experimentId: int("experimentId").notNull(),
  userId: int("userId").notNull(),
  variant: varchar("variant", { length: 50 }).notNull(),
  
  // Metric type (click, favorite, feedback_positive, feedback_negative, etc.)
  metricType: varchar("metricType", { length: 50 }).notNull(),
  
  // Related property ID (if applicable)
  propertyId: int("propertyId"),
  
  // Metric value (1 for binary events, or custom value)
  value: int("value").default(1).notNull(),
  
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
export const idempotencyKeys = mysqlTable("idempotencyKeys", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  requestHash: varchar("requestHash", { length: 64 }).notNull(),
  response: text("response"),
  status: mysqlEnum("status", ["processing", "completed", "failed"]).notNull(),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type InsertIdempotencyKey = typeof idempotencyKeys.$inferInsert;

// Comprehensive audit trail for escrow operations
export const escrowAuditLogs = mysqlTable("escrowAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // created, funded, released, disputed, etc.
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }),
  amount: int("amount"), // Amount involved in this action (cents)
  performedBy: int("performedBy"), // User ID who performed action
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
export const escrowStateHistory = mysqlTable("escrowStateHistory", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  heldAmount: int("heldAmount").notNull(),
  releasedAmount: int("releasedAmount").notNull(),
  refundedAmount: int("refundedAmount").notNull(),
  snapshot: text("snapshot"), // Full JSON snapshot of escrow state
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowStateHistory = typeof escrowStateHistory.$inferSelect;
export type InsertEscrowStateHistory = typeof escrowStateHistory.$inferInsert;

// Multi-signature approval system
export const escrowApprovals = mysqlTable("escrowApprovals", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  approverType: mysqlEnum("approverType", ["buyer", "seller", "inspector", "admin"]).notNull(),
  approverId: int("approverId").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // release, refund, dispute
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
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
export const escrowFraudChecks = mysqlTable("escrowFraudChecks", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  checkType: varchar("checkType", { length: 50 }).notNull(), // velocity, amount, pattern, ip, etc.
  riskScore: int("riskScore").notNull(), // 0-100
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull(),
  flags: text("flags"), // JSON array of fraud flags
  passed: boolean("passed").notNull(),
  blockedReason: text("blockedReason"),
  metadata: text("metadata"), // JSON for check details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscrowFraudCheck = typeof escrowFraudChecks.$inferSelect;
export type InsertEscrowFraudCheck = typeof escrowFraudChecks.$inferInsert;

// Enhanced dispute resolution system
export const escrowDisputesEnhanced = mysqlTable("escrowDisputesEnhanced", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  filedBy: int("filedBy").notNull(), // User ID
  filedByRole: mysqlEnum("filedByRole", ["buyer", "seller"]).notNull(),
  disputeType: mysqlEnum("disputeType", [
    "non_delivery",
    "quality_issue",
    "fraud",
    "contract_breach",
    "other"
  ]).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", [
    "filed",
    "under_review",
    "awaiting_response",
    "arbitration",
    "resolved_buyer",
    "resolved_seller",
    "resolved_split",
    "cancelled"
  ]).default("filed").notNull(),
  assignedArbitrator: int("assignedArbitrator"),
  resolution: text("resolution"),
  resolutionAmount: int("resolutionAmount"), // Amount to refund/release (cents)
  splitPercentage: int("splitPercentage"), // For split resolutions (0-100)
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscrowDisputeEnhanced = typeof escrowDisputesEnhanced.$inferSelect;
export type InsertEscrowDisputeEnhanced = typeof escrowDisputesEnhanced.$inferInsert;

// Dispute messages and communication
export const disputeMessages = mysqlTable("disputeMessages", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  senderId: int("senderId").notNull(),
  senderRole: varchar("senderRole", { length: 50 }).notNull(), // buyer, seller, arbitrator, admin
  message: text("message").notNull(),
  attachments: text("attachments"), // JSON array of attachment URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DisputeMessage = typeof disputeMessages.$inferSelect;
export type InsertDisputeMessage = typeof disputeMessages.$inferInsert;

// Dispute evidence management
export const disputeEvidence = mysqlTable("disputeEvidence", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  evidenceType: varchar("evidenceType", { length: 50 }).notNull(), // document, photo, video, audio, etc.
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"), // bytes
  mimeType: varchar("mimeType", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DisputeEvidence = typeof disputeEvidence.$inferSelect;
export type InsertDisputeEvidence = typeof disputeEvidence.$inferInsert;

// Compliance checks (KYC/AML/Sanctions)
export const escrowComplianceChecks = mysqlTable("escrowComplianceChecks", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  userId: int("userId").notNull(),
  checkType: mysqlEnum("checkType", ["kyc", "aml", "sanctions", "tax"]).notNull(),
  status: mysqlEnum("status", ["pending", "passed", "failed", "manual_review"]).notNull(),
  provider: varchar("provider", { length: 50 }), // e.g., "ballerine", "onfido", "sumsub"
  providerCheckId: varchar("providerCheckId", { length: 255 }),
  result: text("result"), // JSON result from provider
  riskScore: int("riskScore"), // 0-100
  flags: text("flags"), // JSON array of compliance flags
  reviewedBy: int("reviewedBy"), // Admin user ID
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type EscrowComplianceCheck = typeof escrowComplianceChecks.$inferSelect;
export type InsertEscrowComplianceCheck = typeof escrowComplianceChecks.$inferInsert;

// Tax reporting (1099-K, etc.)
export const taxReporting = mysqlTable("taxReporting", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  totalEscrowVolume: int("totalEscrowVolume").notNull(), // Total $ volume in cents
  transactionCount: int("transactionCount").notNull(),
  reportType: varchar("reportType", { length: 50 }), // 1099-K, etc.
  reportStatus: mysqlEnum("reportStatus", ["pending", "generated", "filed"]).notNull(),
  reportUrl: text("reportUrl"), // S3 URL to generated report
  filedAt: timestamp("filedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaxReport = typeof taxReporting.$inferSelect;
export type InsertTaxReport = typeof taxReporting.$inferInsert;

// Webhook retry mechanism
export const webhookRetries = mysqlTable("webhookRetries", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: varchar("webhookId", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // stripe, mojaloop, tigerbeetle, etc.
  eventType: varchar("eventType", { length: 100 }).notNull(),
  payload: text("payload").notNull(), // JSON payload
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).notNull(),
  lastError: text("lastError"),
  nextRetryAt: timestamp("nextRetryAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type WebhookRetry = typeof webhookRetries.$inferSelect;
export type InsertWebhookRetry = typeof webhookRetries.$inferInsert;

// Payment provider configuration
export const paymentProviders = mysqlTable("paymentProviders", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // stripe, mojaloop, tigerbeetle, flutterwave, paystack
  displayName: varchar("displayName", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  priority: int("priority").default(0).notNull(), // Higher priority = preferred provider
  capabilities: text("capabilities"), // JSON array: ["escrow", "instant_transfer", "cross_border", etc.]
  supportedCurrencies: text("supportedCurrencies"), // JSON array: ["USD", "NGN", "KES", etc.]
  configuration: text("configuration"), // JSON config (encrypted)
  healthStatus: mysqlEnum("healthStatus", ["healthy", "degraded", "down"]).default("healthy").notNull(),
  lastHealthCheck: timestamp("lastHealthCheck"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentProvider = typeof paymentProviders.$inferSelect;
export type InsertPaymentProvider = typeof paymentProviders.$inferInsert;

// Provider transaction mapping
export const providerTransactions = mysqlTable("providerTransactions", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  providerId: int("providerId").notNull(),
  providerTransactionId: varchar("providerTransactionId", { length: 255 }).notNull(),
  transactionType: varchar("transactionType", { length: 50 }).notNull(), // hold, release, refund
  amount: int("amount").notNull(), // cents
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  metadata: text("metadata"), // JSON for provider-specific data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProviderTransaction = typeof providerTransactions.$inferSelect;
export type InsertProviderTransaction = typeof providerTransactions.$inferInsert;

// TigerBeetle account mapping
export const tigerBeetleAccounts = mysqlTable("tigerBeetleAccounts", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: int("escrowId").notNull(),
  accountId: varchar("accountId", { length: 128 }).notNull().unique(), // TigerBeetle account ID (128-bit)
  accountType: mysqlEnum("accountType", ["asset", "liability"]).notNull(),
  ledger: int("ledger").notNull(), // Ledger ID
  code: int("code").notNull(), // Account code
  balance: varchar("balance", { length: 50 }).default("0").notNull(), // BigInt as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TigerBeetleAccount = typeof tigerBeetleAccounts.$inferSelect;
export type InsertTigerBeetleAccount = typeof tigerBeetleAccounts.$inferInsert;

// Mojaloop party mapping
export const mojaLoopParties = mysqlTable("mojaLoopParties", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MojaLoopParty = typeof mojaLoopParties.$inferSelect;
export type InsertMojaLoopParty = typeof mojaLoopParties.$inferInsert;

// Builder quote requests
export const builderQuotes = mysqlTable("builderQuotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  builderId: int("builderId"),
  
  projectType: mysqlEnum("projectType", ["new_construction", "renovation", "extension", "commercial", "landscaping"]).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }),
  budget: int("budget"),
  timeline: varchar("timeline", { length: 100 }),
  
  attachments: text("attachments"), // JSON array of S3 URLs
  
  status: mysqlEnum("status", ["pending", "quoted", "accepted", "rejected", "expired"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuilderQuote = typeof builderQuotes.$inferSelect;
export type InsertBuilderQuote = typeof builderQuotes.$inferInsert;

// Builder quote responses
export const builderQuoteResponses = mysqlTable("builderQuoteResponses", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  builderId: int("builderId").notNull(),
  
  estimatedCost: int("estimatedCost").notNull(),
  timeline: varchar("timeline", { length: 255 }).notNull(),
  breakdown: text("breakdown"), // JSON array of cost breakdown
  terms: text("terms"),
  validUntil: timestamp("validUntil"),
  
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuilderQuoteResponse = typeof builderQuoteResponses.$inferSelect;
export type InsertBuilderQuoteResponse = typeof builderQuoteResponses.$inferInsert;

// Open house events
export const openHouseEvents = mysqlTable("openHouseEvents", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  agentId: int("agentId").notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  
  maxAttendees: int("maxAttendees"),
  registrationRequired: int("registrationRequired").default(1), // boolean
  
  status: mysqlEnum("status", ["scheduled", "ongoing", "completed", "cancelled"]).default("scheduled").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OpenHouseEvent = typeof openHouseEvents.$inferSelect;
export type InsertOpenHouseEvent = typeof openHouseEvents.$inferInsert;

// Open house registrations
export const openHouseRegistrations = mysqlTable("openHouseRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId"),
  
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  numberOfGuests: int("numberOfGuests").default(1),
  
  status: mysqlEnum("status", ["registered", "confirmed", "attended", "no_show", "cancelled"]).default("registered").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OpenHouseRegistration = typeof openHouseRegistrations.$inferSelect;
export type InsertOpenHouseRegistration = typeof openHouseRegistrations.$inferInsert;

// Open house attendees (check-in tracking)
export const openHouseAttendees = mysqlTable("openHouseAttendees", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  registrationId: int("registrationId"),
  
  checkInTime: timestamp("checkInTime").notNull(),
  checkOutTime: timestamp("checkOutTime"),
  
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OpenHouseAttendee = typeof openHouseAttendees.$inferSelect;
export type InsertOpenHouseAttendee = typeof openHouseAttendees.$inferInsert;

// Open house feedback
export const openHouseFeedback = mysqlTable("openHouseFeedback", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId"),
  
  rating: int("rating").notNull(), // 1-5
  feedback: text("feedback"),
  interestedInProperty: int("interestedInProperty").default(0), // boolean
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OpenHouseFeedback = typeof openHouseFeedback.$inferSelect;
export type InsertOpenHouseFeedback = typeof openHouseFeedback.$inferInsert;

// Shortlet reviews
export const shortletReviews = mysqlTable("shortletReviews", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  propertyId: int("propertyId").notNull(),
  guestId: int("guestId").notNull(),
  hostId: int("hostId").notNull(),
  
  // Ratings (1-5 scale)
  overallRating: int("overallRating").notNull(),
  cleanlinessRating: int("cleanlinessRating"),
  accuracyRating: int("accuracyRating"),
  communicationRating: int("communicationRating"),
  locationRating: int("locationRating"),
  valueRating: int("valueRating"),
  
  // Review content
  reviewText: text("reviewText"),
  
  // Host response
  hostResponse: text("hostResponse"),
  hostRespondedAt: timestamp("hostRespondedAt"),
  
  // Moderation
  status: mysqlEnum("status", ["pending", "published", "flagged", "removed"]).default("published").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShortletReview = typeof shortletReviews.$inferSelect;
export type InsertShortletReview = typeof shortletReviews.$inferInsert;

// Map Analytics (A/B Testing)
export const mapAnalytics = mysqlTable("mapAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  provider: mysqlEnum("provider", ["google", "maplibre"]).notNull(),
  eventType: mysqlEnum("eventType", ["load", "interaction", "error", "switch"]).notNull(),
  loadTime: int("loadTime"), // milliseconds
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
export const offers = mysqlTable("offers", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  agentId: int("agentId"),
  
  // Offer details
  offerAmount: int("offerAmount").notNull(),
  earnestMoney: int("earnestMoney"), // deposit amount
  downPayment: int("downPayment"),
  financingType: mysqlEnum("financingType", ["cash", "conventional", "fha", "va", "other"]).default("conventional").notNull(),
  
  // Contingencies
  inspectionContingency: int("inspectionContingency").default(1).notNull(), // boolean
  appraisalContingency: int("appraisalContingency").default(1).notNull(), // boolean
  financingContingency: int("financingContingency").default(1).notNull(), // boolean
  
  // Timeline
  proposedClosingDate: timestamp("proposedClosingDate"),
  inspectionPeriod: int("inspectionPeriod").default(10), // days
  
  // Status
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "countered", "withdrawn", "expired"]).default("pending").notNull(),
  
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

// Counteroffers
export const counteroffers = mysqlTable("counteroffers", {
  id: int("id").autoincrement().primaryKey(),
  offerId: int("offerId").notNull(),
  counterpartyId: int("counterpartyId").notNull(), // who made the counteroffer
  
  // Counteroffer details
  counterAmount: int("counterAmount").notNull(),
  earnestMoney: int("earnestMoney"),
  downPayment: int("downPayment"),
  proposedClosingDate: timestamp("proposedClosingDate"),
  inspectionPeriod: int("inspectionPeriod"),
  
  // Contingencies
  inspectionContingency: int("inspectionContingency").default(1).notNull(),
  appraisalContingency: int("appraisalContingency").default(1).notNull(),
  financingContingency: int("financingContingency").default(1).notNull(),
  
  // Terms
  additionalTerms: text("additionalTerms"),
  notes: text("notes"),
  
  // Status
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "withdrawn"]).default("pending").notNull(),
  
  // Expiration
  expiresAt: timestamp("expiresAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Counteroffer = typeof counteroffers.$inferSelect;
export type InsertCounteroffer = typeof counteroffers.$inferInsert;

// Offer Activity Log
export const offerActivityLog = mysqlTable("offerActivityLog", {
  id: int("id").autoincrement().primaryKey(),
  offerId: int("offerId").notNull(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", ["created", "viewed", "accepted", "rejected", "countered", "withdrawn", "expired", "signed", "comment"]).notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OfferActivityLog = typeof offerActivityLog.$inferSelect;
export type InsertOfferActivityLog = typeof offerActivityLog.$inferInsert;

// ============================================================================
// Email Delivery Logs
// ============================================================================

export const emailDeliveryLogs = mysqlTable("emailDeliveryLogs", {
  id: int("id").autoincrement().primaryKey(),
  
  // Email details
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  
  // Delivery status
  status: mysqlEnum("status", ["pending", "sent", "failed", "retrying"]).notNull().default("pending"),
  
  // Retry tracking
  attempts: int("attempts").notNull().default(0),
  lastAttemptAt: timestamp("lastAttemptAt").notNull(),
  
  // Success/failure details
  messageId: varchar("messageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  
  // Metadata
  emailType: varchar("emailType", { length: 100 }), // e.g., "appointment-confirmation", "offer-update"
  userId: int("userId"), // Optional: link to user who triggered the email
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailDeliveryLog = typeof emailDeliveryLogs.$inferSelect;
export type InsertEmailDeliveryLog = typeof emailDeliveryLogs.$inferInsert;

// Webhook Activity Log
export const webhookActivityLog = mysqlTable("webhookActivityLog", {
  id: int("id").autoincrement().primaryKey(),
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

export const emailCampaigns = mysqlTable("emailCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).notNull().default("draft"),
  triggerType: mysqlEnum("triggerType", [
    "manual",
    "signup",
    "property_view",
    "saved_search",
    "offer_submitted",
    "tour_booked",
  ]).notNull().default("manual"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;

export const emailCampaignSequences = mysqlTable("emailCampaignSequences", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sequenceOrder: int("sequenceOrder").notNull(),
  templateId: int("templateId").notNull(),
  delayDays: int("delayDays").notNull().default(0),
  delayHours: int("delayHours").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailCampaignSequence = typeof emailCampaignSequences.$inferSelect;
export type InsertEmailCampaignSequence = typeof emailCampaignSequences.$inferInsert;

export const emailCampaignSubscribers = mysqlTable("emailCampaignSubscribers", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["active", "completed", "unsubscribed"]).notNull().default("active"),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  lastSentSequence: int("lastSentSequence").default(0),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailCampaignSubscriber = typeof emailCampaignSubscribers.$inferSelect;
export type InsertEmailCampaignSubscriber = typeof emailCampaignSubscribers.$inferInsert;

// Update emailDeliveryLogs to include tracking fields for analytics
export const emailDeliveryLog = mysqlTable("emailDeliveryLog", {
  id: int("id").autoincrement().primaryKey(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "failed", "bounced"]).notNull().default("pending"),
  templateId: int("templateId"),
  userId: int("userId"),
  emailType: varchar("emailType", { length: 100 }),
  
  // Tracking fields for analytics
  opened: int("opened").default(0).notNull(),
  clicked: int("clicked").default(0).notNull(),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  
  // Delivery tracking
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
  
  // Error tracking
  errorMessage: text("errorMessage"),
  attempts: int("attempts").notNull().default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailDeliveryLogEntry = typeof emailDeliveryLog.$inferSelect;
export type InsertEmailDeliveryLogEntry = typeof emailDeliveryLog.$inferInsert;


// ============================================================================
// A/B Testing for Email Campaigns
// ============================================================================

export const emailAbTests = mysqlTable("emailAbTests", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  testType: mysqlEnum("testType", ["subject_line", "content", "send_time", "from_name"]).notNull(),
  status: mysqlEnum("status", ["draft", "running", "completed", "cancelled"]).notNull().default("draft"),
  
  // Test configuration
  trafficSplit: int("trafficSplit").notNull().default(50), // Percentage for variant A (0-100)
  sampleSize: int("sampleSize"), // Total subscribers to include in test
  confidenceLevel: int("confidenceLevel").notNull().default(95), // 90, 95, 99
  
  // Winner selection
  winnerMetric: mysqlEnum("winnerMetric", ["open_rate", "click_rate", "conversion_rate"]).notNull().default("open_rate"),
  winnerVariant: varchar("winnerVariant", { length: 1 }), // 'A' or 'B', null if no winner yet
  autoPromoteWinner: int("autoPromoteWinner").notNull().default(1), // boolean as int
  
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailAbTest = typeof emailAbTests.$inferSelect;
export type InsertEmailAbTest = typeof emailAbTests.$inferInsert;

export const emailAbTestVariants = mysqlTable("emailAbTestVariants", {
  id: int("id").autoincrement().primaryKey(),
  testId: int("testId").notNull(),
  variant: varchar("variant", { length: 1 }).notNull(), // 'A' or 'B'
  
  // Variant content
  subjectLine: varchar("subjectLine", { length: 255 }),
  fromName: varchar("fromName", { length: 255 }),
  content: text("content"), // HTML content
  sendTime: varchar("sendTime", { length: 5 }), // HH:MM format
  
  // Performance metrics
  sentCount: int("sentCount").notNull().default(0),
  deliveredCount: int("deliveredCount").notNull().default(0),
  openedCount: int("openedCount").notNull().default(0),
  clickedCount: int("clickedCount").notNull().default(0),
  convertedCount: int("convertedCount").notNull().default(0),
  
  // Calculated rates (stored for performance)
  deliveryRate: int("deliveryRate").notNull().default(0), // Percentage * 100
  openRate: int("openRate").notNull().default(0), // Percentage * 100
  clickRate: int("clickRate").notNull().default(0), // Percentage * 100
  conversionRate: int("conversionRate").notNull().default(0), // Percentage * 100
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailAbTestVariant = typeof emailAbTestVariants.$inferSelect;
export type InsertEmailAbTestVariant = typeof emailAbTestVariants.$inferInsert;

export const emailAbTestResults = mysqlTable("emailAbTestResults", {
  id: int("id").autoincrement().primaryKey(),
  testId: int("testId").notNull(),
  
  // Statistical analysis
  pValue: varchar("pValue", { length: 20 }), // Stored as string for precision
  isSignificant: int("isSignificant").notNull().default(0), // boolean as int
  confidenceInterval: varchar("confidenceInterval", { length: 50 }), // e.g., "95% CI: [0.12, 0.18]"
  
  // Winner determination
  winnerVariant: varchar("winnerVariant", { length: 1 }), // 'A', 'B', or null for tie
  improvementPercentage: int("improvementPercentage"), // How much better winner is (percentage * 100)
  
  // Recommendations
  recommendation: text("recommendation"),
  shouldPromote: int("shouldPromote").notNull().default(0), // boolean as int
  
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type EmailAbTestResult = typeof emailAbTestResults.$inferSelect;
export type InsertEmailAbTestResult = typeof emailAbTestResults.$inferInsert;

// ============================================================================
// Email Template Builder
// ============================================================================

export const emailTemplateBlocks = mysqlTable("emailTemplateBlocks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["header", "text", "image", "cta", "footer", "custom"]).notNull(),
  
  // Block content
  htmlContent: text("htmlContent").notNull(),
  cssStyles: text("cssStyles"),
  
  // Preview
  thumbnailUrl: text("thumbnailUrl"),
  
  // Variables that can be used in this block
  variables: text("variables"), // JSON array of variable names
  
  // Metadata
  isPublic: int("isPublic").notNull().default(1), // boolean as int
  createdBy: int("createdBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplateBlock = typeof emailTemplateBlocks.$inferSelect;
export type InsertEmailTemplateBlock = typeof emailTemplateBlocks.$inferInsert;

export const customEmailTemplates = mysqlTable("customEmailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Template structure (array of block IDs in order)
  blockSequence: text("blockSequence").notNull(), // JSON array of block IDs
  
  // Customizations per block
  blockCustomizations: text("blockCustomizations"), // JSON object with block-specific overrides
  
  // Variables
  availableVariables: text("availableVariables"), // JSON array of variable definitions
  
  // Metadata
  isActive: int("isActive").notNull().default(1), // boolean as int
  createdBy: int("createdBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomEmailTemplate = typeof customEmailTemplates.$inferSelect;
export type InsertCustomEmailTemplate = typeof customEmailTemplates.$inferInsert;

// ============================================================================
// Automated Re-engagement Campaigns
// ============================================================================

export const reEngagementCampaigns = mysqlTable("reEngagementCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Trigger conditions
  inactivityDays: int("inactivityDays").notNull().default(30), // Days of inactivity to trigger
  targetSegment: mysqlEnum("targetSegment", ["all", "buyers", "sellers", "agents"]).notNull().default("all"),
  
  // Campaign configuration
  emailSequence: text("emailSequence").notNull(), // JSON array of email templates
  delayBetweenEmails: int("delayBetweenEmails").notNull().default(3), // Days between emails
  maxEmails: int("maxEmails").notNull().default(3), // Maximum emails in sequence
  
  // Status
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).notNull().default("draft"),
  
  // Performance tracking
  totalTriggered: int("totalTriggered").notNull().default(0),
  totalReEngaged: int("totalReEngaged").notNull().default(0), // Users who became active again
  totalUnsubscribed: int("totalUnsubscribed").notNull().default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReEngagementCampaign = typeof reEngagementCampaigns.$inferSelect;
export type InsertReEngagementCampaign = typeof reEngagementCampaigns.$inferInsert;

export const userActivityTracking = mysqlTable("userActivityTracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Activity metrics
  lastLoginAt: timestamp("lastLoginAt"),
  lastPropertyViewAt: timestamp("lastPropertyViewAt"),
  lastSearchAt: timestamp("lastSearchAt"),
  lastOfferAt: timestamp("lastOfferAt"),
  lastMessageAt: timestamp("lastMessageAt"),
  
  // Engagement score (0-100)
  engagementScore: int("engagementScore").notNull().default(50),
  
  // Re-engagement tracking
  isInactive: int("isInactive").notNull().default(0), // boolean as int
  inactiveSince: timestamp("inactiveSince"),
  reEngagementCampaignId: int("reEngagementCampaignId"),
  reEngagementEmailsSent: int("reEngagementEmailsSent").notNull().default(0),
  lastReEngagementEmailAt: timestamp("lastReEngagementEmailAt"),
  
  // Re-engagement outcome
  wasReEngaged: int("wasReEngaged").notNull().default(0), // boolean as int
  reEngagedAt: timestamp("reEngagedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserActivityTracking = typeof userActivityTracking.$inferSelect;
export type InsertUserActivityTracking = typeof userActivityTracking.$inferInsert;

export const reEngagementCampaignLogs = mysqlTable("reEngagementCampaignLogs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  
  // Email details
  emailSequenceIndex: int("emailSequenceIndex").notNull(), // Which email in the sequence (0-based)
  emailSubject: varchar("emailSubject", { length: 255 }),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "sent", "delivered", "opened", "clicked", "failed"]).notNull(),
  
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
