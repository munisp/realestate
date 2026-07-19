// @ts-nocheck
/**
 * Alert Throttling Service
 * 
 * Prevents alert fatigue by limiting the number of alerts sent to users
 * based on their preferences and intelligent throttling rules
 */

import { getDb } from "../db";
import { valuationAlertsSent, userAlertPreferences } from "../../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// ============================================================================
// Throttling Configuration
// ============================================================================

const DEFAULT_MAX_ALERTS_PER_DAY = 10;
const DEFAULT_MIN_ALERT_INTERVAL_MINUTES = 60; // Minimum 1 hour between alerts
const PRIORITY_THRESHOLD_PERCENTAGE = 10; // Changes > 10% are high priority

// ============================================================================
// Throttling Checks
// ============================================================================

export interface ThrottleCheckResult {
  allowed: boolean;
  reason?: string;
  nextAllowedTime?: Date;
  currentCount?: number;
  maxCount?: number;
}

/**
 * Check if an alert should be sent based on throttling rules
 */
export async function shouldSendAlert(
  userId: number,
  propertyId: number,
  changePercentage: number
): Promise<ThrottleCheckResult> {
  const db = await getDb();
  if (!db) {
    return { allowed: false, reason: "Database unavailable" };
  }

  try {
    // Get user preferences
    const [prefs] = await db
      .select()
      .from(userAlertPreferences)
      .where(eq(userAlertPreferences.userId, userId))
      .limit(1);

    const maxAlertsPerDay = prefs?.maxAlertsPerDay || DEFAULT_MAX_ALERTS_PER_DAY;

    // Check 1: Daily limit
    const dailyLimitCheck = await checkDailyLimit(userId, maxAlertsPerDay);
    if (!dailyLimitCheck.allowed) {
      return dailyLimitCheck;
    }

    // Check 2: Minimum interval between alerts
    const intervalCheck = await checkMinimumInterval(
      userId,
      propertyId,
      DEFAULT_MIN_ALERT_INTERVAL_MINUTES
    );
    if (!intervalCheck.allowed) {
      return intervalCheck;
    }

    // Check 3: Duplicate alert prevention (same property, similar change)
    const duplicateCheck = await checkDuplicateAlert(
      userId,
      propertyId,
      changePercentage
    );
    if (!duplicateCheck.allowed) {
      return duplicateCheck;
    }

    // All checks passed
    return { allowed: true };
  } catch (error) {
    console.error("[AlertThrottling] Error checking throttle:", error);
    return { allowed: false, reason: "Throttling check failed" };
  }
}

/**
 * Check if user has exceeded daily alert limit
 */
async function checkDailyLimit(
  userId: number,
  maxAlertsPerDay: number
): Promise<ThrottleCheckResult> {
  const db = await getDb();
  if (!db) {
    return { allowed: false, reason: "Database unavailable" };
  }

  try {
    // Get alerts sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(valuationAlertsSent)
      .where(
        and(
          eq(valuationAlertsSent.userId, userId),
          gte(valuationAlertsSent.sentAt, today)
        )
      );

    const currentCount = result?.count || 0;

    if (currentCount >= maxAlertsPerDay) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        allowed: false,
        reason: `Daily limit of ${maxAlertsPerDay} alerts reached`,
        nextAllowedTime: tomorrow,
        currentCount,
        maxCount: maxAlertsPerDay,
      };
    }

    return {
      allowed: true,
      currentCount,
      maxCount: maxAlertsPerDay,
    };
  } catch (error) {
    console.error("[AlertThrottling] Error checking daily limit:", error);
    return { allowed: false, reason: "Daily limit check failed" };
  }
}

/**
 * Check if minimum interval has passed since last alert
 */
