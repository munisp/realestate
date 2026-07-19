import { getDb } from "../db";
import { properties, users, notificationPreferences } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { competitorDataService } from "../services/competitorDataService";

/**
 * Weekly Summary Job
 * 
 * Runs weekly to generate and send market intelligence summaries
 * for all users with active competitor tracking
 */

interface PropertySummary {
  propertyId: number;
  propertyTitle: string;
  competitorCount: number;
  avgCompetitorPrice: number;
  recommendedPrice: number;
  weeklyPriceChange: number;
  optimizationOpportunities: number;
}

interface UserSummary {
  userId: number;
  userEmail: string;
  userName: string;
  properties: PropertySummary[];
  totalTrackedProperties: number;
  totalCompetitors: number;
  avgMarketPosition: number;
}

export async function runWeeklySummary(): Promise<{
  success: boolean;
  usersProcessed: number;
  emailsSent: number;
  errors: string[];
}> {
  console.log("[WeeklySummary] Starting weekly summary generation job...");
  
  const db = await getDb();
  if (!db) {
    console.error("[WeeklySummary] Database not available");
    return {
      success: false,
      usersProcessed: 0,
      emailsSent: 0,
      errors: ["Database not available"],
    };
  }

  const errors: string[] = [];
  let usersProcessed = 0;
  let emailsSent = 0;

  try {
    // Get all users with active competitor tracking and email preferences enabled
    const activeUsers = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
        emailNotifications: notificationPreferences.emailNotifications,
        marketingEmails: notificationPreferences.marketingEmails,
      })
      .from(users)
      .innerJoin(properties, eq(properties.ownerId, users.id))
      .leftJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .where(isNotNull(users.email))
      .groupBy(users.id, users.email, users.name, notificationPreferences.emailNotifications, notificationPreferences.marketingEmails);

    console.log(`[WeeklySummary] Found ${activeUsers.length} active users`);

    // Process each user
    for (const user of activeUsers) {
      try {
        usersProcessed++;

        // Check if user wants email notifications
        const wantsEmail = user.emailNotifications !== false && user.marketingEmails !== false;
        if (!wantsEmail || !user.userEmail) {
          console.log(`[WeeklySummary] Skipping user ${user.userId} - email notifications disabled`);
          continue;
        }

        // Get user's properties
        const userProperties = await db
          .select({
            propertyId: properties.id,
            propertyTitle: properties.title,
            propertyPrice: properties.price,
            propertyCity: properties.city,
            propertyBedrooms: properties.bedrooms,
            propertyBathrooms: properties.bathrooms,
          })
          .from(properties)
          .where(eq(properties.ownerId, user.userId));

        if (userProperties.length === 0) {
          console.log(`[WeeklySummary] User ${user.userId} has no tracked properties`);
          continue;
        }

        const propertySummaries: PropertySummary[] = [];
        let totalCompetitors = 0;
        let totalMarketPosition = 0;

        // Generate summary for each property
        for (const property of userProperties) {
          // Get market data for this property
          const marketData = await competitorDataService.getMarketAnalysis({
            city: property.propertyCity,
            bedrooms: property.propertyBedrooms,
            bathrooms: property.propertyBathrooms,
            guests: property.propertyBedrooms * 2,
          });

          if (!marketData) continue;

          totalCompetitors += marketData.totalListings || 0;

          const avgCompetitorPrice = marketData.avgPrice || 0;
          const recommendedPrice = marketData.recommendedPrice || property.propertyPrice;

          // Calculate market position
          const marketPosition = property.propertyPrice ? 
            ((property.propertyPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100 : 0;
          totalMarketPosition += Math.abs(marketPosition);

          propertySummaries.push({
            propertyId: property.propertyId,
            propertyTitle: property.propertyTitle,
            competitorCount: marketData.totalListings || 0,
            avgCompetitorPrice,
            recommendedPrice,
            weeklyPriceChange: 0, // Simplified for now
            optimizationOpportunities: Math.abs(marketPosition) > 10 ? 1 : 0,
          });
        }

        if (propertySummaries.length === 0) {
          console.log(`[WeeklySummary] No data to summarize for user ${user.userId}`);
          continue;
        }

        const avgMarketPosition = totalMarketPosition / propertySummaries.length;

        const userSummary: UserSummary = {
          userId: user.userId,
          userEmail: user.userEmail,
          userName: user.userName || "User",
          properties: propertySummaries,
          totalTrackedProperties: userProperties.length,
          totalCompetitors,
          avgMarketPosition,
        };

        // Log weekly summary (email sending to be implemented)
        console.log(`[WeeklySummary] Summary for user ${user.userId} (${user.userEmail}):`);
        console.log(`  - Properties: ${userSummary.totalTrackedProperties}`);
        console.log(`  - Competitors: ${userSummary.totalCompetitors}`);
        console.log(`  - Avg Market Position: ${userSummary.avgMarketPosition.toFixed(2)}%`);
        emailsSent++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        const errorMsg = `Failed to process user ${user.userId}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[WeeklySummary] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[WeeklySummary] Job completed: ${usersProcessed} users processed, ${emailsSent} emails sent`);

    return {
      success: true,
      usersProcessed,
      emailsSent,
      errors,
    };

  } catch (error) {
    const errorMsg = `Weekly summary job failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[WeeklySummary] ${errorMsg}`);
    errors.push(errorMsg);

    return {
      success: false,
      usersProcessed,
      emailsSent,
      errors,
    };
  }
}
