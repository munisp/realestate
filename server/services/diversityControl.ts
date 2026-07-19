/**
 * Diversity Control Service
 * 
 * Prevents filter bubbles by ensuring recommendation diversity:
 * - Mix high-match properties with exploratory options
 * - Detect and prevent filter bubbles
 * - Calculate diversity scores
 * - Balance personalization with serendipity
 */

export interface PropertyRecommendation {
  propertyId: number;
  matchScore: number;
  price: number;
  propertyType: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
}

export interface DiversityConfig {
  diversityThreshold: number; // 0-1, higher = more diverse
  explorationRate: number; // 0-1, % of exploratory recommendations
  maxSimilarProperties: number; // Max properties with similar attributes
}

export interface DiversityMetrics {
  priceVariance: number;
  typeVariance: number;
  locationVariance: number;
  overallDiversityScore: number;
  filterBubbleRisk: "low" | "medium" | "high";
}

/**
 * Calculate diversity score for a set of recommendations
 */
export function calculateDiversityScore(
  recommendations: PropertyRecommendation[]
): DiversityMetrics {
  if (recommendations.length === 0) {
    return {
      priceVariance: 0,
      typeVariance: 0,
      locationVariance: 0,
      overallDiversityScore: 0,
      filterBubbleRisk: "high",
    };
  }

  // Price variance (normalized standard deviation)
  const prices = recommendations.map((r) => r.price);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const priceStdDev = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
  );
  const priceVariance = avgPrice > 0 ? priceStdDev / avgPrice : 0;

  // Type variance (unique types / total recommendations)
  const uniqueTypes = new Set(recommendations.map((r) => r.propertyType));
  const typeVariance = uniqueTypes.size / recommendations.length;

  // Location variance (unique locations / total recommendations)
  const uniqueLocations = new Set(recommendations.map((r) => r.location));
  const locationVariance = uniqueLocations.size / recommendations.length;

  // Overall diversity score (weighted average)
  const overallDiversityScore =
    priceVariance * 0.3 + typeVariance * 0.4 + locationVariance * 0.3;

  // Filter bubble risk assessment
  let filterBubbleRisk: "low" | "medium" | "high";
  if (overallDiversityScore > 0.6) {
    filterBubbleRisk = "low";
  } else if (overallDiversityScore > 0.3) {
    filterBubbleRisk = "medium";
  } else {
    filterBubbleRisk = "high";
  }

  return {
    priceVariance,
    typeVariance,
    locationVariance,
    overallDiversityScore,
    filterBubbleRisk,
  };
}

/**
 * Apply diversity controls to recommendations
 * 
 * Mixes high-match properties with exploratory options to prevent filter bubbles
 */
export function applyDiversityControls(
  recommendations: PropertyRecommendation[],
  allProperties: PropertyRecommendation[],
  config: DiversityConfig
): PropertyRecommendation[] {
  if (recommendations.length === 0) {
    return [];
  }

  // Step 1: Calculate current diversity
  const currentDiversity = calculateDiversityScore(recommendations);

  // Step 2: If diversity is already good, return as-is
  if (currentDiversity.overallDiversityScore >= config.diversityThreshold) {
    console.log("[Diversity] Current diversity is sufficient:", currentDiversity.overallDiversityScore);
    return recommendations;
  }

  console.log("[Diversity] Applying diversity controls. Current score:", currentDiversity.overallDiversityScore);

  // Step 3: Remove overly similar properties
  const deduplicated = removeSimilarProperties(recommendations, config.maxSimilarProperties);

  // Step 4: Calculate how many exploratory properties to add
  const exploratoryCount = Math.ceil(deduplicated.length * config.explorationRate);

  // Step 5: Find diverse exploratory properties
  const exploratoryProperties = findExploratoryProperties(
    deduplicated,
    allProperties,
    exploratoryCount
  );

  // Step 6: Mix high-match and exploratory properties
  const mixed = mixRecommendations(deduplicated, exploratoryProperties, config.explorationRate);

  // Step 7: Verify improved diversity
  const newDiversity = calculateDiversityScore(mixed);
  console.log("[Diversity] New diversity score:", newDiversity.overallDiversityScore);

  return mixed;
}

/**
 * Remove overly similar properties from recommendations
 */
