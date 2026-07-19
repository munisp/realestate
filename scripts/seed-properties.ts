import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Nigerian cities with realistic coordinates
const NIGERIAN_CITIES = [
  {
    name: 'Lagos',
    center: { lat: 6.5244, lng: 3.3792 },
    neighborhoods: [
      { name: 'Victoria Island', lat: 6.4281, lng: 3.4219, priceMultiplier: 2.5 },
      { name: 'Ikoyi', lat: 6.4541, lng: 3.4316, priceMultiplier: 2.8 },
      { name: 'Lekki', lat: 6.4474, lng: 3.4739, priceMultiplier: 2.0 },
      { name: 'Ikeja', lat: 6.6018, lng: 3.3515, priceMultiplier: 1.5 },
      { name: 'Yaba', lat: 6.5158, lng: 3.3711, priceMultiplier: 1.2 },
      { name: 'Surulere', lat: 6.4969, lng: 3.3547, priceMultiplier: 1.3 },
      { name: 'Ajah', lat: 6.4698, lng: 3.5668, priceMultiplier: 1.1 },
      { name: 'Maryland', lat: 6.5772, lng: 3.3650, priceMultiplier: 1.4 },
    ],
    basePrice: 50000000, // ₦50M base price
    currency: 'NGN',
  },
  {
    name: 'Abuja',
    center: { lat: 9.0765, lng: 7.3986 },
    neighborhoods: [
      { name: 'Maitama', lat: 9.0820, lng: 7.4890, priceMultiplier: 2.5 },
      { name: 'Asokoro', lat: 9.0330, lng: 7.5270, priceMultiplier: 2.3 },
      { name: 'Wuse 2', lat: 9.0579, lng: 7.4833, priceMultiplier: 1.8 },
      { name: 'Garki', lat: 9.0180, lng: 7.4940, priceMultiplier: 1.5 },
      { name: 'Gwarinpa', lat: 9.1115, lng: 7.4114, priceMultiplier: 1.3 },
      { name: 'Jabi', lat: 9.0711, lng: 7.4494, priceMultiplier: 1.6 },
      { name: 'Kubwa', lat: 9.1372, lng: 7.3378, priceMultiplier: 0.9 },
    ],
    basePrice: 45000000, // ₦45M base price
    currency: 'NGN',
  },
  {
    name: 'Port Harcourt',
    center: { lat: 4.8156, lng: 7.0498 },
    neighborhoods: [
      { name: 'GRA Phase 1', lat: 4.8105, lng: 7.0090, priceMultiplier: 2.0 },
      { name: 'GRA Phase 2', lat: 4.8200, lng: 7.0200, priceMultiplier: 1.9 },
      { name: 'Old GRA', lat: 4.7990, lng: 7.0120, priceMultiplier: 1.7 },
      { name: 'Trans Amadi', lat: 4.8050, lng: 7.0650, priceMultiplier: 1.2 },
      { name: 'Rumuola', lat: 4.8450, lng: 6.9950, priceMultiplier: 1.4 },
      { name: 'Eliozu', lat: 4.8750, lng: 6.9850, priceMultiplier: 1.1 },
    ],
    basePrice: 35000000, // ₦35M base price
    currency: 'NGN',
  },
  {
    name: 'Kano',
    center: { lat: 12.0022, lng: 8.5919 },
    neighborhoods: [
      { name: 'Nassarawa GRA', lat: 12.0100, lng: 8.5400, priceMultiplier: 1.8 },
      { name: 'Bompai', lat: 11.9850, lng: 8.5650, priceMultiplier: 1.3 },
      { name: 'Tarauni', lat: 12.0300, lng: 8.5750, priceMultiplier: 1.1 },
      { name: 'Gwale', lat: 12.0050, lng: 8.5300, priceMultiplier: 0.9 },
    ],
    basePrice: 25000000, // ₦25M base price
    currency: 'NGN',
  },
  {
    name: 'Ibadan',
    center: { lat: 7.3775, lng: 3.9470 },
    neighborhoods: [
      { name: 'Bodija', lat: 7.4350, lng: 3.9050, priceMultiplier: 1.6 },
      { name: 'Jericho', lat: 7.4150, lng: 3.9150, priceMultiplier: 1.5 },
      { name: 'Agodi GRA', lat: 7.4050, lng: 3.9250, priceMultiplier: 1.7 },
      { name: 'Ring Road', lat: 7.3950, lng: 3.9350, priceMultiplier: 1.2 },
      { name: 'Oluyole', lat: 7.3550, lng: 3.9550, priceMultiplier: 1.3 },
    ],
    basePrice: 30000000, // ₦30M base price
    currency: 'NGN',
  },
];

