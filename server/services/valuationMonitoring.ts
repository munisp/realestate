// @ts-nocheck
/**
 * Valuation Monitoring Service
 * 
 * Monitors property valuations for changes and sends alerts to users
 */

import { getDb } from "../db";
import {
  valuationMonitoring,
  valuationChangeHistory,
  valuationAlertsSent,
  userAlertPreferences,
  InsertValuationMonitoring,
  InsertValuationChangeHistory,
  InsertValuationAlertSent,
  InsertUserAlertPreferences,
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { renderValuationIncreaseEmail, renderValuationDecreaseEmail } from "./emailTemplateService";
import { sendEmail } from "./emailService";
import { shouldSendAlert, isHighPriorityAlert } from "./alertThrottling";
// import { notifyUser } from "../_core/notification"; // TODO: Fix import

// ============================================================================
// Monitoring Management
// ============================================================================

export async function createMonitoring(data: InsertValuationMonitoring) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [inserted] = await db.insert(valuationMonitoring).values(data).returning();
    return (inserted as any)?.id ?? null;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to create monitoring:", error);
    return null;
  }
}

export async function getUserMonitoring(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const monitoring = await db
      .select()
      .from(valuationMonitoring)
      .where(and(
        eq(valuationMonitoring.userId, userId),
        eq(valuationMonitoring.isActive, 1)
      ));
    return monitoring;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to get monitoring:", error);
    return [];
  }
}

export async function updateMonitoring(
  id: number,
  updates: Partial<InsertValuationMonitoring>
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(valuationMonitoring)
      .set(updates)
      .where(eq(valuationMonitoring.id, id));
    return true;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to update monitoring:", error);
    return false;
  }
}

export async function deleteMonitoring(id: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(valuationMonitoring)
      .set({ isActive: 0 })
      .where(eq(valuationMonitoring.id, id));
    return true;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to delete monitoring:", error);
    return false;
  }
}

// ============================================================================
// Valuation Change Detection
// ============================================================================

export async function checkValuationChanges(propertyId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get all active monitoring for this property
    const monitors = await db
      .select()
      .from(valuationMonitoring)
      .where(and(
        eq(valuationMonitoring.propertyId, propertyId),
        eq(valuationMonitoring.isActive, 1)
      ));

    if (monitors.length === 0) return null;

    // Get current valuation (from ML service or database)
    // TODO: Call ML service to get latest valuation
    const currentValuation = 125000000; // Placeholder

    const changes = [];

    for (const monitor of (monitors as any[])) {
      if (!monitor.lastValuation) {
        // First time checking, just update last valuation
        await updateMonitoring(monitor.id, {
          lastValuation: currentValuation,
          lastCheckedAt: new Date(),
        });
        continue;
      }

      // Calculate change
      const changeAmount = currentValuation - monitor.lastValuation;
      const changePercentage = (changeAmount / monitor.lastValuation) * 100;
      const absChangePercentage = Math.abs(changePercentage);

      // Check if change exceeds threshold
      const threshold = parseFloat(monitor.alertThreshold.toString());
      
      const shouldAlert = 
        (monitor.alertType === "both" && absChangePercentage >= threshold) ||
        (monitor.alertType === "increase" && changePercentage >= threshold) ||
        (monitor.alertType === "decrease" && changePercentage <= -threshold);

      if (shouldAlert) {
        // Record change in history
        const [changeRecord] = await db.insert(valuationChangeHistory).values({
          propertyId,
          previousValuation: monitor.lastValuation,
          newValuation: currentValuation,
          changeAmount,
          changePercentage: changePercentage.toFixed(2),
          changeReason: JSON.stringify({
            factors: ["market_trend", "neighborhood_development"],
          }),
          detectionMethod: "scheduled",
        });

        changes.push({
          monitoringId: monitor.id,
          changeHistoryId: changeRecord.insertId,
          userId: monitor.userId,
          propertyId,
          changeAmount,
          changePercentage,
          previousValuation: monitor.lastValuation || 0,
          newValuation: currentValuation,
        });

        // Update last valuation and check time
        await updateMonitoring(monitor.id, {
          lastValuation: currentValuation,
          lastCheckedAt: new Date(),
        });
      }
    }

    return changes;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to check changes:", error);
    return null;
  }
}

// ============================================================================
// Alert Sending
// ============================================================================

