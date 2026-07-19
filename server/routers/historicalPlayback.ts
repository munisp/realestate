import { z } from 'zod';
import { router, publicProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { propertyHistory, properties } from '../../drizzle/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

/**
 * Historical Playback Router
 * 
 * Provides historical property data for time-series visualization
 * Enables playback of price changes and density evolution over time
 * 
 * Features:
 * - Get property snapshots for a specific time period
 * - Aggregate historical data by time intervals
 * - Calculate price trends and density changes
 * - Support for animated playback
 */

export const historicalPlaybackRouter = router({
  /**
   * Get historical snapshots for a time range
   */
  getSnapshots: publicProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(),
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }).optional(),
        interval: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { snapshots: [], timeline: [] };
      }

      const { startDate, endDate, bounds, interval } = input;

      try {
        // Build query
        let query = db
          .select({
            id: propertyHistory.id,
            propertyId: propertyHistory.propertyId,
            price: propertyHistory.price,
            status: propertyHistory.status,
            listingType: propertyHistory.listingType,
            latitude: propertyHistory.latitude,
            longitude: propertyHistory.longitude,
            snapshotDate: propertyHistory.snapshotDate,
            changeType: propertyHistory.changeType,
          })
          .from(propertyHistory)
          .where(
            and(
              gte(propertyHistory.snapshotDate, new Date(startDate)),
              lte(propertyHistory.snapshotDate, new Date(endDate))
            )
          );

        // Add bounds filter if provided
        if (bounds) {
          query = query.where(
            and(
              gte(sql`CAST(${propertyHistory.latitude} AS DECIMAL(10,8))`, bounds.south),
              lte(sql`CAST(${propertyHistory.latitude} AS DECIMAL(10,8))`, bounds.north),
              gte(sql`CAST(${propertyHistory.longitude} AS DECIMAL(11,8))`, bounds.west),
              lte(sql`CAST(${propertyHistory.longitude} AS DECIMAL(11,8))`, bounds.east)
            )
          );
        }

        const snapshots = await query.orderBy(propertyHistory.snapshotDate).limit(10000);

        // Group snapshots by time interval
        const timeline = groupByInterval(snapshots, interval);

        return {
          snapshots,
          timeline,
          stats: {
            totalSnapshots: snapshots.length,
            timelinePoints: timeline.length,
            startDate,
            endDate,
            interval,
          },
        };
      } catch (error) {
        console.error('Get snapshots error:', error);
        throw error;
      }
    }),

  /**
   * Get aggregated statistics for a time period
   */
  getAggregatedStats: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }).optional(),
        groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { stats: [] };
      }

      const { startDate, endDate, bounds, groupBy } = input;

      try {
        // Get all snapshots in range
        let query = db
          .select()
          .from(propertyHistory)
          .where(
            and(
              gte(propertyHistory.snapshotDate, new Date(startDate)),
              lte(propertyHistory.snapshotDate, new Date(endDate))
            )
          );

        if (bounds) {
          query = query.where(
            and(
              gte(sql`CAST(${propertyHistory.latitude} AS DECIMAL(10,8))`, bounds.south),
              lte(sql`CAST(${propertyHistory.latitude} AS DECIMAL(10,8))`, bounds.north),
              gte(sql`CAST(${propertyHistory.longitude} AS DECIMAL(11,8))`, bounds.west),
              lte(sql`CAST(${propertyHistory.longitude} AS DECIMAL(11,8))`, bounds.east)
            )
          );
        }

        const snapshots = await query;

        // Aggregate by time period
        const aggregated = aggregateByPeriod(snapshots, groupBy);

        return {
          stats: aggregated,
          summary: {
            totalPeriods: aggregated.length,
            avgPriceChange: calculateAvgPriceChange(aggregated),
            avgDensityChange: calculateAvgDensityChange(aggregated),
          },
        };
      } catch (error) {
        console.error('Get aggregated stats error:', error);
        throw error;
      }
    }),

  /**
   * Get price trend for a specific property
   */
  getPropertyTrend: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { trend: [] };
      }

      const { propertyId, startDate, endDate } = input;

      try {
        let query = db
          .select()
          .from(propertyHistory)
          .where(eq(propertyHistory.propertyId, propertyId));

        if (startDate && endDate) {
          query = query.where(
            and(
              gte(propertyHistory.snapshotDate, new Date(startDate)),
              lte(propertyHistory.snapshotDate, new Date(endDate))
            )
          );
        }

        const trend = await query.orderBy(propertyHistory.snapshotDate);

        // Calculate statistics
        const prices = trend.map(t => t.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const priceChange = prices.length > 1 ? prices[prices.length - 1] - prices[0] : 0;
        const priceChangePercent = prices.length > 1 && prices[0] > 0
          ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
          : 0;

        return {
          trend,
          stats: {
            dataPoints: trend.length,
            minPrice,
            maxPrice,
            avgPrice,
            priceChange,
            priceChangePercent: Math.round(priceChangePercent * 100) / 100,
          },
        };
      } catch (error) {
        console.error('Get property trend error:', error);
        throw error;
      }
    }),

  /**
   * Get market overview for a time period
   */
  getMarketOverview: publicProcedure
    .input(
      z.object({
        date: z.string(), // Specific date to get market snapshot
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { overview: null };
      }

      const { date, bounds } = input;

      try {
        // Get snapshots closest to the specified date
        let query = db
          .select()
          .from(propertyHistory)
          .where(lte(propertyHistory.snapshotDate, new Date(date)));

        if (bounds) {
          query = query.where(
            and(
              gte(sql`CAST(${propertyHistory.latitude} AS DECIMAL(10,8))`, bounds.south),
              lte(sql`CAST(${propertyHistory.latitude} AS DECIMAL(10,8))`, bounds.north),
              gte(sql`CAST(${propertyHistory.longitude} AS DECIMAL(11,8))`, bounds.west),
              lte(sql`CAST(${propertyHistory.longitude} AS DECIMAL(11,8))`, bounds.east)
            )
          );
        }

        const snapshots = await query
          .orderBy(desc(propertyHistory.snapshotDate))
          .limit(1000);

        // Calculate market statistics
        const prices = snapshots.map(s => s.price);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const medianPrice = calculateMedian(prices);
        const totalProperties = snapshots.length;

        // Count by status
        const statusCounts = snapshots.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Count by listing type
        const listingTypeCounts = snapshots.reduce((acc, s) => {
          acc[s.listingType] = (acc[s.listingType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          overview: {
            date,
            totalProperties,
            avgPrice: Math.round(avgPrice),
            medianPrice: Math.round(medianPrice),
            statusCounts,
            listingTypeCounts,
          },
        };
      } catch (error) {
        console.error('Get market overview error:', error);
        throw error;
      }
    }),

  /**
   * Create historical snapshot (for testing/seeding)
   */
  createSnapshot: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        price: z.number(),
        status: z.enum(['active', 'pending', 'sold', 'off_market', 'archived']),
        listingType: z.enum(['sale', 'rent', 'sold', 'off_market']),
        latitude: z.string(),
        longitude: z.string(),
        snapshotDate: z.string(),
        changeType: z.enum(['created', 'price_change', 'status_change', 'updated', 'deleted']),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const result = await db.insert(propertyHistory).values({
        propertyId: input.propertyId,
        price: input.price,
        status: input.status,
        listingType: input.listingType,
        latitude: input.latitude,
        longitude: input.longitude,
        snapshotDate: new Date(input.snapshotDate),
        changeType: input.changeType,
      });

      return {
        id: Number(result.insertId),
        message: 'Snapshot created successfully',
      };
    }),
});

