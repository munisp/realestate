import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { startWorkflow, signalWorkflow, queryWorkflow, getWorkflowResult, WorkflowTypes } from '../_core/temporalClient';

/**
 * Workflow orchestration router
 * Integrates Temporal workflows with tRPC for frontend access
 */
export const workflowRouter = router({
  // Start shortlet booking workflow
  startShortletBooking: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      checkIn: z.string(),
      checkOut: z.string(),
      numberOfGuests: z.number(),
      specialRequests: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `shortlet-booking-${ctx.user.id}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.SHORTLET_BOOKING,
        workflowId,
        [{
          propertyId: input.propertyId,
          guestId: ctx.user.id,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          numberOfGuests: input.numberOfGuests,
          specialRequests: input.specialRequests || '',
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Confirm payment for booking workflow
  confirmBookingPayment: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
      paymentId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await signalWorkflow(
        input.workflowId,
        'payment-confirmed',
        [{ confirmed: true, paymentId: input.paymentId }]
      );

      return { success: true };
    }),

  // Start milestone payment workflow
  startMilestonePayment: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      milestoneId: z.number(),
      builderId: z.number(),
      amount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `milestone-payment-${input.milestoneId}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.MILESTONE_PAYMENT,
        workflowId,
        [{
          projectId: input.projectId,
          milestoneId: input.milestoneId,
          clientId: ctx.user.id,
          builderId: input.builderId,
          amount: input.amount,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Signal milestone completion
  completeMilestone: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await signalWorkflow(
        input.workflowId,
        'milestone-completed',
        [true]
      );

      return { success: true };
    }),

  // Approve milestone (client approval)
  approveMilestone: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await signalWorkflow(
        input.workflowId,
        'client-approved',
        [true]
      );

      return { success: true };
    }),

  // Start property valuation workflow
  startPropertyValuation: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `valuation-${input.propertyId}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.PROPERTY_VALUATION,
        workflowId,
        [{
          propertyId: input.propertyId,
          userId: ctx.user.id,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Start tour scheduling workflow
  startTourScheduling: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      preferredDate: z.string(),
      preferredTime: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `tour-${input.propertyId}-${ctx.user.id}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.TOUR_SCHEDULING,
        workflowId,
        [{
          propertyId: input.propertyId,
          buyerId: ctx.user.id,
          preferredDate: new Date(input.preferredDate),
          preferredTime: input.preferredTime,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Start builder quote request workflow
  startQuoteRequest: protectedProcedure
    .input(z.object({
      builderId: z.number(),
      projectType: z.string(),
      description: z.string(),
      budget: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `quote-${input.builderId}-${ctx.user.id}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.QUOTE_REQUEST,
        workflowId,
        [{
          builderId: input.builderId,
          clientId: ctx.user.id,
          projectType: input.projectType,
          description: input.description,
          budget: input.budget,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Start document verification workflow
  startDocumentVerification: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      documentType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `doc-verify-${input.documentId}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.DOCUMENT_VERIFICATION,
        workflowId,
        [{
          documentId: input.documentId,
          documentType: input.documentType,
          userId: ctx.user.id,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Get workflow status
  getWorkflowStatus: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const result = await queryWorkflow(input.workflowId, 'getStatus');
        return {
          workflowId: input.workflowId,
          status: result,
        };
      } catch (error) {
        return {
          workflowId: input.workflowId,
          status: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  // Get workflow result
  getWorkflowResult: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const result = await getWorkflowResult(input.workflowId);
        return {
          workflowId: input.workflowId,
          result,
        };
      } catch (error) {
        throw new Error(`Failed to get workflow result: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Start host payout workflow (scheduled)
  startHostPayout: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      hostId: z.number(),
      amount: z.number(),
    }))
    .mutation(async ({ input }) => {
      const workflowId = `host-payout-${input.bookingId}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.HOST_PAYOUT,
        workflowId,
        [{
          bookingId: input.bookingId,
          hostId: input.hostId,
          amount: input.amount,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Start dynamic pricing workflow (scheduled)
  startDynamicPricing: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `dynamic-pricing-${input.propertyId}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.DYNAMIC_PRICING,
        workflowId,
        [{
          propertyId: input.propertyId,
          hostId: ctx.user.id,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Start builder onboarding workflow
  startBuilderOnboarding: protectedProcedure
    .input(z.object({
      companyName: z.string(),
      registrationNumber: z.string(),
      specializations: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const workflowId = `builder-onboard-${ctx.user.id}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.BUILDER_ONBOARDING,
        workflowId,
        [{
          userId: ctx.user.id,
          companyName: input.companyName,
          registrationNumber: input.registrationNumber,
          specializations: input.specializations,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),

  // Start inspection workflow
  startInspection: protectedProcedure
    .input(z.object({
      milestoneId: z.number(),
      projectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const workflowId = `inspection-${input.milestoneId}-${Date.now()}`;
      
      await startWorkflow(
        WorkflowTypes.INSPECTION,
        workflowId,
        [{
          milestoneId: input.milestoneId,
          projectId: input.projectId,
        }]
      );

      return {
        workflowId,
        status: 'started',
      };
    }),
});
