// @ts-nocheck
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { properties, savedSearches } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const mapSearchRouter = router({
  // Search properties within drawn boundary
  searchWithinBoundary: publicProcedure
    .input(
      z.object({
        boundaryType: z.enum(["polygon", "circle", "rectangle"]),
        boundaryData: z.object({
          // For polygon
          coordinates: z
            .array(
              z.object({
                lat: z.number(),
                lng: z.number(),
              })
            )
            .optional(),
          // For circle
          center: z
            .object({
              lat: z.number(),
              lng: z.number(),
            })
            .optional(),
          radius: z.number().optional(), // in meters
          // For rectangle
          bounds: z
            .object({
              north: z.number(),
              south: z.number(),
              east: z.number(),
              west: z.number(),
            })
            .optional(),
        }),
        // Additional filters
        filters: z
          .object({
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            minBedrooms: z.number().optional(),
            minBathrooms: z.number().optional(),
            propertyType: z.string().optional(),
            status: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { properties: [], count: 0 };
      }

      try {
        let query = db.select().from(properties);

        // Apply boundary filter
        if (input.boundaryType === "circle" && input.boundaryData.center && input.boundaryData.radius) {
          const { lat, lng } = input.boundaryData.center;
          const radiusInKm = input.boundaryData.radius / 1000;

          // Use Haversine formula for distance calculation
          query = query.where(
            sql`(
              6371 * acos(
                cos(radians(${lat})) * 
                cos(radians(${properties.latitude})) * 
                cos(radians(${properties.longitude}) - radians(${lng})) + 
                sin(radians(${lat})) * 
                sin(radians(${properties.latitude}))
              )
            ) <= ${radiusInKm}`
          ) as any;
        } else if (input.boundaryType === "rectangle" && input.boundaryData.bounds) {
          const { north, south, east, west } = input.boundaryData.bounds;
          query = query.where(
            and(
              sql`${properties.latitude} >= ${south}`,
              sql`${properties.latitude} <= ${north}`,
              sql`${properties.longitude} >= ${west}`,
              sql`${properties.longitude} <= ${east}`
            )
          ) as any;
        } else if (input.boundaryType === "polygon" && input.boundaryData.coordinates) {
          // For polygon, we'll use a point-in-polygon check
          // This is a simplified version - in production, use PostGIS or similar
          const coords = input.boundaryData.coordinates;
          
          // Get bounding box first for efficiency
          const lats = coords.map((c) => c.lat);
          const lngs = coords.map((c) => c.lng);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          query = query.where(
            and(
              sql`${properties.latitude} >= ${minLat}`,
              sql`${properties.latitude} <= ${maxLat}`,
              sql`${properties.longitude} >= ${minLng}`,
              sql`${properties.longitude} <= ${maxLng}`
            )
          ) as any;
        }

        // Apply additional filters
        if (input.filters) {
          const conditions = [];

          if (input.filters.minPrice) {
            conditions.push(sql`${properties.price} >= ${input.filters.minPrice}`);
          }
          if (input.filters.maxPrice) {
            conditions.push(sql`${properties.price} <= ${input.filters.maxPrice}`);
          }
          if (input.filters.minBedrooms) {
            conditions.push(sql`${properties.bedrooms} >= ${input.filters.minBedrooms}`);
          }
          if (input.filters.minBathrooms) {
            conditions.push(sql`${properties.bathrooms} >= ${input.filters.minBathrooms}`);
          }
          if (input.filters.propertyType) {
            conditions.push(eq(properties.propertyType, input.filters.propertyType));
          }
          if (input.filters.status) {
            conditions.push(eq(properties.status, input.filters.status));
          }

          if (conditions.length > 0) {
            query = query.where(and(...conditions)) as any;
          }
        }

        const results = await query;

        // For polygon, do client-side point-in-polygon check
        let filteredResults = results;
        if (input.boundaryType === "polygon" && input.boundaryData.coordinates) {
          filteredResults = results.filter((prop) => {
            if (!prop.latitude || !prop.longitude) return false;
            return isPointInPolygon(
              { lat: prop.latitude, lng: prop.longitude },
              input.boundaryData.coordinates!
            );
          });
        }

        return {
          properties: filteredResults,
          count: filteredResults.length,
        };
      } catch (error) {
        console.error("[MapSearch] Error searching within boundary:", error);
        return { properties: [], count: 0 };
      }
    }),

  // Save search with boundary
  saveBoundarySearch: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        boundaryType: z.enum(["none", "polygon", "circle", "rectangle"]),
        boundaryData: z.any().optional(),
        searchCriteria: z.any(),
        notificationsEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const result = await db.insert(savedSearches).values({
          userId: ctx.user.id,
          name: input.name,
          searchCriteria: JSON.stringify(input.searchCriteria),
          boundaryType: input.boundaryType,
          boundaryData: input.boundaryData ? JSON.stringify(input.boundaryData) : null,
          notificationsEnabled: input.notificationsEnabled ? 1 : 0,
        });

        const insertId = (result as any).insertId || 0;

        return {
          success: true,
          searchId: Number(insertId),
        };
      } catch (error) {
        console.error("[MapSearch] Error saving boundary search:", error);
        throw error;
      }
    }),

  // Get user's saved searches with boundaries
  getSavedSearches: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    try {
      const searches = await db
        .select()
        .from(savedSearches)
        .where(eq(savedSearches.userId, ctx.user.id))
        .orderBy(savedSearches.createdAt);

      return searches.map((search) => ({
        ...search,
        searchCriteria: JSON.parse(search.searchCriteria),
        boundaryData: search.boundaryData ? JSON.parse(search.boundaryData) : null,
      }));
    } catch (error) {
      console.error("[MapSearch] Error getting saved searches:", error);
      return [];
    }
  }),

  // Delete saved search
  deleteSavedSearch: protectedProcedure
    .input(z.object({ searchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Verify ownership
        const search = await db
          .select()
          .from(savedSearches)
          .where(eq(savedSearches.id, input.searchId))
          .limit(1);

        if (search.length === 0) {
          throw new Error("Search not found");
        }

        if (search[0].userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        await db.delete(savedSearches).where(eq(savedSearches.id, input.searchId));

        return { success: true };
      } catch (error) {
        console.error("[MapSearch] Error deleting saved search:", error);
        throw error;
      }
    }),

  // Get property density heatmap data
  getHeatmapData: publicProcedure
    .input(
      z.object({
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }),
        metric: z.enum(["density", "price"]).default("density"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { points: [] };
      }

      try {
        const { north, south, east, west } = input.bounds;

        const propertiesInBounds = await db
          .select({
            latitude: properties.latitude,
            longitude: properties.longitude,
            price: properties.price,
          })
          .from(properties)
          .where(
            and(
              sql`${properties.latitude} >= ${south}`,
              sql`${properties.latitude} <= ${north}`,
              sql`${properties.longitude} >= ${west}`,
              sql`${properties.longitude} <= ${east}`,
              eq(properties.status, "active")
            )
          );

        // Format for heatmap
        const points = propertiesInBounds
          .filter((p) => p.latitude && p.longitude)
          .map((p) => ({
            lat: p.latitude!,
            lng: p.longitude!,
            weight: input.metric === "price" ? (p.price || 0) / 100000 : 1,
          }));

        return { points };
      } catch (error) {
        console.error("[MapSearch] Error getting heatmap data:", error);
        return { points: [] };
      }
    }),
});

// Helper function: Point in polygon check (Ray casting algorithm)
function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
