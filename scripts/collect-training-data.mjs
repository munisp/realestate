#!/usr/bin/env node

/**
 * Training Data Collection Script
 * 
 * Collects historical property sales data for training ML models
 * Exports data in formats suitable for:
 * - GNN training (neighborhood graphs)
 * - Ensemble model training (XGBoost, LightGBM, CatBoost)
 * - Bias correction calibration
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { eq, and, gte, sql } from 'drizzle-orm';
import { properties } from '../drizzle/schema.ts';
import fs from 'fs/promises';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

// Create data directories
const DATA_DIR = path.join(process.cwd(), 'data', 'training');
await fs.mkdir(DATA_DIR, { recursive: true });

console.log('🚀 Starting training data collection...\n');

// ============================================================================
// 1. Historical Sales Data
// ============================================================================
console.log('📊 Collecting historical sales data...');

const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

const historicalSales = await db
  .select({
    id: properties.id,
    actualPrice: properties.price,
    squareFeet: properties.squareFeet,
    bedrooms: properties.bedrooms,
    bathrooms: properties.bathrooms,
    yearBuilt: properties.yearBuilt,
    latitude: properties.latitude,
    longitude: properties.longitude,
    zipCode: properties.zipCode,
    city: properties.city,
    propertyType: properties.propertyType,
    soldDate: properties.updatedAt,
  })
  .from(properties)
  .where(
    and(
      eq(properties.status, 'sold'),
      gte(properties.updatedAt, twoYearsAgo)
    )
  );

console.log(`✅ Found ${historicalSales.length} sold properties in the last 2 years`);

// Convert to CSV format
const csvHeaders = [
  'id',
  'actual_price',
  'square_feet',
  'bedrooms',
  'bathrooms',
  'year_built',
  'latitude',
  'longitude',
  'zip_code',
  'city',
  'property_type',
  'sold_date'
].join(',');

const csvRows = historicalSales.map(row => [
  row.id,
  row.actualPrice || '',
  row.squareFeet || '',
  row.bedrooms || '',
  row.bathrooms || '',
  row.yearBuilt || '',
  row.latitude || '',
  row.longitude || '',
  row.zipCode || '',
  row.city || '',
  row.propertyType || '',
  row.soldDate ? row.soldDate.toISOString() : ''
].join(','));

const csvContent = [csvHeaders, ...csvRows].join('\n');
await fs.writeFile(path.join(DATA_DIR, 'historical_sales.csv'), csvContent);
console.log(`💾 Saved to data/training/historical_sales.csv\n`);

// ============================================================================
// 2. Neighborhood Graph Data (for GNN training)
// ============================================================================
console.log('🗺️  Building neighborhood graph data...');

// Find k-nearest neighbors for each property (within 2 miles)
const neighborhoodGraph = [];

for (const property of historicalSales) {
  if (!property.latitude || !property.longitude) continue;

  // Use Haversine formula to find nearby properties
  const neighbors = await db.execute(sql`
    SELECT 
      p2.id as neighbor_id,
      p2.price as neighbor_price,
      p2.square_feet as neighbor_sqft,
      p2.bedrooms as neighbor_beds,
      p2.bathrooms as neighbor_baths,
      (
        6371 * acos(
          cos(radians(CAST(${property.latitude} AS DECIMAL(10,8)))) * 
          cos(radians(CAST(p2.latitude AS DECIMAL(10,8)))) * 
          cos(radians(CAST(p2.longitude AS DECIMAL(11,8))) - radians(CAST(${property.longitude} AS DECIMAL(11,8)))) + 
          sin(radians(CAST(${property.latitude} AS DECIMAL(10,8)))) * 
          sin(radians(CAST(p2.latitude AS DECIMAL(10,8))))
        ) * 0.621371
      ) as distance_miles
    FROM properties p2
    WHERE p2.id != ${property.id}
      AND p2.status = 'sold'
      AND p2.latitude IS NOT NULL
      AND p2.longitude IS NOT NULL
    HAVING distance_miles < 2.0
    ORDER BY distance_miles
    LIMIT 10
  `);

  if (neighbors.rows && neighbors.rows.length > 0) {
    for (const neighbor of neighbors.rows) {
      neighborhoodGraph.push({
        property_id: property.id,
        neighbor_id: neighbor.neighbor_id,
        distance_miles: neighbor.distance_miles,
        neighbor_price: neighbor.neighbor_price,
        neighbor_sqft: neighbor.neighbor_sqft,
        neighbor_beds: neighbor.neighbor_beds,
        neighbor_baths: neighbor.neighbor_baths
      });
    }
  }
}

console.log(`✅ Built graph with ${neighborhoodGraph.length} edges`);

// Save neighborhood graph
const graphCsvHeaders = [
  'property_id',
  'neighbor_id',
  'distance_miles',
  'neighbor_price',
  'neighbor_sqft',
  'neighbor_beds',
  'neighbor_baths'
].join(',');

const graphCsvRows = neighborhoodGraph.map(edge => [
  edge.property_id,
  edge.neighbor_id,
  edge.distance_miles,
  edge.neighbor_price || '',
  edge.neighbor_sqft || '',
  edge.neighbor_beds || '',
  edge.neighbor_baths || ''
].join(','));

const graphCsvContent = [graphCsvHeaders, ...graphCsvRows].join('\n');
await fs.writeFile(path.join(DATA_DIR, 'neighborhood_graph.csv'), graphCsvContent);
console.log(`💾 Saved to data/training/neighborhood_graph.csv\n`);

// ============================================================================
// 3. Feature Engineering Data
// ============================================================================
console.log('🔧 Generating engineered features...');

const engineeredFeatures = historicalSales.map(property => {
  const age = property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : null;
  const pricePerSqft = property.actualPrice && property.squareFeet 
    ? property.actualPrice / property.squareFeet 
    : null;
  
  return {
    property_id: property.id,
    age: age,
    price_per_sqft: pricePerSqft,
    bed_bath_ratio: property.bedrooms && property.bathrooms 
      ? property.bedrooms / property.bathrooms 
      : null,
    total_rooms: (property.bedrooms || 0) + (property.bathrooms || 0),
    log_price: property.actualPrice ? Math.log(property.actualPrice) : null,
    log_sqft: property.squareFeet ? Math.log(property.squareFeet) : null,
  };
});

const featuresCsvHeaders = [
  'property_id',
  'age',
  'price_per_sqft',
  'bed_bath_ratio',
  'total_rooms',
  'log_price',
  'log_sqft'
].join(',');

const featuresCsvRows = engineeredFeatures.map(row => [
  row.property_id,
  row.age || '',
  row.price_per_sqft || '',
  row.bed_bath_ratio || '',
  row.total_rooms || '',
  row.log_price || '',
  row.log_sqft || ''
].join(','));

const featuresCsvContent = [featuresCsvHeaders, ...featuresCsvRows].join('\n');
await fs.writeFile(path.join(DATA_DIR, 'engineered_features.csv'), featuresCsvContent);
console.log(`💾 Saved to data/training/engineered_features.csv\n`);

// ============================================================================
// 4. Train/Test Split
// ============================================================================
console.log('✂️  Creating train/test split (80/20)...');

// Shuffle and split
const shuffled = [...historicalSales].sort(() => Math.random() - 0.5);
const splitIndex = Math.floor(shuffled.length * 0.8);
const trainSet = shuffled.slice(0, splitIndex);
const testSet = shuffled.slice(splitIndex);

// Save train set
const trainCsvContent = [csvHeaders, ...trainSet.map(row => [
  row.id,
  row.actualPrice || '',
  row.squareFeet || '',
  row.bedrooms || '',
  row.bathrooms || '',
  row.yearBuilt || '',
  row.latitude || '',
  row.longitude || '',
  row.zipCode || '',
  row.city || '',
  row.propertyType || '',
  row.soldDate ? row.soldDate.toISOString() : ''
].join(','))].join('\n');

await fs.writeFile(path.join(DATA_DIR, 'train.csv'), trainCsvContent);

// Save test set
const testCsvContent = [csvHeaders, ...testSet.map(row => [
  row.id,
  row.actualPrice || '',
  row.squareFeet || '',
  row.bedrooms || '',
  row.bathrooms || '',
  row.yearBuilt || '',
  row.latitude || '',
  row.longitude || '',
  row.zipCode || '',
  row.city || '',
  row.propertyType || '',
  row.soldDate ? row.soldDate.toISOString() : ''
].join(','))].join('\n');

await fs.writeFile(path.join(DATA_DIR, 'test.csv'), testCsvContent);

console.log(`✅ Train set: ${trainSet.length} properties`);
console.log(`✅ Test set: ${testSet.length} properties`);
console.log(`💾 Saved to data/training/train.csv and data/training/test.csv\n`);

// ============================================================================
// 5. Summary Statistics
// ============================================================================
console.log('📈 Generating summary statistics...');

const stats = {
  total_properties: historicalSales.length,
  train_size: trainSet.length,
  test_size: testSet.length,
  date_range: {
    start: twoYearsAgo.toISOString(),
    end: new Date().toISOString()
  },
  price_stats: {
    min: Math.min(...historicalSales.map(p => p.actualPrice || Infinity)),
    max: Math.max(...historicalSales.map(p => p.actualPrice || 0)),
    mean: historicalSales.reduce((sum, p) => sum + (p.actualPrice || 0), 0) / historicalSales.length,
  },
  sqft_stats: {
    min: Math.min(...historicalSales.map(p => p.squareFeet || Infinity)),
    max: Math.max(...historicalSales.map(p => p.squareFeet || 0)),
    mean: historicalSales.reduce((sum, p) => sum + (p.squareFeet || 0), 0) / historicalSales.length,
  },
  cities: [...new Set(historicalSales.map(p => p.city))],
  property_types: [...new Set(historicalSales.map(p => p.propertyType))],
  neighborhood_graph: {
    total_edges: neighborhoodGraph.length,
    avg_neighbors_per_property: neighborhoodGraph.length / historicalSales.length
  }
};

await fs.writeFile(
  path.join(DATA_DIR, 'summary_stats.json'),
  JSON.stringify(stats, null, 2)
);

console.log(`💾 Saved to data/training/summary_stats.json\n`);

// ============================================================================
// Summary
// ============================================================================
console.log('✅ Training data collection complete!\n');
console.log('📁 Generated files:');
console.log('   - historical_sales.csv (all sold properties)');
console.log('   - neighborhood_graph.csv (k-nearest neighbors)');
console.log('   - engineered_features.csv (derived features)');
console.log('   - train.csv (80% for training)');
console.log('   - test.csv (20% for evaluation)');
console.log('   - summary_stats.json (dataset statistics)\n');

console.log('🎯 Next steps:');
console.log('   1. Train GNN model using neighborhood_graph.csv');
console.log('   2. Train ensemble models (XGBoost, LightGBM, CatBoost) using train.csv');
console.log('   3. Evaluate on test.csv and calculate MAPE');
console.log('   4. Calibrate bias correction using fairness metrics');
console.log('   5. Deploy trained models to production\n');

process.exit(0);
