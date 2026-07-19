/**
 * Alert Management and Recommendation System Tables
 * Missing tables that were referenced but not defined in the migration
 */

import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/pg-core";

// ==================== ENUM DEFINITIONS ====================

export const alertTypeEnum = pgEnum("alertType", [
  "price_drop",
  "new_listing",
  "status_change",
  "market_trend",
  "valuation_change",
  "system_alert"
]);

export const alertStatusEnum = pgEnum("alertStatus", [
  "pending",
  "triggered",
  "acknowledged",
  "resolved",
  "expired"
]);

export const severityEnum = pgEnum("severity", [
  "info",
  "warning",
  "critical"
]);

export const feedbackTypeEnum = pgEnum("feedbackType", [
  "like",
  "dislike",
  "not_interested",
  "already_viewed",
  "too_expensive",
  "wrong_location",
  "other"
]);

// ==================== TABLE DEFINITIONS ====================

/**
 * Alert Configurations
 * Defines alert rules and thresholds for monitoring
 */
export const alertConfigurations = pgTable("alert_configurations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId"), // null for system-wide alerts
  name: varchar("name", { length: 255 }).notNull(),
  alertType: alertTypeEnum("alertType").notNull(),
  
  // Alert conditions (JSON format)
  conditions: json("conditions").notNull(), // { metric: "price", operator: "<", value: 500000 }
  
  // Notification settings
  enabled: boolean("enabled").default(true).notNull(),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  notifyPush: boolean("notifyPush").default(false).notNull(),
  
  // Metadata
  description: text("description"),
  metadata: json("metadata"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Alert History
 * Records of triggered alerts
 */
export const alertHistory = pgTable("alert_history", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  configurationId: integer("configurationId").notNull(), // FK to alertConfigurations
  userId: integer("userId"), // User who received the alert
  
  // Alert details
  alertType: alertTypeEnum("alertType").notNull(),
  severity: severityEnum("severity").default("info").notNull(),
  status: alertStatusEnum("status").default("pending").notNull(),
  
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Related entities
  propertyId: integer("propertyId"), // Related property if applicable
  valuationId: integer("valuationId"), // Related valuation if applicable
  
  // Acknowledgment
  acknowledgedAt: timestamp("acknowledgedAt"),
  acknowledgedBy: integer("acknowledgedBy"), // User ID
  
  // Metadata
  metadata: json("metadata"),
  
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Alert Acknowledgments
 * Tracks when users acknowledge/dismiss alerts
 */
export const alertAcknowledgments = pgTable("alert_acknowledgments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  alertHistoryId: integer("alertHistoryId").notNull(), // FK to alertHistory
  userId: integer("userId").notNull(),
  
  action: varchar("action", { length: 50 }).notNull(), // "acknowledged", "dismissed", "resolved"
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Recommendation Preferences
 * User preferences for property recommendations
 */
export const recommendationPreferences = pgTable("recommendation_preferences", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull().unique(),
  
  // Location preferences
  preferredCities: json("preferredCities"), // ["Lagos", "Abuja"]
  preferredNeighborhoods: json("preferredNeighborhoods"), // ["Lekki", "Victoria Island"]
  excludedAreas: json("excludedAreas"),
  
  // Property preferences
  propertyTypes: json("propertyTypes"), // ["single_family", "condo"]
  minBedrooms: integer("minBedrooms"),
  maxBedrooms: integer("maxBedrooms"),
  minBathrooms: integer("minBathrooms"),
  
  // Budget
  minPrice: integer("minPrice"),
  maxPrice: integer("maxPrice"),
  
  // Features
  requiredFeatures: json("requiredFeatures"), // ["pool", "garage"]
  preferredFeatures: json("preferredFeatures"),
  
  // Recommendation settings
  enableEmailDigest: boolean("enableEmailDigest").default(true).notNull(),
  digestFrequency: varchar("digestFrequency", { length: 20 }).default("weekly"), // "daily", "weekly", "monthly"
  maxRecommendationsPerDay: integer("maxRecommendationsPerDay").default(10),
  
  // Metadata
  metadata: json("metadata"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Recommendation Feedback
 * User feedback on recommended properties
 */
export const recommendationFeedback = pgTable("recommendation_feedback", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  propertyId: integer("propertyId").notNull(),
  
  // Feedback
  feedbackType: feedbackTypeEnum("feedbackType").notNull(),
  rating: integer("rating"), // 1-5 stars (optional)
  
  // Context
  recommendationSource: varchar("recommendationSource", { length: 100 }), // "collaborative_filtering", "content_based", "hybrid"
  recommendationScore: integer("recommendationScore"), // Original recommendation score (0-100)
  
  // Additional feedback
  comment: text("comment"),
  reasons: json("reasons"), // Array of reason codes
  
  // Metadata
  metadata: json("metadata"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== TYPE EXPORTS ====================

export type AlertConfiguration = typeof alertConfigurations.$inferSelect;
export type InsertAlertConfiguration = typeof alertConfigurations.$inferInsert;

export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

export type AlertAcknowledgment = typeof alertAcknowledgments.$inferSelect;
export type InsertAlertAcknowledgment = typeof alertAcknowledgments.$inferInsert;

export type RecommendationPreference = typeof recommendationPreferences.$inferSelect;
export type InsertRecommendationPreference = typeof recommendationPreferences.$inferInsert;

export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;
export type InsertRecommendationFeedback = typeof recommendationFeedback.$inferInsert;
