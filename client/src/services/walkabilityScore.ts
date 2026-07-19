/**
 * Walkability Score Calculation Service
 * 
 * Calculates walkability scores (0-100) for Lagos neighborhoods based on:
 * - Proximity to amenities (shops, restaurants, parks, transit)
 * - Public transport access
 * - Pedestrian infrastructure
 * - Safety and walkability factors
 */

export interface AmenityCategory {
  name: string;
  weight: number; // Importance weight in score calculation
  icon: string;
  color: string;
}

export interface NearbyAmenity {
  name: string;
  category: string;
  distance: number; // meters
  walkTime: number; // minutes
  location: {
    lat: number;
    lng: number;
  };
}

export interface WalkabilityScore {
  overall: number; // 0-100
  breakdown: {
    amenities: number; // 0-100
    transit: number; // 0-100
    pedestrian: number; // 0-100
    safety: number; // 0-100
  };
  nearbyAmenities: NearbyAmenity[];
  dailyErrandsScore: number; // 0-100
  label: string; // "Walker's Paradise", "Very Walkable", etc.
  description: string;
}

export const amenityCategories: AmenityCategory[] = [
  { name: 'Grocery', weight: 0.25, icon: '🛒', color: '#10b981' },
  { name: 'Restaurants', weight: 0.20, icon: '🍽️', color: '#f59e0b' },
  { name: 'Schools', weight: 0.15, icon: '🎓', color: '#3b82f6' },
  { name: 'Parks', weight: 0.15, icon: '🌳', color: '#22c55e' },
  { name: 'Transit', weight: 0.15, icon: '🚌', color: '#8b5cf6' },
  { name: 'Healthcare', weight: 0.10, icon: '🏥', color: '#ef4444' },
];

// Lagos-specific amenity data for walkability calculation
export const lagosAmenities: Record<string, NearbyAmenity[]> = {
  'victoria-island': [
    { name: 'The Palms Shopping Mall', category: 'Grocery', distance: 800, walkTime: 10, location: { lat: 6.4281, lng: 3.4219 } },
    { name: 'Eko Hotel & Suites', category: 'Restaurants', distance: 500, walkTime: 6, location: { lat: 6.4281, lng: 3.4219 } },
    { name: 'Kuramo Beach', category: 'Parks', distance: 1200, walkTime: 15, location: { lat: 6.4281, lng: 3.4319 } },
    { name: 'BRT Station', category: 'Transit', distance: 600, walkTime: 8, location: { lat: 6.4281, lng: 3.4119 } },
    { name: 'Reddington Hospital', category: 'Healthcare', distance: 900, walkTime: 11, location: { lat: 6.4381, lng: 3.4219 } },
  ],
  'lekki': [
    { name: 'Shoprite Lekki', category: 'Grocery', distance: 1500, walkTime: 19, location: { lat: 6.4474, lng: 3.4702 } },
    { name: 'Lekki Leisure Lake', category: 'Parks', distance: 2000, walkTime: 25, location: { lat: 6.4474, lng: 3.4802 } },
    { name: 'Lekki British School', category: 'Schools', distance: 800, walkTime: 10, location: { lat: 6.4474, lng: 3.4702 } },
    { name: 'Lagoon Restaurant', category: 'Restaurants', distance: 600, walkTime: 8, location: { lat: 6.4474, lng: 3.4652 } },
    { name: 'Lekki General Hospital', category: 'Healthcare', distance: 1200, walkTime: 15, location: { lat: 6.4474, lng: 3.4752 } },
  ],
  'ikeja': [
    { name: 'Ikeja City Mall', category: 'Grocery', distance: 500, walkTime: 6, location: { lat: 6.6018, lng: 3.3515 } },
    { name: 'Ikeja GRA Park', category: 'Parks', distance: 400, walkTime: 5, location: { lat: 6.5918, lng: 3.3515 } },
    { name: 'Ikeja Bus Terminal', category: 'Transit', distance: 300, walkTime: 4, location: { lat: 6.6018, lng: 3.3415 } },
    { name: 'Lagos State University Teaching Hospital', category: 'Healthcare', distance: 1000, walkTime: 13, location: { lat: 6.6118, lng: 3.3515 } },
    { name: 'Vivian Fowler Memorial College', category: 'Schools', distance: 600, walkTime: 8, location: { lat: 6.6018, lng: 3.3515 } },
  ],
  'ikoyi': [
    { name: 'Park n Shop', category: 'Grocery', distance: 600, walkTime: 8, location: { lat: 6.4541, lng: 3.4316 } },
    { name: 'Ikoyi Club', category: 'Parks', distance: 400, walkTime: 5, location: { lat: 6.4541, lng: 3.4416 } },
    { name: 'Lagos Preparatory School', category: 'Schools', distance: 500, walkTime: 6, location: { lat: 6.4541, lng: 3.4316 } },
    { name: 'Falomo Shopping Center', category: 'Restaurants', distance: 700, walkTime: 9, location: { lat: 6.4541, lng: 3.4216 } },
    { name: 'Reddington Hospital Ikoyi', category: 'Healthcare', distance: 800, walkTime: 10, location: { lat: 6.4641, lng: 3.4316 } },
  ],
  'yaba': [
    { name: 'Tejuosho Market', category: 'Grocery', distance: 400, walkTime: 5, location: { lat: 6.5167, lng: 3.3667 } },
    { name: 'Yaba Tech Campus', category: 'Schools', distance: 300, walkTime: 4, location: { lat: 6.5167, lng: 3.3767 } },
    { name: 'Yaba Bus Stop', category: 'Transit', distance: 200, walkTime: 3, location: { lat: 6.5167, lng: 3.3567 } },
    { name: 'Sabo Market', category: 'Restaurants', distance: 500, walkTime: 6, location: { lat: 6.5167, lng: 3.3867 } },
    { name: 'Yaba General Hospital', category: 'Healthcare', distance: 600, walkTime: 8, location: { lat: 6.5267, lng: 3.3667 } },
  ],
};

