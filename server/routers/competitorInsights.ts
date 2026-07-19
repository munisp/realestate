import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { CompetitorInsightsService } from "../services/competitorInsightsService";

export const competitorInsightsRouter = router({
  /**
   * Get insights for a specific property
   */
  getPropertyInsights: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      return await CompetitorInsightsService.getPropertyInsights(input.propertyId);
    }),

  /**
   * Get market positioning analysis
   */
  getMarketPositioning: protectedProcedure.query(async () => {
    return await CompetitorInsightsService.getMarketPositioning();
  }),

  /**
   * Get pricing recommendation for a property
   */
  getPricingRecommendation: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      return await CompetitorInsightsService.getPricingRecommendation(input.propertyId);
    }),

  /**
   * Get insights for all properties
   */
  getAllInsights: protectedProcedure.query(async () => {
    return await CompetitorInsightsService.getAllInsights();
  }),

  /**
   * Export insights report
   */
  exportInsightsReport: protectedProcedure
    .input(
      z.object({
        propertyIds: z.array(z.number()).optional(),
        format: z.enum(["json", "csv"]).default("json"),
      })
    )
    .query(async ({ input }) => {
      const insights = input.propertyIds
        ? await Promise.all(
            input.propertyIds.map(id => CompetitorInsightsService.getPropertyInsights(id))
          )
        : await CompetitorInsightsService.getAllInsights();

      const validInsights = insights.filter(i => i !== null);

      if (input.format === "csv") {
        // Generate CSV
        const headers = [
          "Property ID",
          "Address",
          "Price",
          "Competitor Count",
          "Avg Competitor Price",
          "Price Position",
          "Competitive Advantage",
          "Market Share",
          "Recommended Action",
        ];

        const rows = validInsights.map(insight => [
          insight.propertyId,
          insight.propertyAddress,
          insight.propertyPrice,
          insight.competitorCount,
          insight.avgCompetitorPrice,
          insight.pricePosition,
          insight.competitiveAdvantage,
          insight.marketShare,
          insight.recommendedAction,
        ]);

        const csv = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
        ].join("\n");

        return { format: "csv", data: csv };
      }

      return { format: "json", data: validInsights };
    }),
});
