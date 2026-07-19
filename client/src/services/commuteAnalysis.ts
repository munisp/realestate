/**
 * Commute Time Analysis Service
 * 
 * Calculates commute times from properties to major Lagos business districts
 * with traffic pattern predictions (peak vs off-peak)
 */

export interface BusinessDistrict {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  description: string;
  icon: string;
}

export interface CommuteTime {
  districtId: string;
  districtName: string;
  distance: number; // meters
  durationOffPeak: number; // minutes
  durationPeak: number; // minutes
  durationCurrent: number; // minutes (based on current time)
  route: string; // Main route description
  trafficLevel: 'low' | 'moderate' | 'heavy' | 'severe';
}

export interface CommuteAnalysis {
  origin: {
    lat: number;
    lng: number;
  };
  commutes: CommuteTime[];
  bestDistrict: CommuteTime;
  averageCommute: number; // minutes
  timestamp: Date;
}

// Major business districts in Lagos
export const lagosBusinessDistricts: BusinessDistrict[] = [
  {
    id: 'victoria-island',
    name: 'Victoria Island',
    location: { lat: 6.4281, lng: 3.4219 },
    description: 'Premier business and financial district',
    icon: '🏢',
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    location: { lat: 6.4541, lng: 3.4316 },
    description: 'Upscale business and residential area',
    icon: '🏛️',
  },
  {
    id: 'ikeja',
    name: 'Ikeja',
    location: { lat: 6.6018, lng: 3.3515 },
    description: 'Lagos State capital and major commercial hub',
    icon: '🏙️',
  },
  {
    id: 'lekki',
    name: 'Lekki Phase 1',
    location: { lat: 6.4474, lng: 3.4702 },
    description: 'Growing tech and business hub',
    icon: '💼',
  },
  {
    id: 'lagos-island',
    name: 'Lagos Island',
    location: { lat: 6.4541, lng: 3.3947 },
    description: 'Historic commercial center',
    icon: '🏦',
  },
];

/**
 * Calculate straight-line distance using Haversine formula
 */
function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate commute time based on distance and traffic conditions
 * Lagos-specific traffic patterns
 */
function estimateCommuteTime(
  distance: number,
  isPeakHour: boolean,
  route: string
): { offPeak: number; peak: number; current: number } {
  // Base speed assumptions (km/h)
  const offPeakSpeed = 40; // Off-peak average speed in Lagos
  const peakSpeed = 15; // Peak hour average speed in Lagos

  // Convert distance to km
  const distanceKm = distance / 1000;

  // Calculate base times
  let offPeakTime = (distanceKm / offPeakSpeed) * 60; // minutes
  let peakTime = (distanceKm / peakSpeed) * 60; // minutes

  // Apply route-specific multipliers based on Lagos traffic patterns
  const routeMultipliers: Record<string, { offPeak: number; peak: number }> = {
    'Third Mainland Bridge': { offPeak: 1.2, peak: 2.5 },
    'Eko Bridge': { offPeak: 1.1, peak: 2.2 },
    'Ikorodu Road': { offPeak: 1.3, peak: 2.8 },
    'Lekki-Epe Expressway': { offPeak: 1.1, peak: 2.0 },
    'Lagos-Ibadan Expressway': { offPeak: 1.2, peak: 2.3 },
    'Apapa-Oshodi Expressway': { offPeak: 1.4, peak: 3.0 },
    'default': { offPeak: 1.0, peak: 1.8 },
  };

  const multiplier = routeMultipliers[route] || routeMultipliers['default'];
  offPeakTime *= multiplier.offPeak;
  peakTime *= multiplier.peak;

  const currentTime = isPeakHour ? peakTime : offPeakTime;

  return {
    offPeak: Math.round(offPeakTime),
    peak: Math.round(peakTime),
    current: Math.round(currentTime),
  };
}

/**
 * Determine main route based on origin and destination
 */