/**
 * Helper: Group snapshots by time interval
 */
function groupByInterval(snapshots: any[], interval: string) {
  const grouped: Record<string, any[]> = {};

  snapshots.forEach(snapshot => {
    const date = new Date(snapshot.snapshotDate);
    let key: string;

    switch (interval) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(snapshot);
  });

  return Object.entries(grouped).map(([period, data]) => ({
    period,
    count: data.length,
    avgPrice: data.reduce((sum, s) => sum + s.price, 0) / data.length,
    snapshots: data,
  }));
}

/**
 * Helper: Aggregate snapshots by time period
 */
function aggregateByPeriod(snapshots: any[], groupBy: string) {
  const timeline = groupByInterval(snapshots, groupBy);

  return timeline.map(point => {
    const prices = point.snapshots.map((s: any) => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;

    return {
      period: point.period,
      propertyCount: point.count,
      avgPrice: Math.round(avgPrice),
      minPrice,
      maxPrice,
      priceRange: maxPrice - minPrice,
    };
  });
}

/**
 * Helper: Calculate average price change
 */
function calculateAvgPriceChange(aggregated: any[]) {
  if (aggregated.length < 2) return 0;

  const changes = [];
  for (let i = 1; i < aggregated.length; i++) {
    const change = aggregated[i].avgPrice - aggregated[i - 1].avgPrice;
    changes.push(change);
  }

  return Math.round(changes.reduce((sum, c) => sum + c, 0) / changes.length);
}

/**
 * Helper: Calculate average density change
 */
function calculateAvgDensityChange(aggregated: any[]) {
  if (aggregated.length < 2) return 0;

  const changes = [];
  for (let i = 1; i < aggregated.length; i++) {
    const change = aggregated[i].propertyCount - aggregated[i - 1].propertyCount;
    changes.push(change);
  }

  return Math.round(changes.reduce((sum, c) => sum + c, 0) / changes.length);
}

/**
 * Helper: Calculate median
 */
function calculateMedian(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
