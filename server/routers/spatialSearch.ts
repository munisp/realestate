import { z } from 'zod';
import { router, publicProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { properties } from '../../drizzle/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Spatial Search Router
 * 
 * Provides advanced spatial search capabilities using database queries
 * Complements client-side Turf.js operations with server-side filtering
 * 
 * Features:
 * - Radius search (circle)
 * - Bounding box search (rectangle)
 * - Polygon search (custom shapes)
 * - Nearest properties search
 * - Properties along route
 */

export const spatialSearchRouter = router({
  /**
   * Find properties within radius
   */
  withinRadius: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const { lat, lng, radiusKm, limit } = input;

      // Calculate bounding box for initial filter (faster than distance calculation)
      const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111km
      const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

      const results = await db
        .select()
        .from(properties)
        .where(
          and(
            gte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, lat - latDelta),
            lte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, lat + latDelta),
            gte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, lng - lngDelta),
            lte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, lng + lngDelta)
          )
        )
        .limit(limit * 2); // Get more than needed, filter by exact distance

      // Calculate exact distance using Haversine formula
      const withDistances = results.map(p => {
        const pLat = parseFloat(p.latitude);
        const pLng = parseFloat(p.longitude);
        const distance = haversineDistance(lat, lng, pLat, pLng);

        return {
          ...p,
          distance,
        };
      });

      // Filter by exact radius and sort by distance
      return withDistances
        .filter(p => p.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    }),

  /**
   * Find properties within bounding box
   */
  withinBounds: publicProcedure
    .input(
      z.object({
        north: z.number(),
        south: z.number(),
        east: z.number(),
        west: z.number(),
        limit: z.number().optional().default(1000),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const { north, south, east, west, limit } = input;

      const results = await db
        .select()
        .from(properties)
        .where(
          and(
            gte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, south),
            lte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, north),
            gte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, west),
            lte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, east)
          )
        )
        .limit(limit);

      return results;
    }),

  /**
   * Find nearest properties to a point
   */
  nearest: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        count: z.number().optional().default(10),
        maxRadiusKm: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const { lat, lng, count, maxRadiusKm } = input;

      // Get properties within max radius
      const latDelta = maxRadiusKm / 111;
      const lngDelta = maxRadiusKm / (111 * Math.cos(lat * Math.PI / 180));

      const results = await db
        .select()
        .from(properties)
        .where(
          and(
            gte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, lat - latDelta),
            lte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, lat + latDelta),
            gte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, lng - lngDelta),
            lte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, lng + lngDelta)
          )
        )
        .limit(count * 10);

      // Calculate distances
      const withDistances = results.map(p => {
        const pLat = parseFloat(p.latitude);
        const pLng = parseFloat(p.longitude);
        const distance = haversineDistance(lat, lng, pLat, pLng);

        return {
          ...p,
          distance,
        };
      });

      // Sort by distance and return top N
      return withDistances
        .sort((a, b) => a.distance - b.distance)
        .slice(0, count);
    }),

  /**
   * Search properties by polygon
   * Note: This is a simplified implementation using bounding box
   * For true polygon search, use PostGIS or client-side Turf.js filtering
   */
  withinPolygon: publicProcedure
    .input(
      z.object({
        polygon: z.array(z.array(z.number())), // [[lng, lat], ...]
        limit: z.number().optional().default(1000),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const { polygon, limit } = input;

      // Calculate bounding box from polygon
      const lngs = polygon.map(p => p[0]);
      const lats = polygon.map(p => p[1]);

      const west = Math.min(...lngs);
      const east = Math.max(...lngs);
      const south = Math.min(...lats);
      const north = Math.max(...lats);

      // Get properties within bounding box
      // Client should filter by exact polygon using Turf.js
      const results = await db
        .select()
        .from(properties)
        .where(
          and(
            gte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, south),
            lte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, north),
            gte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, west),
            lte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, east)
          )
        )
        .limit(limit);

      return results;
    }),

  /**
   * Get properties for spatial analysis
   * Returns lightweight data optimized for client-side processing
   */
  getForAnalysis: publicProcedure
    .input(
      z.object({
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }),
        limit: z.number().optional().default(10000),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const { bounds, limit } = input;

      const results = await db
        .select({
          id: properties.id,
          latitude: properties.latitude,
          longitude: properties.longitude,
          price: properties.price,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
        })
        .from(properties)
        .where(
          and(
            gte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, bounds.south),
            lte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, bounds.north),
            gte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, bounds.west),
            lte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, bounds.east),
            eq(properties.status, 'active')
          )
        )
        .limit(limit);

      return results;
    }),
});

/**
 * Haversine distance formula
 * Calculates distance between two points on Earth's surface
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