function determineRoute(
  from: { lat: number; lng: number },
  toDistrictId: string
): string {
  // Simplified route determination based on location patterns
  const fromIsland = from.lng > 3.4; // Rough east-west split
  const fromMainland = !fromIsland;

  const islandDistricts = ['victoria-island', 'ikoyi', 'lagos-island'];
  const toIsland = islandDistricts.includes(toDistrictId);

  if (fromMainland && toIsland) {
    // Mainland to Island - likely using bridges
    if (from.lat > 6.5) {
      return 'Third Mainland Bridge';
    }
    return 'Eko Bridge';
  } else if (fromIsland && !toIsland) {
    // Island to Mainland
    if (toDistrictId === 'ikeja') {
      return 'Third Mainland Bridge';
    }
    return 'Eko Bridge';
  } else if (toDistrictId === 'lekki' || from.lng > 3.45) {
    return 'Lekki-Epe Expressway';
  } else if (toDistrictId === 'ikeja' && from.lat < 6.5) {
    return 'Ikorodu Road';
  }

  return 'Local Roads';
}

/**
 * Determine if current time is peak hour
 * Lagos peak hours: 7-10 AM and 4-8 PM on weekdays
 */
function isPeakHour(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const day = date.getDay();

  // Weekend - no peak hours
  if (day === 0 || day === 6) return false;

  // Weekday peak hours
  return (hour >= 7 && hour < 10) || (hour >= 16 && hour < 20);
}

/**
 * Get traffic level based on time and route
 */
function getTrafficLevel(
  isPeak: boolean,
  route: string
): 'low' | 'moderate' | 'heavy' | 'severe' {
  if (!isPeak) return 'low';

  const severeRoutes = ['Third Mainland Bridge', 'Apapa-Oshodi Expressway'];
  const heavyRoutes = ['Ikorodu Road', 'Eko Bridge'];

  if (severeRoutes.includes(route)) return 'severe';
  if (heavyRoutes.includes(route)) return 'heavy';
  return 'moderate';
}

/**
 * Calculate commute analysis for a property location
 */
export function calculateCommuteAnalysis(origin: {
  lat: number;
  lng: number;
}): CommuteAnalysis {
  const currentDate = new Date();
  const isPeak = isPeakHour(currentDate);

  const commutes: CommuteTime[] = lagosBusinessDistricts.map((district) => {
    const distance = calculateDistance(origin, district.location);
    const route = determineRoute(origin, district.id);
    const times = estimateCommuteTime(distance, isPeak, route);
    const trafficLevel = getTrafficLevel(isPeak, route);

    return {
      districtId: district.id,
      districtName: district.name,
      distance,
      durationOffPeak: times.offPeak,
      durationPeak: times.peak,
      durationCurrent: times.current,
      route,
      trafficLevel,
    };
  });

  // Sort by current commute time
  commutes.sort((a, b) => a.durationCurrent - b.durationCurrent);

  const bestDistrict = commutes[0];
  const averageCommute =
    commutes.reduce((sum, c) => sum + c.durationCurrent, 0) / commutes.length;

  return {
    origin,
    commutes,
    bestDistrict,
    averageCommute: Math.round(averageCommute),
    timestamp: currentDate,
  };
}

/**
 * Get traffic level color
 */
export function getTrafficLevelColor(
  level: 'low' | 'moderate' | 'heavy' | 'severe'
): string {
  switch (level) {
    case 'low':
      return '#10b981'; // green-500
    case 'moderate':
      return '#f59e0b'; // amber-500
    case 'heavy':
      return '#f97316'; // orange-500
    case 'severe':
      return '#ef4444'; // red-500
  }
}

/**
 * Get traffic level label
 */
export function getTrafficLevelLabel(
  level: 'low' | 'moderate' | 'heavy' | 'severe'
): string {
  switch (level) {
    case 'low':
      return 'Light Traffic';
    case 'moderate':
      return 'Moderate Traffic';
    case 'heavy':
      return 'Heavy Traffic';
    case 'severe':
      return 'Severe Congestion';
  }
}

/**
 * Format commute time for display
 */
export function formatCommuteTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
