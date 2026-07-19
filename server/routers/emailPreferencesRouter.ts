import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { emailPreferenceService } from "../services/emailPreferenceService";

const preferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  escrowUpdates: z.boolean().optional(),
  documentSigning: z.boolean().optional(),
  propertyAlerts: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

export const emailPreferencesRouter = router({
  // Get current user's preferences
  getMyPreferences: protectedProcedure.query(async ({ ctx }) => {
    return await emailPreferenceService.getPreferences(ctx.user.id);
  }),

  // Update current user's preferences
  updateMyPreferences: protectedProcedure
    .input(preferencesSchema)
    .mutation(async ({ ctx, input }) => {
      await emailPreferenceService.updatePreferences(ctx.user.id, input);
      return { success: true };
    }),

  // Unsubscribe from all notifications
  unsubscribeAll: protectedProcedure.mutation(async ({ ctx }) => {
    await emailPreferenceService.unsubscribeAll(ctx.user.id);
    return { success: true };
  }),

  // Check if a specific category is enabled
  checkCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      const enabled = await emailPreferenceService.checkPreference(ctx.user.id, input.category);
      return { enabled };
    }),
});
