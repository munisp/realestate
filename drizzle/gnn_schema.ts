import { pgTable, pgEnum, integer, varchar, text, timestamp, json, real } from "drizzle-orm/pg-core";

/**
 * GNN Training Data Schema
 * -------------------------
 * Tables for storing GNN model training data, predictions, and performance metrics.
 */

// ==================== ENUM DEFINITIONS ====================
// PostgreSQL requires enums to be declared separately before use

export const edgeTypeEnum = pgEnum("edgeType", ["spatial", "similarity", "temporal"]);
export const trendDirectionEnum = pgEnum("trendDirection", ["up", "down", "stable"]);
export const recommendationEnum = pgEnum("recommendation", ["strong_buy", "buy", "hold", "consider", "pass"]);
export const gnnModelTypeEnum = pgEnum("gnnModelType", ["valuation", "market_trends", "neighborhood"]);
export const gnnTrainingStatusEnum = pgEnum("gnnTrainingStatus", ["running", "completed", "failed"]);
export const gnnPerformanceModelTypeEnum = pgEnum("gnnPerformanceModelType", ["gnn", "traditional_ml"]);
export const alertTypeEnum = pgEnum("alertType", ["market_trend", "undervalued_property", "neighborhood_growth"]);
export const alertFrequencyEnum = pgEnum("alertFrequency", ["instant", "daily", "weekly"]);

// ==================== TABLE DEFINITIONS ====================

// GNN Property Graph Nodes
export const gnnPropertyNodes = pgTable("gnn_property_nodes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(), // FK to properties table
  // Node features (normalized for GNN input)
  price: integer("price").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  sqft: integer("sqft").notNull(),
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),
  yearBuilt: integer("yearBuilt"),
  lotSize: integer("lotSize"),
  // Additional features
  propertyType: varchar("propertyType", { length: 50 }),
  listingType: varchar("listingType", { length: 50 }),
  // Computed features
  pricePerSqft: integer("pricePerSqft"),
  ageOfProperty: integer("ageOfProperty"),
  // Graph metadata
  nodeEmbedding: text("nodeEmbedding"), // JSON array of embedding vector
  centralityScore: varchar("centralityScore", { length: 20 }), // Network centrality
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GNNPropertyNode = typeof gnnPropertyNodes.$inferSelect;
export type InsertGNNPropertyNode = typeof gnnPropertyNodes.$inferInsert;

