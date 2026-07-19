/**
 * Zestimate tRPC Router
 * Exposes ML valuation services to the frontend
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  gnnClient,
  cvClient,
  altDataClient,
  ensembleClient,
  biasClient,
} from "../services/zestimateClient";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import {
  propertyValuations,
  visualAssessments,
  alternativeDataCache,
  neighborhoodGraph,
  InsertPropertyValuation,
  InsertVisualAssessment,
  InsertAlternativeDataCache,
  InsertNeighborhoodGraph,
} from "../../drizzle/schema";

export const zestimateRouter = router({
  /**
   * Get comprehensive valuation for a property
   * Combines GNN, ensemble, CV, and alternative data
   */
  getValuation: publicProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check for cached valuation
      const cached = await db
        .select()
        .from(propertyValuations)
        .where(eq(propertyValuations.propertyId, input.propertyId))
        .limit(1);

      if (cached.length > 0) {
        // Return cached valuation if recent (< 24 hours)
        const cacheAge = Date.now() - cached[0].updatedAt.getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return {
            ...cached[0],
            cached: true,
            cacheAge: Math.floor(cacheAge / 1000 / 60), // minutes
          };
        }
      }

      // Fetch property details
      const properties = await import("../../drizzle/schema");
      const property = await db
        .select()
        .from(properties.properties)
        .where(eq(properties.properties.id, input.propertyId))
        .limit(1);

      if (property.length === 0) {
        throw new Error("Property not found");
      }

      const prop = property[0];

      // Get ensemble prediction
      try {
        const ensemblePred = await ensembleClient.predict(input.propertyId, {
          price: prop.price,
          sqft: prop.squareFeet || undefined,
          beds: prop.bedrooms || undefined,
          baths: prop.bathrooms || undefined,
          year_built: prop.yearBuilt || undefined,
        });

        // Save to database
        const valuation: InsertPropertyValuation = {
          propertyId: input.propertyId,
          estimatedValue: ensemblePred.estimated_value.toString(),
          lowerBound: ensemblePred.lower_bound.toString(),
          upperBound: ensemblePred.upper_bound.toString(),
          confidence: ensemblePred.confidence.toString(),
          modelType: "ensemble",
          source: "ensemble",
          metadata: JSON.stringify(ensemblePred.model_predictions),
        };

        await db.insert(propertyValuations).values(valuation);

        return {
          ...ensemblePred,
          propertyId: input.propertyId,
          cached: false,
        };
      } catch (error: any) {
        console.error("Ensemble prediction failed:", error);
        throw new Error(`Valuation failed: ${error.message}`);
      }
    }),

  /**
   * Get visual assessment for a property
   */
  getVisualAssessment: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      forceRefresh: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check cache
      if (!input.forceRefresh) {
        const cached = await db
          .select()
          .from(visualAssessments)
          .where(eq(visualAssessments.propertyId, input.propertyId))
          .limit(1);

        if (cached.length > 0) {
          return { ...cached[0], cached: true };
        }
      }

      // Fetch property coordinates
      const properties = await import("../../drizzle/schema");
      const property = await db
        .select()
        .from(properties.properties)
        .where(eq(properties.properties.id, input.propertyId))
        .limit(1);

      if (property.length === 0) {
        throw new Error("Property not found");
      }

      const prop = property[0];
      const lat = parseFloat(prop.latitude);
      const lng = parseFloat(prop.longitude);

      try {
        const assessment = await cvClient.assessProperty(lat, lng, true);

        // Save to database
        const visualAssessment: InsertVisualAssessment = {
          propertyId: input.propertyId,
          overallCondition: assessment.overall_condition as any,
          conditionScore: assessment.condition_score,
          roofCondition: assessment.aerial_analysis.roof_condition as any,
          hasPool: assessment.aerial_analysis.has_pool,
          hasSolarPanels: assessment.aerial_analysis.has_solar_panels,
          hasDeck: assessment.aerial_analysis.has_deck,
          vegetationIndex: assessment.aerial_analysis.vegetation_index.toString(),
          curbAppeal: assessment.street_analysis.curb_appeal,
          exteriorCondition: assessment.street_analysis.exterior_condition as any,
          parkingSpaces: assessment.street_analysis.parking_spaces,
          walkabilityScore: assessment.street_analysis.walkability_score,
          aerialImageUrl: assessment.aerial_image_url,
          streetViewUrl: assessment.street_view_url || undefined,
        };

        await db.insert(visualAssessments).values(visualAssessment);

        return { ...assessment, cached: false };
      } catch (error: any) {
        console.error("Visual assessment failed:", error);
        throw new Error(`Assessment failed: ${error.message}`);
      }
    }),

  /**
   * Get alternative data enrichment
   */
  getAlternativeData: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      forceRefresh: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check cache
      if (!input.forceRefresh) {
        const cached = await db
          .select()
          .from(alternativeDataCache)
          .where(eq(alternativeDataCache.propertyId, input.propertyId))
          .limit(1);

        if (cached.length > 0) {
          return { ...cached[0], cached: true };
        }
      }

      // Fetch property details
      const properties = await import("../../drizzle/schema");
      const property = await db
        .select()
        .from(properties.properties)
        .where(eq(properties.properties.id, input.propertyId))
        .limit(1);

      if (property.length === 0) {
        throw new Error("Property not found");
      }

      const prop = property[0];
      const lat = parseFloat(prop.latitude);
      const lng = parseFloat(prop.longitude);

      try {
        const altData = await altDataClient.enrichProperty(
          input.propertyId,
          lat,
          lng,
          prop.zipCode
        );

        // Save to database
        const cacheData: InsertAlternativeDataCache = {
          propertyId: input.propertyId,
          walkabilityScore: altData.walkability_score,
          amenityDensity025mi: altData.amenity_density_025mi,
          amenityDensity05mi: altData.amenity_density_05mi,
          amenityDensity1mi: altData.amenity_density_1mi,
          restaurantQualityAvg: altData.restaurant_quality_avg.toString(),
          schoolQualityProxy: altData.school_quality_proxy,
          retailAccessibility: altData.retail_accessibility,
          unemploymentRate: altData.unemployment_rate.toString(),
          wageGrowthYoy: altData.wage_growth_yoy.toString(),
          priceGrowthYoy: altData.price_growth_yoy.toString(),
          searchInterestIndex: altData.search_interest_index,
          buyerUrgencyScore: altData.buyer_urgency_score,
          poiData: JSON.stringify(altData.poi_breakdown),
        };

        await db.insert(alternativeDataCache).values(cacheData);

        return { ...altData, cached: false };
      } catch (error: any) {
        console.error("Alternative data enrichment failed:", error);
        throw new Error(`Enrichment failed: ${error.message}`);
      }
    }),

  /**
   * Get GNN-based neighborhood influence
   */
  getNeighborhoodInfluence: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      kNeighbors: z.number().optional().default(10),
      maxDistanceMiles: z.number().optional().default(2.0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch property coordinates
      const properties = await import("../../drizzle/schema");
      const property = await db
        .select()
        .from(properties.properties)
        .where(eq(properties.properties.id, input.propertyId))
        .limit(1);

      if (property.length === 0) {
        throw new Error("Property not found");
      }

      const prop = property[0];
      const lat = parseFloat(prop.latitude);
      const lng = parseFloat(prop.longitude);

      try {
        const graphData = await gnnClient.buildGraph(
          input.propertyId,
          lat,
          lng,
          input.kNeighbors,
          input.maxDistanceMiles
        );

        // Save neighborhood edges to database
        for (const neighbor of graphData.neighbors) {
          const edge: InsertNeighborhoodGraph = {
            propertyId: input.propertyId,
            neighborId: neighbor.neighbor_id,
            distanceMiles: neighbor.distance_miles.toString(),
            influenceWeight: neighbor.influence_weight.toString(),
          };

          await db.insert(neighborhoodGraph).values(edge);
        }

        return graphData;
      } catch (error: any) {
        console.error("Neighborhood graph building failed:", error);
        throw new Error(`Graph building failed: ${error.message}`);
      }
    }),

  /**
   * Get comprehensive property insights
   * Combines all ML services
   */
  getComprehensiveInsights: publicProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Fetch all insights in parallel
      const [valuation, visualAssessment, alternativeData] = await Promise.allSettled([
        zestimateRouter.createCaller(ctx).getValuation({ propertyId: input.propertyId }),
        zestimateRouter.createCaller(ctx).getVisualAssessment({ propertyId: input.propertyId }),
        zestimateRouter.createCaller(ctx).getAlternativeData({ propertyId: input.propertyId }),
      ]);

      return {
        valuation: valuation.status === 'fulfilled' ? valuation.value : null,
        visualAssessment: visualAssessment.status === 'fulfilled' ? visualAssessment.value : null,
        alternativeData: alternativeData.status === 'fulfilled' ? alternativeData.value : null,
        errors: {
          valuation: valuation.status === 'rejected' ? valuation.reason.message : null,
          visualAssessment: visualAssessment.status === 'rejected' ? visualAssessment.reason.message : null,
          alternativeData: alternativeData.status === 'rejected' ? alternativeData.reason.message : null,
        },
      };
    }),
});
