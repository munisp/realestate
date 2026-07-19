/**
 * Hybrid Valuation Model Database Schema
 * Extends valuation system with data-scarce market support
 */

import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// ==================== ENUM DEFINITIONS ====================
// PostgreSQL requires enums to be declared separately before use

export const sourceTypeEnum_19708 = pgEnum("sourceType", [
    "comparable_sales",
    "satellite_imagery", 
    "market_listings",
    "economic_indicators",
    "neighborhood_quality",
    "transaction_history",
    "hedonic_model"
  ]);
export const dataQualityEnum_01611 = pgEnum("dataQuality", ["excellent", "good", "fair", "poor", "insufficient"]);
export const confidenceLevelEnum_92576 = pgEnum("confidenceLevel", [
    "very_high",
    "high", 
    "medium",
    "low",
    "very_low"
  ]);
export const roofMaterialEnum_65090 = pgEnum("roofMaterial", ["concrete", "tile", "metal", "thatch"]);
export const roofConditionEnum_59272 = pgEnum("roofCondition", ["excellent", "good", "fair", "poor"]);
export const roadAccessQualityEnum_80017 = pgEnum("roadAccessQuality", ["paved", "unpaved", "none"]);
export const pathwayUsedEnum_54353 = pgEnum("pathwayUsed", ["data_rich", "data_scarce", "hybrid"]);
export const recommendedPathwayEnum_33592 = pgEnum("recommendedPathway", ["data_rich", "data_scarce", "hybrid"]);

// ==================== TABLE DEFINITIONS ====================


