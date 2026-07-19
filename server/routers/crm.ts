import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { crmService, CRMProvider } from '../crmIntegration';

export const crmRouter = router({
  // Sync contact to CRM
  syncContact: protectedProcedure
    .input(
      z.object({
        provider: z.enum(['salesforce', 'hubspot']),
        contactData: z.object({
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().email(),
          phone: z.string().optional(),
          company: z.string().optional(),
          source: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const contactId = await crmService.createContact(input.provider, input.contactData);
        return {
          success: true,
          contactId,
          message: `Contact synced to ${input.provider}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Create lead in CRM
  createLead: protectedProcedure
    .input(
      z.object({
        provider: z.enum(['salesforce', 'hubspot']),
        leadData: z.object({
          contactId: z.string().optional(),
          propertyId: z.string().optional(),
          status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']),
          source: z.string(),
          notes: z.string().optional(),
          assignedTo: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const leadId = await crmService.createLead(input.provider, input.leadData);
        return {
          success: true,
          leadId,
          message: `Lead created in ${input.provider}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Create deal/opportunity in CRM
  createDeal: protectedProcedure
    .input(
      z.object({
        provider: z.enum(['salesforce', 'hubspot']),
        dealData: z.object({
          name: z.string(),
          amount: z.number(),
          stage: z.string(),
          closeDate: z.string().optional(),
          contactId: z.string().optional(),
          propertyId: z.string().optional(),
          probability: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const dealId = await crmService.createDeal(input.provider, {
          ...input.dealData,
          closeDate: input.dealData.closeDate ? new Date(input.dealData.closeDate) : undefined,
        });
        return {
          success: true,
          dealId,
          message: `Deal created in ${input.provider}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Log activity in CRM
  logActivity: protectedProcedure
    .input(
      z.object({
        provider: z.enum(['salesforce', 'hubspot']),
        activityData: z.object({
          type: z.enum(['call', 'email', 'meeting', 'task', 'note']),
          subject: z.string(),
          description: z.string().optional(),
          contactId: z.string().optional(),
          leadId: z.string().optional(),
          dealId: z.string().optional(),
          dueDate: z.string().optional(),
          completed: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const activityId = await crmService.logActivity(input.provider, {
          ...input.activityData,
          dueDate: input.activityData.dueDate ? new Date(input.activityData.dueDate) : undefined,
        });
        return {
          success: true,
          activityId,
          message: `Activity logged in ${input.provider}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Get CRM configuration status
  getStatus: protectedProcedure.query(async () => {
    const salesforceConfigured = !!(
      process.env.SALESFORCE_CLIENT_ID &&
      process.env.SALESFORCE_CLIENT_SECRET &&
      process.env.SALESFORCE_USERNAME &&
      process.env.SALESFORCE_PASSWORD
    );

    const hubspotConfigured = !!process.env.HUBSPOT_API_KEY;

    return {
      salesforce: {
        configured: salesforceConfigured,
        enabled: salesforceConfigured,
      },
      hubspot: {
        configured: hubspotConfigured,
        enabled: hubspotConfigured,
      },
    };
  }),
});
