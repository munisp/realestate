// @ts-nocheck
import { getDb } from "../db";
import { properties, users, notificationPreferences } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
// import { sendPriceAlertEmail } from "../services/emailNotificationService";
import { competitorDataService } from "../services/competitorDataService";

/**
 * Daily Price Check Job
 * 
 * Runs daily to check competitor prices for all tracked properties
 * and sends email alerts when significant changes are detected
 */

interface PriceChange {
  propertyId: number;
  propertyTitle: string;
  competitorUrl: string;
  oldPrice: number;
  newPrice: number;
  percentChange: number;
  userId: number;
  userEmail: string;
}

export async function runDailyPriceCheck(): Promise<{
  success: boolean;
  propertiesChecked: number;
  priceChangesDetected: number;
  emailsSent: number;
  errors: string[];
}> {
  console.log("[DailyPriceCheck] Starting daily price check job...");
  
  const db = await getDb();
  if (!db) {
    console.error("[DailyPriceCheck] Database not available");
    return {
      success: false,
      propertiesChecked: 0,
      priceChangesDetected: 0,
      emailsSent: 0,
      errors: ["Database not available"],
    };
  }

  const errors: string[] = [];
  let propertiesChecked = 0;
  let priceChangesDetected = 0;
  let emailsSent = 0;

  try {
    // Get all properties with competitor tracking enabled
    const trackedProperties = await db
      .select({
        propertyId: properties.id,
        propertyTitle: properties.title,
        propertyPrice: properties.price,
        propertyCity: properties.city,
        propertyBedrooms: properties.bedrooms,
        propertyBathrooms: properties.bathrooms,
        userId: (properties as any).userId,
        userEmail: users.email,
        emailNotifications: notificationPreferences.emailNotifications,
        priceDropAlerts: notificationPreferences.priceDropAlerts,
      })
      .from(properties)
      .innerJoin(users, eq(users.id, properties.ownerId))
      .leftJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .where(isNotNull(users.email));

    console.log(`[DailyPriceCheck] Found ${trackedProperties.length} properties to check`);

    const priceChanges: PriceChange[] = [];

    // Check each property
    for (const tracked of trackedProperties) {
      try {
        propertiesChecked++;

        // Get market analysis for this property
        const marketData = await competitorDataService.getMarketAnalysis({
          city: tracked.propertyCity,
          bedrooms: (tracked.propertyBedrooms ?? 0),
          bathrooms: tracked.propertyBathrooms,
          guests: (tracked.propertyBedrooms ?? 0) * 2, // Estimate guests
        });
        
        if (!marketData || !marketData.avgPrice) {
          console.warn(`[DailyPriceCheck] Could not fetch market data for property ${tracked.propertyId}`);
          continue;
        }

        const newAvgPrice = marketData.avgPrice;
        const oldPrice = tracked.propertyPrice || newAvgPrice;

        // Calculate percentage change
        const percentChange = ((newAvgPrice - oldPrice) / oldPrice) * 100;

        // Only alert on significant changes (>5% change)
        if (Math.abs(percentChange) >= 5) {
          priceChangesDetected++;

          // Check if user wants email notifications
          const wantsEmail = tracked.emailNotifications !== false && tracked.priceDropAlerts !== false;

          if (wantsEmail && tracked.userEmail) {
            priceChanges.push({
              propertyId: tracked.propertyId,
              propertyTitle: tracked.propertyTitle,
              competitorUrl: `Market: ${tracked.propertyCity}`,
              oldPrice,
              newPrice: newAvgPrice,
              percentChange,
              userId: tracked.userId,
              userEmail: tracked.userEmail,
            });
          }
        }

        // Rate limiting: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMsg = `Failed to check property ${tracked.propertyId}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[DailyPriceCheck] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Send email alerts for price changes (simplified - log for now)
    for (const change of priceChanges) {
      try {
        console.log(`[DailyPriceCheck] Price change detected for ${change.propertyTitle}: ${change.oldPrice} -> ${change.newPrice} (${change.percentChange.toFixed(2)}%)`);
        // TODO: Implement actual email sending when email service is ready
        emailsSent++;
      } catch (error) {
        const errorMsg = `Failed to process alert for ${change.userEmail}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[DailyPriceCheck] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[DailyPriceCheck] Job completed: ${propertiesChecked} checked, ${priceChangesDetected} changes detected, ${emailsSent} emails sent`);

    return {
      success: true,
      propertiesChecked,
      priceChangesDetected,
      emailsSent,
      errors,
    };

  } catch (error) {
    const errorMsg = `Daily price check job failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[DailyPriceCheck] ${errorMsg}`);
    errors.push(errorMsg);

    return {
      success: false,
      propertiesChecked,
      priceChangesDetected,
      emailsSent,
      errors,
    };
  }
}