/**
 * Calculate walkability score for a location
 */
export function calculateWalkabilityScore(
  neighborhoodId: string,
  amenities?: NearbyAmenity[]
): WalkabilityScore {
  // Use provided amenities or default Lagos data
  const nearbyAmenities = amenities || lagosAmenities[neighborhoodId] || [];

  // Calculate amenities score (0-100)
  const amenitiesScore = calculateAmenitiesScore(nearbyAmenities);

  // Calculate transit score (0-100)
  const transitScore = calculateTransitScore(nearbyAmenities);

  // Calculate pedestrian infrastructure score (0-100)
  // Based on neighborhood characteristics
  const pedestrianScore = calculatePedestrianScore(neighborhoodId);

  // Calculate safety score (0-100)
  const safetyScore = calculateSafetyScore(neighborhoodId);

  // Calculate overall score (weighted average)
  const overall = Math.round(
    amenitiesScore * 0.40 +
    transitScore * 0.25 +
    pedestrianScore * 0.20 +
    safetyScore * 0.15
  );

  // Calculate daily errands score
  const dailyErrandsScore = calculateDailyErrandsScore(nearbyAmenities);

  // Get label and description
  const { label, description } = getWalkabilityLabel(overall);

  return {
    overall,
    breakdown: {
      amenities: amenitiesScore,
      transit: transitScore,
      pedestrian: pedestrianScore,
      safety: safetyScore,
    },
    nearbyAmenities,
    dailyErrandsScore,
    label,
    description,
  };
}

function calculateAmenitiesScore(amenities: NearbyAmenity[]): number {
  if (amenities.length === 0) return 0;

  let score = 0;
  const categoryScores: Record<string, number> = {};

  amenityCategories.forEach((category) => {
    const categoryAmenities = amenities.filter((a) => a.category === category.name);
    if (categoryAmenities.length === 0) {
      categoryScores[category.name] = 0;
      return;
    }

    // Score based on distance (closer is better)
    const avgDistance = categoryAmenities.reduce((sum, a) => sum + a.distance, 0) / categoryAmenities.length;
    let categoryScore = 0;

    if (avgDistance <= 400) categoryScore = 100; // < 5 min walk
    else if (avgDistance <= 800) categoryScore = 80; // 5-10 min walk
    else if (avgDistance <= 1200) categoryScore = 60; // 10-15 min walk
    else if (avgDistance <= 1600) categoryScore = 40; // 15-20 min walk
    else categoryScore = 20; // > 20 min walk

    categoryScores[category.name] = categoryScore;
    score += categoryScore * category.weight;
  });

  return Math.round(score);
}

