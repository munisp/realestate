/**
 * Valuation Analytics Service
 * 
 * Tracks user engagement with AI-powered property valuations
 */

import { getDb } from "../db";
import { 
  valuationViews, 
  valuationTabEngagement, 
  valuationConversions,
  valuationFeedback,
  InsertValuationView,
  InsertValuationTabEngagement,
  InsertValuationConversion,
  InsertValuationFeedback
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

// ============================================================================
// View Tracking
// ============================================================================

export async function trackValuationView(data: InsertValuationView) {
  const db = await getDb();
  if (!db) {
    console.warn("[ValuationAnalytics] Database not available");
    return null;
  }

  try {
    const [inserted] = await db.insert(valuationViews).values(data).returning();
    return (inserted as any)?.id ?? null;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to track view:", error);
    return null;
  }
}

export async function updateValuationView(
  viewId: number,
  updates: Partial<InsertValuationView>
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(valuationViews)
      .set(updates)
      .where(eq(valuationViews.id, viewId));
    return true;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to update view:", error);
    return false;
  }
}

// ============================================================================
// Tab Engagement Tracking
// ============================================================================

export async function trackTabEngagement(data: InsertValuationTabEngagement) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [inserted] = await db.insert(valuationTabEngagement).values(data).returning();
    return (inserted as any)?.id ?? null;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to track tab engagement:", error);
    return null;
  }
}

export async function getTabEngagementStats(propertyId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const stats = await db
      .select({
        tabName: valuationTabEngagement.tabName,
        avgTimeSpent: sql<number>`AVG(${valuationTabEngagement.timeSpentSeconds})`,
        totalViews: sql<number>`COUNT(*)`,
        avgInteractions: sql<number>`AVG(${valuationTabEngagement.interactionCount})`,
      })
      .from(valuationTabEngagement)
      .where(eq(valuationTabEngagement.propertyId, propertyId))
      .groupBy(valuationTabEngagement.tabName);

    return stats;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to get tab stats:", error);
    return null;
  }
}

// ============================================================================
// Conversion Tracking
// ============================================================================

export async function trackConversion(data: InsertValuationConversion) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [result] = (await db.insert(valuationConversions).values(data) as any);
    
    // Also update the view record
    if (data.viewId) {
      const updateField = 
        data.conversionType === "contact_agent" ? "contactedAgent" :
        data.conversionType === "schedule_tour" ? "scheduledTour" :
        data.conversionType === "add_favorite" ? "addedToFavorites" : null;
      
      if (updateField) {
        await db
          .update(valuationViews)
          .set({ [updateField]: 1 })
          .where(eq(valuationViews.id, data.viewId));
      }
    }
    
    return (result as any)?.id;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to track conversion:", error);
    return null;
  }
}

export async function getConversionRate(
  propertyId?: number,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const conditions = [];
    if (propertyId) conditions.push(eq(valuationViews.propertyId, propertyId));
    if (startDate) conditions.push(gte(valuationViews.createdAt, startDate));
    if (endDate) conditions.push(lte(valuationViews.createdAt, endDate));

    const [stats] = await db
      .select({
        totalViews: sql<number>`COUNT(*)`,
        contactedAgent: sql<number>`SUM(${valuationViews.contactedAgent})`,
        scheduledTour: sql<number>`SUM(${valuationViews.scheduledTour})`,
        addedToFavorites: sql<number>`SUM(${valuationViews.addedToFavorites})`,
      })
      .from(valuationViews)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      totalViews: stats?.totalViews || 0,
      contactRate: (stats?.contactedAgent || 0) / (stats?.totalViews || 1),
      tourRate: (stats?.scheduledTour || 0) / (stats?.totalViews || 1),
      favoriteRate: (stats?.addedToFavorites || 0) / (stats?.totalViews || 1),
    };
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to get conversion rate:", error);
    return null;
  }
}

// ============================================================================
// Feedback Tracking
// ============================================================================

