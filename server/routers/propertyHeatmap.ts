// @ts-nocheck
import { publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { properties } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';

/**
 * Property Heatmap Router
 * 
 * Provides endpoints for property density visualization
 */
export const propertyHeatmapRouter = router({
  /**
   * Get property locations for heatmap
   * Returns latitude/longitude coordinates of all active properties
   */
  getLocations: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    try {
      const result = await db
        .select({
          id: properties.id,
          latitude: properties.latitude,
          longitude: properties.longitude,
          price: properties.price,
        })
        .from(properties)
        .where(sql`${properties.latitude} IS NOT NULL AND ${properties.longitude} IS NOT NULL`)
        .limit(10000); // Limit for performance

      return result;
    } catch (error) {
      console.error('[Property Heatmap] Failed to fetch locations:', error);
      return [];
    }
  }),

  /**
   * Get property density statistics by neighborhood
   */
  getDensityByNeighborhood: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    try {
      const result = await db
        .select({
          neighborhood: properties.neighborhood,
          count: sql<number>`COUNT(*)`.as('count'),
          avgPrice: sql<number>`AVG(${properties.price})`.as('avgPrice'),
        })
        .from(properties)
        .where(sql`${properties.neighborhood} IS NOT NULL`)
        .groupBy(properties.neighborhood)
        .orderBy(sql`count DESC`);

      return result;
    } catch (error) {
      console.error('[Property Heatmap] Failed to fetch density by neighborhood:', error);
      return [];
    }
  }),

  /**
   * Get property density by price range
   */
  getDensityByPriceRange: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    try {
      const result = await db
        .select({
          priceRange: sql<string>`
            CASE
              WHEN ${properties.price} < 50000000 THEN 'Under ₦50M'
              WHEN ${properties.price} BETWEEN 50000000 AND 100000000 THEN '₦50M - ₦100M'
              WHEN ${properties.price} BETWEEN 100000000 AND 200000000 THEN '₦100M - ₦200M'
              WHEN ${properties.price} BETWEEN 200000000 AND 500000000 THEN '₦200M - ₦500M'
              ELSE 'Over ₦500M'
            END
          `.as('priceRange'),
          count: sql<number>`COUNT(*)`.as('count'),
          avgLatitude: sql<number>`AVG(${properties.latitude})`.as('avgLatitude'),
          avgLongitude: sql<number>`AVG(${properties.longitude})`.as('avgLongitude'),
        })
        .from(properties)
        .where(sql`${properties.latitude} IS NOT NULL AND ${properties.longitude} IS NOT NULL`)
        .groupBy(sql`priceRange`)
        .orderBy(sql`count DESC`);

      return result;
    } catch (error) {
      console.error('[Property Heatmap] Failed to fetch density by price range:', error);
      return [];
    }
  }),
});
