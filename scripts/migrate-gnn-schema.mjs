/**
 * GNN Schema Migration Script
 * ----------------------------
 * Safely creates GNN-related tables without affecting existing schema.
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log('🚀 Starting GNN schema migration...\n');

const tables = [
  {
    name: 'gnn_property_nodes',
    sql: `
      CREATE TABLE IF NOT EXISTS gnn_property_nodes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        propertyId INT NOT NULL,
        price INT NOT NULL,
        bedrooms INT NOT NULL,
        bathrooms INT NOT NULL,
        sqft INT NOT NULL,
        latitude VARCHAR(20) NOT NULL,
        longitude VARCHAR(20) NOT NULL,
        yearBuilt INT,
        lotSize INT,
        propertyType VARCHAR(50),
        listingType VARCHAR(50),
        pricePerSqft INT,
        ageOfProperty INT,
        nodeEmbedding TEXT,
        centralityScore VARCHAR(20),
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_propertyId (propertyId),
        INDEX idx_location (latitude, longitude)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'gnn_property_edges',
    sql: `
      CREATE TABLE IF NOT EXISTS gnn_property_edges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sourceNodeId INT NOT NULL,
        targetNodeId INT NOT NULL,
        distance VARCHAR(20) NOT NULL,
        edgeType ENUM('spatial', 'similarity', 'temporal') NOT NULL,
        weight VARCHAR(20) DEFAULT '1.0',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_source (sourceNodeId),
        INDEX idx_target (targetNodeId),
        INDEX idx_edge_type (edgeType)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'gnn_valuation_predictions',
    sql: `
      CREATE TABLE IF NOT EXISTS gnn_valuation_predictions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        propertyId INT NOT NULL,
        estimatedValue INT NOT NULL,
        confidenceScore VARCHAR(20) NOT NULL,
        valueRangeMin INT NOT NULL,
        valueRangeMax INT NOT NULL,
        neighborhoodEffect INT,
        locationPremium VARCHAR(20),
        accessibilityScore INT,
        modelVersion VARCHAR(50) NOT NULL,
        predictionTimestamp TIMESTAMP NOT NULL,
        comparableProperties TEXT,
        actualValue INT,
        predictionError INT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_propertyId (propertyId),
        INDEX idx_modelVersion (modelVersion),
        INDEX idx_predictionTimestamp (predictionTimestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'gnn_market_trend_predictions',
    sql: `
      CREATE TABLE IF NOT EXISTS gnn_market_trend_predictions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        propertyId INT NOT NULL,
        trendDirection ENUM('up', 'down', 'stable') NOT NULL,
        trendMagnitude VARCHAR(20) NOT NULL,
        trendScore VARCHAR(20) NOT NULL,
        forecastMonths INT NOT NULL,
        investmentScore VARCHAR(20),
        centralityScore VARCHAR(20),
        undervaluationScore VARCHAR(20),
        recommendation ENUM('strong_buy', 'buy', 'hold', 'consider', 'pass'),
        isHotspot INT DEFAULT 0,
        hotspotRank INT,
        modelVersion VARCHAR(50) NOT NULL,
        predictionTimestamp TIMESTAMP NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_propertyId (propertyId),
        INDEX idx_isHotspot (isHotspot),
        INDEX idx_recommendation (recommendation)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'gnn_neighborhood_intelligence',
    sql: `
      CREATE TABLE IF NOT EXISTS gnn_neighborhood_intelligence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        latitude VARCHAR(20) NOT NULL,
        longitude VARCHAR(20) NOT NULL,
        city VARCHAR(100) NOT NULL,
        neighborhood VARCHAR(255),
        intersectionDensity VARCHAR(20),
        streetConnectivity VARCHAR(20),
        pedestrianFriendliness VARCHAR(20),
        networkDistanceToAmenities VARCHAR(20),
        walkabilityScore VARCHAR(20),
        numNearbyStops INT,
        avgFrequency VARCHAR(20),
        reachableArea VARCHAR(20),
        transitScore VARCHAR(20),
        nearestStops TEXT,
        locationScore VARCHAR(20),
        recommendation TEXT,
        analysisTimestamp TIMESTAMP NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_location (latitude, longitude),
        INDEX idx_city (city)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'gnn_model_training_runs',
    sql: `
      CREATE TABLE IF NOT EXISTS gnn_model_training_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        modelType ENUM('valuation', 'market_trends', 'neighborhood') NOT NULL,
        modelVersion VARCHAR(50) NOT NULL,
        architecture VARCHAR(100),
        hyperparameters TEXT,
        numTrainingExamples INT,
        numValidationExamples INT,
        numTestExamples INT,
        trainLoss VARCHAR(20),
        validationLoss VARCHAR(20),
        testLoss VARCHAR(20),
        mae VARCHAR(20),
        rmse VARCHAR(20),
        r2Score VARCHAR(20),
        trainingDuration INT,
        device VARCHAR(20),
        status ENUM('running', 'completed', 'failed') NOT NULL,
        errorMessage TEXT,
        startedAt TIMESTAMP NOT NULL,
        completedAt TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_modelType (modelType),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'gnn_model_performance_metrics',
    sql: `
      CREATE TABLE IF NOT EXISTS gnn_model_performance_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        modelType ENUM('gnn', 'traditional_ml') NOT NULL,
        modelVersion VARCHAR(50) NOT NULL,
        evaluationStartDate TIMESTAMP NOT NULL,
        evaluationEndDate TIMESTAMP NOT NULL,
        numPredictions INT,
        avgError VARCHAR(20),
        medianError VARCHAR(20),
        avgConfidence VARCHAR(20),
        accuracy_0_50k VARCHAR(20),
        accuracy_50k_100k VARCHAR(20),
        accuracy_100k_200k VARCHAR(20),
        accuracy_200k_plus VARCHAR(20),
        userRating VARCHAR(20),
        numRatings INT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_modelType (modelType),
        INDEX idx_evaluationPeriod (evaluationStartDate, evaluationEndDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
];

for (const table of tables) {
  try {
    console.log(`Creating table: ${table.name}...`);
    await connection.query(table.sql);
    console.log(`✅ ${table.name} created successfully\n`);
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log(`⚠️  ${table.name} already exists, skipping\n`);
    } else {
      console.error(`❌ Error creating ${table.name}:`, error.message);
      throw error;
    }
  }
}

await connection.end();

console.log('✅ GNN schema migration completed successfully!');
