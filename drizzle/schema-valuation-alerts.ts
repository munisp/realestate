import { integer, pgTable, text, timestamp, decimal, varchar, index, pgEnum } from "drizzle-orm/pg-core";

// ==================== ENUM DEFINITIONS ====================
// PostgreSQL requires enums to be declared separately before use

export const alert_typeEnum_90545 = pgEnum("alert_type", ["increase", "decrease", "both"]);
export const alert_frequencyEnum_03926 = pgEnum("alert_frequency", ["instant", "daily", "weekly"]);
export const delivery_methodEnum_69026 = pgEnum("delivery_method", ["email", "push", "in_app", "sms"]);
export const delivery_statusEnum_12636 = pgEnum("delivery_status", ["pending", "sent", "delivered", "failed", "bounced"]);

// ==================== TABLE DEFINITIONS ====================


/**
 * Valuation Change Alerts Schema
 * 
 * Tracks property valuation changes and sends alerts to interested users
 */

// ============================================================================
// Valuation Monitoring
// ============================================================================

export const valuationMonitoring = pgTable("valuation_monitoring", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("property_id").notNull(),
  userId: integer("user_id").notNull(),
  
  // Alert preferences
  alertThreshold: decimal("alert_threshold", { precision: 5, scale: 2 }).notNull(), // Percentage change (e.g., 5.00 for 5%)
  alertType: alert_typeEnum_90545("alert_type").default("both").notNull(),
  
  // Last known valuation
  lastValuation: integer("last_valuation"),
  lastCheckedAt: timestamp("last_checked_at"),
  
  // Alert status
  isActive: integer("is_active").default(1).notNull(),  // Boolean as int
  alertFrequency: alert_frequencyEnum_03926("alert_frequency").default("instant").notNull(),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  valMonUserIdx: index("val_mon_user_idx").on(table.userId),
  valMonPropertyIdx: index("val_mon_property_idx").on(table.propertyId),
  valMonActiveIdx: index("val_mon_active_idx").on(table.isActive),
}));

export type ValuationMonitoring = typeof valuationMonitoring.$inferSelect;
export type InsertValuationMonitoring = typeof valuationMonitoring.$inferInsert;


// ============================================================================
// Valuation Change History
// ============================================================================

export const valuationChangeHistory = pgTable("valuation_change_history", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("property_id").notNull(),
  
  // Valuation change data
  previousValuation: integer("previous_valuation").notNull(),
  newValuation: integer("new_valuation").notNull(),
  changeAmount: integer("change_amount").notNull(),
  changePercentage: decimal("change_percentage", { precision: 5, scale: 2 }).notNull(),
  
  // Reason for change
  changeReason: text("change_reason"),  // JSON object with factors
  
  // Detection metadata
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  detectionMethod: varchar("detection_method", { length: 50 }),  // "scheduled", "manual", "realtime"
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdIdx: index("property_id_idx").on(table.propertyId),
  detectedAtIdx: index("detected_at_idx").on(table.detectedAt),
}));

export type ValuationChangeHistory = typeof valuationChangeHistory.$inferSelect;
export type InsertValuationChangeHistory = typeof valuationChangeHistory.$inferInsert;


// ============================================================================
// Valuation Alerts Sent
// ============================================================================

export const valuationAlertsSent = pgTable("valuation_alerts_sent", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  monitoringId: integer("monitoring_id").notNull(),  // FK to valuation_monitoring
  changeHistoryId: integer("change_history_id").notNull(),  // FK to valuation_change_history
  userId: integer("user_id").notNull(),
  propertyId: integer("property_id").notNull(),
  
  // Alert delivery
  deliveryMethod: delivery_methodEnum_69026("delivery_method").notNull(),
  deliveryStatus: delivery_statusEnum_12636("delivery_status").default("pending").notNull(),
  
  // Alert content
  alertTitle: varchar("alert_title", { length: 255 }).notNull(),
  alertMessage: text("alert_message").notNull(),
  
  // Engagement tracking
  opened: integer("opened").default(0),  // Boolean as int
  openedAt: timestamp("opened_at"),
  clicked: integer("clicked").default(0),  // Boolean as int
  clickedAt: timestamp("clicked_at"),
  
  // Error handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  valAlertSentUserIdx: index("val_alert_sent_user_idx").on(table.userId),
  valAlertSentPropertyIdx: index("val_alert_sent_property_idx").on(table.propertyId),
  valAlertSentDeliveryStatusIdx: index("val_alert_sent_delivery_status_idx").on(table.deliveryStatus),
}));

export type ValuationAlertSent = typeof valuationAlertsSent.$inferSelect;
export type InsertValuationAlertSent = typeof valuationAlertsSent.$inferInsert;


// ============================================================================
// User Alert Preferences
// ============================================================================

export const userAlertPreferences = pgTable("user_alert_preferences", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().unique(),
  
  // Global preferences
  emailAlertsEnabled: integer("email_alerts_enabled").default(1).notNull(),
  pushAlertsEnabled: integer("push_alerts_enabled").default(1).notNull(),
  inAppAlertsEnabled: integer("in_app_alerts_enabled").default(1).notNull(),
  smsAlertsEnabled: integer("sms_alerts_enabled").default(0).notNull(),
  
  // Frequency preferences
  maxAlertsPerDay: integer("max_alerts_per_day").default(10).notNull(),
  quietHoursStart: integer("quiet_hours_start"),  // Hour 0-23
  quietHoursEnd: integer("quiet_hours_end"),  // Hour 0-23
  
  // Alert types
  valuationChangeAlerts: integer("valuation_change_alerts").default(1).notNull(),
  marketTrendAlerts: integer("market_trend_alerts").default(1).notNull(),
  priceDropAlerts: integer("price_drop_alerts").default(1).notNull(),
  newListingAlerts: integer("new_listing_alerts").default(1).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
}));

export type UserAlertPreferences = typeof userAlertPreferences.$inferSelect;
export type InsertUserAlertPreferences = typeof userAlertPreferences.$inferInsert;
