// @ts-nocheck
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { properties, propertyValuations } from "../../drizzle/schema";
import { sql, desc, and, gte, lte, eq } from "drizzle-orm";
import { z } from "zod";

export const marketTrendsRouter = router({
  /**
   * Get price trends over time for a specific neighborhood or city
   */
  getPriceTrends: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        neighborhood: z.string().optional(),
        months: z.number().min(1).max(24).default(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { trends: [], avgPrice: 0, priceChange: 0 };
      }

      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - input.months);

      try {
        // Get average prices by month
        const trends = await db
          .select({
            month: sql<string>`DATE_FORMAT(${properties.listDate}, '%Y-%m')`,
            avgPrice: sql<number>`AVG(${properties.price})`,
            count: sql<number>`COUNT(*)`,
          })
          .from(properties)
          .where(
            and(
              gte(properties.listDate, monthsAgo),
              input.city ? eq(properties.city, input.city) : undefined,
              input.neighborhood
                ? eq(properties.city, input.neighborhood)
                : undefined
            )
          )
          .groupBy(sql`DATE_FORMAT(${properties.listDate}, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(${properties.listDate}, '%Y-%m')`);

        // Calculate overall metrics
        const currentMonthAvg = trends[trends.length - 1]?.avgPrice || 0;
        const previousMonthAvg = trends[trends.length - 2]?.avgPrice || 0;
        const priceChange =
          previousMonthAvg > 0
            ? ((currentMonthAvg - previousMonthAvg) / previousMonthAvg) * 100
            : 0;

        return {
          trends: trends.map((t) => ({
            month: t.month,
            avgPrice: Math.round(t.avgPrice),
            count: t.count,
          })),
          avgPrice: Math.round(currentMonthAvg),
          priceChange: Math.round(priceChange * 100) / 100,
        };
      } catch (error) {
        console.error("[Market Trends] Error fetching price trends:", error);
        return { trends: [], avgPrice: 0, priceChange: 0 };
      }
    }),

  /**
   * Get inventory levels by neighborhood
   */
  getInventoryLevels: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      try {
        const inventory = await db
          .select({
            neighborhood: properties.city,
            count: sql<number>`COUNT(*)`,
            avgPrice: sql<number>`AVG(${properties.price})`,
            avgDaysOnMarket: sql<number>`AVG(EXTRACT(DAY FROM NOW() - ${properties.listDate}))`,
          })
          .from(properties)
          .where(
            and(
              eq(properties.status, "active"),
              input.city ? eq(properties.city, input.city) : undefined
            )
          )
          .groupBy(properties.city)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(20);

        return inventory.map((item) => ({
          neighborhood: item.neighborhood || "Unknown",
          count: item.count,
          avgPrice: Math.round(item.avgPrice),
          avgDaysOnMarket: Math.round(item.avgDaysOnMarket || 0),
        }));
      } catch (error) {
        console.error("[Market Trends] Error fetching inventory:", error);
        return [];
      }
    }),

  /**
   * Get days on market statistics
   */
  getDaysOnMarket: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        propertyType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { avgDays: 0, medianDays: 0, distribution: [] };
      }

      try {
        const results = await db
          .select({
            daysOnMarket: sql<number>`EXTRACT(DAY FROM NOW() - ${properties.listDate})`,
          })
          .from(properties)
          .where(
            and(
              eq(properties.status, "active"),
              input.city ? eq(properties.city, input.city) : undefined,
              input.propertyType
                ? eq(properties.propertyType, input.propertyType)
                : undefined
            )
          );

        if (results.length === 0) {
          return { avgDays: 0, medianDays: 0, distribution: [] };
        }

        const days = results.map((r) => r.daysOnMarket).sort((a, b) => a - b);
        const avgDays = Math.round(
          days.reduce((sum, d) => sum + d, 0) / days.length
        );
        const medianDays = days[Math.floor(days.length / 2)];

        // Create distribution buckets
        const distribution = [
          {
            range: "0-30 days",
            count: days.filter((d) => d <= 30).length,
          },
          {
            range: "31-60 days",
            count: days.filter((d) => d > 30 && d <= 60).length,
          },
          {
            range: "61-90 days",
            count: days.filter((d) => d > 60 && d <= 90).length,
          },
          {
            range: "90+ days",
            count: days.filter((d) => d > 90).length,
          },
        ];

        return {
          avgDays,
          medianDays,
          distribution,
        };
      } catch (error) {
        console.error("[Market Trends] Error fetching days on market:", error);
        return { avgDays: 0, medianDays: 0, distribution: [] };
      }
    }),

  /**
   * Get hot neighborhoods based on activity and price growth
   */
  getHotNeighborhoods: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // Get neighborhoods with recent activity
        const hotNeighborhoods = await db
          .select({
            neighborhood: properties.city,
            recentListings: sql<number>`COUNT(*)`,
            avgPrice: sql<number>`AVG(${properties.price})`,
          })
          .from(properties)
          .where(
            and(
              gte(properties.listDate, threeMonthsAgo),
              input.city ? eq(properties.city, input.city) : undefined
            )
          )
          .groupBy(properties.city)
          .having(sql`COUNT(*) >= 3`)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(input.limit);

        return hotNeighborhoods.map((item) => ({
          neighborhood: item.neighborhood || "Unknown",
          recentListings: item.recentListings,
          avgPrice: Math.round(item.avgPrice),
          growthIndicator: item.recentListings > 5 ? "High" : "Moderate",
        }));
      } catch (error) {
        console.error("[Market Trends] Error fetching hot neighborhoods:", error);
        return [];
      }
    }),

  /**
   * Get market summary statistics
   */
  getMarketSummary: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalListings: 0,
          avgPrice: 0,
          medianPrice: 0,
          newListingsThisMonth: 0,
        };
      }

      try {
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        // Get total active listings
        const [totalResult] = await db
          .select({
            count: sql<number>`COUNT(*)`,
            avgPrice: sql<number>`AVG(${properties.price})`,
          })
          .from(properties)
          .where(
            and(
              eq(properties.status, "active"),
              input.city ? eq(properties.city, input.city) : undefined
            )
          );

        // Get new listings this month
        const [newListingsResult] = await db
          .select({
            count: sql<number>`COUNT(*)`,
          })
          .from(properties)
          .where(
            and(
              gte(properties.listDate, thisMonth),
              input.city ? eq(properties.city, input.city) : undefined
            )
          );

        // Get median price (approximate using AVG for simplicity)
        const medianPrice = totalResult?.avgPrice || 0;

        return {
          totalListings: totalResult?.count || 0,
          avgPrice: Math.round(totalResult?.avgPrice || 0),
          medianPrice: Math.round(medianPrice),
          newListingsThisMonth: newListingsResult?.count || 0,
        };
      } catch (error) {
        console.error("[Market Trends] Error fetching market summary:", error);
        return {
          totalListings: 0,
          avgPrice: 0,
          medianPrice: 0,
          newListingsThisMonth: 0,
        };
      }
    }),
});
