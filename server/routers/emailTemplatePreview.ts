import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { CompetitorEmailTemplateService, type EmailPreviewData } from "../services/competitorEmailTemplateService";

export const emailTemplatePreviewRouter = router({
  /**
   * Get all available email templates
   */
  getTemplates: protectedProcedure.query(() => {
    return CompetitorEmailTemplateService.getTemplates();
  }),

  /**
   * Get template by ID
   */
  getTemplate: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .query(({ input }) => {
      const template = CompetitorEmailTemplateService.getTemplateById(input.templateId);
      if (!template) {
        throw new Error("Template not found");
      }
      return template;
    }),

  /**
   * Preview template with sample data
   */
  previewTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        data: z.object({
          propertyAddress: z.string().optional(),
          propertyPrice: z.string().optional(),
          competitorUrl: z.string().optional(),
          competitorPrice: z.string().optional(),
          priceDifference: z.string().optional(),
          oldPrice: z.string().optional(),
          newPrice: z.string().optional(),
          changePercentage: z.string().optional(),
          competitorCount: z.number().optional(),
          avgCompetitorPrice: z.string().optional(),
          lowestCompetitorPrice: z.string().optional(),
          highestCompetitorPrice: z.string().optional(),
        }),
      })
    )
    .query(({ input }) => {
      const rendered = CompetitorEmailTemplateService.renderTemplate(input.templateId, input.data);
      if (!rendered) {
        throw new Error("Failed to render template");
      }
      return rendered;
    }),

  /**
   * Send test email
   */
  sendTestEmail: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        toEmail: z.string().email(),
        data: z.object({
          propertyAddress: z.string().optional(),
          propertyPrice: z.string().optional(),
          competitorUrl: z.string().optional(),
          competitorPrice: z.string().optional(),
          priceDifference: z.string().optional(),
          oldPrice: z.string().optional(),
          newPrice: z.string().optional(),
          changePercentage: z.string().optional(),
          competitorCount: z.number().optional(),
          avgCompetitorPrice: z.string().optional(),
          lowestCompetitorPrice: z.string().optional(),
          highestCompetitorPrice: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const result = await CompetitorEmailTemplateService.sendTestEmail(
        input.templateId,
        input.data,
        input.toEmail
      );
      return result;
    }),

  /**
   * Get sample data for each template type
   */
  getSampleData: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .query(({ input }): EmailPreviewData => {
      const sampleData: Record<string, EmailPreviewData> = {
        new_competitor: {
          propertyAddress: "123 Main St, Lagos, Nigeria",
          propertyPrice: "₦45,000,000",
          competitorUrl: "https://example.com/property/456",
          competitorPrice: "₦42,000,000",
          priceDifference: "₦3,000,000 lower",
        },
        price_change: {
          propertyAddress: "123 Main St, Lagos, Nigeria",
          competitorUrl: "https://example.com/property/456",
          oldPrice: "₦45,000,000",
          newPrice: "₦42,000,000",
          changePercentage: "-6.7%",
        },
        market_summary: {
          propertyAddress: "123 Main St, Lagos, Nigeria",
          propertyPrice: "₦45,000,000",
          competitorCount: 12,
          avgCompetitorPrice: "₦43,500,000",
          lowestCompetitorPrice: "₦38,000,000",
          highestCompetitorPrice: "₦52,000,000",
        },
      };

      return sampleData[input.templateId] || {};
    }),
});
