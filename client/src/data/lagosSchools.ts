/**
 * Lagos Schools Data with District Boundaries
 * Top schools in Lagos with catchment zones, ratings, and details
 */

export interface School {
  id: string;
  name: string;
  type: 'public' | 'private';
  level: 'elementary' | 'middle' | 'high' | 'all';
  rating: number; // 0-10
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  tuitionRange?: string; // For private schools
  curriculum: string[];
  enrollment?: number;
  studentTeacherRatio?: string;
  website?: string;
  phone?: string;
  // Catchment zone boundary (polygon coordinates)
  catchmentZone?: Array<{ lat: number; lng: number }>;
  // Circular catchment radius in meters (if no polygon)
  catchmentRadius?: number;
}

export const lagosSchools: School[] = [
  {
    id: 'corona-school',
    name: 'Corona School',
    type: 'private',
    level: 'all',
    rating: 9.5,
    address: '10 Mobolaji Johnson Avenue, Gbagada, Lagos',
    location: { lat: 6.5478, lng: 3.3862 },
    tuitionRange: '₦2.5M - ₦4.5M/year',
    curriculum: ['British Curriculum', 'Nigerian Curriculum'],
    enrollment: 1200,
    studentTeacherRatio: '15:1',
    website: 'https://coronaschools.edu.ng',
    phone: '+234 1 773 6536',
    catchmentRadius: 3000, // 3km radius
  },
  {
    id: 'greensprings-school',
    name: 'Greensprings School',
    type: 'private',
    level: 'all',
    rating: 9.3,
    address: '32 Olatunde Ayoola Avenue, Anthony, Lagos',
    location: { lat: 6.5687, lng: 3.3764 },
    tuitionRange: '₦3M - ₦5M/year',
    curriculum: ['International Baccalaureate', 'British Curriculum'],
    enrollment: 800,
    studentTeacherRatio: '12:1',
    website: 'https://greenspringsschool.com',
    phone: '+234 1 764 0992',
    catchmentRadius: 3500,
  },
  {
    id: 'british-international-school',
    name: 'British International School Lagos',
    type: 'private',
    level: 'all',
    rating: 9.7,
    address: 'Opebi Link Road, Ikeja, Lagos',
    location: { lat: 6.5964, lng: 3.3515 },
    tuitionRange: '₦4M - ₦7M/year',
    curriculum: ['British Curriculum', 'Cambridge IGCSE', 'A-Levels'],
    enrollment: 600,
    studentTeacherRatio: '10:1',
    website: 'https://www.bislagos.org',
    phone: '+234 1 271 7906',
    catchmentZone: [
      { lat: 6.6064, lng: 3.3415 },
      { lat: 6.6064, lng: 3.3615 },
      { lat: 6.5864, lng: 3.3615 },
      { lat: 6.5864, lng: 3.3415 },
    ],
  },
  {
    id: 'grange-school',
    name: 'Grange School',
    type: 'private',
    level: 'all',
    rating: 9.1,
    address: '6 Salvation Road, Ikeja GRA, Lagos',
    location: { lat: 6.5833, lng: 3.3667 },
    tuitionRange: '₦2M - ₦4M/year',
    curriculum: ['British Curriculum', 'Nigerian Curriculum'],
    enrollment: 900,
    studentTeacherRatio: '18:1',
    website: 'https://www.grangeschool.org',
    phone: '+234 1 497 3950',
    catchmentRadius: 2500,
  },
  {
    id: 'atlantic-hall',
    name: 'Atlantic Hall',
    type: 'private',
    level: 'all',
    rating: 9.4,
    address: 'Poka, Epe, Lagos',
    location: { lat: 6.5833, lng: 3.9833 },
    tuitionRange: '₦5M - ₦8M/year (Boarding)',
    curriculum: ['British Curriculum', 'Cambridge IGCSE'],
    enrollment: 400,
    studentTeacherRatio: '8:1',
    website: 'https://www.atlantichall.org',
    phone: '+234 1 774 5752',
    catchmentRadius: 5000, // Larger radius for boarding school
  },
  {
    id: 'chrisland-school-vgc',
    name: 'Chrisland School VGC',
    type: 'private',
    level: 'all',
    rating: 8.8,
    address: 'VGC Estate, Lekki, Lagos',
    location: { lat: 6.4698, lng: 3.5590 },
    tuitionRange: '₦1.5M - ₦3M/year',
    curriculum: ['British Curriculum', 'Nigerian Curriculum'],
    enrollment: 1500,
    studentTeacherRatio: '20:1',
    website: 'https://www.chrislandschools.com',
    phone: '+234 1 740 7928',
    catchmentZone: [
      { lat: 6.4798, lng: 3.5490 },
      { lat: 6.4798, lng: 3.5690 },
      { lat: 6.4598, lng: 3.5690 },
      { lat: 6.4598, lng: 3.5490 },
    ],
  },
  {
    id: 'caleb-international-school',
    name: 'Caleb International School',
    type: 'private',
    level: 'all',
    rating: 8.6,
    address: 'Magodo GRA Phase 2, Lagos',
    location: { lat: 6.5833, lng: 3.3833 },
    tuitionRange: '₦1.8M - ₦3.5M/year',
    curriculum: ['American Curriculum', 'British Curriculum'],
    enrollment: 700,
    studentTeacherRatio: '16:1',
    website: 'https://www.calebschools.com',
    phone: '+234 1 454 5678',
    catchmentRadius: 2800,
  },
  {
    id: 'lagos-preparatory-school',
    name: 'Lagos Preparatory School',
    type: 'private',
    level: 'elementary',
    rating: 9.0,
    address: '11 Bayo Kuku Street, Ikoyi, Lagos',
    location: { lat: 6.4541, lng: 3.4316 },
    tuitionRange: '₦3.5M - ₦5M/year',
    curriculum: ['British Curriculum'],
    enrollment: 300,
    studentTeacherRatio: '10:1',
    website: 'https://www.lagosprep.org',
    phone: '+234 1 461 4821',
    catchmentRadius: 2000,
  },
  {
    id: 'lekki-british-school',
    name: 'Lekki British School',
    type: 'private',
    level: 'all',
    rating: 8.9,
    address: 'Lekki Phase 1, Lagos',
    location: { lat: 6.4474, lng: 3.4702 },
    tuitionRange: '₦2.5M - ₦4.5M/year',
    curriculum: ['British Curriculum', 'Cambridge IGCSE'],
    enrollment: 650,
    studentTeacherRatio: '14:1',
    website: 'https://www.lekki-british.com',
    phone: '+234 1 271 5341',
    catchmentZone: [
      { lat: 6.4574, lng: 3.4602 },
      { lat: 6.4574, lng: 3.4802 },
      { lat: 6.4374, lng: 3.4802 },
      { lat: 6.4374, lng: 3.4602 },
    ],
  },
  {
    id: 'dowen-college',
    name: 'Dowen College',
    type: 'private',
    level: 'high',
    rating: 8.7,
    address: 'Lekki-Epe Expressway, Lagos',
    location: { lat: 6.4667, lng: 3.5667 },
    tuitionRange: '₦2M - ₦3.5M/year',
    curriculum: ['Nigerian Curriculum', 'WAEC', 'JAMB'],
    enrollment: 800,
    studentTeacherRatio: '22:1',
    website: 'https://www.dowencollege.com',
    phone: '+234 1 740 3991',
    catchmentRadius: 4000,
  },
  {
    id: 'vivian-fowler-memorial',
    name: 'Vivian Fowler Memorial College',
    type: 'private',
    level: 'high',
    rating: 9.2,
    address: 'Ikeja, Lagos',
    location: { lat: 6.6018, lng: 3.3515 },
    tuitionRange: '₦1.5M - ₦2.5M/year',
    curriculum: ['Nigerian Curriculum', 'WAEC', 'NECO'],
    enrollment: 1000,
    studentTeacherRatio: '25:1',
    website: 'https://www.vfmc.edu.ng',
    phone: '+234 1 493 2050',
    catchmentRadius: 3000,
  },
  {
    id: 'kings-college-lagos',
    name: "King's College Lagos",
    type: 'public',
    level: 'high',
    rating: 8.5,
    address: 'Catholic Mission Street, Lagos Island',
    location: { lat: 6.4474, lng: 3.3903 },
    curriculum: ['Nigerian Curriculum', 'WAEC', 'NECO'],
    enrollment: 1500,
    studentTeacherRatio: '30:1',
    website: 'https://www.kingscollegelagos.com',
    phone: '+234 1 263 0361',
    catchmentRadius: 5000,
  },
  {
    id: 'queens-college-lagos',
    name: "Queen's College Lagos",
    type: 'public',
    level: 'high',
    rating: 8.6,
    address: 'Yaba, Lagos',
    location: { lat: 6.5167, lng: 3.3667 },
    curriculum: ['Nigerian Curriculum', 'WAEC', 'NECO'],
    enrollment: 1800,
    studentTeacherRatio: '32:1',
    website: 'https://www.queenscollegelagos.com',
    phone: '+234 1 820 0955',
    catchmentRadius: 5000,
  },
  {
    id: 'igbobi-college',
    name: 'Igbobi College',
    type: 'public',
    level: 'high',
    rating: 8.3,
    address: 'Jibowu, Yaba, Lagos',
    location: { lat: 6.5167, lng: 3.3833 },
    curriculum: ['Nigerian Curriculum', 'WAEC', 'NECO'],
    enrollment: 1600,
    studentTeacherRatio: '35:1',
    website: 'https://www.igbobicollege.org',
    phone: '+234 1 820 1234',
    catchmentRadius: 4500,
  },
  {
    id: 'methodist-girls-high',
    name: "Methodist Girls' High School",
    type: 'public',
    level: 'high',
    rating: 8.4,
    address: 'Broad Street, Lagos Island',
    location: { lat: 6.4541, lng: 3.3947 },
    curriculum: ['Nigerian Curriculum', 'WAEC', 'NECO'],
    enrollment: 1400,
    studentTeacherRatio: '33:1',
    website: 'https://www.mghs-lagos.org',
    phone: '+234 1 263 5678',
    catchmentRadius: 4000,
  },
];

