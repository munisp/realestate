import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { notificationPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const notificationPreferencesRouter = router({
  // Get user's notification preferences
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user.id;

    // Try to get existing preferences
    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create default preferences if none exist
    const defaultPrefs = {
      userId,
      emailNotifications: true,
      smsNotifications: false,
      priceDropAlerts: true,
      newListingAlerts: true,
      appointmentReminders: true,
      messageNotifications: true,
      marketingEmails: false,
    };

    await db.insert(notificationPreferences).values(defaultPrefs);

    // Fetch and return the newly created preferences
    const created = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    return created[0];
  }),

  // Update user's notification preferences
  update: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean(),
        smsNotifications: z.boolean(),
        priceDropAlerts: z.boolean(),
        newListingAlerts: z.boolean(),
        appointmentReminders: z.boolean(),
        messageNotifications: z.boolean(),
        marketingEmails: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user.id;

      // Check if preferences exist
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing preferences
        await db
          .update(notificationPreferences)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, userId));
      } else {
        // Insert new preferences
        await db.insert(notificationPreferences).values({
          userId,
          ...input,
        });
      }

      // Return updated preferences
      const updated = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      return updated[0];
    }),

  // Unsubscribe from all notifications (for email unsubscribe links)
  unsubscribeAll: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user.id;

    await db
      .update(notificationPreferences)
      .set({
        emailNotifications: false,
        smsNotifications: false,
        priceDropAlerts: false,
        newListingAlerts: false,
        appointmentReminders: false,
        messageNotifications: false,
        marketingEmails: false,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, userId));

    return { success: true };
  }),
});