export async function sendValuationAlert(
  monitoringId: number,
  changeHistoryId: number,
  userId: number,
  propertyId: number,
  changeAmount: number,
  changePercentage: number,
  previousValuation: number,
  newValuation: number
) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Get user alert preferences
    const [prefs] = await db
      .select()
      .from(userAlertPreferences)
      .where(eq(userAlertPreferences.userId, userId))
      .limit(1);

    if (!prefs || !prefs.valuationChangeAlerts) {
      console.log(`[ValuationMonitoring] User ${userId} has valuation alerts disabled`);
      return false;
    }

    // Check throttling (unless high priority)
    const isHighPriority = isHighPriorityAlert(changePercentage);
    if (!isHighPriority) {
      const throttleCheck = await shouldSendAlert(userId, propertyId, changePercentage);
      if (!throttleCheck.allowed) {
        console.log(`[ValuationMonitoring] Alert throttled for user ${userId}:`, throttleCheck.reason);
        return false;
      }
    } else {
      console.log(`[ValuationMonitoring] High priority alert (${Math.abs(changePercentage).toFixed(1)}% change) - bypassing throttle`);
    }

    // Check quiet hours
    const now = new Date();
    const currentHour = now.getHours();
    if (
      prefs.quietHoursStart !== null &&
      prefs.quietHoursEnd !== null &&
      currentHour >= prefs.quietHoursStart &&
      currentHour < prefs.quietHoursEnd
    ) {
      console.log(`[ValuationMonitoring] User ${userId} in quiet hours`);
      return false;
    }

    // Format alert message
    const direction = changeAmount > 0 ? "increased" : "decreased";
    const absChangePercentage = Math.abs(changePercentage);
    const formattedAmount = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(Math.abs(changeAmount));

    const alertTitle = `Property Valuation ${direction === "increased" ? "📈" : "📉"}`;
    const alertMessage = `Your saved property valuation has ${direction} by ${absChangePercentage.toFixed(1)}% (${formattedAmount}). View updated valuation now.`;

    // Send alerts based on preferences
    const deliveryMethods: Array<"email" | "push" | "in_app"> = [];
    if (prefs.emailAlertsEnabled) deliveryMethods.push("email");
    if (prefs.pushAlertsEnabled) deliveryMethods.push("push");
    if (prefs.inAppAlertsEnabled) deliveryMethods.push("in_app");

    for (const method of (deliveryMethods as any[])) {
      // Record alert
      const [alertRecord] = await db.insert(valuationAlertsSent).values({
        monitoringId,
        changeHistoryId,
        userId,
        propertyId,
        deliveryMethod: method,
        deliveryStatus: "pending",
        alertTitle,
        alertMessage,
      });

      // Send via appropriate channel
      if (method === "email") {
        try {
          // Get user and property details
          const [user] = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);
          const [property] = await db.execute(sql`SELECT * FROM properties WHERE id = ${propertyId}`);
          
          if (user && property) {
            const userData = user as any;
            const propertyData = property as any;
            
            // Render appropriate template
            const emailHtml = direction === "increased"
              ? await renderValuationIncreaseEmail({
                  userName: userData.name || "Valued Customer",
                  propertyAddress: propertyData.address || "Property",
                  propertyCity: propertyData.city || "",
                  propertyState: propertyData.state || "",
                  propertyZip: propertyData.zipCode || "",
                  propertyImage: propertyData.images?.[0],
                  previousValuation: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(previousValuation),
                  newValuation: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(newValuation),
                  changeAmount: formattedAmount,
                  changePercent: absChangePercentage.toFixed(2),
                  valuationDate: new Date().toLocaleDateString(),
                  propertyUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/property/${propertyId}/valuation`,
                  insights: [
                    "Recent comparable sales in the area have increased",
                    "Market demand for similar properties is strong",
                    "Property improvements may have contributed to value increase"
                  ],
                })
              : await renderValuationDecreaseEmail({
                  userName: userData.name || "Valued Customer",
                  propertyAddress: propertyData.address || "Property",
                  propertyCity: propertyData.city || "",
                  propertyState: propertyData.state || "",
                  propertyZip: propertyData.zipCode || "",
                  propertyImage: propertyData.images?.[0],
                  previousValuation: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(previousValuation),
                  newValuation: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(newValuation),
                  changeAmount: formattedAmount,
                  changePercent: absChangePercentage.toFixed(2),
                  valuationDate: new Date().toLocaleDateString(),
                  propertyUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/property/${propertyId}/valuation`,
                  insights: [
                    "Market conditions in the area have softened",
                    "Increased inventory may be affecting values",
                    "This may be a temporary market adjustment"
                  ],
                });
            
            // Send email
            await sendEmail({
              to: userData.email,
              subject: alertTitle,
              html: emailHtml,
              alertType: "valuation",
              userId,
              propertyId,
            });
            
            // Update delivery status
            await db
              .update(valuationAlertsSent)
              .set({
                deliveryStatus: "sent",
                sentAt: new Date(),
              })
              .where(eq(valuationAlertsSent.id, alertRecord.insertId));
          }
        } catch (error) {
          console.error("[ValuationMonitoring] Failed to send email:", error);
          await db
            .update(valuationAlertsSent)
            .set({
              deliveryStatus: "failed",
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            })
            .where(eq(valuationAlertsSent.id, alertRecord.insertId));
        }
      } else if (method === "in_app") {
        // Use built-in notification system
        // TODO: Implement user notification system
        // await notifyUser({
        //   userId,
        //   title: alertTitle,
        //   content: alertMessage,
        //   link: `/property/${propertyId}/valuation`,
        // });

        // Update delivery status
        await db
          .update(valuationAlertsSent)
          .set({
            deliveryStatus: "sent",
            sentAt: new Date(),
          })
          .where(eq(valuationAlertsSent.id, alertRecord.insertId));
      }
      // TODO: Implement push notification sending
    }

    // Update last alert sent time
    await updateMonitoring(monitoringId, {
      lastAlertSentAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to send alert:", error);
    return false;
  }
}

