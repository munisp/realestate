/**
 * AI-Powered Property Recommendation Engine
 * 
 * Uses user browsing history, preferences, and LLM analysis to generate
 * personalized property recommendations
 */

import { invokeLLM } from '../_core/llm';
import { logger } from "../_core/logger";

export interface UserPreferences {
  // Budget
  minBudget?: number;
  maxBudget?: number;
  
  // Property specs
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  propertyTypes?: string[]; // ['single_family', 'condo', etc.]
  
  // Location
  preferredNeighborhoods?: string[];
  maxCommuteTime?: number; // minutes
  commuteDestinations?: string[]; // business district IDs
  
  // Schools
  schoolPriority?: 'low' | 'medium' | 'high';
  minSchoolRating?: number; // 0-10
  
  // Lifestyle
  minWalkabilityScore?: number; // 0-100
  requiredAmenities?: string[];
}

export interface UserBrowsingHistory {
  viewedProperties: Array<{
    id: number;
    price: number;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
    city: string;
    viewDuration: number; // seconds
    viewedAt: Date;
  }>;
  favoritedProperties: Array<{
    id: number;
    price: number;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
    city: string;
    favoritedAt: Date;
  }>;
  savedSearches: Array<{
    criteria: string; // JSON
    frequency: number; // how many times searched
  }>;
}

export interface PropertyRecommendation {
  propertyId: number;
  score: number; // 0-100
  reasoning: string;
  matchedCriteria: string[];
  highlights: string[];
}

export interface RecommendationResult {
  recommendations: PropertyRecommendation[];
  insights: string;
  suggestedFilters: {
    priceRange?: { min: number; max: number };
    bedrooms?: number[];
    neighborhoods?: string[];
  };
}

/**
 * Analyze user behavior to infer preferences
 */
export function inferPreferencesFromBehavior(
  history: UserBrowsingHistory
): Partial<UserPreferences> {
  const { viewedProperties, favoritedProperties } = history;
  
  // Combine viewed and favorited for analysis
  const allProperties = [
    ...viewedProperties.map(p => ({ ...p, weight: p.viewDuration > 60 ? 2 : 1 })),
    ...favoritedProperties.map(p => ({ ...p, weight: 3 })),
  ];
  
  if (allProperties.length === 0) {
    return {};
  }
  
  // Calculate weighted averages
  const totalWeight = allProperties.reduce((sum, p) => sum + p.weight, 0);
  
  const avgPrice = allProperties.reduce((sum, p) => sum + p.price * p.weight, 0) / totalWeight;
  const avgBedrooms = allProperties.reduce((sum, p) => sum + p.bedrooms * p.weight, 0) / totalWeight;
  const avgBathrooms = allProperties.reduce((sum, p) => sum + p.bathrooms * p.weight, 0) / totalWeight;
  
  // Find most common property types
  const propertyTypeCounts: Record<string, number> = {};
  allProperties.forEach(p => {
    propertyTypeCounts[p.propertyType] = (propertyTypeCounts[p.propertyType] || 0) + p.weight;
  });
  const preferredTypes = Object.entries(propertyTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([type]) => type);
  
  // Find most viewed neighborhoods
  const neighborhoodCounts: Record<string, number> = {};
  allProperties.forEach(p => {
    neighborhoodCounts[p.city] = (neighborhoodCounts[p.city] || 0) + p.weight;
  });
  const preferredNeighborhoods = Object.entries(neighborhoodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([city]) => city);
  
  return {
    minBudget: Math.round(avgPrice * 0.7),
    maxBudget: Math.round(avgPrice * 1.3),
    minBedrooms: Math.max(1, Math.floor(avgBedrooms - 0.5)),
    maxBedrooms: Math.ceil(avgBedrooms + 0.5),
    minBathrooms: Math.floor(avgBathrooms),
    propertyTypes: preferredTypes,
    preferredNeighborhoods,
  };
}

/**
 * Generate property recommendations using LLM analysis
 */
