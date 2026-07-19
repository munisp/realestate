import { pgTable, serial, integer, varchar, text, timestamp, real, index } from "drizzle-orm/pg-core";

/**
 * GNN Alert Subscriptions
 * User subscriptions for GNN-powered property alerts
 */
export const gnnAlertSubscriptions = pgTable("gnn_alert_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  alertType: varchar("alertType", { length: 50 }).notNull(), // undervalued, market_trend, investment_opportunity, price_momentum
  
  // Geographic filters
  cities: text("cities"), // JSON array: ["Lagos", "Abuja"]
  neighborhoods: text("neighborhoods"), // JSON array: ["Lekki Phase 1", "Victoria Island"]
  
  // Property filters
  propertyTypes: text("propertyTypes"), // JSON array: ["single_family", "condo"]
  minPrice: integer("minPrice"),
  maxPrice: integer("maxPrice"),
  minBedrooms: integer("minBedrooms"),
  maxBedrooms: integer("maxBedrooms"),
  
  // GNN-specific thresholds
  minInvestmentScore: real("minInvestmentScore"), // 0-100, e.g., 70 = only notify for properties with score >= 70
  minUndervaluedPercent: real("minUndervaluedPercent"), // e.g., 10 = notify when property is 10%+ undervalued
  minTrendStrength: real("minTrendStrength"), // -1 to 1, e.g., 0.5 = strong positive trend
  minGrowthPotential: real("minGrowthPotential"), // 0-100
  
  // Notification preferences
  notificationChannels: text("notificationChannels").notNull(), // JSON array: ["email", "push", "sms"]
  frequency: varchar("frequency", { length: 20 }).notNull().default("instant"), // instant, daily, weekly
  isActive: integer("isActive").notNull().default(1), // 1=true, 0=false
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
}, (table) => ({
  userIdx: index("gnn_alert_sub_user_idx").on(table.userId),
  activeIdx: index("gnn_alert_sub_active_idx").on(table.isActive),
  alertTypeIdx: index("gnn_alert_sub_type_idx").on(table.alertType),
}));

/**
 * GNN Alert Triggers
 * Records of when alerts were triggered by the GNN system
 */
export const gnnAlertTriggers = pgTable("gnn_alert_triggers", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscriptionId").notNull(),
  propertyId: integer("propertyId").notNull(),
  alertType: varchar("alertType", { length: 50 }).notNull(),
  
  // GNN metrics that triggered the alert
  investmentScore: real("investmentScore"),
  undervaluedPercent: real("undervaluedPercent"), // How much below market value
  trendStrength: real("trendStrength"),
  growthPotential: real("growthPotential"),
  confidence: real("confidence").notNull(), // GNN confidence in this alert
  
  // Alert details
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  reasoning: text("reasoning"), // JSON: Why GNN triggered this alert
  
  // Notification status
  notificationsSent: text("notificationsSent"), // JSON: [{channel: "email", status: "sent", sentAt: "..."}]
  userViewed: integer("userViewed").notNull().default(0), // 1=true, 0=false
  viewedAt: timestamp("viewedAt"),
  userDismissed: integer("userDismissed").notNull().default(0),
  dismissedAt: timestamp("dismissedAt"),
  
  // User actions
  userSavedProperty: integer("userSavedProperty").notNull().default(0),
  userViewedProperty: integer("userViewedProperty").notNull().default(0),
  userContactedAgent: integer("userContactedAgent").notNull().default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index("gnn_trigger_subscription_idx").on(table.subscriptionId),
  propertyIdx: index("gnn_trigger_property_idx").on(table.propertyId),
  createdIdx: index("gnn_trigger_created_idx").on(table.createdAt),
  viewedIdx: index("gnn_trigger_viewed_idx").on(table.userViewed),
}));

/**
 * GNN Alert Evaluation Log
 * Tracks when the GNN alert system runs and what it finds
 */
export const gnnAlertEvaluationLog = pgTable("gnn_alert_evaluation_log", {
  id: serial("id").primaryKey(),
  evaluationType: varchar("evaluationType", { length: 50 }).notNull(), // scheduled, manual, property_update
  
  // Evaluation results
  propertiesEvaluated: integer("propertiesEvaluated").notNull(),
  alertsTriggered: integer("alertsTriggered").notNull(),
  subscriptionsChecked: integer("subscriptionsChecked").notNull(),
  notificationsSent: integer("notificationsSent").notNull(),
  
  // Performance metrics
  executionTimeMs: integer("executionTimeMs").notNull(),
  gnnInferenceTimeMs: integer("gnnInferenceTimeMs"),
  cacheHitRate: real("cacheHitRate"), // 0-1
  
  // Errors
  errorCount: integer("errorCount").notNull().default(0),
  errorDetails: text("errorDetails"), // JSON
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  evalTypeIdx: index("gnn_eval_log_type_idx").on(table.evaluationType),
  evalCreatedIdx: index("gnn_eval_log_created_idx").on(table.createdAt),
}));

/**
 * GNN Alert Performance Metrics
 * Tracks effectiveness of GNN alerts
 */
export const gnnAlertPerformanceMetrics = pgTable("gnn_alert_performance_metrics", {
  id: serial("id").primaryKey(),
  alertType: varchar("alertType", { length: 50 }).notNull(),
  
  // Engagement metrics
  totalSent: integer("totalSent").notNull().default(0),
  totalViewed: integer("totalViewed").notNull().default(0),
  totalDismissed: integer("totalDismissed").notNull().default(0),
  totalPropertyViews: integer("totalPropertyViews").notNull().default(0),
  totalPropertySaves: integer("totalPropertySaves").notNull().default(0),
  totalAgentContacts: integer("totalAgentContacts").notNull().default(0),
  
  // Calculated rates
  viewRate: real("viewRate"), // totalViewed / totalSent
  engagementRate: real("engagementRate"), // (views + saves + contacts) / totalSent
  dismissRate: real("dismissRate"), // totalDismissed / totalSent
  
  // Accuracy metrics (when we can verify)
  truePositives: integer("truePositives").notNull().default(0), // User took action and it was a good deal
  falsePositives: integer("falsePositives").notNull().default(0), // User dismissed or property didn't sell
  precision: real("precision"), // truePositives / (truePositives + falsePositives)
  
  // Time period
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  perfTypeIdx: index("gnn_perf_type_idx").on(table.alertType),
  periodIdx: index("gnn_perf_period_idx").on(table.periodStart, table.periodEnd),
}));

export type GnnAlertSubscription = typeof gnnAlertSubscriptions.$inferSelect;
export type InsertGnnAlertSubscription = typeof gnnAlertSubscriptions.$inferInsert;
export type GnnAlertTrigger = typeof gnnAlertTriggers.$inferSelect;
export type InsertGnnAlertTrigger = typeof gnnAlertTriggers.$inferInsert;
export type GnnAlertEvaluationLog = typeof gnnAlertEvaluationLog.$inferSelect;
export type InsertGnnAlertEvaluationLog = typeof gnnAlertEvaluationLog.$inferInsert;
export type GnnAlertPerformanceMetric = typeof gnnAlertPerformanceMetrics.$inferSelect;
export type InsertGnnAlertPerformanceMetric = typeof gnnAlertPerformanceMetrics.$inferInsert;
