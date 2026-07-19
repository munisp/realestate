import { integer, pgTable, serial, timestamp, varchar, text, boolean, decimal } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// Pricing strategy enum
export const pricingStrategyEnum = pgEnum("pricingStrategy", ["fixed", "dynamic", "seasonal", "demand_based"]);

// Day type enum
export const dayTypeEnum = pgEnum("dayType", ["weekday", "weekend", "holiday"]);

// Pricing rules for properties
export const pricingRules = pgTable("pricingRules", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  
  // Base pricing
  basePrice: integer("basePrice").notNull(), // Base price per night in cents
  
  // Strategy
  strategy: pricingStrategyEnum("strategy").default("fixed").notNull(),
  
  // Weekend pricing (Friday-Sunday)
  weekendMultiplier: decimal("weekendMultiplier", { precision: 4, scale: 2 }).default("1.00"),
  
  // Seasonal pricing
  highSeasonStart: varchar("highSeasonStart", { length: 5 }), // MM-DD format
  highSeasonEnd: varchar("highSeasonEnd", { length: 5 }),
  highSeasonMultiplier: decimal("highSeasonMultiplier", { precision: 4, scale: 2 }).default("1.00"),
  
  lowSeasonStart: varchar("lowSeasonStart", { length: 5 }),
  lowSeasonEnd: varchar("lowSeasonEnd", { length: 5 }),
  lowSeasonMultiplier: decimal("lowSeasonMultiplier", { precision: 4, scale: 2 }).default("1.00"),
  
  // Demand-based pricing
  enableDemandPricing: boolean("enableDemandPricing").default(false),
  demandMultiplierMin: decimal("demandMultiplierMin", { precision: 4, scale: 2 }).default("0.80"), // 20% discount max
  demandMultiplierMax: decimal("demandMultiplierMax", { precision: 4, scale: 2 }).default("1.50"), // 50% increase max
  
  // Last-minute discounts
  lastMinuteDays: integer("lastMinuteDays").default(7), // Days before check-in
  lastMinuteDiscount: decimal("lastMinuteDiscount", { precision: 4, scale: 2 }).default("0.00"), // Percentage discount
  
  // Length-of-stay discounts
  weeklyDiscount: decimal("weeklyDiscount", { precision: 4, scale: 2 }).default("0.00"), // 7+ nights
  monthlyDiscount: decimal("monthlyDiscount", { precision: 4, scale: 2 }).default("0.00"), // 28+ nights
  
  // Minimum stay requirements
  minStayWeekday: integer("minStayWeekday").default(1),
  minStayWeekend: integer("minStayWeekend").default(2),
  minStayHighSeason: integer("minStayHighSeason").default(1),
  
  // Active status
  isActive: boolean("isActive").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = typeof pricingRules.$inferInsert;

// Special event pricing
export const specialEventPricing = pgTable("specialEventPricing", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  
  eventName: varchar("eventName", { length: 255 }).notNull(),
  eventDescription: text("eventDescription"),
  
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  
  priceMultiplier: decimal("priceMultiplier", { precision: 4, scale: 2 }).notNull(),
  minStay: integer("minStay").default(1),
  
  isActive: boolean("isActive").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SpecialEventPricing = typeof specialEventPricing.$inferSelect;
export type InsertSpecialEventPricing = typeof specialEventPricing.$inferInsert;

// Custom date pricing overrides
export const customDatePricing = pgTable("customDatePricing", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  
  date: timestamp("date").notNull(),
  price: integer("price").notNull(), // Price in cents
  minStay: integer("minStay").default(1),
  
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomDatePricing = typeof customDatePricing.$inferSelect;
export type InsertCustomDatePricing = typeof customDatePricing.$inferInsert;

// Market pricing recommendations
export const marketPricingRecommendations = pgTable("marketPricingRecommendations", {
  id: serial("id").primaryKey(),
  propertyId: integer("propertyId").notNull(),
  
  date: timestamp("date").notNull(),
  recommendedPrice: integer("recommendedPrice").notNull(), // Price in cents
  confidence: decimal("confidence", { precision: 4, scale: 2 }), // 0.00 to 1.00
  
  // Factors
  occupancyRate: decimal("occupancyRate", { precision: 4, scale: 2 }),
  competitorAvgPrice: integer("competitorAvgPrice"),
  demandScore: decimal("demandScore", { precision: 4, scale: 2 }),
  
  reasoning: text("reasoning"), // JSON with detailed factors
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarketPricingRecommendation = typeof marketPricingRecommendations.$inferSelect;
export type InsertMarketPricingRecommendation = typeof marketPricingRecommendations.$inferInsert;
