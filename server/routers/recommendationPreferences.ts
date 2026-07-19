import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { recommendationPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Recommendation Preferences Router
 * 
 * Manages user preferences for recommendation email digests including:
 * - Digest frequency (weekly/biweekly/monthly)
 * - Match score threshold (70%/80%/90%)
 * - Email enable/disable toggle
 */

export const recommendationPreferencesRouter = router({
  /**
   * Get user's recommendation preferences
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(recommendationPreferences)
      .where(eq(recommendationPreferences.userId, ctx.user.id))
      .limit(1);

    if (result.length === 0) {
      // Return default preferences if none exist
      return {
        digestFrequency: "weekly" as const,
        matchScoreThreshold: 70,
        emailEnabled: 1,
      };
    }

    return result[0];
  }),

  /**
   * Update user's recommendation preferences
   */
  update: protectedProcedure
    .input(
      z.object({
        digestFrequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
        matchScoreThreshold: z.number().min(70).max(90).optional(),
        emailEnabled: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if preferences exist
      const existing = await db
        .select()
        .from(recommendationPreferences)
        .where(eq(recommendationPreferences.userId, ctx.user.id))
        .limit(1);

      if (existing.length === 0) {
        // Create new preferences
        await db.insert(recommendationPreferences).values({
          userId: ctx.user.id,
          digestFrequency: input.digestFrequency || "weekly",
          matchScoreThreshold: input.matchScoreThreshold || 70,
          emailEnabled: input.emailEnabled !== undefined ? input.emailEnabled : 1,
        });
      } else {
        // Update existing preferences
        const updates: any = {};
        if (input.digestFrequency !== undefined) updates.digestFrequency = input.digestFrequency;
        if (input.matchScoreThreshold !== undefined) updates.matchScoreThreshold = input.matchScoreThreshold;
        if (input.emailEnabled !== undefined) updates.emailEnabled = input.emailEnabled;

        if (Object.keys(updates).length > 0) {
          await db
            .update(recommendationPreferences)
            .set(updates)
            .where(eq(recommendationPreferences.userId, ctx.user.id));
        }
      }

      return { success: true };
    }),
});
