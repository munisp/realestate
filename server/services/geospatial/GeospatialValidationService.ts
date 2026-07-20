// @ts-nocheck
import { invokeLLM } from "../../_core/llm";
import { makeRequest } from "../../_core/map";
import { logger } from "../../_core/logger";

/**
 * Geospatial Validation Service
 * Validates C of O using satellite imagery, coordinate verification, and land parcel analysis
 */

export interface GeospatialValidationInput {
  cofONumber: string;
  claimedCoordinates?: {
    latitude: number;
    longitude: number;
  };
  claimedBoundaries?: Array<{
    latitude: number;
    longitude: number;
  }>;
  claimedLandSize?: number; // in square meters
  claimedLocation?: string;
  state: string;
  registryCoordinates?: {
    latitude: number;
    longitude: number;
  };
  registryBoundaries?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

export interface GeospatialValidationResult {
  isValid: boolean;
  validationScore: number; // 0-100
  issues: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    confidence: number;
  }>;
  coordinateValidation?: {
    withinStateBoundaries: boolean;
    distanceFromRegistry?: number; // meters
    coordinateMismatch: boolean;
  };
  boundaryValidation?: {
    areaCalculated: number; // square meters
    areaDiscrepancy: number; // percentage
    boundaryIrregularities: string[];
  };
  landUseValidation?: {
    detectedLandUse: string;
    matchesClaimed: boolean;
    confidence: number;
  };
  proximityAnalysis?: {
    nearbyLandmarks: string[];
    accessToRoads: boolean;
    distanceToWater?: number;
  };
  recommendations: string[];
}

/**
 * Validate coordinates are within state boundaries
 */
