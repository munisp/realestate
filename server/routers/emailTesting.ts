// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  renderValuationIncreaseEmail,
  renderValuationDecreaseEmail,
  renderPriceDropEmail,
  renderNewListingEmail,
} from "../services/emailTemplateService";
import { sendEmail } from "../services/emailService";

/**
 * Email Testing Router
 * 
 * Provides endpoints for previewing and testing email templates
 * Useful for development and QA
 */

export const emailTestingRouter = router({
  /**
   * Preview valuation increase email
   */
  previewValuationIncrease: protectedProcedure
    .input(
      z.object({
        userName: z.string().optional(),
        propertyAddress: z.string().optional(),
        previousValuation: z.string().optional(),
        newValuation: z.string().optional(),
        changeAmount: z.string().optional(),
        changePercent: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const html = await renderValuationIncreaseEmail({
        userName: input.userName || "John Doe",
        propertyAddress: input.propertyAddress || "123 Main Street",
        // propertyCity: "Lagos",
        propertyState: "Lagos",
        propertyZip: "100001",
        propertyImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
        previousValuation: input.previousValuation || "₦45,000,000",
        newValuation: input.newValuation || "₦52,000,000",
        changeAmount: input.changeAmount || "₦7,000,000",
        changePercent: input.changePercent || "15.56",
        valuationDate: new Date().toLocaleDateString(),
        propertyUrl: "http://localhost:3000/property/1/valuation",
        insights: [
          "Recent comparable sales in the area have increased by 12%",
          "Market demand for similar properties is strong",
          "Property improvements may have contributed to value increase",
        ],
      });

      return { html };
    }),

  /**
   * Preview valuation decrease email
   */
  previewValuationDecrease: protectedProcedure
    .input(
      z.object({
        userName: z.string().optional(),
        propertyAddress: z.string().optional(),
        previousValuation: z.string().optional(),
        newValuation: z.string().optional(),
        changeAmount: z.string().optional(),
        changePercent: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const html = await renderValuationDecreaseEmail({
        userName: input.userName || "John Doe",
        propertyAddress: input.propertyAddress || "123 Main Street",
        // propertyCity: "Lagos",
        propertyState: "Lagos",
        propertyZip: "100001",
        propertyImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
        previousValuation: input.previousValuation || "₦52,000,000",
        newValuation: input.newValuation || "₦47,000,000",
        changeAmount: input.changeAmount || "₦5,000,000",
        changePercent: input.changePercent || "9.62",
        valuationDate: new Date().toLocaleDateString(),
        propertyUrl: "http://localhost:3000/property/1/valuation",
        insights: [
          "Market conditions in the area have softened slightly",
          "Increased inventory may be affecting values",
          "This may be a temporary market adjustment",
        ],
      });

      return { html };
    }),

  /**
   * Preview price drop email
   */
  previewPriceDrop: protectedProcedure
    .input(
      z.object({
        userName: z.string().optional(),
        propertyAddress: z.string().optional(),
        originalPrice: z.string().optional(),
        newPrice: z.string().optional(),
        priceDropAmount: z.string().optional(),
        priceDropPercent: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const html = await renderPriceDropEmail({
        userName: input.userName || "John Doe",
        propertyAddress: input.propertyAddress || "456 Oak Avenue",
        // propertyCity: "Abuja",
        propertyState: "FCT",
        propertyZip: "900001",
        propertyImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
        originalPrice: input.originalPrice || "₦85,000,000",
        newPrice: input.newPrice || "₦75,000,000",
        priceDropAmount: input.priceDropAmount || "₦10,000,000",
        priceDropPercent: input.priceDropPercent || "11.76",
        priceDropDate: new Date().toLocaleDateString(),
        propertyUrl: "http://localhost:3000/property/2",
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: "3,200",
        propertyType: "Single Family Home",
        daysOnMarket: 45,
      });

      return { html };
    }),

  /**
   * Preview new listing email
   */
  previewNewListing: protectedProcedure
    .input(
      z.object({
        userName: z.string().optional(),
        propertyAddress: z.string().optional(),
        price: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        squareFeet: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const html = await renderNewListingEmail({
        userName: input.userName || "John Doe",
        propertyAddress: input.propertyAddress || "789 Palm Drive",
        propertyImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        price: input.price || "₦95,000,000",
        bedrooms: input.bedrooms || 5,
        bathrooms: input.bathrooms || 4,
        squareFeet: input.squareFeet || 4500,
        propertyUrl: "http://localhost:3000/property/3",
        matchReason: "Matches your search for 4-5 bedroom homes in Victoria Island under ₦100M",
        propertyType: "Detached House",
        yearBuilt: 2022,
        lotSize: "800 sqm",
        scheduleViewingUrl: "http://localhost:3000/schedule-viewing/3",
        savePropertyUrl: "http://localhost:3000/favorites/add/3",
        refineSearchUrl: "http://localhost:3000/saved-searches",
      });

      return { html };
    }),

  /**
   * Send test email
   */
  sendTestEmail: protectedProcedure
    .input(
      z.object({
        templateType: z.enum(["valuation-increase", "valuation-decrease", "price-drop", "new-listing"]),
        recipientEmail: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let html: string;
      let subject: string;

      switch (input.templateType) {
        case "valuation-increase":
          html = await renderValuationIncreaseEmail({
            userName: ctx.user.name || "Test User",
            propertyAddress: "123 Test Street",
            // propertyCity: "Lagos",
            propertyState: "Lagos",
            propertyZip: "100001",
            propertyImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
            previousValuation: "₦45,000,000",
            newValuation: "₦52,000,000",
            changeAmount: "₦7,000,000",
            changePercent: "15.56",
            valuationDate: new Date().toLocaleDateString(),
            propertyUrl: "http://localhost:3000/property/1/valuation",
            insights: [
              "Recent comparable sales in the area have increased by 12%",
              "Market demand for similar properties is strong",
            ],
          });
          subject = "Test: Property Valuation Increased 📈";
          break;

        case "valuation-decrease":
          html = await renderValuationDecreaseEmail({
            userName: ctx.user.name || "Test User",
            propertyAddress: "123 Test Street",
            // propertyCity: "Lagos",
            propertyState: "Lagos",
            propertyZip: "100001",
            propertyImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
            previousValuation: "₦52,000,000",
            newValuation: "₦47,000,000",
            changeAmount: "₦5,000,000",
            changePercent: "9.62",
            valuationDate: new Date().toLocaleDateString(),
            propertyUrl: "http://localhost:3000/property/1/valuation",
            insights: [
              "Market conditions in the area have softened slightly",
              "This may be a temporary market adjustment",
            ],
          });
          subject = "Test: Property Valuation Decreased 📉";
          break;

        case "price-drop":
          html = await renderPriceDropEmail({
            userName: ctx.user.name || "Test User",
            propertyAddress: "456 Test Avenue",
            // propertyCity: "Abuja",
            propertyState: "FCT",
            propertyZip: "900001",
            propertyImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
            originalPrice: "₦85,000,000",
            newPrice: "₦75,000,000",
            priceDropAmount: "₦10,000,000",
            priceDropPercent: "11.76",
            priceDropDate: new Date().toLocaleDateString(),
            propertyUrl: "http://localhost:3000/property/2",
            bedrooms: 4,
            bathrooms: 3,
            squareFeet: "3,200",
            propertyType: "Single Family Home",
            daysOnMarket: 45,
          });
          subject = "Test: Price Drop Alert 💰";
          break;

        case "new-listing":
          html = await renderNewListingEmail({
            userName: ctx.user.name || "Test User",
            propertyAddress: "789 Test Drive",
            propertyImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
            price: "₦95,000,000",
            bedrooms: 5,
            bathrooms: 4,
            squareFeet: 4500,
            propertyUrl: "http://localhost:3000/property/3",
            matchReason: "Matches your search criteria",
            propertyType: "Detached House",
            yearBuilt: 2022,
            lotSize: "800 sqm",
            scheduleViewingUrl: "http://localhost:3000/schedule-viewing/3",
            savePropertyUrl: "http://localhost:3000/favorites/add/3",
            refineSearchUrl: "http://localhost:3000/saved-searches",
          });
          subject = "Test: New Listing Alert 🏠";
          break;
      }

      const success = await sendEmail({
        to: input.recipientEmail,
        subject,
        html,
        userId: ctx.user.id,
        alertType: "test",
      });

      if (!success) {
        throw new Error("Failed to send test email");
      }

      return {
        success: true,
        message: `Test email sent to ${input.recipientEmail}`,
      };
    }),

  /**
   * List all available email templates
   */
  listTemplates: protectedProcedure.query(() => {
    return {
      templates: [
        {
          id: "valuation-increase",
          name: "Valuation Increase Alert",
          description: "Sent when a property's valuation increases",
          category: "valuation",
        },
        {
          id: "valuation-decrease",
          name: "Valuation Decrease Alert",
          description: "Sent when a property's valuation decreases",
          category: "valuation",
        },
        {
          id: "price-drop",
          name: "Price Drop Alert",
          description: "Sent when a listed property's price drops",
          category: "price",
        },
        {
          id: "new-listing",
          name: "New Listing Alert",
          description: "Sent when a new property matching user criteria is listed",
          category: "listing",
        },
      ],
    };
  }),
});
