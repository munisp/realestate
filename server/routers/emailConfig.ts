// @ts-nocheck
/**
 * Email Configuration Router
 * 
 * Provides endpoints for managing email configuration and testing
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { resendEmailService } from '../services/resendEmailService';
import { emailRetryService } from '../services/emailRetryService';
import { renderEmailTemplate } from '../services/emailTemplateService';

export const emailConfigRouter = router({
  /**
   * Get email service status
   */
  getStatus: protectedProcedure.query(async () => {
    const status = resendEmailService.getStatus();
    const verification = await resendEmailService.verifyConfiguration();
    
    return {
      ...status,
      ...verification,
    };
  }),

  /**
   * Send a test email
   */
  sendTestEmail: protectedProcedure
    .input(z.object({
      to: z.string().email(),
      template: z.enum(['appointment-confirmation', 'offer-update', 'saved-search-alert', 'price-drop']),
      testData: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Prepare test data based on template
      const testData = input.testData || getDefaultTestData(input.template);

      // Render email template
      const html = await renderEmailTemplate(input.template, testData);

      // Send email with retry logic
      const result = await emailRetryService.sendWithRetry({
        to: input.to,
        subject: `Test Email: ${input.template}`,
        html,
        from: 'Test <test@realestate.com>',
      });

      return result;
    }),

  /**
   * Preview email template
   */
  previewTemplate: protectedProcedure
    .input(z.object({
      template: z.enum(['appointment-confirmation', 'offer-update', 'saved-search-alert', 'price-drop']),
      testData: z.record(z.any()).optional(),
    }))
    .query(async ({ input }) => {
      const testData = input.testData || getDefaultTestData(input.template);
      const html = await renderEmailTemplate(input.template, testData);
      
      return {
        html,
        testData,
      };
    }),

  /**
   * Get retry service statistics
   */
  getRetryStats: protectedProcedure.query(async () => {
    const stats = emailRetryService.getDeliveryStats();
    const failedDeliveries = emailRetryService.getFailedDeliveries();
    
    return {
      ...stats,
      failedDeliveries: failedDeliveries.map(log => ({
        recipient: log.recipient,
        subject: log.subject,
        attempts: log.attempts,
        lastAttemptAt: log.lastAttemptAt,
        errorMessage: log.errorMessage,
      })),
    };
  }),

  /**
   * Get email delivery statistics
   */
  getDeliveryStats: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      // This would query the email_delivery_log table
      // For now, return mock stats
      return {
        totalSent: 1250,
        delivered: 1180,
        opened: 890,
        clicked: 340,
        bounced: 45,
        failed: 25,
        deliveryRate: 94.4,
        openRate: 71.2,
        clickRate: 27.2,
        bounceRate: 3.6,
      };
    }),
});

/**
 * Get default test data for each template
 */
function getDefaultTestData(template: string): Record<string, any> {
  switch (template) {
    case 'appointment-confirmation':
      return {
        userName: 'John Doe',
        propertyAddress: '123 Main Street, Lagos, Nigeria',
        appointmentDate: new Date(Date.now() + 86400000).toLocaleDateString(),
        appointmentTime: '2:00 PM',
        tourType: 'In-Person',
        agentName: 'Sarah Johnson',
        agentPhone: '+234 123 456 7890',
        agentEmail: 'sarah@realestate.com',
        meetingLink: 'https://meet.realestate.com/tour/abc123',
        propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
      };

    case 'offer-update':
      return {
        userName: 'John Doe',
        propertyAddress: '123 Main Street, Lagos, Nigeria',
        offerAmount: '₦45,000,000',
        status: 'Accepted',
        statusColor: '#10b981',
        message: 'Congratulations! Your offer has been accepted by the seller.',
        nextSteps: 'Please review and sign the purchase agreement within 48 hours.',
        propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
      };

    case 'saved-search-alert':
      return {
        userName: 'John Doe',
        searchName: 'Luxury Homes in Lekki',
        newListingsCount: 3,
        properties: [
          {
            address: '456 Ocean View, Lekki Phase 1',
            price: '₦75,000,000',
            bedrooms: 4,
            bathrooms: 3,
            sqft: '3,200',
            image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
            url: 'https://realestate.com/property/1',
          },
          {
            address: '789 Garden Estate, Lekki Phase 2',
            price: '₦85,000,000',
            bedrooms: 5,
            bathrooms: 4,
            sqft: '4,000',
            image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
            url: 'https://realestate.com/property/2',
          },
        ],
      };

    case 'price-drop':
      return {
        userName: 'John Doe',
        propertyAddress: '123 Main Street, Lagos, Nigeria',
        oldPrice: '₦50,000,000',
        newPrice: '₦45,000,000',
        priceChange: '₦5,000,000',
        percentageChange: '10%',
        propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
        propertyUrl: 'https://realestate.com/property/123',
      };

    default:
      return {};
  }
}
