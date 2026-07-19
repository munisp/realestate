import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as savedSearchAlertsService from "../services/savedSearchAlertsService";

export const savedSearchAlertsRouter = router({
  /**
   * Get user's saved searches
   */
  getUserSearches: protectedProcedure.query(async ({ ctx }) => {
    return savedSearchAlertsService.getUserSavedSearches(ctx.user.id);
  }),

  /**
   * Create a new saved search
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        criteria: z.object({
          city: z.string().optional(),
          state: z.string().optional(),
          propertyType: z.string().optional(),
          listingType: z.string().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          minBedrooms: z.number().optional(),
          minBathrooms: z.number().optional(),
          minSquareFeet: z.number().optional(),
          maxSquareFeet: z.number().optional(),
        }),
        notificationsEnabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return savedSearchAlertsService.createSavedSearch(
        ctx.user.id,
        input.name,
        input.criteria,
        input.notificationsEnabled
      );
    }),

  /**
   * Update notification preferences
   */
  updateNotifications: protectedProcedure
    .input(
      z.object({
        searchId: z.number(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return savedSearchAlertsService.updateNotificationPreferences(
        input.searchId,
        input.enabled
      );
    }),

  /**
   * Delete a saved search
   */
  delete: protectedProcedure
    .input(
      z.object({
        searchId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return savedSearchAlertsService.deleteSavedSearch(input.searchId);
    }),

  /**
   * Get new properties for a saved search
   */
  getNewProperties: protectedProcedure
    .input(
      z.object({
        searchId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return savedSearchAlertsService.getNewPropertiesForSearch(input.searchId);
    }),

  /**
   * Find matching saved searches for a property (admin/system use)
   */
  findMatches: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return savedSearchAlertsService.findMatchingSavedSearches(input.propertyId);
    }),

  /**
   * Get saved searches needing digest emails (scheduled job)
   */
  getSearchesForDigest: protectedProcedure.query(async () => {
    return savedSearchAlertsService.getSavedSearchesForDigest();
  }),

  /**
   * Mark search as notified
   */
  markNotified: protectedProcedure
    .input(
      z.object({
        searchId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return savedSearchAlertsService.updateLastNotified(input.searchId);
    }),
});