// US cities for comparison
const US_CITIES = [
  {
    name: 'San Francisco',
    center: { lat: 37.7749, lng: -122.4194 },
    neighborhoods: [
      { name: 'Pacific Heights', lat: 37.7919, lng: -122.4364, priceMultiplier: 2.5 },
      { name: 'Nob Hill', lat: 37.7925, lng: -122.4153, priceMultiplier: 2.2 },
      { name: 'Mission District', lat: 37.7599, lng: -122.4148, priceMultiplier: 1.5 },
      { name: 'SoMa', lat: 37.7786, lng: -122.4004, priceMultiplier: 1.8 },
    ],
    basePrice: 1200000, // $1.2M base price
    currency: 'USD',
  },
  {
    name: 'New York',
    center: { lat: 40.7128, lng: -74.0060 },
    neighborhoods: [
      { name: 'Manhattan', lat: 40.7831, lng: -73.9712, priceMultiplier: 3.0 },
      { name: 'Brooklyn', lat: 40.6782, lng: -73.9442, priceMultiplier: 1.6 },
      { name: 'Queens', lat: 40.7282, lng: -73.7949, priceMultiplier: 1.2 },
    ],
    basePrice: 900000, // $900K base price
    currency: 'USD',
  },
];

const PROPERTY_TYPES = [
  { type: 'single_family', minBed: 2, maxBed: 5, sizeMultiplier: 1.0 },
  { type: 'condo', minBed: 1, maxBed: 3, sizeMultiplier: 0.8 },
  { type: 'townhouse', minBed: 2, maxBed: 4, sizeMultiplier: 0.9 },
  { type: 'multi_family', minBed: 3, maxBed: 6, sizeMultiplier: 1.5 },
];

const PROPERTY_STATUSES = ['active', 'pending', 'sold'];

// Simple H3 mock (in production, use actual h3-js library)
function generateMockH3Index(lat: number, lng: number): string {
  const latHex = Math.abs(Math.floor(lat * 1000000)).toString(16).padStart(8, '0');
  const lngHex = Math.abs(Math.floor(lng * 1000000)).toString(16).padStart(8, '0');
  return `89${latHex.substring(0, 6)}${lngHex.substring(0, 6)}ffff`;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max));
}

function generatePropertyTitle(type: string, bedrooms: number, neighborhood: string): string {
  const adjectives = ['Luxury', 'Modern', 'Spacious', 'Beautiful', 'Elegant', 'Stunning'];
  const adj = adjectives[randomInt(0, adjectives.length)];
  return `${adj} ${bedrooms}-Bedroom ${type.charAt(0).toUpperCase() + type.slice(1)} in ${neighborhood}`;
}

function generateDescription(type: string, bedrooms: number, bathrooms: number, neighborhood: string): string {
  return `This ${type} features ${bedrooms} bedrooms and ${bathrooms} bathrooms in the heart of ${neighborhood}. Modern amenities, excellent location, and premium finishes throughout.`;
}

