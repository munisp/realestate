/**
 * Hybrid Valuation tRPC Router
 * Exposes hybrid valuation model to frontend
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getHybridValuationClient } from "../clients/hybridValuationClient";
import { getDb } from "../db";
import {
  hybridValuations,
  confidenceScores,
  valuationDataSources,
  satelliteImageryAnalysis,
  alternativeDataSources,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Input validation schemas
const propertyDataSchema = z.object({
  id: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  city: z.string(),
  state: z.string(),
  type: z.string(),
  size_sqm: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  base_price_per_sqm: z.number().optional(),
});

const valuationRequestSchema = z.object({
  property_data: propertyDataSchema,
  comparable_count: z.number().default(0),
  transaction_history_count: z.number().default(0),
  market_volatility: z.number().default(0.15),
});

export const hybridValuationRouter = router({
  /**
   * Get hybrid valuation for a property
   */
  getValuation: publicProcedure
    .input(valuationRequestSchema)
    .mutation(async ({ input }) => {
      const client = getHybridValuationClient();
      
      try {
        // Call Python hybrid valuation service
        const result = await client.valueProperty(input);
        
        // Store result in database
        const db = await getDb();
        if (db && input.property_data.id) {
          try {
            // Insert hybrid valuation record
            const [hybridVal] = await db.insert(hybridValuations).values({
              valuationId: 0, // Will be linked to base valuation if needed
              propertyId: parseInt(input.property_data.id),
              pathwayUsed: result.pathway_used as "data_rich" | "data_scarce" | "hybrid",
              dataAvailabilityScore: Math.round(result.data_availability_score * 100),
              components: JSON.stringify(result.confidence_details.data_source_contributions),
              finalValuation: Math.round(result.final_valuation),
              confidenceScore: Math.round(result.confidence_score * 100),
              uncertaintyRangeLower: Math.round(result.uncertainty_range[0]),
              uncertaintyRangeUpper: Math.round(result.uncertainty_range[1]),
              satelliteAnalysisId: null,
              alternativeDataId: null,
              modelVersion: result.model_version,
              metadata: JSON.stringify({
                num_components: result.num_components,
                component_methods: result.component_methods,
                valuation_timestamp: result.valuation_timestamp,
              }),
            });
            
            // Insert confidence scores
            if (hybridVal.insertId) {
              await db.insert(confidenceScores).values({
                valuationId: hybridVal.insertId,
                overallConfidence: Math.round(result.confidence_details.overall_confidence * 100),
                confidenceLevel: result.confidence_details.confidence_level as any,
                dataCompletenessScore: Math.round(result.confidence_details.data_completeness.overall_completeness * 100),
                modelAccuracyScore: Math.round(result.confidence_details.confidence_breakdown.model_accuracy_contribution * 100),
                comparableQualityScore: Math.round(result.confidence_details.confidence_breakdown.comparable_quality_contribution * 100),
                satelliteConfidenceScore: result.satellite_analysis 
                  ? Math.round(result.satellite_analysis.confidence_score * 100)
                  : null,
                marketStabilityScore: Math.round(result.confidence_details.confidence_breakdown.market_stability_contribution * 100),
                comparableSalesCount: result.confidence_details.data_completeness.comparable_sales_count,
                transactionHistoryCount: result.confidence_details.data_completeness.transaction_history_count,
                satelliteDataAvailable: result.satellite_analysis ? 1 : 0,
                alternativeDataSourcesCount: result.confidence_details.data_completeness.alternative_data_sources,
                predictionIntervalLower: Math.round(result.confidence_details.uncertainty_metrics.prediction_interval_lower),
                predictionIntervalUpper: Math.round(result.confidence_details.uncertainty_metrics.prediction_interval_upper),
                intervalWidthPercent: Math.round(result.confidence_details.uncertainty_metrics.interval_width_percent),
                standardError: Math.round(result.confidence_details.uncertainty_metrics.standard_error),
                qualityFlags: JSON.stringify(result.confidence_details.quality_flags),
                limitingFactors: JSON.stringify(result.confidence_details.confidence_breakdown.limiting_factors),
                recommendations: JSON.stringify(result.confidence_details.recommendations),
              });
              
              // Insert data source contributions
              for (const contrib of result.confidence_details.data_source_contributions) {
                await db.insert(valuationDataSources).values({
                  valuationId: hybridVal.insertId,
                  sourceName: contrib.source_name,
                  sourceType: contrib.source_name.includes('satellite') ? 'satellite_imagery' :
                             contrib.source_name.includes('comparable') ? 'comparable_sales' :
                             contrib.source_name.includes('market') ? 'market_listings' :
                             contrib.source_name.includes('hedonic') ? 'hedonic_model' : 'comparable_sales',
                  weight: Math.round(contrib.weight * 100),
                  confidence: Math.round(contrib.confidence * 100),
                  valueContribution: Math.round(contrib.value_contribution),
                  dataQuality: result.confidence_details.data_completeness.quality_flag as any,
                  dataCount: null,
                  metadata: JSON.stringify({ importance_rank: contrib.importance_rank }),
                });
              }
              
              // Insert satellite analysis if available
              if (result.satellite_analysis) {
                await db.insert(satelliteImageryAnalysis).values({
                  propertyId: parseInt(input.property_data.id),
                  buildingFootprintSqm: Math.round(result.satellite_analysis.building_footprint_sqm),
                  estimatedHeightM: Math.round(result.satellite_analysis.estimated_height_m * 100), // cm
                  numFloors: result.satellite_analysis.num_floors,
                  roofMaterial: result.satellite_analysis.roof_material as any,
                  roofCondition: result.satellite_analysis.roof_condition as any,
                  buildingDensity: Math.round(result.satellite_analysis.building_density * 10),
                  greenSpaceRatio: Math.round(result.satellite_analysis.green_space_ratio * 100),
                  roadAccessQuality: result.satellite_analysis.road_access_quality as any,
                  amenityDensity: null,
                  roadDensityKm: null,
                  commercialRatio: null,
                  infrastructureScore: null,
                  analysisConfidence: Math.round(result.satellite_analysis.confidence_score * 100),
                  dataQuality: result.confidence_details.data_completeness.quality_flag as any,
                  dataSources: JSON.stringify(['satellite_imagery']),
                  analysisTimestamp: new Date(),
                  valuationMultiplier: null,
                  metadata: JSON.stringify({}),
                });
              }
            }
          } catch (dbError) {
            console.error('Failed to store valuation in database:', dbError);
            // Continue even if DB storage fails
          }
        }
        
        return result;
      } catch (error) {
        console.error('Hybrid valuation error:', error);
        throw new Error(`Valuation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  /**
   * Get valuation history for a property
   */
  getValuationHistory: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const history = await db
        .select()
        .from(hybridValuations)
        .where(eq(hybridValuations.propertyId, input.propertyId))
        .orderBy(desc(hybridValuations.createdAt))
        .limit(input.limit);

      return history;
    }),

  /**
   * Get confidence score details for a valuation
   */
  getConfidenceDetails: publicProcedure
    .input(z.object({
      valuationId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const [confidence] = await db
        .select()
        .from(confidenceScores)
        .where(eq(confidenceScores.valuationId, input.valuationId))
        .limit(1);

      if (!confidence) {
        throw new Error('Confidence scores not found');
      }

      // Get data source contributions
      const sources = await db
        .select()
        .from(valuationDataSources)
        .where(eq(valuationDataSources.valuationId, input.valuationId));

      return {
        ...confidence,
        dataSources: sources,
      };
    }),

  /**
   * Get satellite analysis for a property
   */
  getSatelliteAnalysis: publicProcedure
    .input(z.object({
      propertyId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const [analysis] = await db
        .select()
        .from(satelliteImageryAnalysis)
        .where(eq(satelliteImageryAnalysis.propertyId, input.propertyId))
        .orderBy(desc(satelliteImageryAnalysis.createdAt))
        .limit(1);

      return analysis || null;
    }),

  /**
   * Health check for hybrid valuation service
   */
  healthCheck: publicProcedure
    .query(async () => {
      const client = getHybridValuationClient();
      
      try {
        const health = await client.healthCheck();
        return {
          status: 'healthy',
          service: health.service,
          version: health.version,
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});