async function checkMinimumInterval(
  userId: number,
  propertyId: number,
  minIntervalMinutes: number
): Promise<ThrottleCheckResult> {
  const db = await getDb();
  if (!db) {
    return { allowed: false, reason: "Database unavailable" };
  }

  try {
    // Get last alert for this property
    const lastAlert = await db
      .select()
      .from(valuationAlertsSent)
      .where(
        and(
          eq(valuationAlertsSent.userId, userId),
          eq(valuationAlertsSent.propertyId, propertyId)
        )
      )
      .orderBy(sql`${valuationAlertsSent.sentAt} DESC`)
      .limit(1);

    if (lastAlert.length === 0) {
      return { allowed: true };
    }

    const lastAlertTime = new Date(lastAlert[0].sentAt);
    const now = new Date();
    const minutesSinceLastAlert =
      (now.getTime() - lastAlertTime.getTime()) / (1000 * 60);

    if (minutesSinceLastAlert < minIntervalMinutes) {
      const nextAllowedTime = new Date(
        lastAlertTime.getTime() + minIntervalMinutes * 60 * 1000
      );

      return {
        allowed: false,
        reason: `Minimum ${minIntervalMinutes} minute interval not met`,
        nextAllowedTime,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[AlertThrottling] Error checking interval:", error);
    return { allowed: false, reason: "Interval check failed" };
  }
}

/**
 * Check for duplicate alerts (same property, similar change within 24 hours)
 */
async function checkDuplicateAlert(
  userId: number,
  propertyId: number,
  changePercentage: number
): Promise<ThrottleCheckResult> {
  const db = await getDb();
  if (!db) {
    return { allowed: false, reason: "Database unavailable" };
  }

  try {
    // Get alerts for this property in last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const recentAlerts = await db
      .select()
      .from(valuationAlertsSent)
      .where(
        and(
          eq(valuationAlertsSent.userId, userId),
          eq(valuationAlertsSent.propertyId, propertyId),
          gte(valuationAlertsSent.sentAt, yesterday)
        )
      );

    // Check if any recent alert has similar change percentage (within 2%)
    const similarAlert = recentAlerts.find((alert) => {
      // Extract percentage from alert message if available
      const match = alert.alertMessage?.match(/(\d+\.?\d*)%/);
      if (match) {
        const previousChange = parseFloat(match[1]);
        return Math.abs(previousChange - Math.abs(changePercentage)) < 2;
      }
      return false;
    });

    if (similarAlert) {
      return {
        allowed: false,
        reason: "Similar alert already sent in the last 24 hours",
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[AlertThrottling] Error checking duplicates:", error);
    return { allowed: false, reason: "Duplicate check failed" };
  }
}

/**
 * Check if alert is high priority (bypasses some throttling rules)
 */
export function isHighPriorityAlert(changePercentage: number): boolean {
  return Math.abs(changePercentage) >= PRIORITY_THRESHOLD_PERCENTAGE;
}

/**
 * Get throttling stats for a user
 */
export async function getThrottlingStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get user preferences
    const [prefs] = await db
      .select()
      .from(userAlertPreferences)
      .where(eq(userAlertPreferences.userId, userId))
      .limit(1);

    const maxAlertsPerDay = prefs?.maxAlertsPerDay || DEFAULT_MAX_ALERTS_PER_DAY;

    // Get alerts sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(valuationAlertsSent)
      .where(
        and(
          eq(valuationAlertsSent.userId, userId),
          gte(valuationAlertsSent.sentAt, today)
        )
      );

    // Get alerts sent this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [weekCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(valuationAlertsSent)
      .where(
        and(
          eq(valuationAlertsSent.userId, userId),
          gte(valuationAlertsSent.sentAt, weekAgo)
        )
      );

    return {
      alertsSentToday: todayCount?.count || 0,
      alertsSentThisWeek: weekCount?.count || 0,
      maxAlertsPerDay,
      remainingToday: Math.max(0, maxAlertsPerDay - (todayCount?.count || 0)),
      throttlingActive: (todayCount?.count || 0) >= maxAlertsPerDay,
    };
  } catch (error) {
    console.error("[AlertThrottling] Error getting stats:", error);
    return null;
  }
}

/**
 * Update user's max alerts per day preference
 */
export async function updateMaxAlertsPerDay(
  userId: number,
  maxAlertsPerDay: number
) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Validate range (1-50 alerts per day)
    const validMax = Math.max(1, Math.min(50, maxAlertsPerDay));

    await db
      .update(userAlertPreferences)
      .set({ maxAlertsPerDay: validMax })
      .where(eq(userAlertPreferences.userId, userId));

    return true;
  } catch (error) {
    console.error("[AlertThrottling] Error updating max alerts:", error);
    return false;
  }
}