// Helper function to check if a location is within a school's catchment zone
export function isInCatchmentZone(
  location: { lat: number; lng: number },
  school: School
): boolean {
  if (school.catchmentZone) {
    // Point-in-polygon algorithm
    const polygon = school.catchmentZone;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;

      const intersect =
        yi > location.lng !== yj > location.lng &&
        location.lat < ((xj - xi) * (location.lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  } else if (school.catchmentRadius) {
    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const dLat = ((location.lat - school.location.lat) * Math.PI) / 180;
    const dLng = ((location.lng - school.location.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((school.location.lat * Math.PI) / 180) *
        Math.cos((location.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= school.catchmentRadius;
  }
  return false;
}

// Get schools near a location (within radius in meters)
export function getSchoolsNearLocation(
  location: { lat: number; lng: number },
  radiusMeters: number = 5000
): School[] {
  return lagosSchools.filter((school) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((location.lat - school.location.lat) * Math.PI) / 180;
    const dLng = ((location.lng - school.location.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((school.location.lat * Math.PI) / 180) *
        Math.cos((location.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusMeters;
  });
}

// Get rating color
export function getSchoolRatingColor(rating: number): string {
  if (rating >= 9.0) return '#10b981'; // green-500
  if (rating >= 8.0) return '#3b82f6'; // blue-500
  if (rating >= 7.0) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

// Get rating label
export function getSchoolRatingLabel(rating: number): string {
  if (rating >= 9.0) return 'Excellent';
  if (rating >= 8.0) return 'Very Good';
  if (rating >= 7.0) return 'Good';
  if (rating >= 6.0) return 'Above Average';
  return 'Average';
}
