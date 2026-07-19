/**
 * Data Migration Script: TiDB → PostGIS
 * 
 * Migrates property spatial data from TiDB (MySQL) to PostGIS (PostgreSQL)
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-to-postgis.ts [--batch-size=1000] [--dry-run]
 */

import { Pool as PgPool } from 'pg';
import { getDb } from '../server/db';
import { properties } from '../drizzle/schema';

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000');
const DRY_RUN = process.argv.includes('--dry-run');

// PostGIS connection
const pgPool = new PgPool({
  host: process.env.POSTGIS_HOST || 'localhost',
  port: parseInt(process.env.POSTGIS_PORT || '5432'),
  database: process.env.POSTGIS_DATABASE || 'realestate_spatial',
  user: process.env.POSTGIS_USER || 'postgres',
  password: process.env.POSTGIS_PASSWORD || 'postgis_dev_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

interface PropertyRow {
  id: number;
  latitude: string;
  longitude: string;
  title: string | null;
  price: string;
  propertyType: string | null;
  listingType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validate coordinates
 */
function isValidCoordinate(lat: string, lng: string): boolean {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    return false;
  }
  
  // Valid latitude: -90 to 90
  // Valid longitude: -180 to 180
  return latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}

/**
 * Migrate a batch of properties
 */
async function migrateBatch(batch: PropertyRow[]): Promise<{
  success: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
}> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: number; error: string }> = [];

  for (const property of batch) {
    try {
      // Validate coordinates
      if (!isValidCoordinate(property.latitude, property.longitude)) {
        throw new Error(`Invalid coordinates: lat=${property.latitude}, lng=${property.longitude}`);
      }

      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      const price = parseInt(property.price);

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would insert property ${property.id}: ${property.title} at (${lat}, ${lng})`);
        success++;
        continue;
      }

      // Insert into PostGIS
      await pgPool.query(`
        INSERT INTO spatial.properties_spatial (
          id, geom, title, price, property_type, listing_type,
          bedrooms, bathrooms, square_feet, city, state, country, status,
          created_at, updated_at, synced_at
        ) VALUES (
          $1, 
          ST_SetSRID(ST_MakePoint($2, $3), 4326),
          $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          geom = EXCLUDED.geom,
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          property_type = EXCLUDED.property_type,
          listing_type = EXCLUDED.listing_type,
          bedrooms = EXCLUDED.bedrooms,
          bathrooms = EXCLUDED.bathrooms,
          square_feet = EXCLUDED.square_feet,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          synced_at = CURRENT_TIMESTAMP
      `, [
        property.id,
        lng, // PostGIS uses (longitude, latitude) order
        lat,
        property.title,
        price,
        property.propertyType,
        property.listingType,
        property.bedrooms,
        property.bathrooms,
        property.squareFeet,
        property.city,
        property.state,
        property.country,
        property.status,
        property.createdAt,
        property.updatedAt,
      ]);

      success++;
    } catch (error) {
      failed++;
      errors.push({
        id: property.id,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed to migrate property ${property.id}:`, error);
    }
  }

  return { success, failed, errors };
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('PostGIS Migration Script');
  console.log('='.repeat(60));
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // Test PostGIS connection
    console.log('Testing PostGIS connection...');
    const pgClient = await pgPool.connect();
    const versionResult = await pgClient.query('SELECT PostGIS_Version()');
    console.log(`✓ PostGIS version: ${versionResult.rows[0].postgis_version}`);
    pgClient.release();

    // Get TiDB connection
    console.log('Connecting to TiDB...');
    const db = await getDb();
    if (!db) {
      throw new Error('Failed to connect to TiDB');
    }
    console.log('✓ TiDB connected');
    console.log('');

    // Count total properties
    console.log('Counting properties...');
    const allProperties = await db.select().from(properties);
    const totalCount = allProperties.length;
    console.log(`Total properties to migrate: ${totalCount}`);
    console.log('');

    if (totalCount === 0) {
      console.log('No properties to migrate');
      return;
    }

    // Migrate in batches
    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: Array<{ id: number; error: string }> = [];

    const batchCount = Math.ceil(totalCount / BATCH_SIZE);
    console.log(`Processing ${batchCount} batches...`);
    console.log('');

    for (let i = 0; i < batchCount; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, totalCount);
      const batch = allProperties.slice(start, end);

      console.log(`Batch ${i + 1}/${batchCount}: Processing properties ${start + 1}-${end}...`);

      const result = await migrateBatch(batch);
      totalSuccess += result.success;
      totalFailed += result.failed;
      allErrors.push(...result.errors);

      console.log(`  ✓ Success: ${result.success}, ✗ Failed: ${result.failed}`);

      // Progress bar
      const progress = ((end / totalCount) * 100).toFixed(1);
      const barLength = 40;
      const filledLength = Math.round((end / totalCount) * barLength);
      const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      console.log(`  [${bar}] ${progress}%`);
      console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total properties: ${totalCount}`);
    console.log(`✓ Successfully migrated: ${totalSuccess}`);
    console.log(`✗ Failed: ${totalFailed}`);
    console.log(`Success rate: ${((totalSuccess / totalCount) * 100).toFixed(2)}%`);
    console.log('');

    if (allErrors.length > 0) {
      console.log('Errors:');
      allErrors.slice(0, 10).forEach(err => {
        console.log(`  Property ${err.id}: ${err.error}`);
      });
      if (allErrors.length > 10) {
        console.log(`  ... and ${allErrors.length - 10} more errors`);
      }
      console.log('');
    }

    if (!DRY_RUN) {
      // Refresh materialized views
      console.log('Refreshing materialized views...');
      await pgPool.query('SELECT spatial.refresh_property_density()');
      console.log('✓ Materialized views refreshed');
      console.log('');

      // Analyze table for query optimization
      console.log('Analyzing table for query optimization...');
      await pgPool.query('ANALYZE spatial.properties_spatial');
      console.log('✓ Table analyzed');
      console.log('');
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// Run migration
migrate().catch(console.error);