function calculateTransitScore(amenities: NearbyAmenity[]): number {
  const transitAmenities = amenities.filter((a) => a.category === 'Transit');
  if (transitAmenities.length === 0) return 30; // Base score for Lagos

  const avgDistance = transitAmenities.reduce((sum, a) => sum + a.distance, 0) / transitAmenities.length;

  if (avgDistance <= 300) return 100; // Excellent transit access
  if (avgDistance <= 600) return 85; // Very good
  if (avgDistance <= 1000) return 70; // Good
  if (avgDistance <= 1500) return 50; // Fair
  return 30; // Limited

}

function calculatePedestrianScore(neighborhoodId: string): number {
  // Lagos-specific pedestrian infrastructure scores
  const pedestrianScores: Record<string, number> = {
    'victoria-island': 75, // Good sidewalks, crosswalks
    'ikoyi': 80, // Excellent infrastructure
    'lekki': 60, // Developing infrastructure
    'ikeja': 70, // Good main roads, mixed side streets
    'yaba': 65, // Busy, mixed infrastructure
    'surulere': 60,
    'ajah': 50,
    'maryland': 65,
    'gbagada': 60,
    'festac': 55,
    'apapa': 45,
    'oshodi': 50,
    'mushin': 45,
    'lagos-island': 55,
    'epe': 40,
    'badagry': 35,
  };

  return pedestrianScores[neighborhoodId] || 50;
}

function calculateSafetyScore(neighborhoodId: string): number {
  // Lagos-specific safety scores for walking
  const safetyScores: Record<string, number> = {
    'victoria-island': 85,
    'ikoyi': 90,
    'lekki': 80,
    'ikeja': 75,
    'yaba': 70,
    'surulere': 70,
    'ajah': 65,
    'maryland': 75,
    'gbagada': 70,
    'festac': 65,
    'apapa': 55,
    'oshodi': 50,
    'mushin': 50,
    'lagos-island': 60,
    'epe': 60,
    'badagry': 55,
  };

  return safetyScores[neighborhoodId] || 60;
}

function calculateDailyErrandsScore(amenities: NearbyAmenity[]): number {
  // Essential categories for daily errands
  const essentialCategories = ['Grocery', 'Restaurants', 'Transit'];
  const essentialAmenities = amenities.filter((a) => essentialCategories.includes(a.category));

  if (essentialAmenities.length === 0) return 0;

  // Check if all essential categories are within walking distance (< 1km)
  const categoriesWithin1km = new Set(
    essentialAmenities.filter((a) => a.distance <= 1000).map((a) => a.category)
  );

  const score = (categoriesWithin1km.size / essentialCategories.length) * 100;
  return Math.round(score);
}

function getWalkabilityLabel(score: number): { label: string; description: string } {
  if (score >= 90) {
    return {
      label: "Walker's Paradise",
      description: 'Daily errands do not require a car',
    };
  } else if (score >= 70) {
    return {
      label: 'Very Walkable',
      description: 'Most errands can be accomplished on foot',
    };
  } else if (score >= 50) {
    return {
      label: 'Somewhat Walkable',
      description: 'Some errands can be accomplished on foot',
    };
  } else if (score >= 25) {
    return {
      label: 'Car-Dependent',
      description: 'Most errands require a car',
    };
  } else {
    return {
      label: 'Very Car-Dependent',
      description: 'Almost all errands require a car',
    };
  }
}

/**
 * Get walkability color based on score
 */
export function getWalkabilityColor(score: number): string {
  if (score >= 90) return '#10b981'; // green-500
  if (score >= 70) return '#3b82f6'; // blue-500
  if (score >= 50) return '#f59e0b'; // amber-500
  if (score >= 25) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Get transit score color
 */
export function getTransitScoreColor(score: number): string {
  if (score >= 80) return '#8b5cf6'; // purple-500
  if (score >= 60) return '#3b82f6'; // blue-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}
