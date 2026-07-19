/**
 * PostGIS Sync Service
 * 
 * Real-time synchronization between TiDB (source of truth) and PostGIS (spatial queries)
 * 
 * Architecture:
 * - TiDB: Transactional data (properties table)
 * - PostGIS: Spatial data (properties_spatial table)
 * - Sync: Triggered on property create/update/delete
 */

import { queryPostGIS, getPostGISClient } from './postgis';

export interface PropertySyncData {
  id: number;
  latitude: string;
  longitude: string;
  title?: string | null;
  price: string;
  propertyType?: string | null;
  listingType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync a single property to PostGIS
 */
export async function syncPropertyToPostGIS(
  property: PropertySyncData
): Promise<{ success: boolean; error?: string }> {
  try {
    const lat = parseFloat(property.latitude);
    const lng = parseFloat(property.longitude);
    const price = parseInt(property.price);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        success: false,
        error: `Invalid coordinates: lat=${property.latitude}, lng=${property.longitude}`,
      };
    }

    await queryPostGIS(`
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

    console.log(`[PostGIS Sync] Property ${property.id} synced successfully`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PostGIS Sync] Failed to sync property ${property.id}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete a property from PostGIS
 */
export async function deletePropertyFromPostGIS(
  propertyId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await queryPostGIS(`
      DELETE FROM spatial.properties_spatial
      WHERE id = $1
    `, [propertyId]);

    console.log(`[PostGIS Sync] Property ${propertyId} deleted successfully`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PostGIS Sync] Failed to delete property ${propertyId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Batch sync multiple properties to PostGIS
 */
export async function batchSyncPropertiesToPostGIS(
  properties: PropertySyncData[]
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
}> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: number; error: string }> = [];

  const client = await getPostGISClient();

  try {
    await client.query('BEGIN');

    for (const property of properties) {
      try {
        const lat = parseFloat(property.latitude);
        const lng = parseFloat(property.longitude);
        const price = parseInt(property.price);

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error(`Invalid coordinates: lat=${property.latitude}, lng=${property.longitude}`);
        }

        await client.query(`
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
          lng,
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
      }
    }

    await client.query('COMMIT');
    console.log(`[PostGIS Sync] Batch sync completed: ${success} success, ${failed} failed`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PostGIS Sync] Batch sync transaction failed:', error);
    throw error;
  } finally {
    client.release();
  }

  return { success, failed, errors };
}

/**
 * Refresh materialized views
 */
export async function refreshMaterializedViews(): Promise<void> {
  try {
    await queryPostGIS('SELECT spatial.refresh_property_density()');
    console.log('[PostGIS Sync] Materialized views refreshed');
  } catch (error) {
    console.error('[PostGIS Sync] Failed to refresh materialized views:', error);
    throw error;
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  totalProperties: number;
  lastSyncedAt?: Date;
  oldestSyncedAt?: Date;
  outOfSyncCount: number;
}> {
  try {
    const result = await queryPostGIS<{
      total: string;
      lastSynced: Date | null;
      oldestSynced: Date | null;
      outOfSync: string;
    }>(`
      SELECT 
        COUNT(*) as total,
        MAX(synced_at) as "lastSynced",
        MIN(synced_at) as "oldestSynced",
        COUNT(*) FILTER (WHERE synced_at < updated_at) as "outOfSync"
      FROM spatial.properties_spatial
    `);

    const row = result.rows[0];

    return {
      totalProperties: parseInt(row.total),
      lastSyncedAt: row.lastSynced || undefined,
      oldestSyncedAt: row.oldestSynced || undefined,
      outOfSyncCount: parseInt(row.outOfSync),
    };
  } catch (error) {
    console.error('[PostGIS Sync] Failed to get sync stats:', error);
    throw error;
  }
}

/**
 * Check if PostGIS is available
 */
export async function isPostGISAvailable(): Promise<boolean> {
  try {
    await queryPostGIS('SELECT 1');
    return true;
  } catch (error) {
    console.error('[PostGIS Sync] PostGIS not available:', error);
    return false;
  }
}
