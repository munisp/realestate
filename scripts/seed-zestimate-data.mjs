/**
 * Seed Zestimate Sample Data
 * Creates sample properties with AI valuations for testing
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log("========================================");
console.log("Seeding Zestimate Sample Data");
console.log("========================================\n");

// Sample properties in San Francisco
const sampleProperties = [
  {
    addressLine1: "123 Market St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    country: "USA",
    latitude: "37.7749",
    longitude: "-122.4194",
    propertyType: "single_family",
    listingType: "sale",
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    lotSize: 3000,
    yearBuilt: 1920,
    price: 1200000,
    pricePerSqFt: 667,
    title: "Charming Victorian Home",
    description: "Beautiful Victorian home in the heart of San Francisco",
  },
  {
    addressLine1: "456 Valencia St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94110",
    country: "USA",
    latitude: "37.7599",
    longitude: "-122.4216",
    propertyType: "condo",
    listingType: "sale",
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    lotSize: 0,
    yearBuilt: 2015,
    price: 950000,
    pricePerSqFt: 792,
    title: "Modern Mission District Condo",
    description: "Sleek modern condo with rooftop access",
  },
  {
    addressLine1: "789 Divisadero St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94117",
    country: "USA",
    latitude: "37.7726",
    longitude: "-122.4376",
    propertyType: "single_family",
    listingType: "sale",
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2400,
    lotSize: 4000,
    yearBuilt: 1950,
    price: 1850000,
    pricePerSqFt: 771,
    title: "Spacious Haight-Ashbury Home",
    description: "Renovated home with modern amenities",
  },
];

try {
  console.log("Inserting sample properties...");
  const insertedProperties = [];

  for (const prop of sampleProperties) {
    const [result] = await connection.execute(
      `INSERT INTO properties (addressLine1, city, state, zipCode, country, latitude, longitude, 
       propertyType, listingType, bedrooms, bathrooms, squareFeet, lotSize, yearBuilt, price, 
       pricePerSqFt, title, description, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        prop.addressLine1, prop.city, prop.state, prop.zipCode, prop.country,
        prop.latitude, prop.longitude, prop.propertyType, prop.listingType,
        prop.bedrooms, prop.bathrooms, prop.squareFeet, prop.lotSize,
        prop.yearBuilt, prop.price, prop.pricePerSqFt, prop.title, prop.description
      ]
    );
    const propertyId = result.insertId;
    insertedProperties.push({ ...prop, id: propertyId });
    console.log(`  ✓ Inserted property ${propertyId}: ${prop.addressLine1}`);
  }

  // Create AI valuations
  console.log("\nCreating AI valuations...");
  for (const prop of insertedProperties) {
    const estimatedValue = prop.price * (0.95 + Math.random() * 0.1);
    const confidence = 0.75 + Math.random() * 0.2;
    const range = estimatedValue * 0.1;

    await connection.execute(
      `INSERT INTO property_valuations (propertyId, estimatedValue, lowerBound, upperBound, 
       confidence, modelType, source, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        prop.id,
        estimatedValue.toFixed(2),
        (estimatedValue - range).toFixed(2),
        (estimatedValue + range).toFixed(2),
        confidence.toFixed(4),
        'ensemble',
        'ensemble'
      ]
    );

    console.log(`  ✓ Created valuation for property ${prop.id}: $${Math.round(estimatedValue).toLocaleString()}`);
  }

  // Create visual assessments
  console.log("\nCreating visual assessments...");
  for (const prop of insertedProperties) {
    const conditionScore = 70 + Math.floor(Math.random() * 25);
    const overallCondition = conditionScore >= 85 ? 'excellent' : conditionScore >= 70 ? 'good' : 'fair';

    await connection.execute(
      `INSERT INTO visual_assessments (propertyId, overallCondition, conditionScore, 
       roofCondition, hasPool, hasSolarPanels, hasDeck, vegetationIndex, curbAppeal, 
       exteriorCondition, parkingSpaces, walkabilityScore, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        prop.id,
        overallCondition,
        conditionScore,
        overallCondition,
        Math.random() > 0.8 ? 1 : 0,
        Math.random() > 0.7 ? 1 : 0,
        Math.random() > 0.6 ? 1 : 0,
        (0.3 + Math.random() * 0.4).toFixed(4),
        60 + Math.floor(Math.random() * 35),
        overallCondition,
        Math.floor(Math.random() * 3) + 1,
        70 + Math.floor(Math.random() * 25)
      ]
    );

    console.log(`  ✓ Created visual assessment for property ${prop.id}: ${overallCondition} condition`);
  }

  // Create alternative data cache
  console.log("\nCreating alternative data cache...");
  for (const prop of insertedProperties) {
    await connection.execute(
      `INSERT INTO alternative_data_cache (propertyId, walkabilityScore, amenityDensity025mi, 
       amenityDensity05mi, amenityDensity1mi, restaurantQualityAvg, schoolQualityProxy, 
       retailAccessibility, unemploymentRate, wageGrowthYoy, priceGrowthYoy, 
       searchInterestIndex, buyerUrgencyScore, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        prop.id,
        70 + Math.floor(Math.random() * 25),
        Math.floor(Math.random() * 20) + 10,
        Math.floor(Math.random() * 40) + 20,
        Math.floor(Math.random() * 80) + 40,
        (3.5 + Math.random() * 1.0).toFixed(2),
        60 + Math.floor(Math.random() * 35),
        70 + Math.floor(Math.random() * 25),
        (3.0 + Math.random() * 3.0).toFixed(2),
        (1.0 + Math.random() * 4.0).toFixed(2),
        (2.0 + Math.random() * 8.0).toFixed(2),
        50 + Math.floor(Math.random() * 50),
        40 + Math.floor(Math.random() * 50)
      ]
    );

    console.log(`  ✓ Created alternative data for property ${prop.id}`);
  }

  // Create neighborhood graph edges
  console.log("\nCreating neighborhood graph...");
  let edgeCount = 0;

  for (let i = 0; i < insertedProperties.length; i++) {
    for (let j = i + 1; j < insertedProperties.length; j++) {
      const prop1 = insertedProperties[i];
      const prop2 = insertedProperties[j];

      // Calculate distance (simplified Haversine)
      const lat1 = parseFloat(prop1.latitude);
      const lon1 = parseFloat(prop1.longitude);
      const lat2 = parseFloat(prop2.latitude);
      const lon2 = parseFloat(prop2.longitude);

      const R = 3959; // Earth radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance < 2.0) {
        const influence = Math.exp(-distance);

        // Create bidirectional edges
        await connection.execute(
          `INSERT INTO neighborhood_graph (propertyId, neighborId, distanceMiles, influenceWeight, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [prop1.id, prop2.id, distance.toFixed(4), influence.toFixed(6)]
        );

        await connection.execute(
          `INSERT INTO neighborhood_graph (propertyId, neighborId, distanceMiles, influenceWeight, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [prop2.id, prop1.id, distance.toFixed(4), influence.toFixed(6)]
        );

        edgeCount += 2;
      }
    }
  }

  console.log(`  ✓ Created ${edgeCount} neighborhood graph edges`);

  console.log("\n========================================");
  console.log("✓ Seeding Complete");
  console.log("========================================");
  console.log(`\nCreated:`);
  console.log(`  - ${insertedProperties.length} properties`);
  console.log(`  - ${insertedProperties.length} valuations`);
  console.log(`  - ${insertedProperties.length} visual assessments`);
  console.log(`  - ${insertedProperties.length} alternative data records`);
  console.log(`  - ${edgeCount} neighborhood graph edges`);
  console.log(`\nTest the UI at:`);
  console.log(`  http://localhost:3000/property/${insertedProperties[0].id}/valuation`);
  console.log("");

  await connection.end();
  process.exit(0);

} catch (error) {
  console.error("Error seeding data:", error);
  await connection.end();
  process.exit(1);
}
