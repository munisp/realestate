import { getDb } from "../db";
import { dataQualityMetrics, confidenceScores, hybridValuations } from "../../drizzle/schema-hybrid-valuation";
import { properties } from "../../drizzle/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

/**
 * Data Quality Service
 * Tracks and analyzes valuation data quality metrics
 */

export interface DataQualityReport {
  overall: {
    averageConfidence: number;
    totalValuations: number;
    highConfidenceCount: number;
    lowConfidenceCount: number;
  };
  byPropertyType: Record<string, {
    averageConfidence: number;
    count: number;
  }>;
  byNeighborhood: Record<string, {
    averageConfidence: number;
    count: number;
  }>;
  freshness: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  accuracy: {
    averageDeviation: number;
    withinMargin: number;
    totalComparisons: number;
  };
}

export interface DataQualityTrend {
  date: Date;
  averageConfidence: number;
  valuationCount: number;
  highConfidencePercentage: number;
}

export class DataQualityService {
  /**
   * Generate comprehensive data quality report
   */
  static async generateReport(
    filters?: {
      city?: string;
      state?: string;
      propertyType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<DataQualityReport> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [];
    if (filters?.city) conditions.push(sql`city = ${filters.city}`);
    if (filters?.state) conditions.push(sql`state = ${filters.state}`);
    if (filters?.propertyType) conditions.push(sql`property_type = ${filters.propertyType}`);
    if (filters?.startDate) conditions.push(sql`created_at >= ${filters.startDate}`);
    if (filters?.endDate) conditions.push(sql`created_at <= ${filters.endDate}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    // Overall metrics
    const overallQuery = await db.execute(sql`
      SELECT 
        AVG(cs.overallConfidence) as avgConfidence,
        COUNT(*) as totalValuations,
        SUM(CASE WHEN cs.overallConfidence >= 80 THEN 1 ELSE 0 END) as highConfidence,
        SUM(CASE WHEN cs.overallConfidence < 50 THEN 1 ELSE 0 END) as lowConfidence
      FROM hybridValuations hv
      JOIN confidenceScores cs ON hv.id = cs.valuationId
      ${whereClause}
    `);

    const overallRow = overallQuery.rows[0] as any;

    // By property type
    const byTypeQuery = await db.execute(sql`
      SELECT 
        hv.propertyType,
        AVG(cs.overallConfidence) as avgConfidence,
        COUNT(*) as count
      FROM hybridValuations hv
      JOIN confidenceScores cs ON hv.id = cs.valuationId
      ${whereClause}
      GROUP BY hv.propertyType
    `);

    const byPropertyType: Record<string, any> = {};
    for (const row of byTypeQuery.rows as any[]) {
      byPropertyType[row.propertyType] = {
        averageConfidence: Number(row.avgConfidence),
        count: Number(row.count),
      };
    }

    // By neighborhood (using city as proxy)
    const byNeighborhoodQuery = await db.execute(sql`
      SELECT 
        hv.city,
        AVG(cs.overallConfidence) as avgConfidence,
        COUNT(*) as count
      FROM hybridValuations hv
      JOIN confidenceScores cs ON hv.id = cs.valuationId
      ${whereClause}
      GROUP BY hv.city
      ORDER BY count DESC
      LIMIT 20
    `);

    const byNeighborhood: Record<string, any> = {};
    for (const row of byNeighborhoodQuery.rows as any[]) {
      byNeighborhood[row.city] = {
        averageConfidence: Number(row.avgConfidence),
        count: Number(row.count),
      };
    }

    // Freshness metrics
    const now = new Date();
    const day24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const freshnessQuery = await db.execute(sql`
      SELECT 
        SUM(CASE WHEN hv.createdAt >= ${day24Ago} THEN 1 ELSE 0 END) as last24h,
        SUM(CASE WHEN hv.createdAt >= ${days7Ago} THEN 1 ELSE 0 END) as last7d,
        SUM(CASE WHEN hv.createdAt >= ${days30Ago} THEN 1 ELSE 0 END) as last30d
      FROM hybridValuations hv
      ${whereClause}
    `);

    const freshnessRow = freshnessQuery.rows[0] as any;

    // Accuracy metrics (comparing valuations to actual sale prices)
    const accuracyQuery = await db.execute(sql`
      SELECT 
        AVG(ABS(hv.finalValue - p.price) / p.price * 100) as avgDeviation,
        SUM(CASE WHEN ABS(hv.finalValue - p.price) / p.price <= 0.10 THEN 1 ELSE 0 END) as withinMargin,
        COUNT(*) as totalComparisons
      FROM hybridValuations hv
      JOIN properties p ON hv.propertyId = p.id
      WHERE p.status = 'sold' AND p.price > 0
      ${conditions.length > 0 ? sql`AND ${sql.join(conditions, sql` AND `)}` : sql``}
    `);

    const accuracyRow = accuracyQuery.rows[0] as any;

    return {
      overall: {
        averageConfidence: Number(overallRow?.avgConfidence || 0),
        totalValuations: Number(overallRow?.totalValuations || 0),
        highConfidenceCount: Number(overallRow?.highConfidence || 0),
        lowConfidenceCount: Number(overallRow?.lowConfidence || 0),
      },
      byPropertyType,
      byNeighborhood,
      freshness: {
        last24Hours: Number(freshnessRow?.last24h || 0),
        last7Days: Number(freshnessRow?.last7d || 0),
        last30Days: Number(freshnessRow?.last30d || 0),
      },
      accuracy: {
        averageDeviation: Number(accuracyRow?.avgDeviation || 0),
        withinMargin: Number(accuracyRow?.withinMargin || 0),
        totalComparisons: Number(accuracyRow?.totalComparisons || 0),
      },
    };
  }

  /**
   * Get data quality trends over time
   */
  static async getTrends(days: number = 30): Promise<DataQualityTrend[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trendsQuery = await db.execute(sql`
      SELECT 
        DATE(hv.createdAt) as date,
        AVG(cs.overallConfidence) as avgConfidence,
        COUNT(*) as valuationCount,
        SUM(CASE WHEN cs.overallConfidence >= 80 THEN 1 ELSE 0 END) / COUNT(*) * 100 as highConfidencePercentage
      FROM hybridValuations hv
      JOIN confidenceScores cs ON hv.id = cs.valuationId
      WHERE hv.createdAt >= ${startDate}
      GROUP BY DATE(hv.createdAt)
      ORDER BY date ASC
    `);

    return (trendsQuery.rows as any[]).map((row) => ({
      date: new Date(row.date),
      averageConfidence: Number(row.avgConfidence),
      valuationCount: Number(row.valuationCount),
      highConfidencePercentage: Number(row.highConfidencePercentage),
    }));
  }

  /**
   * Get confidence score breakdown for a specific valuation
   */
  static async getConfidenceBreakdown(valuationId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const confidence = await db
      .select()
      .from(confidenceScores)
      .where(eq(confidenceScores.valuationId, valuationId))
      .limit(1);

    if (!confidence || confidence.length === 0) {
      return null;
    }

    const score = confidence[0];

    return {
      overall: {
        confidence: score.overallConfidence,
        level: score.confidenceLevel,
      },
      components: {
        dataCompleteness: {
          score: score.dataCompletenessScore,
          weight: 25,
        },
        modelAccuracy: {
          score: score.modelAccuracyScore,
          weight: 30,
        },
        comparableQuality: {
          score: score.comparableQualityScore,
          weight: 25,
        },
        satelliteConfidence: {
          score: score.satelliteConfidenceScore || 0,
          weight: 10,
        },
        marketStability: {
          score: score.marketStabilityScore || 0,
          weight: 10,
        },
      },
      factors: {
        comparableCount: score.comparableCount,
        comparableDistance: score.avgComparableDistance,
        dataAge: score.dataAge,
        marketVolatility: score.marketVolatility,
      },
      warnings: this.generateWarnings(score),
    };
  }

  /**
   * Generate warnings based on confidence scores
   */
  private static generateWarnings(score: typeof confidenceScores.$inferSelect): string[] {
    const warnings: string[] = [];

    if (score.dataCompletenessScore < 50) {
      warnings.push("Insufficient property data available");
    }

    if (score.modelAccuracyScore < 60) {
      warnings.push("Model accuracy is below acceptable threshold");
    }

    if (score.comparableQualityScore < 50) {
      warnings.push("Limited comparable properties found");
    }

    if (score.comparableCount && score.comparableCount < 3) {
      warnings.push("Very few comparable properties available");
    }

    if (score.avgComparableDistance && score.avgComparableDistance > 5) {
      warnings.push("Comparable properties are geographically distant");
    }

    if (score.dataAge && score.dataAge > 180) {
      warnings.push("Property data may be outdated");
    }

    if (score.marketVolatility && score.marketVolatility > 15) {
      warnings.push("High market volatility may affect accuracy");
    }

    return warnings;
  }

  /**
   * Update data quality metrics for a region
   */
  static async updateRegionalMetrics(city: string, state: string, propertyType?: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [
      sql`hv.city = ${city}`,
      sql`hv.state = ${state}`,
    ];

    if (propertyType) {
      conditions.push(sql`hv.propertyType = ${propertyType}`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    const metricsQuery = await db.execute(sql`
      SELECT 
        AVG(cs.comparableQualityScore) as comparableQuality,
        AVG(CASE WHEN hv.transactionDataUsed = 1 THEN 100 ELSE 0 END) as transactionQuality,
        AVG(COALESCE(cs.satelliteConfidenceScore, 0)) as satelliteQuality,
        AVG(COALESCE(cs.marketStabilityScore, 0)) as marketQuality,
        AVG(cs.overallConfidence) as overallQuality,
        COUNT(*) as totalProperties,
        SUM(CASE WHEN cs.comparableCount > 0 THEN 1 ELSE 0 END) as propertiesWithComparables,
        SUM(CASE WHEN cs.satelliteConfidenceScore IS NOT NULL THEN 1 ELSE 0 END) as propertiesWithSatellite,
        SUM(CASE WHEN cs.marketStabilityScore IS NOT NULL THEN 1 ELSE 0 END) as propertiesWithMarketData
      FROM hybridValuations hv
      JOIN confidenceScores cs ON hv.id = cs.valuationId
      WHERE ${whereClause}
    `);

    const row = metricsQuery.rows[0] as any;

    if (!row || row.totalProperties === 0) {
      return null;
    }

    // Upsert data quality metrics
    await db.execute(sql`
      INSERT INTO dataQualityMetrics (
        city, state, propertyType,
        comparableDataQuality, transactionDataQuality, satelliteDataQuality,
        marketDataQuality, overallDataQuality,
        totalProperties, propertiesWithComparables, propertiesWithSatellite,
        propertiesWithMarketData, recordedAt
      ) VALUES (
        ${city}, ${state}, ${propertyType || null},
        ${Math.round(row.comparableQuality)}, ${Math.round(row.transactionQuality)},
        ${Math.round(row.satelliteQuality)}, ${Math.round(row.marketQuality)},
        ${Math.round(row.overallQuality)},
        ${row.totalProperties}, ${row.propertiesWithComparables},
        ${row.propertiesWithSatellite}, ${row.propertiesWithMarketData},
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        comparableDataQuality = VALUES(comparableDataQuality),
        transactionDataQuality = VALUES(transactionDataQuality),
        satelliteDataQuality = VALUES(satelliteDataQuality),
        marketDataQuality = VALUES(marketDataQuality),
        overallDataQuality = VALUES(overallDataQuality),
        totalProperties = VALUES(totalProperties),
        propertiesWithComparables = VALUES(propertiesWithComparables),
        propertiesWithSatellite = VALUES(propertiesWithSatellite),
        propertiesWithMarketData = VALUES(propertiesWithMarketData),
        recordedAt = VALUES(recordedAt)
    `);

    return row;
  }

  /**
   * Get low confidence valuations that need review
   */
  static async getLowConfidenceValuations(threshold: number = 50, limit: number = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const results = await db
      .select({
        valuation: hybridValuations,
        confidence: confidenceScores,
      })
      .from(hybridValuations)
      .innerJoin(confidenceScores, eq(hybridValuations.id, confidenceScores.valuationId))
      .where(sql`${confidenceScores.overallConfidence} < ${threshold}`)
      .orderBy(confidenceScores.overallConfidence)
      .limit(limit);

    return results;
  }
}
