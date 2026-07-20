import { z } from "zod";
import { publicProcedure, rateLimitedPublicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties } from "../../drizzle/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { gnnServiceClient } from "../services/gnnServiceClient";

const advancedSearchSchema = z.object({
  // Basic filters
  city: z.string().optional(),
  minPrice: z.number().default(0),
  maxPrice: z.number().default(500000000),
  bedrooms: z.number().default(0),
  bathrooms: z.number().default(0),
  minSquareFeet: z.number().default(0),
  propertyType: z.string().default("any"),
  
  // GNN-enhanced filters
  minInvestmentPotential: z.number().min(0).max(100).default(0),
  minGrowthMomentum: z.number().min(0).max(100).default(0),
  minNetworkCentrality: z.number().min(0).max(1).default(0),
  minGNNScore: z.number().min(0).max(100).default(0),
  
  // Pagination
  limit: z.number().default(50),
  offset: z.number().default(0),
});

export const advancedSearchRouter = router({
  search: publicProcedure
    .input(advancedSearchSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Build WHERE conditions
      const conditions = [
        eq(properties.status, "active"),
      ];

      if (input.city) {
        conditions.push(eq(properties.city, input.city));
      }

      if (input.minPrice > 0) {
        conditions.push(gte(properties.price, input.minPrice));
      }

      if (input.maxPrice < 500000000) {
        conditions.push(lte(properties.price, input.maxPrice));
      }

      if (input.bedrooms > 0) {
        conditions.push(gte(properties.bedrooms, input.bedrooms));
      }

      if (input.bathrooms > 0) {
        conditions.push(gte(properties.bathrooms, input.bathrooms));
      }

      if (input.minSquareFeet > 0) {
        conditions.push(gte(properties.squareFeet, input.minSquareFeet));
      }

      if (input.propertyType && input.propertyType !== "any") {
        conditions.push(eq(properties.propertyType, input.propertyType));
      }

      // Execute query
      const results = await db
        .select()
        .from(properties)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset);

      // Calculate GNN scores for each property using real service
      const enrichedResults = await Promise.all(
        results.map(async (property) => {
          const gnnMetrics = await gnnServiceClient.calculateScores({
            id: property.id,
            price: property.price,
            bedrooms: property.bedrooms ?? 0,
            bathrooms: property.bathrooms ?? 0,
            squareFeet: property.squareFeet ?? 0,
            latitude: parseFloat(property.latitude) || 0,
            longitude: parseFloat(property.longitude) || 0,
            city: property.city,
            address: (property as any).address,
            propertyType: property.propertyType,
            yearBuilt: property.yearBuilt,
          });
          
          // Apply GNN filters
          if (gnnMetrics.gnnScore < input.minGNNScore) return null;
          if (gnnMetrics.investmentPotential < input.minInvestmentPotential) return null;
          if (gnnMetrics.growthMomentum < input.minGrowthMomentum) return null;
          if (gnnMetrics.networkCentrality < input.minNetworkCentrality) return null;

          return {
            ...property,
            ...gnnMetrics,
          };
        })
      );

      // Filter out nulls and return
      return enrichedResults.filter((result) => result !== null);
    }),

  getFilterStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Get statistics for filter ranges
    const stats = await db
      .select({
        minPrice: sql<number>`MIN(${properties.price})`,
        maxPrice: sql<number>`MAX(${properties.price})`,
        avgPrice: sql<number>`AVG(${properties.price})`,
        totalProperties: sql<number>`COUNT(*)`,
      })
      .from(properties)
      .where(eq(properties.status, "active"));

    return stats[0] || {
      minPrice: 0,
      maxPrice: 500000000,
      avgPrice: 50000000,
      totalProperties: 0,
    };
  }),
});