export async function trackFeedback(data: InsertValuationFeedback) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [inserted] = await db.insert(valuationFeedback).values(data).returning();
    return (inserted as any)?.id ?? null;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to track feedback:", error);
    return null;
  }
}

export async function getAverageFeedback(propertyId?: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const condition = propertyId ? eq(valuationFeedback.propertyId, propertyId) : undefined;

    const [stats] = await db
      .select({
        avgRating: sql<number>`AVG(${valuationFeedback.rating})`,
        avgAccuracy: sql<number>`AVG(${valuationFeedback.accuracyRating})`,
        avgUsefulness: sql<number>`AVG(${valuationFeedback.usefulnessRating})`,
        totalFeedback: sql<number>`COUNT(*)`,
      })
      .from(valuationFeedback)
      .where(condition);

    return stats;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to get feedback stats:", error);
    return null;
  }
}

// ============================================================================
// Analytics Dashboard Data
// ============================================================================

export async function getValuationAnalyticsDashboard(
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const conditions = [];
    if (startDate) conditions.push(gte(valuationViews.createdAt, startDate));
    if (endDate) conditions.push(lte(valuationViews.createdAt, endDate));

    // Overall metrics
    const [overall] = await db
      .select({
        totalViews: sql<number>`COUNT(*)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${valuationViews.userId})`,
        avgDuration: sql<number>`AVG(${valuationViews.viewDurationSeconds})`,
        avgScrollDepth: sql<number>`AVG(${valuationViews.scrollDepth})`,
        totalConversions: sql<number>`SUM(${valuationViews.contactedAgent} + ${valuationViews.scheduledTour} + ${valuationViews.addedToFavorites})`,
      })
      .from(valuationViews)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Top properties by views
    const topProperties = await db
      .select({
        propertyId: valuationViews.propertyId,
        views: sql<number>`COUNT(*)`,
        conversions: sql<number>`SUM(${valuationViews.contactedAgent} + ${valuationViews.scheduledTour})`,
      })
      .from(valuationViews)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(valuationViews.propertyId)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    // Device breakdown
    const deviceStats = await db
      .select({
        deviceType: valuationViews.deviceType,
        count: sql<number>`COUNT(*)`,
      })
      .from(valuationViews)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(valuationViews.deviceType);

    // Referrer sources
    const referrerStats = await db
      .select({
        referrerPage: valuationViews.referrerPage,
        count: sql<number>`COUNT(*)`,
      })
      .from(valuationViews)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(valuationViews.referrerPage)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    return {
      overall,
      topProperties,
      deviceStats,
      referrerStats,
    };
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to get dashboard data:", error);
    return null;
  }
}

// ============================================================================
// Funnel Analysis
// ============================================================================

export async function getValuationFunnel(
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const conditions = [];
    if (startDate) conditions.push(gte(valuationViews.createdAt, startDate));
    if (endDate) conditions.push(lte(valuationViews.createdAt, endDate));

    const [funnel] = await db
      .select({
        totalViews: sql<number>`COUNT(*)`,
        viewedVisual: sql<number>`SUM(CASE WHEN ${valuationViews.tabsViewed} LIKE '%visual%' THEN 1 ELSE 0 END)`,
        viewedNeighborhood: sql<number>`SUM(CASE WHEN ${valuationViews.tabsViewed} LIKE '%neighborhood%' THEN 1 ELSE 0 END)`,
        viewedAltData: sql<number>`SUM(CASE WHEN ${valuationViews.tabsViewed} LIKE '%altdata%' THEN 1 ELSE 0 END)`,
        addedFavorite: sql<number>`SUM(${valuationViews.addedToFavorites})`,
        contacted: sql<number>`SUM(${valuationViews.contactedAgent})`,
        scheduledTour: sql<number>`SUM(${valuationViews.scheduledTour})`,
      })
      .from(valuationViews)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return funnel;
  } catch (error) {
    console.error("[ValuationAnalytics] Failed to get funnel data:", error);
    return null;
  }
}
