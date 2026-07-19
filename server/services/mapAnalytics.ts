/**
 * Map Analytics Service
 * Tracks map provider usage, performance, and user behavior for A/B testing
 */

import { getDb } from '../db';
import { sql } from 'drizzle-orm';

export interface MapAnalyticsEvent {
  userId?: number;
  sessionId: string;
  provider: 'google' | 'maplibre';
  eventType: 'load' | 'interaction' | 'error' | 'switch';
  loadTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface MapPerformanceMetrics {
  provider: 'google' | 'maplibre';
  avgLoadTime: number;
  errorRate: number;
  totalEvents: number;
  uniqueUsers: number;
  switchRate: number;
}

/**
 * Track map analytics event
 */
export async function trackMapEvent(event: MapAnalyticsEvent): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[Map Analytics] Database not available');
    return;
  }

  try {
    await db.execute(sql`
      INSERT INTO map_analytics (
        user_id,
        session_id,
        provider,
        event_type,
        load_time,
        error_message,
        metadata,
        created_at
      ) VALUES (
        ${event.userId || null},
        ${event.sessionId},
        ${event.provider},
        ${event.eventType},
        ${event.loadTime || null},
        ${event.errorMessage || null},
        ${event.metadata ? JSON.stringify(event.metadata) : null},
        NOW()
      )
    `);
  } catch (error) {
    console.error('[Map Analytics] Failed to track event:', error);
  }
}

/**
 * Get performance metrics for a provider
 */
export async function getProviderMetrics(
  provider: 'google' | 'maplibre',
  startDate?: Date,
  endDate?: Date
): Promise<MapPerformanceMetrics | null> {
  const db = await getDb();
  if (!db) {
    console.warn('[Map Analytics] Database not available');
    return null;
  }

  try {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const end = endDate || new Date();

    const result = await db.execute(sql`
      SELECT
        provider,
        AVG(load_time) as avg_load_time,
        SUM(CASE WHEN event_type = 'error' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as error_rate,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(CASE WHEN event_type = 'switch' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as switch_rate
      FROM map_analytics
      WHERE provider = ${provider}
        AND created_at >= ${start}
        AND created_at <= ${end}
      GROUP BY provider
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        provider,
        avgLoadTime: parseFloat(row.avg_load_time || '0'),
        errorRate: parseFloat(row.error_rate || '0'),
        totalEvents: parseInt(row.total_events || '0'),
        uniqueUsers: parseInt(row.unique_users || '0'),
        switchRate: parseFloat(row.switch_rate || '0'),
      };
    }

    return null;
  } catch (error) {
    console.error('[Map Analytics] Failed to get metrics:', error);
    return null;
  }
}

/**
 * Compare performance between providers
 */
export async function compareProviders(
  startDate?: Date,
  endDate?: Date
): Promise<{
  google: MapPerformanceMetrics | null;
  maplibre: MapPerformanceMetrics | null;
  winner: 'google' | 'maplibre' | 'tie';
  recommendation: string;
}> {
  const googleMetrics = await getProviderMetrics('google', startDate, endDate);
  const maplibreMetrics = await getProviderMetrics('maplibre', startDate, endDate);

  // Determine winner based on weighted score
  let winner: 'google' | 'maplibre' | 'tie' = 'tie';
  let recommendation = 'Insufficient data for recommendation';

  if (googleMetrics && maplibreMetrics) {
    // Score calculation (lower is better)
    const googleScore =
      googleMetrics.avgLoadTime * 0.4 + // 40% weight on load time
      googleMetrics.errorRate * 100 * 0.4 + // 40% weight on error rate
      googleMetrics.switchRate * 100 * 0.2; // 20% weight on switch rate (users switching away)

    const maplibreScore =
      maplibreMetrics.avgLoadTime * 0.4 +
      maplibreMetrics.errorRate * 100 * 0.4 +
      maplibreMetrics.switchRate * 100 * 0.2;

    const scoreDiff = Math.abs(googleScore - maplibreScore);

    if (scoreDiff < 5) {
      winner = 'tie';
      recommendation = 'Both providers perform similarly. Consider cost savings with MapLibre.';
    } else if (googleScore < maplibreScore) {
      winner = 'google';
      recommendation = `Google Maps performs ${scoreDiff.toFixed(1)}% better. Continue testing MapLibre optimizations.`;
    } else {
      winner = 'maplibre';
      recommendation = `MapLibre performs ${scoreDiff.toFixed(1)}% better. Consider increasing MapLibre rollout.`;
    }
  } else if (googleMetrics) {
    recommendation = 'Only Google Maps data available. Enable MapLibre for comparison.';
  } else if (maplibreMetrics) {
    recommendation = 'Only MapLibre data available. Enable Google Maps for comparison.';
  }

  return {
    google: googleMetrics,
    maplibre: maplibreMetrics,
    winner,
    recommendation,
  };
}

/**
 * Get A/B test assignment for a user
 * Returns 'google' or 'maplibre' based on user ID hash
 */
export function getABTestAssignment(
  userId: number | string,
  rolloutPercentage: number = 10 // % of users to assign to MapLibre
): 'google' | 'maplibre' {
  // Hash user ID to get consistent assignment
  const hash = hashCode(userId.toString());
  const bucket = Math.abs(hash) % 100;

  return bucket < rolloutPercentage ? 'maplibre' : 'google';
}

/**
 * Simple hash function for consistent A/B test assignment
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get daily analytics summary
 */
export async function getDailyAnalytics(days: number = 7): Promise<
  Array<{
    date: string;
    google_loads: number;
    maplibre_loads: number;
    google_errors: number;
    maplibre_errors: number;
    google_avg_load_time: number;
    maplibre_avg_load_time: number;
  }>
> {
  const db = await getDb();
  if (!db) {
    console.warn('[Map Analytics] Database not available');
    return [];
  }

  try {
    const result = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN provider = 'google' AND event_type = 'load' THEN 1 ELSE 0 END) as google_loads,
        SUM(CASE WHEN provider = 'maplibre' AND event_type = 'load' THEN 1 ELSE 0 END) as maplibre_loads,
        SUM(CASE WHEN provider = 'google' AND event_type = 'error' THEN 1 ELSE 0 END) as google_errors,
        SUM(CASE WHEN provider = 'maplibre' AND event_type = 'error' THEN 1 ELSE 0 END) as maplibre_errors,
        AVG(CASE WHEN provider = 'google' AND load_time IS NOT NULL THEN load_time END) as google_avg_load_time,
        AVG(CASE WHEN provider = 'maplibre' AND load_time IS NOT NULL THEN load_time END) as maplibre_avg_load_time
      FROM map_analytics
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    return (result.rows || []) as any[];
  } catch (error) {
    console.error('[Map Analytics] Failed to get daily analytics:', error);
    return [];
  }
}
