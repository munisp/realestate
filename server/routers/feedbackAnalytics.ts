import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { recommendationFeedback, properties, users } from "../../drizzle/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

/**
 * Feedback Analytics Router
 * 
 * Provides analytics on user recommendation feedback including:
 * - User satisfaction rate (thumbs up vs down)
 * - Most liked property types
 * - Recommendation accuracy trends over time
 * - Property attribute preferences
 */

export const feedbackAnalyticsRouter = router({
  /**
   * Get user's overall satisfaction rate
   */
  getSatisfactionRate: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        totalFeedback: sql<number>`count(*)`,
        positiveFeedback: sql<number>`sum(case when ${recommendationFeedback.rating} = 'up' then 1 else 0 end)`,
        negativeFeedback: sql<number>`sum(case when ${recommendationFeedback.rating} = 'down' then 1 else 0 end)`,
      })
      .from(recommendationFeedback)
      .where(eq(recommendationFeedback.userId, ctx.user.id));

    const total = Number(result[0]?.totalFeedback || 0);
    const positive = Number(result[0]?.positiveFeedback || 0);
    const negative = Number(result[0]?.negativeFeedback || 0);
    const satisfactionRate = total > 0 ? (positive / total) * 100 : 0;

    return {
      totalFeedback: total,
      positiveFeedback: positive,
      negativeFeedback: negative,
      satisfactionRate: Math.round(satisfactionRate * 10) / 10,
    };
  }),

  /**
   * Get most liked property types based on feedback
   */
  getMostLikedPropertyTypes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        propertyType: properties.propertyType,
        likeCount: sql<number>`count(*)`,
      })
      .from(recommendationFeedback)
      .innerJoin(properties, eq(recommendationFeedback.propertyId, properties.id))
      .where(
        and(
          eq(recommendationFeedback.userId, ctx.user.id),
          eq(recommendationFeedback.rating, "up")
        )
      )
      .groupBy(properties.propertyType)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(5);

    return result.map((r) => ({
      propertyType: r.propertyType,
      likeCount: Number(r.likeCount),
    }));
  }),

  /**
   * Get recommendation accuracy trends over time (last 30 days)
   */
  getAccuracyTrends: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .select({
        date: sql<string>`DATE(${recommendationFeedback.createdAt})`,
        totalFeedback: sql<number>`count(*)`,
        positiveFeedback: sql<number>`sum(case when ${recommendationFeedback.rating} = 'up' then 1 else 0 end)`,
      })
      .from(recommendationFeedback)
      .where(
        and(
          eq(recommendationFeedback.userId, ctx.user.id),
          gte(recommendationFeedback.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${recommendationFeedback.createdAt})`)
      .orderBy(sql`DATE(${recommendationFeedback.createdAt})`);

    return result.map((r) => {
      const total = Number(r.totalFeedback);
      const positive = Number(r.positiveFeedback);
      const accuracy = total > 0 ? (positive / total) * 100 : 0;

      return {
        date: r.date,
        totalFeedback: total,
        positiveFeedback: positive,
        accuracy: Math.round(accuracy * 10) / 10,
      };
    });
  }),

  /**
   * Get property attribute preferences from liked properties
   */
  getPropertyPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const likedProperties = await db
      .select({
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        price: properties.price,
        squareFeet: properties.squareFeet,
        propertyType: properties.propertyType,
        city: properties.city,
      })
      .from(recommendationFeedback)
      .innerJoin(properties, eq(recommendationFeedback.propertyId, properties.id))
      .where(
        and(
          eq(recommendationFeedback.userId, ctx.user.id),
          eq(recommendationFeedback.rating, "up")
        )
      );

    if (likedProperties.length === 0) {
      return {
        averageBedrooms: 0,
        averageBathrooms: 0,
        averagePrice: 0,
        averageSquareFeet: 0,
        preferredPropertyTypes: [],
        preferredCities: [],
      };
    }

    // Calculate averages
    const totalBedrooms = likedProperties.reduce((sum, p) => sum + (p.bedrooms || 0), 0);
    const totalBathrooms = likedProperties.reduce((sum, p) => sum + (p.bathrooms || 0), 0);
    const totalPrice = likedProperties.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalSquareFeet = likedProperties.reduce((sum, p) => sum + (p.squareFeet || 0), 0);

    // Get most common property types
    const propertyTypeCounts = likedProperties.reduce((acc, p) => {
      if (p.propertyType) {
        acc[p.propertyType] = (acc[p.propertyType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const preferredPropertyTypes = Object.entries(propertyTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));

    // Get most common cities
    const cityCounts = likedProperties.reduce((acc, p) => {
      if (p.city) {
        acc[p.city] = (acc[p.city] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const preferredCities = Object.entries(cityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([city, count]) => ({ city, count }));

    return {
      averageBedrooms: Math.round(totalBedrooms / likedProperties.length),
      averageBathrooms: Math.round(totalBathrooms / likedProperties.length),
      averagePrice: Math.round(totalPrice / likedProperties.length),
      averageSquareFeet: Math.round(totalSquareFeet / likedProperties.length),
      preferredPropertyTypes,
      preferredCities,
      totalLikedProperties: likedProperties.length,
    };
  }),

  /**
   * Get recent feedback activity
   */
  getRecentFeedback: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: recommendationFeedback.id,
          propertyId: recommendationFeedback.propertyId,
          rating: recommendationFeedback.rating,
          createdAt: recommendationFeedback.createdAt,
          propertyAddress: properties.address,
          propertyPrice: properties.price,
          propertyType: properties.propertyType,
          propertyCity: properties.city,
        })
        .from(recommendationFeedback)
        .innerJoin(properties, eq(recommendationFeedback.propertyId, properties.id))
        .where(eq(recommendationFeedback.userId, ctx.user.id))
        .orderBy(desc(recommendationFeedback.createdAt))
        .limit(input.limit);

      return result;
    }),
});
