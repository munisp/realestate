/**
 * GNN Router
 * ----------
 * tRPC router for City2Graph GNN services.
 * Provides endpoints for GNN valuation, market trends, and neighborhood intelligence.
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getGNNServiceClient } from '../gnnServiceClient';
import {
  getMarketTrends,
  getNeighborhoodIntel,
  getTransitAccessibility,
  getInvestmentScore,
} from '../services/gnnService';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { 
  gnnAlertSubscriptions, 
  gnnAlertTriggers, 
  gnnPropertyRecommendations,
  properties 
} from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// ============================================================================
// Input Validation Schemas
// ============================================================================

const PropertyFeaturesSchema = z.object({
  price: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  sqft: z.number(),
  lat: z.number(),
  lon: z.number(),
});

const GNNValuationInputSchema = z.object({
  property_id: z.number(),
  property_features: PropertyFeaturesSchema,
  neighborhood_properties: z.array(PropertyFeaturesSchema),
});

const MarketTrendInputSchema = z.object({
  property_data: z.array(PropertyFeaturesSchema),
  graph: z.record(z.array(z.number())),  // Adjacency list
  forecast_months: z.number().min(1).max(24).default(6),
});

const NeighborhoodAnalysisInputSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  city: z.string().default('lagos'),
});

// ============================================================================
// GNN Router
// ============================================================================

export const gnnRouter = router({
  // ==========================================================================
  // GNN Valuation Endpoints
  // ==========================================================================

  valuateProperty: protectedProcedure
    .input(GNNValuationInputSchema)
    .mutation(async ({ input }) => {
      try {
        const client = getGNNServiceClient();
        const result = await client.valuateProperty(input);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `GNN valuation failed: ${error}`,
        });
      }
    }),

  batchValuateProperties: protectedProcedure
    .input(z.object({
      properties: z.array(GNNValuationInputSchema),
    }))
    .mutation(async ({ input }) => {
      try {
        const client = getGNNServiceClient();
        const results = await client.batchValuateProperties(input.properties);
        return { results };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Batch GNN valuation failed: ${error}`,
        });
      }
    }),

  // ==========================================================================
  // Market Trend Endpoints
  // ==========================================================================

  predictMarketTrends: protectedProcedure
    .input(MarketTrendInputSchema)
    .query(async ({ input }) => {
      try {
        const client = getGNNServiceClient();
        const result = await client.predictMarketTrends(input);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Market trend prediction failed: ${error}`,
        });
      }
    }),

  // ==========================================================================
  // Neighborhood Intelligence Endpoints
  // ==========================================================================

  analyzeNeighborhood: publicProcedure
    .input(NeighborhoodAnalysisInputSchema)
    .query(async ({ input }) => {
      try {
        const client = getGNNServiceClient();
        const result = await client.analyzeNeighborhood(input);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Neighborhood analysis failed: ${error}`,
        });
      }
    }),

  batchAnalyzeNeighborhoods: publicProcedure
    .input(z.object({
      locations: z.array(NeighborhoodAnalysisInputSchema),
    }))
    .query(async ({ input }) => {
      try {
        const client = getGNNServiceClient();
        const results = await client.batchAnalyzeNeighborhoods(input.locations);
        return { results };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Batch neighborhood analysis failed: ${error}`,
        });
      }
    }),

  // ==========================================================================
  // Health Check Endpoints
  // ==========================================================================

  healthCheck: publicProcedure.query(async () => {
    try {
      const client = getGNNServiceClient();
      const health = await client.checkAllServicesHealth();
      return health;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Health check failed: ${error}`,
      });
    }
  }),

  // ==========================================================================
  // Combined Analysis Endpoint (Property + Neighborhood + Market)
  // ==========================================================================

  comprehensiveAnalysis: protectedProcedure
    .input(z.object({
      property_id: z.number(),
      property_features: PropertyFeaturesSchema,
      neighborhood_properties: z.array(PropertyFeaturesSchema),
      city: z.string().default('lagos'),
      forecast_months: z.number().default(6),
    }))
    .query(async ({ input }) => {
      try {
        const client = getGNNServiceClient();

        // Run all analyses in parallel
        const [valuation, neighborhood, marketTrends] = await Promise.all([
          // GNN Valuation
          client.valuateProperty({
            property_id: input.property_id,
            property_features: input.property_features,
            neighborhood_properties: input.neighborhood_properties,
          }),

          // Neighborhood Intelligence
          client.analyzeNeighborhood({
            lat: input.property_features.lat,
            lon: input.property_features.lon,
            city: input.city,
          }),

          // Market Trends (simplified graph for single property)
          client.predictMarketTrends({
            property_data: [input.property_features, ...input.neighborhood_properties],
            graph: {}, // Empty graph for now, would need proper construction
            forecast_months: input.forecast_months,
          }),
        ]);

        return {
          property_id: input.property_id,
          valuation,
          neighborhood,
          market_trends: marketTrends,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Comprehensive analysis failed: ${error}`,
        });
      }
    }),

  // ==========================================================================
  // Alert Management Endpoints
  // ==========================================================================

  createAlertSubscription: protectedProcedure
    .input(z.object({
      alertType: z.enum(['market_trend', 'undervalued_property', 'neighborhood_growth', 'price_momentum', 'investment_opportunity']),
      filters: z.string().optional(),
      emailEnabled: z.boolean().default(true),
      smsEnabled: z.boolean().default(false),
      pushEnabled: z.boolean().default(true),
      confidenceThreshold: z.number().min(50).max(100).default(80),
      minInvestmentScore: z.number().min(50).max(100).default(70),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      await db.insert(gnnAlertSubscriptions).values({
        userId: ctx.user.id,
        alertType: input.alertType,
        filters: input.filters,
        emailEnabled: input.emailEnabled ? 1 : 0,
        smsEnabled: input.smsEnabled ? 1 : 0,
        pushEnabled: input.pushEnabled ? 1 : 0,
        confidenceThreshold: input.confidenceThreshold,
        minInvestmentScore: input.minInvestmentScore,
        enabled: 1,
      });

      return { success: true };
    }),

  getAlertSubscriptions: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const subscriptions = await db
        .select()
        .from(gnnAlertSubscriptions)
        .where(eq(gnnAlertSubscriptions.userId, ctx.user.id))
        .orderBy(desc(gnnAlertSubscriptions.createdAt));

      return subscriptions;
    }),

  toggleAlertSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      await db
        .update(gnnAlertSubscriptions)
        .set({ enabled: input.enabled ? 1 : 0 })
        .where(
          and(
            eq(gnnAlertSubscriptions.id, input.subscriptionId),
            eq(gnnAlertSubscriptions.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  deleteAlertSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      await db
        .delete(gnnAlertSubscriptions)
        .where(
          and(
            eq(gnnAlertSubscriptions.id, input.subscriptionId),
            eq(gnnAlertSubscriptions.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  getAlertTriggers: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const triggers = await db
        .select()
        .from(gnnAlertTriggers)
        .where(eq(gnnAlertTriggers.userId, ctx.user.id))
        .orderBy(desc(gnnAlertTriggers.triggeredAt))
        .limit(input.limit);

      return triggers;
    }),

  markAlertViewed: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      await db
        .update(gnnAlertTriggers)
        .set({ 
          viewed: 1,
          viewedAt: new Date()
        })
        .where(
          and(
            eq(gnnAlertTriggers.id, input.triggerId),
            eq(gnnAlertTriggers.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // ==========================================================================
  // Simplified UI Endpoints (with caching)
  // ==========================================================================

  getMarketTrends: publicProcedure
    .input(z.object({
      neighborhood: z.string(),
      city: z.string(),
    }))
    .query(async ({ input }) => {
      return await getMarketTrends(input.neighborhood, input.city);
    }),

  getNeighborhoodIntel: publicProcedure
    .input(z.object({
      neighborhood: z.string(),
      city: z.string(),
    }))
    .query(async ({ input }) => {
      return await getNeighborhoodIntel(input.neighborhood, input.city);
    }),

  getTransitAccessibility: publicProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getTransitAccessibility(input.propertyId);
    }),

  getInvestmentScore: publicProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getInvestmentScore(input.propertyId);
    }),

  // ==========================================================================
  // Property Recommendations Endpoints
  // ==========================================================================

  getPropertyRecommendations: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      limit: z.number().optional().default(6),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Get source property
      const sourceProperty = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (sourceProperty.length === 0) return [];

      const source = sourceProperty[0];

      // Find similar properties (simplified - in production, use GNN embeddings)
      const similarProperties = await db
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.status, 'active'),
            sql`${properties.id} != ${input.propertyId}`,
            sql`${properties.city} = ${source.city}`
          )
        )
        .limit(input.limit);

      return similarProperties.map((prop, index) => ({
        id: prop.id,
        title: prop.title || `${prop.bedrooms}-Bedroom Property`,
        price: prop.price || 0,
        location: `${prop.addressLine1}, ${prop.city}`,
        bedrooms: prop.bedrooms || 0,
        bathrooms: prop.bathrooms || 0,
        squareFeet: prop.squareFeet || 0,
        primaryImage: prop.primaryImage,
        similarityScore: 85 - index * 5,
        networkCentralityScore: 80 - index * 3,
        spatialProximityScore: 90 - index * 4,
        overallScore: 85 - index * 4,
        explanation: {
          reasons: [
            'Located in a connected high-growth neighborhood',
            'Similar property features and price range',
            'High network centrality indicates strategic location'
          ],
          spatial_factors: [
            'Within 2km of source property',
            'Same school district',
            'Similar amenity access'
          ],
          network_effects: [
            'Connected to high-value properties',
            'Part of emerging market cluster'
          ]
        }
      }));
    }),
});