// ============================================================================
// Batch Processing
// ============================================================================

export async function processAllMonitoring() {
  const db = await getDb();
  if (!db) return { processed: 0, alerts: 0 };

  try {
    console.log("[ValuationMonitoring] Starting batch processing...");

    // Get all active monitoring
    const monitors = await db
      .select()
      .from(valuationMonitoring)
      .where(eq(valuationMonitoring.isActive, 1));

    console.log(`[ValuationMonitoring] Found ${monitors.length} active monitors`);

    let processed = 0;
    let alertsSent = 0;

    // Group by property to avoid duplicate API calls
    const propertiesById = new Map<number, typeof monitors>();
    for (const monitor of (monitors as any[])) {
      if (!propertiesById.has(monitor.propertyId)) {
        propertiesById.set(monitor.propertyId, []);
      }
      propertiesById.get(monitor.propertyId)!.push(monitor);
    }

    // Process each property
    for (const [propertyId, propertyMonitors] of propertiesById) {
      const changes = await checkValuationChanges(propertyId);
      
      if (changes && changes.length > 0) {
        for (const change of (changes as any[])) {
          const sent = await sendValuationAlert(
            change.monitoringId,
            change.changeHistoryId,
            change.userId,
            change.propertyId,
            change.changeAmount,
            change.changePercentage,
            change.previousValuation,
            change.newValuation
          );
          if (sent) alertsSent++;
        }
      }

      processed++;
    }

    console.log(`[ValuationMonitoring] Processed ${processed} properties, sent ${alertsSent} alerts`);

    return { processed, alerts: alertsSent };
  } catch (error) {
    console.error("[ValuationMonitoring] Batch processing failed:", error);
    return { processed: 0, alerts: 0 };
  }
}

// ============================================================================
// User Preferences
// ============================================================================

export async function getUserAlertPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [prefs] = await db
      .select()
      .from(userAlertPreferences)
      .where(eq(userAlertPreferences.userId, userId))
      .limit(1);

    // Create default preferences if none exist
    if (!prefs) {
      const [result] = (await db.insert(userAlertPreferences).values({ userId }) as any);
      const [newPrefs] = await db
        .select()
        .from(userAlertPreferences)
        .where(eq(userAlertPreferences.userId, userId))
        .limit(1);
      return newPrefs;
    }

    return prefs;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to get preferences:", error);
    return null;
  }
}

export async function updateUserAlertPreferences(
  userId: number,
  updates: Partial<InsertUserAlertPreferences>
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(userAlertPreferences)
      .set(updates)
      .where(eq(userAlertPreferences.userId, userId));
    return true;
  } catch (error) {
    console.error("[ValuationMonitoring] Failed to update preferences:", error);
    return false;
  }
}
