// @ts-nocheck
/**
 * Server-Side Clustering Router
 * 
 * Implements tile-based clustering for massive datasets (100K+ properties)
 * Uses H3 hexagonal indexing for efficient spatial aggregation
 * 
 * Benefits:
 * - Handles 100K+ properties efficiently
 * - Reduces client-side rendering overhead
 * - Enables tile-based caching
 * - Supports dynamic zoom levels
 */

import { z } from 'zod';
import { latLngToCell, cellToBoundary, gridDisk } from 'h3-js';
import { publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { properties } from '../../drizzle/schema';
import { sql, and, gte, lte } from 'drizzle-orm';
import { clusterCacheService } from '../services/clusterCacheService';

/**
 * Get H3 resolution based on zoom level
 * Higher zoom = higher resolution (smaller hexagons)
 */
function getH3ResolutionFromZoom(zoom: number): number {
  if (zoom >= 18) return 11; // Street level
  if (zoom >= 16) return 10; // Block level
  if (zoom >= 14) return 9;  // Neighborhood level
  if (zoom >= 12) return 8;  // District level
  if (zoom >= 10) return 7;  // City level
  if (zoom >= 8) return 6;   // Metro level
  if (zoom >= 6) return 5;   // State level
  if (zoom >= 4) return 4;   // Country level
  return 3;                   // Continental level
}

/**
 * Calculate cluster color based on property count
 */
function getClusterColor(count: number): string {
  if (count > 1000) return '#dc2626'; // Red
  if (count > 500) return '#ea580c';  // Orange
  if (count > 100) return '#f59e0b';  // Amber
  if (count > 50) return '#3b82f6';   // Blue
  return '#10b981';                    // Green
}

/**
 * Calculate average price for cluster
 */
function formatPrice(avgPrice: number): string {
  if (avgPrice >= 1_000_000_000) {
    return `₦${(avgPrice / 1_000_000_000).toFixed(1)}B`;
  }
  if (avgPrice >= 1_000_000) {
    return `₦${(avgPrice / 1_000_000).toFixed(1)}M`;
  }
  if (avgPrice >= 1_000) {
    return `₦${(avgPrice / 1_000).toFixed(0)}K`;
  }
  return `₦${avgPrice.toFixed(0)}`;
}

export const serverSideClusteringRouter = router({
  /**
   * Get clustered properties for a given viewport
   * 
   * Uses H3 hexagonal indexing to aggregate properties into clusters
   * Returns cluster centroids with property counts and average prices
   */
  getClusters: publicProcedure
    .input(
      z.object({
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }),
        zoom: z.number().min(1).max(22),
        minClusterSize: z.number().optional().default(2),
      })
    )
    .query(async ({ input }) => {
      const { bounds, zoom, minClusterSize } = input;
      const h3Resolution = getH3ResolutionFromZoom(zoom);

      // Try to get from cache first
      const cached = await clusterCacheService.getCachedClusters(bounds, zoom, h3Resolution);
      if (cached) {
        return cached;
      }

      const db = await getDb();
      if (!db) {
        return { clusters: [], properties: [] };
      }

      try {
        // Fetch properties within bounds
        const propertiesInBounds = await db
          .select({
            id: properties.id,
            title: properties.title,
            latitude: properties.latitude,
            longitude: properties.longitude,
            price: properties.price,
            bedrooms: properties.bedrooms,
            bathrooms: properties.bathrooms,
            propertyType: properties.propertyType,
          })
          .from(properties)
          .where(
            and(
              gte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, bounds.south),
              lte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, bounds.north),
              gte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, bounds.west),
              lte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, bounds.east)
            )
          )
          .limit(100000); // Safety limit

        // Group properties by H3 cell
        const cellMap = new Map<string, typeof propertiesInBounds>();

        propertiesInBounds.forEach((property) => {
          const lat = parseFloat(property.latitude as string);
          const lng = parseFloat(property.longitude as string);

          if (isNaN(lat) || isNaN(lng)) return;

          try {
            const h3Index = latLngToCell(lat, lng, h3Resolution);
            
            if (!cellMap.has(h3Index)) {
              cellMap.set(h3Index, []);
            }
            cellMap.get(h3Index)!.push(property);
          } catch (err) {
            console.error('H3 indexing error:', err);
          }
        });

        // Create clusters from cells
        const clusters = Array.from(cellMap.entries())
          .filter(([_, props]) => props.length >= minClusterSize)
          .map(([h3Index, props]) => {
            // Get cell boundary (hexagon vertices)
            const boundary = cellToBoundary(h3Index);
            
            // Calculate centroid (average of vertices)
            const centroid = boundary.reduce(
              (acc, [lat, lng]) => ({
                lat: acc.lat + lat / boundary.length,
                lng: acc.lng + lng / boundary.length,
              }),
              { lat: 0, lng: 0 }
            );

            // Calculate statistics
            const count = props.length;
            const avgPrice = props.reduce((sum, p) => sum + (parseFloat(p.price as string) || 0), 0) / count;
            const minPrice = Math.min(...props.map(p => parseFloat(p.price as string) || 0));
            const maxPrice = Math.max(...props.map(p => parseFloat(p.price as string) || 0));

            return {
              h3Index,
              centroid,
              boundary,
              count,
              avgPrice,
              minPrice,
              maxPrice,
              formattedPrice: formatPrice(avgPrice),
              color: getClusterColor(count),
              propertyIds: props.map(p => p.id),
            };
          });

        // Individual properties (not in clusters)
        const clusteredPropertyIds = new Set(
          clusters.flatMap(c => c.propertyIds)
        );

        const individualProperties = propertiesInBounds
          .filter(p => !clusteredPropertyIds.has(p.id))
          .map(p => ({
            id: p.id,
            title: p.title,
            position: {
              lat: parseFloat(p.latitude as string),
              lng: parseFloat(p.longitude as string),
            },
            price: parseFloat(p.price as string),
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            propertyType: p.propertyType,
          }));

        const result = {
          clusters,
          properties: individualProperties,
          stats: {
            totalProperties: propertiesInBounds.length,
            clusteredProperties: clusteredPropertyIds.size,
            individualProperties: individualProperties.length,
            clusterCount: clusters.length,
            h3Resolution,
          },
        };

        // Cache the result
        await clusterCacheService.setCachedClusters(bounds, zoom, h3Resolution, result);

        return result;
      } catch (error) {
        console.error('Clustering error:', error);
        throw error;
      }
    }),

  /**
   * Get properties within a specific H3 cell (cluster)
   * 
   * Used when user clicks on a cluster to see individual properties
   */
  getClusterProperties: publicProcedure
    .input(
      z.object({
        h3Index: z.string(),
        includeNeighbors: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input }) => {
      const { h3Index, includeNeighbors } = input;

      // Try to get from cache first (only for single cell, not neighbors)
      if (!includeNeighbors) {
        const cached = await clusterCacheService.getCachedClusterProperties(h3Index);
        if (cached) {
          return {
            properties: cached,
            h3Index,
            count: cached.length,
          };
        }
      }

      const db = await getDb();
      if (!db) {
        return { properties: [] };
      }

      try {
        // Get cells to query
        const cells = includeNeighbors
          ? [h3Index, ...gridDisk(h3Index, 1)] // Include neighboring cells
          : [h3Index];

        // Get boundaries for all cells
        const bounds = cells.map(cell => {
          const boundary = cellToBoundary(cell);
          const lats = boundary.map(([lat]) => lat);
          const lngs = boundary.map(([, lng]) => lng);
          
          return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs),
          };
        });

        // Combine bounds
        const combinedBounds = bounds.reduce(
          (acc, b) => ({
            north: Math.max(acc.north, b.north),
            south: Math.min(acc.south, b.south),
            east: Math.max(acc.east, b.east),
            west: Math.min(acc.west, b.west),
          }),
          bounds[0]
        );

        // Fetch properties
        const propertiesInCell = await db
          .select()
          .from(properties)
          .where(
            and(
              gte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, combinedBounds.south),
              lte(sql`CAST(${properties.latitude} AS DECIMAL(10,8))`, combinedBounds.north),
              gte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, combinedBounds.west),
              lte(sql`CAST(${properties.longitude} AS DECIMAL(11,8))`, combinedBounds.east)
            )
          )
          .limit(1000);

        const mappedProperties = propertiesInCell.map(p => ({
            ...p,
            position: {
              lat: parseFloat(p.latitude as string),
              lng: parseFloat(p.longitude as string),
            },
          }));

        // Cache the result (only for single cell)
        if (!includeNeighbors) {
          await clusterCacheService.setCachedClusterProperties(h3Index, mappedProperties);
        }

        return {
          properties: mappedProperties,
          h3Index,
          count: propertiesInCell.length,
        };
      } catch (error) {
        console.error('Get cluster properties error:', error);
        throw error;
      }
    }),

  /**
   * Get cluster statistics for analytics
   */
  getClusterStats: publicProcedure
    .input(
      z.object({
        zoom: z.number().min(1).max(22),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { stats: null };
      }

      const { zoom } = input;
      const h3Resolution = getH3ResolutionFromZoom(zoom);

      try {
        // Get total property count
        const totalCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(properties);

        return {
          stats: {
            totalProperties: totalCount[0]?.count || 0,
            h3Resolution,
            zoom,
            estimatedClusters: Math.ceil((totalCount[0]?.count || 0) / 10),
          },
        };
      } catch (error) {
        console.error('Get cluster stats error:', error);
        throw error;
      }
    }),
});