async function seedProperties() {
  console.log('🌱 Starting property seeding...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = pool;
  const db = drizzle(pool);

  const allCities = [...NIGERIAN_CITIES, ...US_CITIES];
  let totalProperties = 0;

  for (const city of allCities) {
    console.log(`\n📍 Seeding properties for ${city.name}...`);

    for (const neighborhood of city.neighborhoods) {
      const propertiesPerNeighborhood = randomInt(15, 30);

      for (let i = 0; i < propertiesPerNeighborhood; i++) {
        const propertyType = PROPERTY_TYPES[randomInt(0, PROPERTY_TYPES.length)];
        const bedrooms = randomInt(propertyType.minBed, propertyType.maxBed + 1);
        const bathrooms = randomInt(Math.max(1, bedrooms - 1), bedrooms + 1);
        const status = PROPERTY_STATUSES[randomInt(0, PROPERTY_STATUSES.length)];

        // Add some randomness to coordinates (within ~500m radius)
        const lat = neighborhood.lat + randomInRange(-0.005, 0.005);
        const lng = neighborhood.lng + randomInRange(-0.005, 0.005);

        // Calculate price
        const basePrice = city.basePrice * neighborhood.priceMultiplier * propertyType.sizeMultiplier;
        const bedroomMultiplier = 1 + (bedrooms - 2) * 0.2;
        const randomVariation = randomInRange(0.85, 1.15);
        const price = Math.floor(basePrice * bedroomMultiplier * randomVariation);

        // Calculate square footage
        const sqft = Math.floor(randomInRange(800, 3500));

        const h3Index = generateMockH3Index(lat, lng);

        const property = {
          title: generatePropertyTitle(propertyType.type, bedrooms, neighborhood.name),
          description: generateDescription(propertyType.type, bedrooms, bathrooms, neighborhood.name),
          price,
          currency: city.currency,
          propertyType: propertyType.type,
          bedrooms,
          bathrooms,
          sqft,
          latitude: lat,
          longitude: lng,
          h3Index,
          address: `${randomInt(1, 999)} ${neighborhood.name} Street`,
          city: city.name,
          state: city.name === 'Lagos' || city.name === 'Abuja' ? city.name : 'State',
          country: NIGERIAN_CITIES.includes(city) ? 'Nigeria' : 'USA',
          zipCode: randomInt(10000, 99999).toString(),
          status,
          yearBuilt: randomInt(1990, 2024),
          parking: randomInt(1, 4),
          lotSize: sqft * randomInRange(1.5, 3.0),
          createdAt: new Date(Date.now() - randomInt(0, 90) * 24 * 60 * 60 * 1000), // Random date within last 90 days
        };

        try {
          // Insert property into database
          await connection.query(
            `INSERT INTO properties (
              title, description, price, propertyType, bedrooms, bathrooms, squareFeet,
              latitude, longitude, addressLine1, city, state, country, zipCode,
              status, yearBuilt, lotSize, listingType, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              property.title,
              property.description,
              property.price,
              property.propertyType,
              property.bedrooms,
              property.bathrooms,
              property.sqft,
              property.latitude.toString(),
              property.longitude.toString(),
              property.address,
              property.city,
              property.state,
              property.country,
              property.zipCode,
              property.status,
              property.yearBuilt,
              Math.floor(property.lotSize),
              'sale',
              property.createdAt
            ]
          );
          console.log(`  ✓ Created: ${property.title} - ${city.currency} ${price.toLocaleString()}`);
          totalProperties++;
        } catch (error) {
          console.error(`  ✗ Error creating property:`, error);
        }
      }

      console.log(`  ✓ Completed ${neighborhood.name}: ${propertiesPerNeighborhood} properties`);
    }
  }

  await pool.end();

  console.log(`\n✅ Seeding complete! Created ${totalProperties} properties across ${allCities.length} cities.`);
  console.log(`\nCities included:`);
  console.log(`  Nigerian cities: ${NIGERIAN_CITIES.map(c => c.name).join(', ')}`);
  console.log(`  US cities: ${US_CITIES.map(c => c.name).join(', ')}`);
}

// Run if called directly
// ES module check
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedProperties()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedProperties, NIGERIAN_CITIES, US_CITIES };