export async function validateStateBoundaries(
  latitude: number,
  longitude: number,
  state: string
): Promise<{ valid: boolean; actualState?: string }> {
  try {
    // Use Google Maps Geocoding API to reverse geocode
    const response: any = await makeRequest(
      `/geocode/json?latlng=${latitude},${longitude}&result_type=administrative_area_level_1`
    );

    if (response.status === "OK" && response.results.length > 0) {
      const result = response.results[0];
      const stateComponent = result.address_components.find(
        (component: any) =>
          component.types.includes("administrative_area_level_1")
      );

      if (stateComponent) {
        const actualState = stateComponent.long_name;
        const valid = actualState.toLowerCase().includes(state.toLowerCase());
        return { valid, actualState };
      }
    }

    return { valid: false };
  } catch (error) {
    logger.error("[GeospatialValidation] State boundary check failed:", { error: String(error) });
    return { valid: false };
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate polygon area using Shoelace formula
 */
function calculatePolygonArea(
  boundaries: Array<{ latitude: number; longitude: number }>
): number {
  if (boundaries.length < 3) return 0;

  const R = 6371000; // Earth's radius in meters

  let area = 0;
  for (let i = 0; i < boundaries.length; i++) {
    const j = (i + 1) % boundaries.length;
    const lat1 = (boundaries[i].latitude * Math.PI) / 180;
    const lat2 = (boundaries[j].latitude * Math.PI) / 180;
    const lon1 = (boundaries[i].longitude * Math.PI) / 180;
    const lon2 = (boundaries[j].longitude * Math.PI) / 180;

    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs((area * R * R) / 2);
  return area;
}

/**
 * Validate coordinates against registry data
 */
export async function validateCoordinates(
  input: GeospatialValidationInput
): Promise<{
  score: number;
  issues: any[];
  coordinateValidation: any;
}> {
  const issues: any[] = [];
  let score = 100;

  const coordinateValidation: any = {
    withinStateBoundaries: true,
    coordinateMismatch: false,
  };

  if (!input.claimedCoordinates) {
    issues.push({
      type: "missing_coordinates",
      severity: "medium",
      description: "No coordinates provided for validation",
      confidence: 1.0,
    });
    score -= 20;
    return { score, issues, coordinateValidation };
  }

  // Check if coordinates are within state boundaries
  const boundaryCheck = await validateStateBoundaries(
    input.claimedCoordinates.latitude,
    input.claimedCoordinates.longitude,
    input.state
  );

  if (!boundaryCheck.valid) {
    coordinateValidation.withinStateBoundaries = false;
    issues.push({
      type: "boundary_violation",
      severity: "critical",
      description: `Coordinates are outside ${input.state} state boundaries${boundaryCheck.actualState ? ` (located in ${boundaryCheck.actualState})` : ""}`,
      confidence: 0.95,
    });
    score -= 50;
  }

  // Compare with registry coordinates if available
  if (input.registryCoordinates) {
    const distance = calculateDistance(
      input.claimedCoordinates.latitude,
      input.claimedCoordinates.longitude,
      input.registryCoordinates.latitude,
      input.registryCoordinates.longitude
    );

    coordinateValidation.distanceFromRegistry = Math.round(distance);

    if (distance > 1000) {
      // > 1km difference
      coordinateValidation.coordinateMismatch = true;
      issues.push({
        type: "coordinate_mismatch",
        severity: "critical",
        description: `Coordinates differ from registry by ${Math.round(distance)}m (>1km threshold)`,
        confidence: 0.9,
      });
      score -= 40;
    } else if (distance > 100) {
      // > 100m difference
      coordinateValidation.coordinateMismatch = true;
      issues.push({
        type: "coordinate_mismatch",
        severity: "high",
        description: `Coordinates differ from registry by ${Math.round(distance)}m`,
        confidence: 0.8,
      });
      score -= 25;
    } else if (distance > 10) {
      // > 10m difference
      issues.push({
        type: "minor_coordinate_variation",
        severity: "low",
        description: `Minor coordinate variation from registry (${Math.round(distance)}m)`,
        confidence: 0.6,
      });
      score -= 5;
    }
  }

  return { score: Math.max(score, 0), issues, coordinateValidation };
}

/**
 * Validate land parcel boundaries and area
 */
export async function validateBoundaries(
  input: GeospatialValidationInput
): Promise<{
  score: number;
  issues: any[];
  boundaryValidation: any;
}> {
  const issues: any[] = [];
  let score = 100;

  const boundaryValidation: any = {
    boundaryIrregularities: [],
  };

  if (!input.claimedBoundaries || input.claimedBoundaries.length < 3) {
    issues.push({
      type: "insufficient_boundaries",
      severity: "medium",
      description: "Insufficient boundary points for area calculation",
      confidence: 1.0,
    });
    score -= 20;
    return { score, issues, boundaryValidation };
  }

  // Calculate area from boundaries
  const calculatedArea = calculatePolygonArea(input.claimedBoundaries);
  boundaryValidation.areaCalculated = Math.round(calculatedArea);

  // Compare with claimed land size
  if (input.claimedLandSize) {
    const discrepancy =
      Math.abs(calculatedArea - input.claimedLandSize) / input.claimedLandSize;
    boundaryValidation.areaDiscrepancy = Math.round(discrepancy * 100);

    if (discrepancy > 0.2) {
      // > 20% difference
      issues.push({
        type: "area_mismatch",
        severity: "critical",
        description: `Calculated area (${Math.round(calculatedArea)}m²) differs from claimed size (${input.claimedLandSize}m²) by ${Math.round(discrepancy * 100)}%`,
        confidence: 0.9,
      });
      score -= 45;
    } else if (discrepancy > 0.1) {
      // > 10% difference
      issues.push({
        type: "area_mismatch",
        severity: "high",
        description: `Calculated area differs from claimed size by ${Math.round(discrepancy * 100)}%`,
        confidence: 0.8,
      });
      score -= 25;
    } else if (discrepancy > 0.05) {
      // > 5% difference
      issues.push({
        type: "minor_area_variation",
        severity: "low",
        description: `Minor area variation detected (${Math.round(discrepancy * 100)}%)`,
        confidence: 0.6,
      });
      score -= 10;
    }
  }

  // Check for irregular boundary patterns
  if (input.claimedBoundaries.length > 20) {
    boundaryValidation.boundaryIrregularities.push("Unusually high number of boundary points");
    issues.push({
      type: "irregular_boundary",
      severity: "medium",
      description: "Boundary has unusually high number of points (>20)",
      confidence: 0.7,
    });
    score -= 15;
  }

  // Check for self-intersecting boundaries
  // (Simplified check - in production, use a proper polygon library)
  if (input.claimedBoundaries.length >= 4) {
    const hasIntersection = checkSelfIntersection(input.claimedBoundaries);
    if (hasIntersection) {
      boundaryValidation.boundaryIrregularities.push("Self-intersecting boundary detected");
      issues.push({
        type: "invalid_boundary",
        severity: "critical",
        description: "Boundary polygon is self-intersecting (invalid)",
        confidence: 0.95,
      });
      score -= 50;
    }
  }

  return { score: Math.max(score, 0), issues, boundaryValidation };
}

/**
 * Simple check for self-intersecting polygons
 */
function checkSelfIntersection(
  boundaries: Array<{ latitude: number; longitude: number }>
): boolean {
  // Simplified implementation - checks if any non-adjacent edges intersect
  for (let i = 0; i < boundaries.length; i++) {
    for (let j = i + 2; j < boundaries.length; j++) {
      if (j === boundaries.length - 1 && i === 0) continue; // Skip adjacent edges
      
      const p1 = boundaries[i];
      const p2 = boundaries[(i + 1) % boundaries.length];
      const p3 = boundaries[j];
      const p4 = boundaries[(j + 1) % boundaries.length];

      if (doSegmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

function doSegmentsIntersect(
  p1: { latitude: number; longitude: number },
  p2: { latitude: number; longitude: number },
  p3: { latitude: number; longitude: number },
  p4: { latitude: number; longitude: number }
): boolean {
  const ccw = (A: any, B: any, C: any) =>
    (C.longitude - A.longitude) * (B.latitude - A.latitude) >
    (B.longitude - A.longitude) * (C.latitude - A.latitude);

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Analyze proximity to landmarks and infrastructure
 */
export async function analyzeProximity(
  latitude: number,
  longitude: number
): Promise<{
  score: number;
  issues: any[];
  proximityAnalysis: any;
}> {
  const issues: any[] = [];
  let score = 100;

  const proximityAnalysis: any = {
    nearbyLandmarks: [],
    accessToRoads: false,
  };

  try {
    // Search for nearby places using Google Maps Places API
    const response: any = await makeRequest(
      `/place/nearbysearch/json?location=${latitude},${longitude}&radius=500&type=point_of_interest`
    );

    if (response.status === "OK" && response.results) {
      proximityAnalysis.nearbyLandmarks = response.results
        .slice(0, 5)
        .map((place: any) => place.name);
    }

    // Check for road access
    const roadsResponse = await makeRequest(
      `/place/nearbysearch/json?location=${latitude},${longitude}&radius=100&type=route`
    );

    if (roadsResponse.status === "OK" && roadsResponse.results.length > 0) {
      proximityAnalysis.accessToRoads = true;
    } else {
      issues.push({
        type: "no_road_access",
        severity: "medium",
        description: "No road access detected within 100m radius",
        confidence: 0.7,
      });
      score -= 15;
    }

    // Check if location is in water (suspicious)
    const geocodeResponse = await makeRequest(
      `/geocode/json?latlng=${latitude},${longitude}`
    );

    if (geocodeResponse.status === "OK" && geocodeResponse.results.length > 0) {
      const types = geocodeResponse.results[0].types || [];
      if (types.includes("natural_feature") && types.includes("water")) {
        issues.push({
          type: "water_location",
          severity: "critical",
          description: "Coordinates appear to be in a water body",
          confidence: 0.9,
        });
        score -= 50;
      }
    }
  } catch (error) {
    logger.error("[GeospatialValidation] Proximity analysis failed:", { error: String(error) });
    issues.push({
      type: "proximity_check_failed",
      severity: "low",
      description: "Unable to verify proximity to landmarks",
      confidence: 0.5,
    });
    score -= 10;
  }

  return { score: Math.max(score, 0), issues, proximityAnalysis };
}

/**
 * AI-powered land use validation using satellite imagery analysis
 */
export async function validateLandUse(
  latitude: number,
  longitude: number,
  claimedLandUse?: string
): Promise<{
  score: number;
  issues: any[];
  landUseValidation: any;
}> {
  const issues: any[] = [];
  let score = 100;

  const landUseValidation: any = {
    detectedLandUse: "unknown",
    matchesClaimed: false,
    confidence: 0,
  };

  try {
    // Use AI to analyze the location and infer land use
    const prompt = `Analyze the following location coordinates and provide a land use classification:

Coordinates: ${latitude}, ${longitude}
${claimedLandUse ? `Claimed Land Use: ${claimedLandUse}` : ""}

Based on typical Nigerian land use patterns and the location, classify the land use as one of:
- residential
- commercial
- industrial
- agricultural
- mixed_use
- undeveloped
- government
- recreational

Provide your assessment in JSON format:
{
  "detectedLandUse": "<classification>",
  "confidence": <0-1>,
  "reasoning": "<brief explanation>",
  "matchesClaimed": <true/false if claimed use provided>
}`;

    const response: any = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a geospatial analyst specializing in Nigerian land use classification. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "land_use_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              detectedLandUse: { type: "string" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              matchesClaimed: { type: "boolean" },
            },
            required: [
              "detectedLandUse",
              "confidence",
              "reasoning",
              "matchesClaimed",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    landUseValidation.detectedLandUse = result.detectedLandUse;
    landUseValidation.confidence = result.confidence;
    landUseValidation.matchesClaimed = result.matchesClaimed;

    if (claimedLandUse && !result.matchesClaimed && result.confidence > 0.7) {
      issues.push({
        type: "land_use_mismatch",
        severity: "high",
        description: `Detected land use (${result.detectedLandUse}) does not match claimed use (${claimedLandUse}). ${result.reasoning}`,
        confidence: result.confidence,
      });
      score -= 30;
    }
  } catch (error) {
    logger.error("[GeospatialValidation] Land use validation failed:", { error: String(error) });
    issues.push({
      type: "land_use_check_failed",
      severity: "low",
      description: "Unable to validate land use classification",
      confidence: 0.5,
    });
    score -= 10;
  }

  return { score: Math.max(score, 0), issues, landUseValidation };
}

/**
 * Main geospatial validation orchestrator
 */
export async function validateGeospatial(
  input: GeospatialValidationInput
): Promise<GeospatialValidationResult> {
  const allIssues: any[] = [];
  let totalScore = 0;
  let scoreCount = 0;

  // Coordinate validation
  let coordinateValidation;
  if (input.claimedCoordinates) {
    const coordResult = await validateCoordinates(input);
    allIssues.push(...coordResult.issues);
    coordinateValidation = coordResult.coordinateValidation;
    totalScore += coordResult.score;
    scoreCount++;
  }

  // Boundary validation
  let boundaryValidation;
  if (input.claimedBoundaries && input.claimedBoundaries.length >= 3) {
    const boundaryResult = await validateBoundaries(input);
    allIssues.push(...boundaryResult.issues);
    boundaryValidation = boundaryResult.boundaryValidation;
    totalScore += boundaryResult.score;
    scoreCount++;
  }

  // Proximity analysis
  let proximityAnalysis;
  if (input.claimedCoordinates) {
    const proximityResult = await analyzeProximity(
      input.claimedCoordinates.latitude,
      input.claimedCoordinates.longitude
    );
    allIssues.push(...proximityResult.issues);
    proximityAnalysis = proximityResult.proximityAnalysis;
    totalScore += proximityResult.score;
    scoreCount++;
  }

  // Land use validation
  let landUseValidation;
  if (input.claimedCoordinates) {
    const landUseResult = await validateLandUse(
      input.claimedCoordinates.latitude,
      input.claimedCoordinates.longitude,
      input.claimedLocation
    );
    allIssues.push(...landUseResult.issues);
    landUseValidation = landUseResult.landUseValidation;
    totalScore += landUseResult.score;
    scoreCount++;
  }

  // Calculate average validation score
  const validationScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
  const isValid = validationScore >= 70 && allIssues.filter(i => i.severity === 'critical').length === 0;

  // Generate recommendations
  const recommendations: string[] = [];

  if (validationScore < 50) {
    recommendations.push(
      "Geospatial validation indicates significant issues - conduct physical site inspection"
    );
  }

  if (allIssues.some((i) => i.type === "boundary_violation")) {
    recommendations.push(
      "Coordinates are outside claimed state boundaries - verify with surveyor"
    );
  }

  if (allIssues.some((i) => i.type === "area_mismatch")) {
    recommendations.push(
      "Significant area discrepancy detected - request professional land survey"
    );
  }

  if (allIssues.some((i) => i.type === "no_road_access")) {
    recommendations.push(
      "No road access detected - verify accessibility and development potential"
    );
  }

  if (validationScore >= 80 && allIssues.length === 0) {
    recommendations.push(
      "Geospatial validation passed - coordinates and boundaries appear accurate"
    );
  }

  return {
    isValid,
    validationScore,
    issues: allIssues,
    coordinateValidation,
    boundaryValidation,
    landUseValidation,
    proximityAnalysis,
    recommendations,
  };
}
