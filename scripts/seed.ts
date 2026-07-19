import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { properties } from '../drizzle/schema';

const sampleProperties = [
  {
    addressLine1: "123 Ocean View Drive",
    city: "Miami",
    state: "FL",
    zipCode: "33139",
    country: "USA",
    latitude: "25.7907",
    longitude: "-80.1300",
    propertyType: "single_family" as const,
    listingType: "sale" as const,
    status: "active" as const,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2500,
    lotSize: 5000,
    yearBuilt: 2018,
    price: 850000,
    pricePerSqFt: 340,
    title: "Luxury Oceanfront Home",
    description: "Beautiful 4-bedroom home with stunning ocean views. Features modern kitchen, spacious living areas, and private pool.",
    features: JSON.stringify(["Pool", "Ocean View", "Modern Kitchen", "Garage", "Central AC"]),
    primaryImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
    ]),
  },
  {
    addressLine1: "456 Park Avenue",
    city: "New York",
    state: "NY",
    zipCode: "10022",
    country: "USA",
    latitude: "40.7614",
    longitude: "-73.9776",
    propertyType: "condo" as const,
    listingType: "sale" as const,
    status: "active" as const,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    yearBuilt: 2020,
    price: 1250000,
    pricePerSqFt: 1042,
    title: "Modern Manhattan Condo",
    description: "Sleek 2-bedroom condo in prime Manhattan location. Floor-to-ceiling windows, chef's kitchen, and building amenities.",
    features: JSON.stringify(["Doorman", "Gym", "Rooftop Terrace", "Concierge", "Pet Friendly"]),
    primaryImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
    ]),
  },
  {
    addressLine1: "789 Silicon Valley Blvd",
    city: "San Jose",
    state: "CA",
    zipCode: "95110",
    country: "USA",
    latitude: "37.3382",
    longitude: "-121.8863",
    propertyType: "townhouse" as const,
    listingType: "sale" as const,
    status: "active" as const,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    lotSize: 2000,
    yearBuilt: 2019,
    price: 950000,
    pricePerSqFt: 528,
    title: "Contemporary Silicon Valley Townhouse",
    description: "Modern 3-bedroom townhouse in tech hub. Smart home features, open floor plan, and attached garage.",
    features: JSON.stringify(["Smart Home", "Garage", "Patio", "Energy Efficient"]),
    primaryImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
    ]),
  },
  {
    addressLine1: "321 Lakefront Circle",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    country: "USA",
    latitude: "30.2672",
    longitude: "-97.7431",
    propertyType: "single_family" as const,
    listingType: "sale" as const,
    status: "active" as const,
    bedrooms: 5,
    bathrooms: 4,
    squareFeet: 3500,
    lotSize: 8000,
    yearBuilt: 2021,
    price: 1100000,
    pricePerSqFt: 314,
    title: "Spacious Lakefront Estate",
    description: "Stunning 5-bedroom home on the lake. Gourmet kitchen, home office, and expansive outdoor living space.",
    features: JSON.stringify(["Lake View", "Home Office", "Outdoor Kitchen", "Boat Dock", "Pool"]),
    primaryImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
    ]),
  },
  {
    addressLine1: "555 Downtown Street",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    country: "USA",
    latitude: "47.6062",
    longitude: "-122.3321",
    propertyType: "condo" as const,
    listingType: "rent" as const,
    status: "active" as const,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 750,
    yearBuilt: 2022,
    price: 2500,
    pricePerSqFt: 3,
    title: "Urban Studio Apartment",
    description: "Modern studio in the heart of downtown Seattle. Walking distance to Pike Place Market and waterfront.",
    features: JSON.stringify(["City View", "Gym", "Bike Storage", "Package Room"]),
    primaryImage: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
    ]),
  },
];

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = pool;
  const db = drizzle(pool);
  
  console.log('Seeding properties...');
  
  for (const property of sampleProperties) {
    await db.insert(properties).values(property);
    console.log(`Added: ${property.title}`);
  }
  
  console.log('Seeding complete!');
  await pool.end();
  process.exit(0);
}

seed().catch(console.error);
