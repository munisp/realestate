// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getDb } from "../db";
import { 
  pricingRules, 
  specialEventPricing, 
  customDatePricing,
  marketPricingRecommendations,
  shortLetProperties,
  properties
} from "../../drizzle/schema";
import { SmartPricingService } from "../services/smartPricingService";
import { AutoPricingEngine } from "../jobs/autoPricingEngine";
import { competitorTrackingService } from "../services/competitorTrackingService";

export const pricingRouter = router({
  /**
   * Get pricing rules for a specific property
   */
  getPricingRule: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rules = await db
        .select()
        .from(pricingRules)
        .where(eq(pricingRules.propertyId, input.propertyId))
        .limit(1);

      return rules[0] || null;
    }),

  /**
   * Get all properties owned by the current user for pricing management
   */
  getMyProperties: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const shortletProps = await db
      .select({
        id: shortLetProperties.id,
        propertyId: shortLetProperties.propertyId,
        nightlyRate: shortLetProperties.nightlyRate,
        weeklyRate: shortLetProperties.weeklyRate,
        monthlyRate: shortLetProperties.monthlyRate,
        status: shortLetProperties.status,
        title: properties.title,
        city: properties.city,
        state: properties.state,
      })
      .from(shortLetProperties)
      .leftJoin(properties, eq(shortLetProperties.propertyId, properties.id))
      .where(eq(shortLetProperties.hostId, ctx.user.id))
      .orderBy(desc(shortLetProperties.createdAt));

    return shortletProps;
  }),

  /**
   * Create or update pricing rules for a property
   */
  savePricingRule: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        basePrice: z.number().min(0),
        strategy: z.enum(["fixed", "dynamic", "market_based"]).default("dynamic"),
        weekendMultiplier: z.number().min(1).max(3).default(1.2),
        highSeasonStart: z.string().nullable().optional(),
        highSeasonEnd: z.string().nullable().optional(),
        highSeasonMultiplier: z.number().min(1).max(3).default(1.5),
        lowSeasonStart: z.string().nullable().optional(),
        lowSeasonEnd: z.string().nullable().optional(),
        lowSeasonMultiplier: z.number().min(0.5).max(1).default(0.8),
        enableDemandPricing: z.boolean().default(true),
        demandMultiplierMin: z.number().min(0.5).max(1).default(0.8),
        demandMultiplierMax: z.number().min(1).max(3).default(1.5),
        lastMinuteDays: z.number().min(1).max(30).default(7),
        lastMinuteDiscount: z.number().min(0).max(0.5).default(0.15),
        weeklyDiscount: z.number().min(0).max(0.5).default(0.1),
        monthlyDiscount: z.number().min(0).max(0.5).default(0.2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify property ownership
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(
          and(
            eq(shortLetProperties.id, input.propertyId),
            eq(shortLetProperties.hostId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property.length) {
        throw new Error("Property not found or you don't have permission");
      }

      // Check if rule exists
      const existingRule = await db
        .select()
        .from(pricingRules)
        .where(eq(pricingRules.propertyId, input.propertyId))
        .limit(1);

      if (existingRule.length > 0) {
        // Update existing rule
        await db
          .update(pricingRules)
          .set({
            basePrice: input.basePrice.toString(),
            strategy: input.strategy,
            weekendMultiplier: input.weekendMultiplier.toString(),
            highSeasonStart: input.highSeasonStart || null,
            highSeasonEnd: input.highSeasonEnd || null,
            highSeasonMultiplier: input.highSeasonMultiplier.toString(),
            lowSeasonStart: input.lowSeasonStart || null,
            lowSeasonEnd: input.lowSeasonEnd || null,
            lowSeasonMultiplier: input.lowSeasonMultiplier.toString(),
            enableDemandPricing: input.enableDemandPricing ? 1 : 0,
            demandMultiplierMin: input.demandMultiplierMin.toString(),
            demandMultiplierMax: input.demandMultiplierMax.toString(),
            lastMinuteDays: input.lastMinuteDays,
            lastMinuteDiscount: input.lastMinuteDiscount.toString(),
            weeklyDiscount: input.weeklyDiscount.toString(),
            monthlyDiscount: input.monthlyDiscount.toString(),
            updatedAt: new Date(),
          })
          .where(eq(pricingRules.propertyId, input.propertyId));
      } else {
        // Create new rule
        await db.insert(pricingRules).values({
          propertyId: input.propertyId,
          basePrice: input.basePrice.toString(),
          strategy: input.strategy,
          weekendMultiplier: input.weekendMultiplier.toString(),
          highSeasonStart: input.highSeasonStart || null,
          highSeasonEnd: input.highSeasonEnd || null,
          highSeasonMultiplier: input.highSeasonMultiplier.toString(),
          lowSeasonStart: input.lowSeasonStart || null,
          lowSeasonEnd: input.lowSeasonEnd || null,
          lowSeasonMultiplier: input.lowSeasonMultiplier.toString(),
          enableDemandPricing: input.enableDemandPricing ? 1 : 0,
          demandMultiplierMin: input.demandMultiplierMin.toString(),
          demandMultiplierMax: input.demandMultiplierMax.toString(),
          lastMinuteDays: input.lastMinuteDays,
          lastMinuteDiscount: input.lastMinuteDiscount.toString(),
          weeklyDiscount: input.weeklyDiscount.toString(),
          monthlyDiscount: input.monthlyDiscount.toString(),
        });
      }

      return { success: true };
    }),

  /**
   * Calculate price for a date range using pricing rules
   */
  calculatePrice: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        checkInDate: z.string(),
        checkOutDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get pricing rule
      const rules = await db
        .select()
        .from(pricingRules)
        .where(eq(pricingRules.propertyId, input.propertyId))
        .limit(1);

      if (!rules.length) {
        throw new Error("No pricing rules found for this property");
      }

      const rule = rules[0];

      // Get special events
      const events = await db
        .select()
        .from(specialEventPricing)
        .where(
          and(
            eq(specialEventPricing.propertyId, input.propertyId),
            gte(specialEventPricing.endDate, new Date(input.checkInDate)),
            lte(specialEventPricing.startDate, new Date(input.checkOutDate))
          )
        );

      // Get custom pricing
      const customPrices = await db
        .select()
        .from(customDatePricing)
        .where(
          and(
            eq(customDatePricing.propertyId, input.propertyId),
            gte(customDatePricing.date, new Date(input.checkInDate)),
            lte(customDatePricing.date, new Date(input.checkOutDate))
          )
        );

      // Calculate price using SmartPricingService
      const result = SmartPricingService.calculatePrice({
        pricingRule: rule,
        checkInDate: new Date(input.checkInDate),
        checkOutDate: new Date(input.checkOutDate),
        specialEvents: events,
        customPricing: customPrices,
      });

      return result;
    }),

  /**
   * Get market pricing recommendations
   */
  getMarketRecommendations: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const recommendations = await db
        .select()
        .from(marketPricingRecommendations)
        .where(eq(marketPricingRecommendations.propertyId, input.propertyId))
        .orderBy(desc(marketPricingRecommendations.createdAt))
        .limit(1);

      return recommendations[0] || null;
    }),

  /**
   * Analyze competitor pricing and get market recommendations
   */
  analyzeCompetitors: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify property ownership
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(
          and(
            eq(shortLetProperties.id, input.propertyId),
            eq(shortLetProperties.hostId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property.length) {
        throw new Error("Property not found or you don't have permission");
      }

      // Analyze market and save recommendation
      const analysis = await competitorTrackingService.refreshMarketData(
        input.propertyId
      );

      return analysis;
    }),

  /**
   * Get competitor analysis for a property
   */
  getCompetitorAnalysis: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify property ownership
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(
          and(
            eq(shortLetProperties.id, input.propertyId),
            eq(shortLetProperties.hostId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property.length) {
        throw new Error("Property not found or you don't have permission");
      }

      // Get latest recommendation
      const recommendation = await competitorTrackingService.getLatestRecommendation(
        input.propertyId
      );

      if (!recommendation) {
        // No recommendation exists, generate one
        return await competitorTrackingService.refreshMarketData(input.propertyId);
      }

      // Return existing recommendation with parsed values
      return {
        avgPrice: recommendation.competitorAvgPrice || 0,
        recommendedPrice: recommendation.recommendedBasePrice,
        confidence: parseFloat(recommendation.confidence),
        demandScore: parseFloat(recommendation.marketDemandScore || "0"),
        seasonalityFactor: parseFloat(recommendation.seasonalityFactor || "1"),
        reasoning: recommendation.reasoning || "",
        createdAt: recommendation.createdAt,
      };
    }),

  /**
   * Get special events for a property
   */
  getSpecialEvents: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify property ownership
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(
          and(
            eq(shortLetProperties.id, input.propertyId),
            eq(shortLetProperties.hostId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property.length) {
        throw new Error("Property not found or you don't have permission");
      }

      const events = await db
        .select()
        .from(specialEventPricing)
        .where(eq(specialEventPricing.propertyId, input.propertyId))
        .orderBy(specialEventPricing.startDate);

      return events;
    }),

  /**
   * Add special event pricing
   */
  addSpecialEvent: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        eventName: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        priceMultiplier: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify property ownership
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(
          and(
            eq(shortLetProperties.id, input.propertyId),
            eq(shortLetProperties.hostId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property.length) {
        throw new Error("Property not found or you don't have permission");
      }

      await db.insert(specialEventPricing).values({
        propertyId: input.propertyId,
        eventName: input.eventName,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        priceMultiplier: input.priceMultiplier.toString(),
      });

      return { success: true };
    }),

  /**
   * Delete special event
   */
  deleteSpecialEvent: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership through property
      const event = await db
        .select({
          propertyId: specialEventPricing.propertyId,
        })
        .from(specialEventPricing)
        .where(eq(specialEventPricing.id, input.eventId))
        .limit(1);

      if (!event.length) {
        throw new Error("Event not found");
      }

      const property = await db
        .select()
        .from(shortLetProperties)
        .where(
          and(
            eq(shortLetProperties.id, event[0].propertyId),
            eq(shortLetProperties.hostId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property.length) {
        throw new Error("You don't have permission to delete this event");
      }

      await db
        .delete(specialEventPricing)
        .where(eq(specialEventPricing.id, input.eventId));

      return { success: true };
    }),

  /**
   * Run automated pricing engine for a specific property (on-demand)
   */
  runAutoPricing: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify property ownership
      const property = await db
        .select()
        .from(shortLetProperties)
        .where(
          and(
            eq(shortLetProperties.id, input.propertyId),
            eq(shortLetProperties.hostId, ctx.user.id)
          )
        )
        .limit(1);

      if (!property.length) {
        throw new Error("Property not found or you don't have permission");
      }

      // Run pricing engine
      const updatedCount = await AutoPricingEngine.runForProperty(
        input.propertyId
      );

      return {
        success: true,
        updatedCount,
        message: `Updated ${updatedCount} price entries for the next 90 days`,
      };
    }),
});
