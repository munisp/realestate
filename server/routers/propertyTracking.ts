import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { propertyTrackingPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const propertyTrackingRouter = router({
  /**
   * Get tracking preferences for a property
   */
  getPreferences: protectedProcedure
    .input(z.object({
      propertyId: z.number()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const prefs = await db
        .select()
        .from(propertyTrackingPreferences)
        .where(eq(propertyTrackingPreferences.propertyId, input.propertyId))
        .limit(1);

      return prefs.length > 0 ? prefs[0] : null;
    }),

  /**
   * Update or create tracking preferences for a property
   */
  updatePreferences: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      trackingEnabled: z.boolean(),
      notifyOnPriceChange: z.boolean().optional(),
      notifyOnNewCompetitor: z.boolean().optional(),
      notifyOnStatusChange: z.boolean().optional(),
      checkFrequency: z.enum(["hourly", "daily", "weekly"]).optional(),
      priceChangeThreshold: z.number().min(0).max(100).optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { propertyId, ...settings } = input;

      // Convert booleans to integers for PostgreSQL
      const dbSettings = {
        propertyId,
        trackingEnabled: settings.trackingEnabled ? 1 : 0,
        notifyOnPriceChange: settings.notifyOnPriceChange !== undefined ? (settings.notifyOnPriceChange ? 1 : 0) : undefined,
        notifyOnNewCompetitor: settings.notifyOnNewCompetitor !== undefined ? (settings.notifyOnNewCompetitor ? 1 : 0) : undefined,
        notifyOnStatusChange: settings.notifyOnStatusChange !== undefined ? (settings.notifyOnStatusChange ? 1 : 0) : undefined,
        checkFrequency: settings.checkFrequency,
        priceChangeThreshold: settings.priceChangeThreshold,
        updatedAt: new Date()
      };

      // Remove undefined values
      const cleanSettings = Object.fromEntries(
        Object.entries(dbSettings).filter(([_, v]) => v !== undefined)
      );

      // Try to update first
      const existing = await db
        .select()
        .from(propertyTrackingPreferences)
        .where(eq(propertyTrackingPreferences.propertyId, propertyId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(propertyTrackingPreferences)
          .set(cleanSettings)
          .where(eq(propertyTrackingPreferences.propertyId, propertyId));
      } else {
        await db
          .insert(propertyTrackingPreferences)
          .values({
            propertyId,
            trackingEnabled: settings.trackingEnabled ? 1 : 0,
            notifyOnPriceChange: settings.notifyOnPriceChange !== undefined ? (settings.notifyOnPriceChange ? 1 : 0) : 1,
            notifyOnNewCompetitor: settings.notifyOnNewCompetitor !== undefined ? (settings.notifyOnNewCompetitor ? 1 : 0) : 1,
            notifyOnStatusChange: settings.notifyOnStatusChange !== undefined ? (settings.notifyOnStatusChange ? 1 : 0) : 1,
            checkFrequency: settings.checkFrequency || "daily",
            priceChangeThreshold: settings.priceChangeThreshold || 5
          });
      }

      return { success: true };
    }),

  /**
   * Bulk enable/disable tracking for multiple properties
   */
  bulkUpdateTracking: protectedProcedure
    .input(z.object({
      propertyIds: z.array(z.number()),
      trackingEnabled: z.boolean()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const trackingValue = input.trackingEnabled ? 1 : 0;

      for (const propertyId of input.propertyIds) {
        const existing = await db
          .select()
          .from(propertyTrackingPreferences)
          .where(eq(propertyTrackingPreferences.propertyId, propertyId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(propertyTrackingPreferences)
            .set({ trackingEnabled: trackingValue, updatedAt: new Date() })
            .where(eq(propertyTrackingPreferences.propertyId, propertyId));
        } else {
          await db
            .insert(propertyTrackingPreferences)
            .values({
              propertyId,
              trackingEnabled: trackingValue
            });
        }
      }

      return { 
        success: true,
        updated: input.propertyIds.length
      };
    }),

  /**
   * Get tracking analytics for a property
   */
  getPropertyAnalytics: protectedProcedure
    .input(z.object({
      propertyId: z.number()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          competitorsFound: 0,
          priceChanges: 0,
          lastChecked: null,
          averageCompetitorPrice: null
        };
      }

      // This would query from competitorListings table
      // For now, return placeholder data
      return {
        competitorsFound: 0,
        priceChanges: 0,
        lastChecked: null,
        averageCompetitorPrice: null
      };
    })
});
