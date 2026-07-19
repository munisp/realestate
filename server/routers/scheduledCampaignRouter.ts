// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { scheduledCampaignService } from "../services/scheduledCampaignService";

const campaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "completed"]),
  triggerType: z.enum(["manual", "signup", "property_view", "saved_search", "offer_submitted", "tour_booked"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const sequenceSchema = z.object({
  campaignId: z.number(),
  sequenceOrder: z.number(),
  templateId: z.number(),
  delayDays: z.number().min(0),
  delayHours: z.number().min(0).max(23),
});

export const scheduledCampaignRouter = router({
  // Campaign management
  createCampaign: protectedProcedure
    .input(campaignSchema)
    .mutation(async ({ input }) => {
      const campaignData = {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      };

      const id = await scheduledCampaignService.createCampaign(campaignData);
      return { id };
    }),

  updateCampaign: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: campaignSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData = {
        ...input.data,
        startDate: input.data.startDate ? new Date(input.data.startDate) : undefined,
        endDate: input.data.endDate ? new Date(input.data.endDate) : undefined,
      };

      await scheduledCampaignService.updateCampaign(input.id, updateData);
      return { success: true };
    }),

  deleteCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await scheduledCampaignService.deleteCampaign(input.id);
      return { success: true };
    }),

  getCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await scheduledCampaignService.getCampaign(input.id);
    }),

  getAllCampaigns: protectedProcedure.query(async () => {
    return await scheduledCampaignService.getAllCampaigns();
  }),

  // Sequence management
  addSequence: protectedProcedure
    .input(sequenceSchema)
    .mutation(async ({ input }) => {
      const id = await scheduledCampaignService.addSequence(input);
      return { id };
    }),

  updateSequence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: sequenceSchema.partial().omit({ campaignId: true }),
      })
    )
    .mutation(async ({ input }) => {
      await scheduledCampaignService.updateSequence(input.id, input.data);
      return { success: true };
    }),

  deleteSequence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await scheduledCampaignService.deleteSequence(input.id);
      return { success: true };
    }),

  // Subscriber management
  subscribeToCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        userId: z.number(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await scheduledCampaignService.subscribeToCampaign({
        campaignId: input.campaignId,
        userId: input.userId,
        status: "active",
        subscribedAt: new Date(),
        metadata: input.metadata,
      });
      return { success: true };
    }),

  unsubscribeFromCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await scheduledCampaignService.unsubscribeFromCampaign(input.campaignId, input.userId);
      return { success: true };
    }),

  getSubscribers: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      return await scheduledCampaignService.getSubscribers(input.campaignId);
    }),

  // Trigger campaign for a user
  triggerCampaign: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        triggerType: z.string(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await scheduledCampaignService.triggerCampaign(input.userId, input.triggerType, input.metadata);
      return { success: true };
    }),

  // Manual trigger to process scheduled emails (typically called by a cron job)
  processScheduledEmails: protectedProcedure.mutation(async () => {
    const emailsSent = await scheduledCampaignService.processScheduledEmails();
    return { emailsSent };
  }),
});
