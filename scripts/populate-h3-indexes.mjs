/**
 * Populate H3 Indexes for All Properties
 * Production script to pre-compute H3 hexagonal indexes
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as h3 from 'h3-js';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

/**
 * Convert lat/lng to H3 index
 */
function latLngToH3(lat, lng, resolution = 9) {
  try {
    return h3.latLngToCell(lat, lng, resolution);
  } catch (error) {
    console.error(`Failed to convert (${lat}, ${lng}) to H3:`, error);
    return null;
  }
}

/**
 * Get H3 cell boundary as GeoJSON
 */
function getH3Boundary(h3Index) {
  try {
    const boundary = h3.cellToBoundary(h3Index);
    return JSON.stringify({
      type: 'Polygon',
      coordinates: [boundary.map(([lat, lng]) => [lng, lat])],
    });
  } catch (error) {
    console.error(`Failed to get boundary for ${h3Index}:`, error);
    return null;
  }
}

/**
 * Populate H3 indexes for all properties
 */
async function populatePropertyH3Indexes() {
  console.log('[H3] Starting H3 index population for properties...');

  try {
    // Get all properties without H3 index
    const [properties] = await connection.execute(
      `SELECT id, latitude, longitude FROM properties WHERE h3Index IS NULL OR h3Index = ''`
    );

    console.log(`[H3] Found ${properties.length} properties to process`);

    let successCount = 0;
    let errorCount = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      const updates = batch.map(async (property) => {
        try {
          const lat = parseFloat(property.latitude);
          const lng = parseFloat(property.longitude);

          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`[H3] Invalid coordinates for property ${property.id}`);
            errorCount++;
            return;
          }

          const h3Index = latLngToH3(lat, lng, 9);
          if (!h3Index) {
            errorCount++;
            return;
          }

          await connection.execute(
            `UPDATE properties SET h3Index = ?, h3Resolution = 9 WHERE id = ?`,
            [h3Index, property.id]
          );

          successCount++;
        } catch (error) {
          console.error(`[H3] Error processing property ${property.id}:`, error);
          errorCount++;
        }
      });

      await Promise.all(updates);

      console.log(`[H3] Processed ${Math.min(i + batchSize, properties.length)}/${properties.length} properties`);
    }

    console.log(`[H3] Property H3 indexing complete: ${successCount} success, ${errorCount} errors`);
  } catch (error) {
    console.error('[H3] Failed to populate property H3 indexes:', error);
    throw error;
  }
}

/**
 * Populate H3 cell metadata
 */
async function populateH3CellMetadata() {
  console.log('[H3] Starting H3 cell metadata population...');

  try {
    // Get all unique H3 indexes from properties
    const [h3Indexes] = await connection.execute(
      `SELECT DISTINCT h3Index FROM properties WHERE h3Index IS NOT NULL AND h3Index != ''`
    );

    console.log(`[H3] Found ${h3Indexes.length} unique H3 cells`);

    let successCount = 0;
    let errorCount = 0;

    for (const row of h3Indexes) {
      try {
        const h3Index = row.h3Index;
        const center = h3.cellToLatLng(h3Index);
        const boundary = getH3Boundary(h3Index);
        const resolution = h3.getResolution(h3Index);

        // Count properties in this cell
        const [countResult] = await connection.execute(
          `SELECT COUNT(*) as count FROM properties WHERE h3Index = ?`,
          [h3Index]
        );
        const propertyCount = countResult[0].count;

        // Insert or update H3 cell metadata
        await connection.execute(
          `INSERT INTO h3_cells (h3Index, resolution, centerLat, centerLng, boundaryGeoJSON, propertyCount)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             centerLat = VALUES(centerLat),
             centerLng = VALUES(centerLng),
             boundaryGeoJSON = VALUES(boundaryGeoJSON),
             propertyCount = VALUES(propertyCount),
             lastUpdated = CURRENT_TIMESTAMP`,
          [h3Index, resolution, center[0], center[1], boundary, propertyCount]
        );

        successCount++;
      } catch (error) {
        console.error(`[H3] Error processing H3 cell ${row.h3Index}:`, error);
        errorCount++;
      }
    }

    console.log(`[H3] H3 cell metadata complete: ${successCount} success, ${errorCount} errors`);
  } catch (error) {
    console.error('[H3] Failed to populate H3 cell metadata:', error);
    throw error;
  }
}

/**
 * Calculate and populate neighborhood statistics
 */
async function populateNeighborhoodStats() {
  console.log('[H3] Starting neighborhood statistics calculation...');

  try {
    // Calculate stats for each H3 cell
    await connection.execute(`
      INSERT INTO neighborhood_stats (
        h3Index,
        propertyCount,
        averagePrice,
        medianPrice,
        minPrice,
        maxPrice,
        pricePerSqft,
        avgBedrooms,
        avgBathrooms,
        avgSquareFeet
      )
      SELECT
        h3Index,
        COUNT(*) as propertyCount,
        AVG(price) as averagePrice,
        (SELECT price FROM properties p2 
         WHERE p2.h3Index = p1.h3Index 
         ORDER BY price 
         LIMIT 1 OFFSET (COUNT(*) / 2)) as medianPrice,
        MIN(price) as minPrice,
        MAX(price) as maxPrice,
        AVG(price / NULLIF(squareFeet, 0)) as pricePerSqft,
        AVG(bedrooms) as avgBedrooms,
        AVG(bathrooms) as avgBathrooms,
        AVG(squareFeet) as avgSquareFeet
      FROM properties p1
      WHERE h3Index IS NOT NULL AND h3Index != ''
        AND status = 'active'
      GROUP BY h3Index
      ON DUPLICATE KEY UPDATE
        propertyCount = VALUES(propertyCount),
        averagePrice = VALUES(averagePrice),
        medianPrice = VALUES(medianPrice),
        minPrice = VALUES(minPrice),
        maxPrice = VALUES(maxPrice),
        pricePerSqft = VALUES(pricePerSqft),
        avgBedrooms = VALUES(avgBedrooms),
        avgBathrooms = VALUES(avgBathrooms),
        avgSquareFeet = VALUES(avgSquareFeet),
        lastUpdated = CURRENT_TIMESTAMP
    `);

    const [result] = await connection.execute(
      `SELECT COUNT(*) as count FROM neighborhood_stats`
    );

    console.log(`[H3] Neighborhood statistics complete: ${result[0].count} neighborhoods`);
  } catch (error) {
    console.error('[H3] Failed to populate neighborhood stats:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('H3 Index Population Script');
  console.log('='.repeat(60));

  try {
    // Step 1: Populate H3 indexes for properties
    await populatePropertyH3Indexes();

    // Step 2: Populate H3 cell metadata
    await populateH3CellMetadata();

    // Step 3: Calculate neighborhood statistics
    await populateNeighborhoodStats();

    console.log('\n✅ H3 index population complete!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ H3 index population failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the script
main();
