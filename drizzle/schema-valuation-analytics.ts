import { integer, pgTable, text, timestamp, decimal, varchar, index } from "drizzle-orm/pg-core";

/**
 * Valuation Analytics Schema
 * 
 * Tracks user engagement with AI-powered property valuations
 */

// ============================================================================
// Valuation Views Tracking
// ============================================================================

export const valuationViews = pgTable("valuation_views", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("property_id").notNull(),
  userId: integer("user_id"),  // Nullable for anonymous users
  sessionId: varchar("session_id", { length: 255 }),
  
  // Engagement metrics
  viewDurationSeconds: integer("view_duration_seconds"),
  tabsViewed: text("tabs_viewed"),  // JSON array: ["visual", "neighborhood", "altdata"]
  scrollDepth: decimal("scroll_depth", { precision: 5, scale: 2 }),  // 0-100%
  
  // Conversion tracking
  contactedAgent: integer("contacted_agent").default(0),  // Boolean as int
  scheduledTour: integer("scheduled_tour").default(0),
  addedToFavorites: integer("added_to_favorites").default(0),
  
  // Referrer tracking
  referrerPage: varchar("referrer_page", { length: 255 }),  // Where user came from
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  
  // Device & browser
  deviceType: varchar("device_type", { length: 50 }),  // mobile, tablet, desktop
  browser: varchar("browser", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  valViewPropertyIdx: index("val_view_property_idx").on(table.propertyId),
  valViewUserIdx: index("val_view_user_idx").on(table.userId),
  valViewCreatedIdx: index("val_view_created_idx").on(table.createdAt),
}));

export type ValuationView = typeof valuationViews.$inferSelect;
export type InsertValuationView = typeof valuationViews.$inferInsert;


// ============================================================================
// Valuation Tab Engagement
// ============================================================================

export const valuationTabEngagement = pgTable("valuation_tab_engagement", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  viewId: integer("view_id").notNull(),  // FK to valuation_views
  propertyId: integer("property_id").notNull(),
  userId: integer("user_id"),
  
  // Tab-specific metrics
  tabName: varchar("tab_name", { length: 50 }).notNull(),  // visual, neighborhood, altdata, insights
  timeSpentSeconds: integer("time_spent_seconds").notNull(),
  interactionCount: integer("interaction_count").default(0),  // Clicks, hovers, etc.
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  viewIdIdx: index("view_id_idx").on(table.viewId),
  tabNameIdx: index("tab_name_idx").on(table.tabName),
}));

export type ValuationTabEngagement = typeof valuationTabEngagement.$inferSelect;
export type InsertValuationTabEngagement = typeof valuationTabEngagement.$inferInsert;


// ============================================================================
// Valuation Conversion Events
// ============================================================================

export const valuationConversions = pgTable("valuation_conversions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  viewId: integer("view_id").notNull(),
  propertyId: integer("property_id").notNull(),
  userId: integer("user_id"),
  
  // Conversion type
  conversionType: varchar("conversion_type", { length: 50 }).notNull(),  // contact_agent, schedule_tour, add_favorite
  conversionValue: decimal("conversion_value", { precision: 15, scale: 2 }),  // Estimated value
  
  // Time to conversion
  timeToConversionSeconds: integer("time_to_conversion_seconds"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  valConvPropertyIdx: index("val_conv_property_idx").on(table.propertyId),
  valConvTypeIdx: index("val_conv_type_idx").on(table.conversionType),
  valConvCreatedIdx: index("val_conv_created_idx").on(table.createdAt),
}));

export type ValuationConversion = typeof valuationConversions.$inferSelect;
export type InsertValuationConversion = typeof valuationConversions.$inferInsert;


// ============================================================================
// Valuation A/B Tests
// ============================================================================

export const valuationABTests = pgTable("valuation_ab_tests", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  testName: varchar("test_name", { length: 100 }).notNull(),
  variant: varchar("variant", { length: 50 }).notNull(),  // control, variant_a, variant_b
  
  propertyId: integer("property_id").notNull(),
  userId: integer("user_id"),
  sessionId: varchar("session_id", { length: 255 }),
  
  // Outcome metrics
  converted: integer("converted").default(0),
  conversionType: varchar("conversion_type", { length: 50 }),
  timeSpentSeconds: integer("time_spent_seconds"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  testNameIdx: index("test_name_idx").on(table.testName),
  variantIdx: index("variant_idx").on(table.variant),
}));

export type ValuationABTest = typeof valuationABTests.$inferSelect;
export type InsertValuationABTest = typeof valuationABTests.$inferInsert;


// ============================================================================
// Valuation Feedback
// ============================================================================

export const valuationFeedback = pgTable("valuation_feedback", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("property_id").notNull(),
  userId: integer("user_id"),
  
  // Feedback data
  rating: integer("rating"),  // 1-5 stars
  accuracyRating: integer("accuracy_rating"),  // 1-5 for valuation accuracy
  usefulnessRating: integer("usefulness_rating"),  // 1-5 for usefulness
  comment: text("comment"),
  
  // What was helpful/not helpful
  helpfulFeatures: text("helpful_features"),  // JSON array
  issuesReported: text("issues_reported"),  // JSON array
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  valFeedbackPropertyIdx: index("val_feedback_property_idx").on(table.propertyId),
  valFeedbackRatingIdx: index("val_feedback_rating_idx").on(table.rating),
}));

export type ValuationFeedback = typeof valuationFeedback.$inferSelect;
export type InsertValuationFeedback = typeof valuationFeedback.$inferInsert;
