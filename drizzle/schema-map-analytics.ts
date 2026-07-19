import { integer, pgEnum, pgTable, text, timestamp, varchar, json, real } from "drizzle-orm/pg-core";

// ==================== ENUM DEFINITIONS ====================
// PostgreSQL requires enums to be declared separately before use

export const providerEnum_62103 = pgEnum("provider", ["google", "maplibre"]);
export const eventTypeEnum_99423 = pgEnum("eventType", ["load", "interaction", "error", "switch"]);

// ==================== TABLE DEFINITIONS ====================


/**
 * Map Analytics Table
 * Tracks map provider usage and performance for A/B testing
 */
export const mapAnalytics = pgTable("map_analytics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  provider: providerEnum_62103("provider").notNull(),
  eventType: eventTypeEnum_99423("eventType").notNull(),
  loadTime: real("loadTime"), // milliseconds
  errorMessage: text("errorMessage"),
  metadata: json("metadata"), // Additional event data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MapAnalytics = typeof mapAnalytics.$inferSelect;
export type InsertMapAnalytics = typeof mapAnalytics.$inferInsert;