export async function generateRecommendations(
  userId: number,
  userPreferences: UserPreferences,
  browsingHistory: UserBrowsingHistory,
  availableProperties: Array<{
    id: number;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    propertyType: string;
    city: string;
    addressLine1: string;
    title: string;
    description: string;
    latitude: string;
    longitude: string;
  }>
): Promise<RecommendationResult> {
  // Infer additional preferences from behavior
  const inferredPrefs = inferPreferencesFromBehavior(browsingHistory);
  const combinedPrefs = { ...inferredPrefs, ...userPreferences };
  
  // Filter properties based on hard constraints
  let filteredProperties = availableProperties.filter(p => {
    if (combinedPrefs.minBudget && p.price < combinedPrefs.minBudget) return false;
    if (combinedPrefs.maxBudget && p.price > combinedPrefs.maxBudget) return false;
    if (combinedPrefs.minBedrooms && p.bedrooms < combinedPrefs.minBedrooms) return false;
    if (combinedPrefs.maxBedrooms && p.bedrooms > combinedPrefs.maxBedrooms) return false;
    if (combinedPrefs.minBathrooms && p.bathrooms < combinedPrefs.minBathrooms) return false;
    if (combinedPrefs.propertyTypes && combinedPrefs.propertyTypes.length > 0) {
      if (!combinedPrefs.propertyTypes.includes(p.propertyType)) return false;
    }
    return true;
  });
  
  // Limit to top 50 for LLM analysis
  filteredProperties = filteredProperties.slice(0, 50);
  
  if (filteredProperties.length === 0) {
    return {
      recommendations: [],
      insights: "No properties match your current criteria. Try adjusting your budget or preferences.",
      suggestedFilters: {
        priceRange: { min: Math.round(combinedPrefs.minBudget! * 0.8), max: Math.round(combinedPrefs.maxBudget! * 1.2) },
      },
    };
  }
  
  // Prepare context for LLM
  const userContext = {
    preferences: combinedPrefs,
    recentViews: browsingHistory.viewedProperties.slice(0, 10).map(p => ({
      price: p.price,
      bedrooms: p.bedrooms,
      type: p.propertyType,
      city: p.city,
      viewDuration: p.viewDuration,
    })),
    favorites: browsingHistory.favoritedProperties.slice(0, 5).map(p => ({
      price: p.price,
      bedrooms: p.bedrooms,
      type: p.propertyType,
      city: p.city,
    })),
  };
  
  const propertiesForAnalysis = filteredProperties.map(p => ({
    id: p.id,
    price: p.price,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    squareFeet: p.squareFeet,
    type: p.propertyType,
    city: p.city,
    title: p.title,
    description: p.description?.substring(0, 200), // Limit description length
  }));
  
  const prompt = `You are a real estate recommendation expert. Analyze the user's preferences and browsing history to recommend the best properties.

User Context:
${JSON.stringify(userContext, null, 2)}

Available Properties (${filteredProperties.length} total):
${JSON.stringify(propertiesForAnalysis, null, 2)}

Task:
1. Rank the top 10 properties that best match the user's preferences and behavior patterns
2. For each property, provide:
   - A relevance score (0-100)
   - Brief reasoning (1-2 sentences)
   - Key matched criteria
   - Unique highlights
3. Provide overall insights about the user's preferences
4. Suggest filter adjustments if needed

Return your response in this JSON format:
{
  "recommendations": [
    {
      "propertyId": number,
      "score": number,
      "reasoning": string,
      "matchedCriteria": string[],
      "highlights": string[]
    }
  ],
  "insights": string,
  "suggestedFilters": {
    "priceRange": { "min": number, "max": number },
    "bedrooms": number[],
    "neighborhoods": string[]
  }
}`;
  
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a real estate recommendation expert. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'property_recommendations',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              recommendations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    propertyId: { type: 'number' },
                    score: { type: 'number' },
                    reasoning: { type: 'string' },
                    matchedCriteria: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    highlights: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['propertyId', 'score', 'reasoning', 'matchedCriteria', 'highlights'],
                  additionalProperties: false,
                },
              },
              insights: { type: 'string' },
              suggestedFilters: {
                type: 'object',
                properties: {
                  priceRange: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                    },
                    required: ['min', 'max'],
                    additionalProperties: false,
                  },
                  bedrooms: {
                    type: 'array',
                    items: { type: 'number' },
                  },
                  neighborhoods: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                additionalProperties: false,
              },
            },
            required: ['recommendations', 'insights'],
            additionalProperties: false,
          },
        },
      },
    });
    
    const result = JSON.parse(response.choices[0].message.content as string);
    return result;
  } catch (error) {
    logger.error('Error generating recommendations:', { error: String(error) });
    
    // Fallback: simple scoring based on preferences
    const fallbackRecs = filteredProperties
      .slice(0, 10)
      .map(p => ({
        propertyId: p.id,
        score: 75,
        reasoning: 'This property matches your basic criteria.',
        matchedCriteria: ['Budget', 'Bedrooms'],
        highlights: [`${p.bedrooms} bedrooms`, `₦${p.price.toLocaleString()}`],
      }));
    
    return {
      recommendations: fallbackRecs,
      insights: 'Showing properties that match your basic criteria.',
      suggestedFilters: {},
    };
  }
}