// GNN Property Graph Edges (Spatial relationships)
export const gnnPropertyEdges = pgTable("gnn_property_edges", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  sourceNodeId: integer("sourceNodeId").notNull(), // FK to gnn_property_nodes
  targetNodeId: integer("targetNodeId").notNull(), // FK to gnn_property_nodes
  // Edge attributes
  distance: varchar("distance", { length: 20 }).notNull(), // Distance in meters
  edgeType: edgeTypeEnum("edgeType").notNull(),
  weight: varchar("weight", { length: 20 }).default("1.0"), // Edge weight for GNN
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GNNPropertyEdge = typeof gnnPropertyEdges.$inferSelect;
export type InsertGNNPropertyEdge = typeof gnnPropertyEdges.$inferInsert;

// GNN Valuation Predictions
export const gnnValuationPredictions = pgTable("gnn_valuation_predictions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(), // FK to properties table
  // Prediction results
  estimatedValue: integer("estimatedValue").notNull(),
  confidenceScore: varchar("confidenceScore", { length: 20 }).notNull(), // 0-1
  valueRangeMin: integer("valueRangeMin").notNull(),
  valueRangeMax: integer("valueRangeMax").notNull(),
  // Spatial factors
  neighborhoodEffect: integer("neighborhoodEffect"),
  locationPremium: varchar("locationPremium", { length: 20 }),
  accessibilityScore: integer("accessibilityScore"),
  // Model metadata
  modelVersion: varchar("modelVersion", { length: 50 }).notNull(),
  predictionTimestamp: timestamp("predictionTimestamp").notNull(),
  // Comparable properties (JSON array of property IDs)
  comparableProperties: text("comparableProperties"),
  // Actual vs Predicted (for model evaluation)
  actualValue: integer("actualValue"),
  predictionError: integer("predictionError"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GNNValuationPrediction = typeof gnnValuationPredictions.$inferSelect;
export type InsertGNNValuationPrediction = typeof gnnValuationPredictions.$inferInsert;

// GNN Market Trend Predictions
export const gnnMarketTrendPredictions = pgTable("gnn_market_trend_predictions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(), // FK to properties table
  // Trend predictions
  trendDirection: trendDirectionEnum("trendDirection").notNull(),
  trendMagnitude: varchar("trendMagnitude", { length: 20 }).notNull(), // Percentage change
  trendScore: varchar("trendScore", { length: 20 }).notNull(), // 0-1 confidence
  forecastMonths: integer("forecastMonths").notNull(),
  // Investment metrics
  investmentScore: varchar("investmentScore", { length: 20 }),
  centralityScore: varchar("centralityScore", { length: 20 }),
  undervaluationScore: varchar("undervaluationScore", { length: 20 }),
  recommendation: recommendationEnum("recommendation"),
  // Hotspot identification
  isHotspot: integer("isHotspot").default(0), // boolean as int
  hotspotRank: integer("hotspotRank"),
  // Model metadata
  modelVersion: varchar("modelVersion", { length: 50 }).notNull(),
  predictionTimestamp: timestamp("predictionTimestamp").notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GNNMarketTrendPrediction = typeof gnnMarketTrendPredictions.$inferSelect;
export type InsertGNNMarketTrendPrediction = typeof gnnMarketTrendPredictions.$inferInsert;

// GNN Neighborhood Intelligence
export const gnnNeighborhoodIntelligence = pgTable("gnn_neighborhood_intelligence", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  // Location
  latitude: varchar("latitude", { length: 20 }).notNull(),
  longitude: varchar("longitude", { length: 20 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  neighborhood: varchar("neighborhood", { length: 255 }),
  // Walkability metrics
  intersectionDensity: varchar("intersectionDensity", { length: 20 }),
  streetConnectivity: varchar("streetConnectivity", { length: 20 }),
  pedestrianFriendliness: varchar("pedestrianFriendliness", { length: 20 }),
  networkDistanceToAmenities: varchar("networkDistanceToAmenities", { length: 20 }),
  walkabilityScore: varchar("walkabilityScore", { length: 20 }),
  // Transit accessibility
  numNearbyStops: integer("numNearbyStops"),
  avgFrequency: varchar("avgFrequency", { length: 20 }),
  reachableArea: varchar("reachableArea", { length: 20 }), // km²
  transitScore: varchar("transitScore", { length: 20 }),
  nearestStops: text("nearestStops"), // JSON array
  // Overall score
  locationScore: varchar("locationScore", { length: 20 }),
  recommendation: text("recommendation"),
  // Model metadata
  analysisTimestamp: timestamp("analysisTimestamp").notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GNNNeighborhoodIntelligence = typeof gnnNeighborhoodIntelligence.$inferSelect;
export type InsertGNNNeighborhoodIntelligence = typeof gnnNeighborhoodIntelligence.$inferInsert;

// GNN Model Training Runs
export const gnnModelTrainingRuns = pgTable("gnn_model_training_runs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  modelType: gnnModelTypeEnum("modelType").notNull(),
  modelVersion: varchar("modelVersion", { length: 50 }).notNull(),
  // Training configuration
  architecture: varchar("architecture", { length: 100 }), // e.g., "GraphSAGE-3layer"
  hyperparameters: text("hyperparameters"), // JSON
  // Training data
  numTrainingExamples: integer("numTrainingExamples"),
  numValidationExamples: integer("numValidationExamples"),
  numTestExamples: integer("numTestExamples"),
  // Performance metrics
  trainLoss: varchar("trainLoss", { length: 20 }),
  validationLoss: varchar("validationLoss", { length: 20 }),
  testLoss: varchar("testLoss", { length: 20 }),
  mae: varchar("mae", { length: 20 }), // Mean Absolute Error
  rmse: varchar("rmse", { length: 20 }), // Root Mean Squared Error
  r2Score: varchar("r2Score", { length: 20 }), // R² Score
  // Training metadata
  trainingDuration: integer("trainingDuration"), // seconds
  device: varchar("device", { length: 20 }), // cpu or cuda
  status: gnnTrainingStatusEnum("status").notNull(),
  errorMessage: text("errorMessage"),
  // Timestamps
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GNNModelTrainingRun = typeof gnnModelTrainingRuns.$inferSelect;
export type InsertGNNModelTrainingRun = typeof gnnModelTrainingRuns.$inferInsert;

// GNN Model Performance Metrics (A/B testing)
export const gnnModelPerformanceMetrics = pgTable("gnn_model_performance_metrics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  modelType: gnnPerformanceModelTypeEnum("modelType").notNull(),
  modelVersion: varchar("modelVersion", { length: 50 }).notNull(),
  // Evaluation period
  evaluationStartDate: timestamp("evaluationStartDate").notNull(),
  evaluationEndDate: timestamp("evaluationEndDate").notNull(),
  // Performance metrics
  numPredictions: integer("numPredictions"),
  avgError: varchar("avgError", { length: 20 }),
  medianError: varchar("medianError", { length: 20 }),
  avgConfidence: varchar("avgConfidence", { length: 20 }),
  // Accuracy by price range
  accuracy_0_50k: varchar("accuracy_0_50k", { length: 20 }),
  accuracy_50k_100k: varchar("accuracy_50k_100k", { length: 20 }),
  accuracy_100k_200k: varchar("accuracy_100k_200k", { length: 20 }),
  accuracy_200k_plus: varchar("accuracy_200k_plus", { length: 20 }),
  // User feedback
  userRating: varchar("userRating", { length: 20 }),
  numRatings: integer("numRatings"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GNNModelPerformanceMetric = typeof gnnModelPerformanceMetrics.$inferSelect;
export type InsertGNNModelPerformanceMetric = typeof gnnModelPerformanceMetrics.$inferInsert;

// GNN Alert Subscriptions
export const gnnAlertSubscriptions = pgTable("gnn_alert_subscriptions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull(), // FK to users table
  // Alert criteria
  alertType: alertTypeEnum("alertType").notNull(),
  minInvestmentScore: integer("minInvestmentScore"), // Minimum score to trigger alert
  minMomentumScore: integer("minMomentumScore"),
  minCentralityScore: varchar("minCentralityScore", { length: 20 }),
  // Geographic filters
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  radiusKm: integer("radiusKm"),
  neighborhoods: text("neighborhoods"), // JSON array of neighborhood names
  // Additional geographic filters
  cities: text("cities"), // JSON array: ["Lagos", "Abuja"]
  // Property filters
  propertyTypes: text("propertyTypes"), // JSON array: ["single_family", "condo"]
  minBedrooms: integer("minBedrooms"),
  maxBedrooms: integer("maxBedrooms"),
  // Price filters
  minPrice: integer("minPrice"),
  maxPrice: integer("maxPrice"),
  // GNN-specific thresholds (real/float)
  minUndervaluedPercent: real("minUndervaluedPercent"),
  minTrendStrength: real("minTrendStrength"),
  minGrowthPotential: real("minGrowthPotential"),
  // Notification preferences
  enabled: integer("enabled").default(1).notNull(), // 1 = enabled, 0 = disabled
  isActive: integer("isActive").default(1).notNull(), // alias for enabled
  notifyEmail: integer("notifyEmail").default(1),
  notifySms: integer("notifySms").default(0),
  notifyInApp: integer("notifyInApp").default(1),
  notificationChannels: text("notificationChannels"), // JSON array: ["email", "push", "sms"]
  frequency: alertFrequencyEnum("frequency").default("daily").notNull(),
  // Metadata
  lastTriggered: timestamp("lastTriggered"),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  triggerCount: integer("triggerCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GNNAlertSubscription = typeof gnnAlertSubscriptions.$inferSelect;
export type InsertGNNAlertSubscription = typeof gnnAlertSubscriptions.$inferInsert;

// GNN Alert Triggers (History of triggered alerts)
export const gnnAlertTriggers = pgTable("gnn_alert_triggers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  subscriptionId: integer("subscriptionId").notNull(), // FK to gnn_alert_subscriptions
  propertyId: integer("propertyId"), // FK to properties table (if property-specific)
  // Alert details
  alertType: varchar("alertType", { length: 50 }).notNull(),
  alertTitle: varchar("alertTitle", { length: 255 }).notNull(),
  alertMessage: text("alertMessage").notNull(),
  // GNN metrics that triggered the alert
  investmentScore: integer("investmentScore"),
  momentumScore: integer("momentumScore"),
  centralityScore: varchar("centralityScore", { length: 20 }),
  predictedPriceChange: varchar("predictedPriceChange", { length: 20 }),
  confidenceScore: varchar("confidenceScore", { length: 20 }),
  // Additional GNN metrics (real/float)
  undervaluedPercent: real("undervaluedPercent"),
  trendStrength: real("trendStrength"),
  growthPotential: real("growthPotential"),
  confidence: real("confidence"),
  // Alert content
  title: varchar("title", { length: 255 }),
  message: text("message"),
  reasoning: text("reasoning"), // JSON
  // Delivery status
  emailSent: integer("emailSent").default(0),
  smsSent: integer("smsSent").default(0),
  inAppSent: integer("inAppSent").default(1),
  notificationsSent: text("notificationsSent"), // JSON: [{channel, status, sentAt}]
  // User interaction
  viewed: integer("viewed").default(0),
  userViewed: integer("userViewed").default(0),
  viewedAt: timestamp("viewedAt"),
  clicked: integer("clicked").default(0),
  clickedAt: timestamp("clickedAt"),
  userDismissed: integer("userDismissed").default(0),
  dismissedAt: timestamp("dismissedAt"),
  userSavedProperty: integer("userSavedProperty").default(0),
  userViewedProperty: integer("userViewedProperty").default(0),
  userContactedAgent: integer("userContactedAgent").default(0),
  // Timestamps
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GNNAlertTrigger = typeof gnnAlertTriggers.$inferSelect;
export type InsertGNNAlertTrigger = typeof gnnAlertTriggers.$inferInsert;
