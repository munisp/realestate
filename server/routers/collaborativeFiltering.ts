import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { favorites, properties, users, recommendationFeedback } from "../../drizzle/schema";
import { eq, and, inArray, notInArray, sql, ne } from "drizzle-orm";

/**
 * Collaborative Filtering Router
 * 
 * Implements "Users who liked this also liked" recommendations by:
 * - Finding users with similar preferences
 * - Analyzing their liked properties
 * - Recommending properties the current user hasn't seen
 */

interface UserSimilarity {
  userId: number;
  similarityScore: number;
  commonLikes: number;
}

export const collaborativeFilteringRouter = router({
  /**
   * Get similar users based on shared property likes
   */
  getSimilarUsers: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current user's liked properties
      const userLikes = await db
        .select({ propertyId: favorites.propertyId })
        .from(favorites)
        .where(eq(favorites.userId, ctx.user.id));

      const likedPropertyIds = userLikes.map((l) => l.propertyId);

      if (likedPropertyIds.length === 0) {
        return [];
      }

      // Find users who also liked these properties
      const similarUsers = await db
        .select({
          userId: favorites.userId,
          commonLikes: sql<number>`count(distinct ${favorites.propertyId})`,
        })
        .from(favorites)
        .where(
          and(
            inArray(favorites.propertyId, likedPropertyIds),
            ne(favorites.userId, ctx.user.id)
          )
        )
        .groupBy(favorites.userId)
        .orderBy(sql`count(distinct ${favorites.propertyId}) DESC`)
        .limit(input.limit);

      // Calculate similarity scores (Jaccard similarity)
      const results: UserSimilarity[] = [];

      for (const similar of similarUsers) {
        const theirLikes = await db
          .select({ propertyId: favorites.propertyId })
          .from(favorites)
          .where(eq(favorites.userId, similar.userId));

        const theirPropertyIds = theirLikes.map((l) => l.propertyId);
        const union = new Set([...likedPropertyIds, ...theirPropertyIds]);
        const intersection = likedPropertyIds.filter((id) => theirPropertyIds.includes(id));

        const similarityScore = intersection.length / union.size;

        results.push({
          userId: similar.userId,
          similarityScore: Math.round(similarityScore * 100),
          commonLikes: similar.commonLikes,
        });
      }

      return results.sort((a, b) => b.similarityScore - a.similarityScore);
    }),

  /**
   * Get collaborative recommendations based on similar users
   */
  getCollaborativeRecommendations: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current user's liked properties
      const userLikes = await db
        .select({ propertyId: favorites.propertyId })
        .from(favorites)
        .where(eq(favorites.userId, ctx.user.id));

      const likedPropertyIds = userLikes.map((l) => l.propertyId);

      if (likedPropertyIds.length === 0) {
        return [];
      }

      // Find similar users (top 5)
      const similarUsers = await db
        .select({
          userId: favorites.userId,
          commonLikes: sql<number>`count(distinct ${favorites.propertyId})`,
        })
        .from(favorites)
        .where(
          and(
            inArray(favorites.propertyId, likedPropertyIds),
            ne(favorites.userId, ctx.user.id)
          )
        )
        .groupBy(favorites.userId)
        .orderBy(sql`count(distinct ${favorites.propertyId}) DESC`)
        .limit(5);

      const similarUserIds = similarUsers.map((u) => u.userId);

      if (similarUserIds.length === 0) {
        return [];
      }

      // Get properties liked by similar users that current user hasn't liked
      const recommendations = await db
        .select({
          property: properties,
          likeCount: sql<number>`count(distinct ${favorites.userId})`,
        })
        .from(favorites)
        .innerJoin(properties, eq(favorites.propertyId, properties.id))
        .where(
          and(
            inArray(favorites.userId, similarUserIds),
            likedPropertyIds.length > 0
              ? notInArray(favorites.propertyId, likedPropertyIds)
              : undefined
          )
        )
        .groupBy(properties.id)
        .orderBy(sql`count(distinct ${favorites.userId}) DESC`)
        .limit(input.limit);

      return recommendations.map((rec) => ({
        ...rec.property,
        collaborativeScore: Math.round((rec.likeCount / similarUserIds.length) * 100),
        likedBySimilarUsers: rec.likeCount,
      }));
    }),

  /**
   * Get "Users who liked this also liked" for a specific property
   */
  getAlsoLiked: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        limit: z.number().default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find users who liked this property
      const usersWhoLiked = await db
        .select({ userId: favorites.userId })
        .from(favorites)
        .where(eq(favorites.propertyId, input.propertyId));

      const userIds = usersWhoLiked.map((u) => u.userId);

      if (userIds.length === 0) {
        return [];
      }

      // Find other properties these users liked
      const alsoLiked = await db
        .select({
          property: properties,
          likeCount: sql<number>`count(distinct ${favorites.userId})`,
        })
        .from(favorites)
        .innerJoin(properties, eq(favorites.propertyId, properties.id))
        .where(
          and(
            inArray(favorites.userId, userIds),
            ne(favorites.propertyId, input.propertyId)
          )
        )
        .groupBy(properties.id)
        .orderBy(sql`count(distinct ${favorites.userId}) DESC`)
        .limit(input.limit);

      return alsoLiked.map((rec) => ({
        ...rec.property,
        likedByCount: rec.likeCount,
        likedByPercentage: Math.round((rec.likeCount / userIds.length) * 100),
      }));
    }),

  /**
   * Get collaborative recommendations based on feedback patterns
   */
  getFeedbackBasedRecommendations: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get properties the current user gave positive feedback to
      const userPositiveFeedback = await db
        .select({ propertyId: recommendationFeedback.propertyId })
        .from(recommendationFeedback)
        .where(
          and(
            eq(recommendationFeedback.userId, ctx.user.id),
            eq(recommendationFeedback.rating, "up")
          )
        );

      const likedPropertyIds = userPositiveFeedback.map((f) => f.propertyId);

      if (likedPropertyIds.length === 0) {
        return [];
      }

      // Find users who also gave positive feedback to these properties
      const similarUsers = await db
        .select({
          userId: recommendationFeedback.userId,
          commonLikes: sql<number>`count(distinct ${recommendationFeedback.propertyId})`,
        })
        .from(recommendationFeedback)
        .where(
          and(
            inArray(recommendationFeedback.propertyId, likedPropertyIds),
            eq(recommendationFeedback.rating, "up"),
            ne(recommendationFeedback.userId, ctx.user.id)
          )
        )
        .groupBy(recommendationFeedback.userId)
        .orderBy(sql`count(distinct ${recommendationFeedback.propertyId}) DESC`)
        .limit(5);

      const similarUserIds = similarUsers.map((u) => u.userId);

      if (similarUserIds.length === 0) {
        return [];
      }

      // Get properties these similar users liked that current user hasn't rated
      const recommendations = await db
        .select({
          property: properties,
          likeCount: sql<number>`count(distinct ${recommendationFeedback.userId})`,
        })
        .from(recommendationFeedback)
        .innerJoin(properties, eq(recommendationFeedback.propertyId, properties.id))
        .where(
          and(
            inArray(recommendationFeedback.userId, similarUserIds),
            eq(recommendationFeedback.rating, "up"),
            sql`${recommendationFeedback.propertyId} NOT IN (${likedPropertyIds.join(",")})`
          )
        )
        .groupBy(properties.id)
        .orderBy(sql`count(distinct ${recommendationFeedback.userId}) DESC`)
        .limit(input.limit);

      return recommendations.map((rec) => ({
        ...rec.property,
        feedbackScore: Math.round((rec.likeCount / similarUserIds.length) * 100),
        likedBySimilarUsers: rec.likeCount,
      }));
    }),
});
