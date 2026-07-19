import { integer, pgTable, decimal, varchar, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

// ==================== ENUM DEFINITIONS ====================
// PostgreSQL requires enums to be declared separately before use

export const overallConditionEnum_40505 = pgEnum("overallCondition", ["excellent", "good", "fair", "poor"]);
export const roofConditionEnum_59272 = pgEnum("roofCondition", ["excellent", "good", "fair", "poor"]);
export const exteriorConditionEnum_98295 = pgEnum("exteriorCondition", ["excellent", "good", "fair", "poor"]);

// ==================== TABLE DEFINITIONS ====================


/**
 * Zestimate Valuation Tables
 * 
 * Tables for AI-powered property valuations, visual assessments,
 * alternative data, neighborhood graphs, and fairness metrics.
 */

// Property Valuations - Current AI valuations
export const propertyValuations = pgTable("property_valuations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  estimatedValue: decimal("estimatedValue", { precision: 15, scale: 2 }).notNull(),
  lowerBound: decimal("lowerBound", { precision: 15, scale: 2 }).notNull(),
  upperBound: decimal("upperBound", { precision: 15, scale: 2 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(), // 0.0000 to 1.0000
  modelType: varchar("modelType", { length: 50 }).notNull(), // gcn, graphsage, gat, ensemble
  source: varchar("source", { length: 50 }).notNull(), // gnn, ensemble, cv, altdata
  metadata: text("metadata"), // JSON metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Valuation History - Historical valuations for tracking
export const valuationHistory = pgTable("valuation_history", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  estimatedValue: decimal("estimatedValue", { precision: 15, scale: 2 }).notNull(),
  actualValue: decimal("actualValue", { precision: 15, scale: 2 }), // Actual sale price if known
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  modelType: varchar("modelType", { length: 50 }).notNull(),
  valuationDate: timestamp("valuationDate").notNull(),
  error: decimal("error", { precision: 10, scale: 4 }), // Prediction error if actualValue known
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Visual Assessments - Computer vision analysis results
export const visualAssessments = pgTable("visual_assessments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  overallCondition: overallConditionEnum_40505("overallCondition").notNull(),
  conditionScore: integer("conditionScore").notNull(), // 0-100
  roofCondition: roofConditionEnum_59272("roofCondition").notNull(),
  hasPool: boolean("hasPool").default(false),
  hasSolarPanels: boolean("hasSolarPanels").default(false),
  hasDeck: boolean("hasDeck").default(false),
  vegetationIndex: decimal("vegetationIndex", { precision: 5, scale: 4 }), // NDVI 0.0000 to 1.0000
  curbAppeal: integer("curbAppeal"), // 0-100
  exteriorCondition: exteriorConditionEnum_98295("exteriorCondition"),
  parkingSpaces: integer("parkingSpaces"),
  walkabilityScore: integer("walkabilityScore"), // 0-100
  aerialImageUrl: text("aerialImageUrl"),
  streetViewUrl: text("streetViewUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Alternative Data Cache - POI, economic, behavioral data
export const alternativeDataCache = pgTable("alternative_data_cache", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  walkabilityScore: integer("walkabilityScore"), // 0-100
  amenityDensity025mi: integer("amenityDensity025mi"), // Count within 0.25 miles
  amenityDensity05mi: integer("amenityDensity05mi"), // Count within 0.5 miles
  amenityDensity1mi: integer("amenityDensity1mi"), // Count within 1 mile
  restaurantQualityAvg: decimal("restaurantQualityAvg", { precision: 3, scale: 2 }), // 0.00 to 5.00
  schoolQualityProxy: integer("schoolQualityProxy"), // 0-100
  retailAccessibility: integer("retailAccessibility"), // 0-100
  unemploymentRate: decimal("unemploymentRate", { precision: 5, scale: 2 }), // Percentage
  wageGrowthYoy: decimal("wageGrowthYoy", { precision: 5, scale: 2 }), // Year-over-year %
  priceGrowthYoy: decimal("priceGrowthYoy", { precision: 5, scale: 2 }), // Year-over-year %
  searchInterestIndex: integer("searchInterestIndex"), // 0-100
  buyerUrgencyScore: integer("buyerUrgencyScore"), // 0-100
  poiData: text("poiData"), // JSON POI breakdown
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Neighborhood Graph - GNN graph edges
export const neighborhoodGraph = pgTable("neighborhood_graph", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  neighborId: integer("neighborId").notNull(),
  distanceMiles: decimal("distanceMiles", { precision: 10, scale: 4 }).notNull(),
  influenceWeight: decimal("influenceWeight", { precision: 10, scale: 6 }).notNull(), // 0.000000 to 1.000000
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Fairness Metrics - Bias monitoring
export const fairnessMetrics = pgTable("fairness_metrics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  segment: varchar("segment", { length: 100 }).notNull(), // zip_code, neighborhood, etc.
  segmentValue: varchar("segmentValue", { length: 100 }).notNull(), // e.g., "94102"
  mpe: decimal("mpe", { precision: 10, scale: 4 }).notNull(), // Mean Percentage Error
  mdape: decimal("mdape", { precision: 10, scale: 4 }).notNull(), // Median Absolute Percentage Error
  disparateImpact: decimal("disparateImpact", { precision: 10, scale: 4 }), // Disparate impact ratio
  sampleSize: integer("sampleSize").notNull(),
  calibrationFactor: decimal("calibrationFactor", { precision: 10, scale: 6 }).default("1.000000"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Type exports
export type PropertyValuation = typeof propertyValuations.$inferSelect;
export type InsertPropertyValuation = typeof propertyValuations.$inferInsert;

export type ValuationHistory = typeof valuationHistory.$inferSelect;
export type InsertValuationHistory = typeof valuationHistory.$inferInsert;

export type VisualAssessment = typeof visualAssessments.$inferSelect;
export type InsertVisualAssessment = typeof visualAssessments.$inferInsert;

export type AlternativeDataCache = typeof alternativeDataCache.$inferSelect;
export type InsertAlternativeDataCache = typeof alternativeDataCache.$inferInsert;

export type NeighborhoodGraph = typeof neighborhoodGraph.$inferSelect;
export type InsertNeighborhoodGraph = typeof neighborhoodGraph.$inferInsert;

export type FairnessMetric = typeof fairnessMetrics.$inferSelect;
export type InsertFairnessMetric = typeof fairnessMetrics.$inferInsert;
