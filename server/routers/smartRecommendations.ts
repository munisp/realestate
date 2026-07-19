import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties, favorites, savedSearches } from "../../drizzle/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { applyDiversityControls, calculateDiversityScore, getDefaultDiversityConfig, type PropertyRecommendation } from "../services/diversityControl";

export const smartRecommendationsRouter = router({
  /**
   * Generate personalized property recommendations based on user's activity
   */
  getPersonalizedRecommendations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { recommendations: [] };
    }

    try {
      // Get user's favorite properties
      const userFavorites = await db
        .select({
          property: properties,
        })
        .from(favorites)
        .innerJoin(properties, eq(favorites.propertyId, properties.id))
        .where(eq(favorites.userId, ctx.user.id))
        .limit(10);

      // Get user's saved searches
      const userSearches = await db
        .select()
        .from(savedSearches)
        .where(eq(savedSearches.userId, ctx.user.id))
        .limit(5);

      // Get all active properties (excluding already favorited ones)
      const favoritedIds = userFavorites.map(f => f.property.id);
      const candidateProperties = await db
        .select()
        .from(properties)
        .where(
          sql`${properties.status} = 'active' AND ${properties.id} NOT IN (${favoritedIds.length > 0 ? favoritedIds.join(',') : '0'})`
        )
        .limit(50);

      // Analyze user preferences using AI
      const favoritesSummary = userFavorites.map(f => ({
        type: f.property.propertyType,
        price: f.property.price,
        bedrooms: f.property.bedrooms,
        bathrooms: f.property.bathrooms,
        city: f.property.city,
        state: f.property.state,
      }));

      const searchesSummary = userSearches.map(s => ({
        criteria: s.criteria ? JSON.parse(s.criteria) : {},
        name: s.name,
      }));

      // Use LLM to analyze preferences and generate recommendations
      const analysisPrompt = `You are a real estate recommendation expert. Analyze the user's preferences and recommend the top 5 properties from the candidates.

User's Favorite Properties:
${JSON.stringify(favoritesSummary, null, 2)}

User's Saved Searches:
${JSON.stringify(searchesSummary, null, 2)}

Candidate Properties (select top 5):
${JSON.stringify(candidateProperties.slice(0, 20).map(p => ({
  id: p.id,
  type: p.propertyType,
  price: p.price,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  squareFeet: p.squareFeet,
  city: p.city,
  state: p.state,
  title: p.title,
})), null, 2)}

For each recommended property, provide:
1. Property ID
2. Match score (0-100)
3. Reason for recommendation (2-3 sentences explaining why this matches their preferences)

Return ONLY a JSON array of recommendations in this exact format:
[
  {
    "propertyId": 123,
    "matchScore": 95,
    "reason": "This property matches your preference for..."
  }
]`;

      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a real estate recommendation expert. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "property_recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      propertyId: { type: "number" },
                      matchScore: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: ["propertyId", "matchScore", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations"],
              additionalProperties: false,
            },
          },
        },
      });

      const aiRecommendations = JSON.parse(
        llmResponse.choices[0]?.message?.content || '{"recommendations":[]}'
      );

      // Fetch full property details for recommended properties
      const recommendedIds = aiRecommendations.recommendations.map(
        (r: any) => r.propertyId
      );

      const recommendedProperties = await db
        .select()
        .from(properties)
        .where(inArray(properties.id, recommendedIds));

      // Combine AI recommendations with property details
      const finalRecommendations = aiRecommendations.recommendations.map((rec: any) => {
        const property = recommendedProperties.find(p => p.id === rec.propertyId);
        return {
          property,
          matchScore: rec.matchScore,
          reason: rec.reason,
        };
      }).filter((r: any) => r.property); // Filter out any properties that weren't found

      return {
        recommendations: finalRecommendations,
      };
    } catch (error) {
      console.error("[SmartRecommendations] Error generating recommendations:", error);
      return { recommendations: [] };
    }
  }),

  /**
   * Get recommendations with diversity controls applied
   */
  getDiverseRecommendations: protectedProcedure
    .input(
      z.object({
        diversityLevel: z.enum(["high", "medium", "low"]).default("medium"),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {      const db = await getDb();
      if (!db) {
        return { recommendations: [], diversityMetrics: null };
      }

      try {
        // Get user's favorites
        const userFavorites = await db
          .select({ property: properties })
          .from(favorites)
          .innerJoin(properties, eq(favorites.propertyId, properties.id))
          .where(eq(favorites.userId, ctx.user.id))
          .limit(10);

        const favoritedIds = userFavorites.map(f => f.property.id);

        // Get candidate properties
        const candidateProperties = await db
          .select()
          .from(properties)
          .where(
            sql`${properties.status} = 'active' AND ${properties.id} NOT IN (${favoritedIds.length > 0 ? favoritedIds.join(',') : '0'})`
          )
          .limit(50);

        // Convert to PropertyRecommendation format
        const allPropertyRecs: PropertyRecommendation[] = candidateProperties.map((prop) => ({
          propertyId: prop.id,
          matchScore: 0.7 + Math.random() * 0.3, // Simulated match scores
          price: prop.price,
          propertyType: prop.propertyType,
          location: `${prop.city}, ${prop.state}`,
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
        }));

        // Sort by match score
        allPropertyRecs.sort((a, b) => b.matchScore - a.matchScore);

        // Take top recommendations
        const topRecs = allPropertyRecs.slice(0, input.limit);

        // Apply diversity controls
        const diversityConfig = getDefaultDiversityConfig(input.diversityLevel);
        const diverseRecs = applyDiversityControls(topRecs, allPropertyRecs, diversityConfig);
        const diversityMetrics = calculateDiversityScore(diverseRecs);

        // Get final property details
        const diversePropertyIds = diverseRecs.map(r => r.propertyId);
        const finalProperties = await db
          .select()
          .from(properties)
          .where(inArray(properties.id, diversePropertyIds));

        // Combine with match scores
        const result = finalProperties.map((prop) => {
          const rec = diverseRecs.find(r => r.propertyId === prop.id);
          return {
            property: prop,
            matchScore: rec?.matchScore || 0,
            reason: `Match score: ${((rec?.matchScore || 0) * 100).toFixed(0)}%`,
          };
        });

        return {
          recommendations: result,
          diversityMetrics,
          diversityConfig,
        };
      } catch (error) {
        console.error("[SmartRecommendations] Error generating diverse recommendations:", error);
        return { recommendations: [], diversityMetrics: null };
      }
    }),
});