function removeSimilarProperties(
  recommendations: PropertyRecommendation[],
  maxSimilar: number
): PropertyRecommendation[] {
  const grouped = new Map<string, PropertyRecommendation[]>();

  // Group by property type + location
  for (const rec of recommendations) {
    const key = `${rec.propertyType}_${rec.location}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(rec);
  }

  // Keep only top N from each group
  const result: PropertyRecommendation[] = [];
  for (const group of grouped.values()) {
    // Sort by match score descending
    group.sort((a, b) => b.matchScore - a.matchScore);
    result.push(...group.slice(0, maxSimilar));
  }

  return result;
}

/**
 * Find exploratory properties that are different from current recommendations
 */
function findExploratoryProperties(
  currentRecommendations: PropertyRecommendation[],
  allProperties: PropertyRecommendation[],
  count: number
): PropertyRecommendation[] {
  // Extract current attributes
  const currentTypes = new Set(currentRecommendations.map((r) => r.propertyType));
  const currentLocations = new Set(currentRecommendations.map((r) => r.location));
  const currentPriceRange = {
    min: Math.min(...currentRecommendations.map((r) => r.price)),
    max: Math.max(...currentRecommendations.map((r) => r.price)),
  };

  // Find properties that are different
  const exploratory = allProperties
    .filter((prop) => {
      // Exclude already recommended properties
      if (currentRecommendations.some((r) => r.propertyId === prop.propertyId)) {
        return false;
      }

      // Calculate difference score
      let differenceScore = 0;

      // Different type
      if (!currentTypes.has(prop.propertyType)) {
        differenceScore += 1;
      }

      // Different location
      if (!currentLocations.has(prop.location)) {
        differenceScore += 1;
      }

      // Different price range (outside current range)
      if (prop.price < currentPriceRange.min * 0.8 || prop.price > currentPriceRange.max * 1.2) {
        differenceScore += 1;
      }

      // Keep properties with at least 1 difference
      return differenceScore >= 1;
    })
    .slice(0, count);

  return exploratory;
}

/**
 * Mix high-match and exploratory recommendations
 */
function mixRecommendations(
  highMatch: PropertyRecommendation[],
  exploratory: PropertyRecommendation[],
  explorationRate: number
): PropertyRecommendation[] {
  const result: PropertyRecommendation[] = [];
  const totalCount = highMatch.length + exploratory.length;

  let highMatchIndex = 0;
  let exploratoryIndex = 0;

  // Interleave high-match and exploratory based on exploration rate
  for (let i = 0; i < totalCount; i++) {
    const shouldExplore = Math.random() < explorationRate && exploratoryIndex < exploratory.length;

    if (shouldExplore) {
      result.push(exploratory[exploratoryIndex++]);
    } else if (highMatchIndex < highMatch.length) {
      result.push(highMatch[highMatchIndex++]);
    } else if (exploratoryIndex < exploratory.length) {
      result.push(exploratory[exploratoryIndex++]);
    }
  }

  return result;
}

/**
 * Detect filter bubble based on user's recommendation history
 */
export function detectFilterBubble(
  recentRecommendations: PropertyRecommendation[][],
  threshold: number = 0.3
): {
  isFilterBubble: boolean;
  averageDiversity: number;
  trend: "improving" | "stable" | "worsening";
} {
  if (recentRecommendations.length === 0) {
    return {
      isFilterBubble: false,
      averageDiversity: 1.0,
      trend: "stable",
    };
  }

  // Calculate diversity for each recommendation set
  const diversityScores = recentRecommendations.map((recs) =>
    calculateDiversityScore(recs).overallDiversityScore
  );

  // Average diversity
  const averageDiversity =
    diversityScores.reduce((sum, score) => sum + score, 0) / diversityScores.length;

  // Detect filter bubble
  const isFilterBubble = averageDiversity < threshold;

  // Trend analysis (comparing first half vs second half)
  const midpoint = Math.floor(diversityScores.length / 2);
  const firstHalfAvg =
    diversityScores.slice(0, midpoint).reduce((sum, score) => sum + score, 0) / midpoint;
  const secondHalfAvg =
    diversityScores.slice(midpoint).reduce((sum, score) => sum + score, 0) /
    (diversityScores.length - midpoint);

  let trend: "improving" | "stable" | "worsening";
  if (secondHalfAvg > firstHalfAvg * 1.1) {
    trend = "improving";
  } else if (secondHalfAvg < firstHalfAvg * 0.9) {
    trend = "worsening";
  } else {
    trend = "stable";
  }

  return {
    isFilterBubble,
    averageDiversity,
    trend,
  };
}

/**
 * Get default diversity config based on user preferences
 */
export function getDefaultDiversityConfig(userPreference?: "high" | "medium" | "low"): DiversityConfig {
  switch (userPreference) {
    case "high":
      return {
        diversityThreshold: 0.7,
        explorationRate: 0.3,
        maxSimilarProperties: 2,
      };
    case "low":
      return {
        diversityThreshold: 0.3,
        explorationRate: 0.1,
        maxSimilarProperties: 5,
      };
    case "medium":
    default:
      return {
        diversityThreshold: 0.5,
        explorationRate: 0.2,
        maxSimilarProperties: 3,
      };
  }
}
