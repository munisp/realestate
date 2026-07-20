// @ts-nocheck
import { getDb } from "../db";
import { users, properties, favorites, savedSearches, recommendationPreferences } from "../../drizzle/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { logger } from "../_core/logger";

/**
 * Weekly recommendation digest service
 * Analyzes new listings and sends personalized recommendations to users
 */

interface RecommendationResult {
  propertyId: number;
  matchScore: number;
  reason: string;
}

/**
 * Generate personalized recommendations for a single user
 */
async function generateUserRecommendations(
  userId: number,
  newListings: any[]
): Promise<RecommendationResult[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get user's favorites
    const userFavorites = await db
      .select({
        property: properties,
      })
      .from(favorites)
      .innerJoin(properties, eq(favorites.propertyId, properties.id))
      .where(eq(favorites.userId, userId))
      .limit(10);

    // Get user's saved searches
    const userSearches = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .limit(5);

    if (userFavorites.length === 0 && userSearches.length === 0) {
      return []; // No data to base recommendations on
    }

    // Prepare context for LLM
    const favoritesContext = userFavorites.map((f) => ({
      type: f.property.propertyType,
      price: f.property.price,
      bedrooms: f.property.bedrooms,
      bathrooms: f.property.bathrooms,
      city: f.property.city,
      state: f.property.state,
    }));

    const searchesContext = userSearches.map((s) => {
      try {
        return JSON.parse(s.searchCriteria);
      } catch {
        return {};
      }
    });

    const candidatesContext = newListings.slice(0, 20).map((p) => ({
      id: p.id,
      type: p.propertyType,
      price: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      city: p.city,
      state: p.state,
      title: p.title,
    }));

    // Use LLM to analyze and recommend
    const prompt = `You are a real estate recommendation engine. Analyze the user's preferences and recommend the top 3 properties from the candidates.

User's Favorite Properties:
${JSON.stringify(favoritesContext, null, 2)}

User's Saved Searches:
${JSON.stringify(searchesContext, null, 2)}

New Property Candidates:
${JSON.stringify(candidatesContext, null, 2)}

Return a JSON array of exactly 3 recommendations with this structure:
[
  {
    "propertyId": <number>,
    "matchScore": <number 0-100>,
    "reason": "<one sentence explaining why this property matches user preferences>"
  }
]

Focus on matching property type, price range, location preferences, and features like bedrooms/bathrooms. Provide diverse recommendations.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful real estate recommendation assistant. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    propertyId: { type: "number" },
                    matchScore: { type: "number" },
                    reason: { type: "string" },
                  },
                  required: ["propertyId", "matchScore", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const result = JSON.parse(content);
    return result.recommendations || [];
  } catch (error) {
    logger.error(`[RecommendationDigest] Error generating recommendations for user ${userId}:`, { error: String(error) });
    return [];
  }
}

/**
 * Send weekly digest email to a user
 */
async function sendDigestEmail(
  userId: number,
  userName: string,
  userEmail: string,
  recommendations: RecommendationResult[],
  properties: any[],
  matchScoreThreshold: number = 70
) {
  // Filter recommendations by match score threshold
  const filteredRecommendations = recommendations.filter(
    (rec) => rec.matchScore >= matchScoreThreshold
  );

  if (filteredRecommendations.length === 0) return;

  const propertyDetails = filteredRecommendations
    .map((rec) => {
      const property = properties.find((p) => p.id === rec.propertyId);
      if (!property) return null;

      return `
**${property.title || property.addressLine1}**
- Location: ${property.city}, ${property.state}
- Price: $${property.price.toLocaleString()}
- ${property.bedrooms} beds, ${property.bathrooms} baths
- Match Score: ${rec.matchScore}%
- Why: ${rec.reason}
- View: https://your-domain.com/property/${property.id}
`;
    })
    .filter(Boolean)
    .join("\n\n");

  const emailContent = `
Hi ${userName},

Here are your personalized property recommendations for this week:

${propertyDetails}

These properties were selected based on your saved searches and favorite properties. Visit the platform to see more details and schedule viewings.

Happy house hunting!
`;

  // Send notification to owner (in production, this would send to the user's email)
  await notifyOwner({
    title: `Weekly Recommendations for ${userName}`,
    content: emailContent,
  });

  logger.info(`[RecommendationDigest] Sent digest to user ${userId} (${userEmail})`);
}

/**
 * Process weekly recommendation digest for all active users
 */
export async function processWeeklyDigest() {
  const db = await getDb();
  if (!db) {
    logger.error("[RecommendationDigest] Database not available");
    return;
  }

  try {
    logger.info("[RecommendationDigest] Starting weekly digest process...");

    // Get new listings from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newListings = await db
      .select()
      .from(properties)
      .where(sql`${properties.createdAt} >= ${sevenDaysAgo}`)
      .limit(100);

    if (newListings.length === 0) {
      logger.info("[RecommendationDigest] No new listings in the past 7 days");
      return;
    }

    logger.info(`[RecommendationDigest] Found ${newListings.length} new listings`);

    // Get all users who have favorites or saved searches
    const activeUserIds = new Set<number>();

    const usersWithFavorites = await db
      .selectDistinct({ userId: favorites.userId })
      .from(favorites);
    usersWithFavorites.forEach((u) => activeUserIds.add(u.userId));

    const usersWithSearches = await db
      .selectDistinct({ userId: savedSearches.userId })
      .from(savedSearches);
    usersWithSearches.forEach((u) => activeUserIds.add(u.userId));

    if (activeUserIds.size === 0) {
      logger.info("[RecommendationDigest] No active users with preferences");
      return;
    }

    logger.info(`[RecommendationDigest] Processing ${activeUserIds.size} active users`);

    // Get user details
    const activeUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, Array.from(activeUserIds)));

    // Process each user
    let successCount = 0;
    for (const user of activeUsers) {
      try {
        // Check user's email preferences
        const userPrefs = await db
          .select()
          .from(recommendationPreferences)
          .where(eq(recommendationPreferences.userId, user.id))
          .limit(1);

        // Skip if email is disabled
        if (userPrefs.length > 0 && userPrefs[0].emailEnabled === 0) {
          logger.info(`[RecommendationDigest] Skipping user ${user.id} - emails disabled`);
          continue;
        }

        const matchScoreThreshold = userPrefs.length > 0 ? userPrefs[0].matchScoreThreshold : 70;

        const recommendations = await generateUserRecommendations(user.id, newListings);

        if (recommendations.length > 0) {
          await sendDigestEmail(
            user.id,
            user.name || "User",
            user.email || "",
            recommendations,
            newListings,
            matchScoreThreshold
          );
          successCount++;
        }
      } catch (error) {
        logger.error(`[RecommendationDigest] Error processing user ${user.id}:`, { error: String(error) });
      }
    }

    logger.info(`[RecommendationDigest] Completed. Sent ${successCount} digests.`);
  } catch (error) {
    logger.error("[RecommendationDigest] Fatal error:", { error: String(error) });
  }
}

/**
 * Start the weekly digest scheduler
 * Runs every Monday at 9:00 AM
 */
export function startWeeklyDigestScheduler() {
  // Run every Monday at 9:00 AM
  const MONDAY = 1;
  const TARGET_HOUR = 9;
  const TARGET_MINUTE = 0;

  function scheduleNextRun() {
    const now = new Date();
    const nextRun = new Date(now);

    // Set to next Monday 9:00 AM
    nextRun.setHours(TARGET_HOUR, TARGET_MINUTE, 0, 0);

    const daysUntilMonday = (MONDAY + 7 - now.getDay()) % 7 || 7;
    nextRun.setDate(now.getDate() + daysUntilMonday);

    // If we've passed this Monday's 9 AM, schedule for next Monday
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    }

    const delay = nextRun.getTime() - now.getTime();

    console.log(
      `[RecommendationDigest] Next digest scheduled for ${nextRun.toLocaleString()}`
    );

    setTimeout(async () => {
      await processWeeklyDigest();
      scheduleNextRun(); // Schedule next run after completion
    }, delay);
  }

  scheduleNextRun();
  logger.info("[RecommendationDigest] Weekly scheduler started");
}
