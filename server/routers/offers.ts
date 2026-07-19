import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as offerService from "../services/offerService";

export const offersRouter = router({
  /**
   * Create a new offer
   */
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        sellerId: z.number(),
        agentId: z.number().optional(),
        offerAmount: z.number(),
        earnestMoney: z.number().optional(),
        downPayment: z.number().optional(),
        financingType: z.enum(["cash", "conventional", "fha", "va", "other"]).default("conventional"),
        inspectionContingency: z.boolean().default(true),
        appraisalContingency: z.boolean().default(true),
        financingContingency: z.boolean().default(true),
        proposedClosingDate: z.string().optional(), // ISO date string
        inspectionPeriod: z.number().default(10),
        additionalTerms: z.string().optional(),
        notes: z.string().optional(),
        expiresAt: z.string().optional(), // ISO datetime string
      })
    )
    .mutation(async ({ input, ctx }) => {
      const proposedClosingDate = input.proposedClosingDate
        ? new Date(input.proposedClosingDate)
        : undefined;
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;

      return offerService.createOffer(
        {
          propertyId: input.propertyId,
          buyerId: ctx.user.id,
          sellerId: input.sellerId,
          agentId: input.agentId,
          offerAmount: input.offerAmount,
          earnestMoney: input.earnestMoney,
          downPayment: input.downPayment,
          financingType: input.financingType,
          inspectionContingency: input.inspectionContingency ? 1 : 0,
          appraisalContingency: input.appraisalContingency ? 1 : 0,
          financingContingency: input.financingContingency ? 1 : 0,
          proposedClosingDate,
          inspectionPeriod: input.inspectionPeriod,
          additionalTerms: input.additionalTerms,
          notes: input.notes,
          expiresAt,
          status: "pending",
        },
        ctx.user.id
      );
    }),

  /**
   * Get offer by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        offerId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return offerService.getOfferById(input.offerId);
    }),

  /**
   * Get offers for a property
   */
  getPropertyOffers: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return offerService.getPropertyOffers(input.propertyId);
    }),

  /**
   * Get offers made by current user (buyer)
   */
  getMyOffers: protectedProcedure.query(async ({ ctx }) => {
    return offerService.getBuyerOffers(ctx.user.id);
  }),

  /**
   * Get offers received by current user (seller)
   */
  getReceivedOffers: protectedProcedure.query(async ({ ctx }) => {
    return offerService.getSellerOffers(ctx.user.id);
  }),

  /**
   * Get offers for an agent
   */
  getAgentOffers: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }) => {
      // For now, return seller offers (agent represents seller)
      return offerService.getSellerOffers(input.agentId);
    }),

  /**
   * Update offer status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        offerId: z.number(),
        status: z.enum(["pending", "accepted", "rejected", "countered", "withdrawn", "expired"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return offerService.updateOfferStatus(input.offerId, input.status, ctx.user.id);
    }),

  /**
   * Create a counteroffer
   */
  createCounteroffer: protectedProcedure
    .input(
      z.object({
        offerId: z.number(),
        counterAmount: z.number(),
        earnestMoney: z.number().optional(),
        downPayment: z.number().optional(),
        proposedClosingDate: z.string().optional(),
        inspectionPeriod: z.number().optional(),
        inspectionContingency: z.boolean().default(true),
        appraisalContingency: z.boolean().default(true),
        financingContingency: z.boolean().default(true),
        additionalTerms: z.string().optional(),
        notes: z.string().optional(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const proposedClosingDate = input.proposedClosingDate
        ? new Date(input.proposedClosingDate)
        : undefined;
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;

      return offerService.createCounteroffer(
        {
          offerId: input.offerId,
          counterpartyId: ctx.user.id,
          counterAmount: input.counterAmount,
          earnestMoney: input.earnestMoney,
          downPayment: input.downPayment,
          proposedClosingDate,
          inspectionPeriod: input.inspectionPeriod,
          inspectionContingency: input.inspectionContingency ? 1 : 0,
          appraisalContingency: input.appraisalContingency ? 1 : 0,
          financingContingency: input.financingContingency ? 1 : 0,
          additionalTerms: input.additionalTerms,
          notes: input.notes,
          expiresAt,
          status: "pending",
        },
        ctx.user.id
      );
    }),

  /**
   * Get counteroffers for an offer
   */
  getCounteroffers: protectedProcedure
    .input(
      z.object({
        offerId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return offerService.getOfferCounteroffers(input.offerId);
    }),

  /**
   * Accept a counteroffer
   */
  acceptCounteroffer: protectedProcedure
    .input(
      z.object({
        counterofferId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return offerService.acceptCounteroffer(input.counterofferId, ctx.user.id);
    }),

  /**
   * Sign an offer
   */
  signOffer: protectedProcedure
    .input(
      z.object({
        offerId: z.number(),
        signature: z.string(),
        role: z.enum(["buyer", "seller"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return offerService.signOffer(
        input.offerId,
        ctx.user.id,
        input.signature,
        input.role
      );
    }),

  /**
   * Get offer activity log
   */
  getActivity: protectedProcedure
    .input(
      z.object({
        offerId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return offerService.getOfferActivity(input.offerId);
    }),

  /**
   * Withdraw an offer
   */
  withdraw: protectedProcedure
    .input(
      z.object({
        offerId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return offerService.withdrawOffer(input.offerId, ctx.user.id);
    }),

  /**
   * Expire old offers (scheduled job)
   */
  expireOldOffers: protectedProcedure.mutation(async () => {
    return offerService.expireOldOffers();
  }),
});
