import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { z } from "zod";
import { sql } from "drizzle-orm";

/**
 * Recommendation feedback router
 * Handles user ratings (thumbs up/down) for property recommendations
 */

// Note: In a full implementation, you would add a recommendationFeedback table to drizzle/schema.ts
// For now, we'll use a simple in-memory store as a placeholder

interface FeedbackRecord {
  userId: number;
  propertyId: number;
  rating: "up" | "down";
  timestamp: Date;
}

// In-memory feedback store (replace with database table in production)
const feedbackStore: FeedbackRecord[] = [];

export const recommendationFeedbackRouter = router({
  /**
   * Submit feedback for a recommendation
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        rating: z.enum(["up", "down"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { propertyId, rating } = input;
      const userId = ctx.user.id;

      // Remove any existing feedback for this property from this user
      const existingIndex = feedbackStore.findIndex(
        (f) => f.userId === userId && f.propertyId === propertyId
      );

      if (existingIndex >= 0) {
        feedbackStore.splice(existingIndex, 1);
      }

      // Add new feedback
      feedbackStore.push({
        userId,
        propertyId,
        rating,
        timestamp: new Date(),
      });

      console.log(
        `[RecommendationFeedback] User ${userId} rated property ${propertyId}: ${rating}`
      );

      return {
        success: true,
        message: "Feedback recorded successfully",
      };
    }),

  /**
   * Get user's feedback for specific properties
   */
  getUserFeedback: protectedProcedure
    .input(
      z.object({
        propertyIds: z.array(z.number()),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { propertyIds } = input;

      const userFeedback = feedbackStore.filter(
        (f) => f.userId === userId && propertyIds.includes(f.propertyId)
      );

      const feedbackMap: Record<number, "up" | "down"> = {};
      userFeedback.forEach((f) => {
        feedbackMap[f.propertyId] = f.rating;
      });

      return feedbackMap;
    }),

  /**
   * Get feedback statistics for analytics
   */
  getFeedbackStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const userFeedback = feedbackStore.filter((f) => f.userId === userId);

    const upCount = userFeedback.filter((f) => f.rating === "up").length;
    const downCount = userFeedback.filter((f) => f.rating === "down").length;

    return {
      totalFeedback: userFeedback.length,
      upvotes: upCount,
      downvotes: downCount,
      satisfactionRate:
        userFeedback.length > 0 ? (upCount / userFeedback.length) * 100 : 0,
    };
  }),

  /**
   * Get aggregated feedback for improving recommendations
   * This data can be fed back to the LLM for better suggestions
   */
  getAggregatedFeedback: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const userFeedback = feedbackStore.filter((f) => f.userId === userId);

    // Group by rating
    const likedProperties = userFeedback
      .filter((f) => f.rating === "up")
      .map((f) => f.propertyId);

    const dislikedProperties = userFeedback
      .filter((f) => f.rating === "down")
      .map((f) => f.propertyId);

    return {
      likedPropertyIds: likedProperties,
      dislikedPropertyIds: dislikedProperties,
      feedbackCount: userFeedback.length,
    };
  }),
});
