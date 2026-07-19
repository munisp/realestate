/**
 * Neighborhood Intelligence Router
 * Integrates schools, crime, walk score, and other location intelligence
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { greatSchoolsAPI } from '../_core/greatSchoolsApi';
import { crimeDataAPI } from '../_core/crimeDataApi';
import { walkScoreAPI } from '../_core/walkScoreApi';
import { geospatialIntegration } from '../_core/geospatialIntegration';

export const neighborhoodIntelligenceRouter = router({
  /**
   * Get comprehensive neighborhood intelligence for a location
   */
  getNeighborhoodIntelligence: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        address: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Fetch all data in parallel
      const [schools, crime, walkability, geospatialStats] = await Promise.all([
        greatSchoolsAPI.searchNearby({
          lat: input.lat,
          lng: input.lng,
          radius: 2,
          limit: 10,
        }),
        crimeDataAPI.searchNearby({
          lat: input.lat,
          lng: input.lng,
          radius: 1,
          days: 90,
        }),
        walkScoreAPI.getScores({
          lat: input.lat,
          lng: input.lng,
          address: input.address,
        }),
        // Get H3 index for neighborhood stats
        (async () => {
          const h3Index = await geospatialIntegration.indexProperty({
            id: 'temp',
            location: {
              lat: input.lat,
              lng: input.lng,
              address: input.address,
              city: '',
              state: '',
              zipCode: '',
            },
            features: {
              propertyType: '',
              price: 0,
              bedrooms: 0,
              bathrooms: 0,
              sqft: 0,
            },
          });
          
          return geospatialIntegration.getNeighborhoodStats(h3Index.h3Index);
        })(),
      ]);

      // Calculate overall neighborhood score (0-100)
      const neighborhoodScore = Math.round(
        (schools.averageRating * 10 + // School rating 0-100
          crime.statistics.safetyScore + // Safety score 0-100
          walkability.walkScore + // Walk score 0-100
          walkability.transitScore + // Transit score 0-100
          walkability.bikeScore) / // Bike score 0-100
          5
      );

      // Determine neighborhood grade
      let neighborhoodGrade: 'A' | 'B' | 'C' | 'D' | 'F';
      if (neighborhoodScore >= 90) neighborhoodGrade = 'A';
      else if (neighborhoodScore >= 80) neighborhoodGrade = 'B';
      else if (neighborhoodScore >= 70) neighborhoodGrade = 'C';
      else if (neighborhoodScore >= 60) neighborhoodGrade = 'D';
      else neighborhoodGrade = 'F';

      return {
        location: {
          lat: input.lat,
          lng: input.lng,
          address: input.address,
        },
        neighborhoodScore,
        neighborhoodGrade,
        schools: {
          nearby: schools.schools,
          averageRating: schools.averageRating,
          total: schools.total,
        },
        safety: {
          safetyScore: crime.statistics.safetyScore,
          safetyGrade: crime.safetyGrade,
          totalIncidents: crime.statistics.totalIncidents,
          incidentsByType: crime.statistics.incidentsByType,
          trend: crime.statistics.trend,
          recentIncidents: crime.incidents.slice(0, 5), // Last 5 incidents
        },
        walkability: {
          walkScore: walkability.walkScore,
          walkDescription: walkability.walkDescription,
          transitScore: walkability.transitScore,
          transitDescription: walkability.transitDescription,
          bikeScore: walkability.bikeScore,
          bikeDescription: walkability.bikeDescription,
          overallGrade: walkability.overallGrade,
        },
        demographics: geospatialStats.demographics,
        amenities: geospatialStats.amenities,
        marketStats: {
          propertyCount: geospatialStats.propertyCount,
          averagePrice: geospatialStats.averagePrice,
          medianPrice: geospatialStats.medianPrice,
          pricePerSqft: geospatialStats.pricePerSqft,
        },
      };
    }),

  /**
   * Get schools near a location
   */
  getSchools: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().optional(),
        level: z.enum(['elementary', 'middle', 'high', 'all']).optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await greatSchoolsAPI.searchNearby(input);
    }),

  /**
   * Get school score for a location
   */
  getSchoolScore: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
      })
    )
    .query(async ({ input }) => {
      const score = await greatSchoolsAPI.calculateSchoolScore(input.lat, input.lng);
      
      let grade: 'A' | 'B' | 'C' | 'D' | 'F';
      if (score >= 9) grade = 'A';
      else if (score >= 7) grade = 'B';
      else if (score >= 5) grade = 'C';
      else if (score >= 3) grade = 'D';
      else grade = 'F';

      return {
        score,
        grade,
      };
    }),

  /**
   * Get crime data for a location
   */
  getCrimeData: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().optional(),
        days: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await crimeDataAPI.searchNearby(input);
    }),

  /**
   * Get safety score for a location
   */
  getSafetyScore: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
      })
    )
    .query(async ({ input }) => {
      const score = await crimeDataAPI.calculateSafetyScore(input.lat, input.lng);
      
      let grade: 'A' | 'B' | 'C' | 'D' | 'F';
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';
      else grade = 'F';

      return {
        score,
        grade,
      };
    }),

  /**
   * Get crime trend analysis
   */
  getCrimeTrend: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await crimeDataAPI.getCrimeTrend(input.lat, input.lng);
    }),

  /**
   * Get Walk Score data
   */
  getWalkability: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        address: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await walkScoreAPI.getScores(input);
    }),

  /**
   * Compare multiple neighborhoods
   */
  compareNeighborhoods: publicProcedure
    .input(
      z.object({
        locations: z.array(
          z.object({
            lat: z.number(),
            lng: z.number(),
            address: z.string(),
            name: z.string().optional(),
          })
        ),
      })
    )
    .query(async ({ input }) => {
      const comparisons = await Promise.all(
        input.locations.map(async (location) => {
          const [schools, crime, walkability] = await Promise.all([
            greatSchoolsAPI.calculateSchoolScore(location.lat, location.lng),
            crimeDataAPI.calculateSafetyScore(location.lat, location.lng),
            walkScoreAPI.getScores(location),
          ]);

          const overallScore = Math.round(
            (schools * 10 + crime + walkability.walkScore + walkability.transitScore) / 4
          );

          return {
            location: {
              ...location,
              name: location.name || location.address,
            },
            scores: {
              school: schools,
              safety: crime,
              walkScore: walkability.walkScore,
              transitScore: walkability.transitScore,
              bikeScore: walkability.bikeScore,
              overall: overallScore,
            },
          };
        })
      );

      // Rank neighborhoods by overall score
      comparisons.sort((a, b) => b.scores.overall - a.scores.overall);

      return {
        comparisons,
        winner: comparisons[0],
      };
    }),
});
