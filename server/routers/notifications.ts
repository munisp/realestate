import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { userNotificationPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const notificationsRouter = router({
  // Get user's notification preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      // Return defaults if DB not available
      return {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        escrowUpdates: true,
        documentSigning: true,
        propertyAlerts: true,
        messageNotifications: true,
        marketingEmails: false,
      };
    }

    try {
      const prefs = await db
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (prefs.length > 0) {
        return {
          emailEnabled: !!prefs[0].emailEnabled,
          smsEnabled: !!prefs[0].smsEnabled,
          pushEnabled: !!prefs[0].pushEnabled,
          escrowUpdates: !!prefs[0].escrowUpdates,
          documentSigning: !!prefs[0].documentSigning,
          propertyAlerts: !!prefs[0].propertyAlerts,
          messageNotifications: !!prefs[0].messageNotifications,
          marketingEmails: !!prefs[0].marketingEmails,
        };
      }

      // Create default preferences
      await db.insert(userNotificationPreferences).values({
        userId: ctx.user.id,
        emailEnabled: 1,
        smsEnabled: 0,
        pushEnabled: 1,
        escrowUpdates: 1,
        documentSigning: 1,
        propertyAlerts: 1,
        messageNotifications: 1,
        marketingEmails: 0,
      });

      return {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        escrowUpdates: true,
        documentSigning: true,
        propertyAlerts: true,
        messageNotifications: true,
        marketingEmails: false,
      };
    } catch (error) {
      console.error("[Notifications] Error getting preferences:", error);
      // Return defaults on error
      return {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        escrowUpdates: true,
        documentSigning: true,
        propertyAlerts: true,
        messageNotifications: true,
        marketingEmails: false,
      };
    }
  }),

  // Update user's notification preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        escrowUpdates: z.boolean().optional(),
        documentSigning: z.boolean().optional(),
        propertyAlerts: z.boolean().optional(),
        messageNotifications: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        console.warn("[Notifications] Database not available");
        return { success: false };
      }

      try {
        // Check if preferences exist
        const existing = await db
          .select()
          .from(userNotificationPreferences)
          .where(eq(userNotificationPreferences.userId, ctx.user.id))
          .limit(1);

        const updateData: any = {};
        if (input.emailEnabled !== undefined)
          updateData.emailEnabled = input.emailEnabled ? 1 : 0;
        if (input.smsEnabled !== undefined)
          updateData.smsEnabled = input.smsEnabled ? 1 : 0;
        if (input.pushEnabled !== undefined)
          updateData.pushEnabled = input.pushEnabled ? 1 : 0;
        if (input.escrowUpdates !== undefined)
          updateData.escrowUpdates = input.escrowUpdates ? 1 : 0;
        if (input.documentSigning !== undefined)
          updateData.documentSigning = input.documentSigning ? 1 : 0;
        if (input.propertyAlerts !== undefined)
          updateData.propertyAlerts = input.propertyAlerts ? 1 : 0;
        if (input.messageNotifications !== undefined)
          updateData.messageNotifications = input.messageNotifications ? 1 : 0;
        if (input.marketingEmails !== undefined)
          updateData.marketingEmails = input.marketingEmails ? 1 : 0;

        if (existing.length > 0) {
          // Update existing preferences
          await db
            .update(userNotificationPreferences)
            .set(updateData)
            .where(eq(userNotificationPreferences.userId, ctx.user.id));
        } else {
          // Create new preferences with defaults
          await db.insert(userNotificationPreferences).values({
            userId: ctx.user.id,
            emailEnabled: updateData.emailEnabled ?? 1,
            smsEnabled: updateData.smsEnabled ?? 0,
            pushEnabled: updateData.pushEnabled ?? 1,
            escrowUpdates: updateData.escrowUpdates ?? 1,
            documentSigning: updateData.documentSigning ?? 1,
            propertyAlerts: updateData.propertyAlerts ?? 1,
            messageNotifications: updateData.messageNotifications ?? 1,
            marketingEmails: updateData.marketingEmails ?? 0,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[Notifications] Error updating preferences:", error);
        return { success: false };
      }
    }),
});