// Valuation Data Sources - tracks what data was used
export const valuationDataSources = pgTable("valuationDataSources", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  valuationId: integer("valuationId").notNull(),
  
  // Data source details
  sourceName: varchar("sourceName", { length: 100 }).notNull(), // 'comparable_sales', 'satellite_imagery', 'market_listings', etc.
  sourceType: sourceTypeEnum_19708("sourceType").notNull(),
  
  // Contribution metrics
  weight: integer("weight").notNull(), // 0-100 (percentage)
  confidence: integer("confidence").notNull(), // 0-100
  valueContribution: integer("valueContribution"), // Actual value contributed in currency
  
  // Data quality
  dataQuality: dataQualityEnum_01611("dataQuality"),
  dataCount: integer("dataCount"), // Number of data points (e.g., number of comparables)
  
  // Metadata
  metadata: text("metadata"), // JSON with source-specific details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ValuationDataSource = typeof valuationDataSources.$inferSelect;
export type InsertValuationDataSource = typeof valuationDataSources.$inferInsert;

// Confidence Scores - detailed confidence breakdown
export const confidenceScores = pgTable("confidenceScores", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  valuationId: integer("valuationId").notNull().unique(), // One-to-one with valuation
  
  // Overall metrics
  overallConfidence: integer("overallConfidence").notNull(), // 0-100
  confidenceLevel: confidenceLevelEnum_92576("confidenceLevel").notNull(),
  
  // Component confidences (0-100 each)
  dataCompletenessScore: integer("dataCompletenessScore").notNull(),
  modelAccuracyScore: integer("modelAccuracyScore").notNull(),
  comparableQualityScore: integer("comparableQualityScore").notNull(),
  satelliteConfidenceScore: integer("satelliteConfidenceScore"),
  marketStabilityScore: integer("marketStabilityScore"),
  
  // Data completeness breakdown
  comparableSalesCount: integer("comparableSalesCount").default(0),
  transactionHistoryCount: integer("transactionHistoryCount").default(0),
  satelliteDataAvailable: integer("satelliteDataAvailable").default(0), // boolean
  alternativeDataSourcesCount: integer("alternativeDataSourcesCount").default(0),
  
  // Uncertainty metrics
  predictionIntervalLower: integer("predictionIntervalLower").notNull(),
  predictionIntervalUpper: integer("predictionIntervalUpper").notNull(),
  intervalWidthPercent: integer("intervalWidthPercent").notNull(), // 0-100
  standardError: integer("standardError"),
  
  // Quality flags (JSON array of strings)
  qualityFlags: text("qualityFlags"), // ["limited_comparables", "high_uncertainty", etc.]
  limitingFactors: text("limitingFactors"), // JSON array of what's limiting confidence
  
  // Recommendations (JSON array of strings)
  recommendations: text("recommendations"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConfidenceScore = typeof confidenceScores.$inferSelect;
export type InsertConfidenceScore = typeof confidenceScores.$inferInsert;

// Satellite Imagery Analysis - cached satellite analysis results
export const satelliteImageryAnalysis = pgTable("satelliteImageryAnalysis", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  
  // Building features
  buildingFootprintSqm: integer("buildingFootprintSqm"),
  estimatedHeightM: integer("estimatedHeightM"), // stored as cm, divide by 100
  numFloors: integer("numFloors"),
  roofMaterial: roofMaterialEnum_65090("roofMaterial"),
  roofCondition: roofConditionEnum_59272("roofCondition"),
  
  // Neighborhood features
  buildingDensity: integer("buildingDensity"), // buildings per hectare * 10
  greenSpaceRatio: integer("greenSpaceRatio"), // 0-100 percentage
  roadAccessQuality: roadAccessQualityEnum_80017("roadAccessQuality"),
  
  // Neighborhood metrics
  amenityDensity: integer("amenityDensity"), // POIs per km² * 10
  roadDensityKm: integer("roadDensityKm"), // km of roads per km² * 10
  commercialRatio: integer("commercialRatio"), // 0-100 percentage
  infrastructureScore: integer("infrastructureScore"), // 0-100
  
  // Confidence and quality
  analysisConfidence: integer("analysisConfidence").notNull(), // 0-100
  dataQuality: dataQualityEnum_01611("dataQuality"),
  
  // Data sources
  dataSources: text("dataSources"), // JSON array of sources used
  analysisTimestamp: timestamp("analysisTimestamp").notNull(),
  
  // Valuation multiplier
  valuationMultiplier: integer("valuationMultiplier"), // stored as * 1000 (e.g., 1.15 = 1150)
  
  // Metadata
  metadata: text("metadata"), // JSON with additional analysis details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SatelliteImageryAnalysis = typeof satelliteImageryAnalysis.$inferSelect;
export type InsertSatelliteImageryAnalysis = typeof satelliteImageryAnalysis.$inferInsert;

// Alternative Data Sources - economic and market data
export const alternativeDataSources = pgTable("alternativeDataSources", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  
  // Location context
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  
  // Economic indicators
  inflationRate: integer("inflationRate"), // stored as * 100 (e.g., 25.5% = 2550)
  gdpGrowthRate: integer("gdpGrowthRate"), // stored as * 100
  unemploymentRate: integer("unemploymentRate"), // stored as * 100
  currencyExchangeRate: integer("currencyExchangeRate"), // NGN/USD * 100
  interestRate: integer("interestRate"), // stored as * 100
  
  // Market listing data
  avgPricePerSqm: integer("avgPricePerSqm"),
  listingCount: integer("listingCount"),
  avgDaysOnMarket: integer("avgDaysOnMarket"),
  priceTrend30d: integer("priceTrend30d"), // stored as * 100 (percentage)
  comparablePropertiesCount: integer("comparablePropertiesCount"),
  
  // Neighborhood quality scores (0-100)
  schoolProximityScore: integer("schoolProximityScore"),
  hospitalProximityScore: integer("hospitalProximityScore"),
  shoppingProximityScore: integer("shoppingProximityScore"),
  transportProximityScore: integer("transportProximityScore"),
  crimeSafetyScore: integer("crimeSafetyScore"),
  overallNeighborhoodScore: integer("overallNeighborhoodScore"),
  
  // Data quality
  dataCompletenessScore: integer("dataCompletenessScore").notNull(), // 0-100
  sourcesUsed: text("sourcesUsed"), // JSON array of source names
  
  // Timestamps
  dataDate: timestamp("dataDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AlternativeDataSource = typeof alternativeDataSources.$inferSelect;
export type InsertAlternativeDataSource = typeof alternativeDataSources.$inferInsert;

// Hybrid Valuation Results - extends base valuations table
export const hybridValuations = pgTable("hybridValuations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  valuationId: integer("valuationId").notNull().unique(), // Links to base valuations table
  propertyId: integer("propertyId").notNull(),
  
  // Pathway information
  pathwayUsed: pathwayUsedEnum_54353("pathwayUsed").notNull(),
  dataAvailabilityScore: integer("dataAvailabilityScore").notNull(), // 0-100
  
  // Component valuations (JSON array)
  components: text("components").notNull(), // Array of {method, value, weight, confidence}
  
  // Final valuation
  finalValuation: integer("finalValuation").notNull(),
  confidenceScore: integer("confidenceScore").notNull(), // 0-100
  uncertaintyRangeLower: integer("uncertaintyRangeLower").notNull(),
  uncertaintyRangeUpper: integer("uncertaintyRangeUpper").notNull(),
  
  // Linked analyses
  satelliteAnalysisId: integer("satelliteAnalysisId"),
  alternativeDataId: integer("alternativeDataId"),
  
  // Model metadata
  modelVersion: varchar("modelVersion", { length: 50 }).default("2.0-hybrid"),
  
  // Metadata
  metadata: text("metadata"), // JSON with additional details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HybridValuation = typeof hybridValuations.$inferSelect;
export type InsertHybridValuation = typeof hybridValuations.$inferInsert;

// Data Quality Metrics - track data quality over time
export const dataQualityMetrics = pgTable("dataQualityMetrics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  
  // Scope
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  propertyType: varchar("propertyType", { length: 50 }),
  
  // Quality scores (0-100)
  comparableDataQuality: integer("comparableDataQuality"),
  transactionDataQuality: integer("transactionDataQuality"),
  satelliteDataQuality: integer("satelliteDataQuality"),
  marketDataQuality: integer("marketDataQuality"),
  overallDataQuality: integer("overallDataQuality").notNull(),
  
  // Counts
  totalProperties: integer("totalProperties"),
  propertiesWithComparables: integer("propertiesWithComparables"),
  propertiesWithSatellite: integer("propertiesWithSatellite"),
  propertiesWithMarketData: integer("propertiesWithMarketData"),
  
  // Recommendations
  recommendedPathway: recommendedPathwayEnum_33592("recommendedPathway"),
  
  // Metadata
  calculatedAt: timestamp("calculatedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DataQualityMetric = typeof dataQualityMetrics.$inferSelect;
export type InsertDataQualityMetric = typeof dataQualityMetrics.$inferInsert;
