import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  reEngagementCampaigns,
  userActivityTracking,
  reEngagementCampaignLogs,
} from "../../drizzle/schema";
import {
  trackUserActivity,
  detectInactiveUsers,
  processScheduledEmails,
  getCampaignAnalytics,
  getInactiveUsersReport,
} from "../services/reEngagementService";

/**
 * Re-engagement Campaigns Router
 * 
 * Provides endpoints for:
 * - Creating and managing re-engagement campaigns
 * - Tracking user activity
 * - Detecting inactive users
 * - Campaign analytics
 */

export const reEngagementRouter = router({
  /**
   * Create a new re-engagement campaign
   */
  createCampaign: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        inactivityDays: z.number().min(1).default(30),
        targetSegment: z.enum(["all", "buyers", "sellers", "agents"]).default("all"),
        emailSequence: z.array(
          z.object({
            subject: z.string(),
            content: z.string(),
          })
        ),
        delayBetweenEmails: z.number().min(1).default(3),
        maxEmails: z.number().min(1).max(10).default(3),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [campaign] = await db.insert(reEngagementCampaigns).values({
        name: input.name,
        description: input.description,
        inactivityDays: input.inactivityDays,
        targetSegment: input.targetSegment,
        emailSequence: JSON.stringify(input.emailSequence),
        delayBetweenEmails: input.delayBetweenEmails,
        maxEmails: input.maxEmails,
        status: "draft",
      });

      return { campaignId: campaign.insertId };
    }),

  /**
   * Get all re-engagement campaigns
   */
  getCampaigns: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db.select().from(reEngagementCampaigns);
  }),

  /**
   * Get campaign by ID
   */
  getCampaignById: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [campaign] = await db
        .select()
        .from(reEngagementCampaigns)
        .where(eq(reEngagementCampaigns.id, input.campaignId));

      if (!campaign) throw new Error("Campaign not found");

      return campaign;
    }),

  /**
   * Start a campaign
   */
  startCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(reEngagementCampaigns)
        .set({ status: "active" })
        .where(eq(reEngagementCampaigns.id, input.campaignId));

      // Detect inactive users and trigger campaign
      const triggered = await detectInactiveUsers(input.campaignId);

      return { success: true, triggered };
    }),

  /**
   * Pause a campaign
   */
  pauseCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(reEngagementCampaigns)
        .set({ status: "paused" })
        .where(eq(reEngagementCampaigns.id, input.campaignId));

      return { success: true };
    }),

  /**
   * Delete a campaign
   */
  deleteCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete logs first
      await db
        .delete(reEngagementCampaignLogs)
        .where(eq(reEngagementCampaignLogs.campaignId, input.campaignId));

      // Delete campaign
      await db
        .delete(reEngagementCampaigns)
        .where(eq(reEngagementCampaigns.id, input.campaignId));

      return { success: true };
    }),

  /**
   * Get campaign analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      return getCampaignAnalytics(input.campaignId);
    }),

  /**
   * Get inactive users report
   */
  getInactiveUsers: protectedProcedure.query(async () => {
    return getInactiveUsersReport();
  }),

  /**
   * Track user activity (called from other parts of the app)
   */
  trackActivity: protectedProcedure
    .input(
      z.object({
        activityType: z.enum(["login", "property_view", "search", "offer", "message"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await trackUserActivity(ctx.user.id, input.activityType);
      return { success: true };
    }),

  /**
   * Get user activity status
   */
  getUserActivity: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [activity] = await db
      .select()
      .from(userActivityTracking)
      .where(eq(userActivityTracking.userId, ctx.user.id));

    return activity || null;
  }),

  /**
   * Process scheduled emails (admin/cron job)
   */
  processScheduledEmails: protectedProcedure.mutation(async () => {
    const processed = await processScheduledEmails();
    return { processed };
  }),

  /**
   * Update campaign
   */
  updateCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        inactivityDays: z.number().optional(),
        targetSegment: z.enum(["all", "buyers", "sellers", "agents"]).optional(),
        emailSequence: z
          .array(
            z.object({
              subject: z.string(),
              content: z.string(),
            })
          )
          .optional(),
        delayBetweenEmails: z.number().optional(),
        maxEmails: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.description) updates.description = input.description;
      if (input.inactivityDays) updates.inactivityDays = input.inactivityDays;
      if (input.targetSegment) updates.targetSegment = input.targetSegment;
      if (input.emailSequence) updates.emailSequence = JSON.stringify(input.emailSequence);
      if (input.delayBetweenEmails) updates.delayBetweenEmails = input.delayBetweenEmails;
      if (input.maxEmails) updates.maxEmails = input.maxEmails;

      await db
        .update(reEngagementCampaigns)
        .set(updates)
        .where(eq(reEngagementCampaigns.id, input.campaignId));

      return { success: true };
    }),

  /**
   * Get campaign logs
   */
  getCampaignLogs: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return db
        .select()
        .from(reEngagementCampaignLogs)
        .where(eq(reEngagementCampaignLogs.campaignId, input.campaignId));
    }),
});
