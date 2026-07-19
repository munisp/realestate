import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";

// Nigerian cities and states
const locations = [
  { city: "Lagos", state: "Lagos" },
  { city: "Abuja", state: "FCT" },
  { city: "Port Harcourt", state: "Rivers" },
  { city: "Ibadan", state: "Oyo" },
  { city: "Kano", state: "Kano" },
  { city: "Enugu", state: "Enugu" },
  { city: "Calabar", state: "Cross River" },
  { city: "Lekki", state: "Lagos" },
  { city: "Victoria Island", state: "Lagos" },
  { city: "Ikoyi", state: "Lagos" },
];

// Property images (using high-quality Unsplash images)
const propertyImages = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
  "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200",
  "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200",
];

const buildingImages = [
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200",
];

const apartmentImages = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200",
];

async function seed() {
  console.log("🌱 Starting database seeding...");

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // 1. Seed Properties (Buy/Sell)
    console.log("📍 Seeding properties...");
    const propertyTypes = ["single_family", "condo", "townhouse", "multi_family"];
    const properties = [];

    for (let i = 0; i < 20; i++) {
      const location = locations[i % locations.length];
      const propertyType = propertyTypes[i % propertyTypes.length];
      const bedrooms = 2 + (i % 4);
      const bathrooms = 1 + (i % 3);
      const sqft = 1000 + (i * 200);
      const price = 15000000 + (i * 5000000);
      
      properties.push({
        title: `${bedrooms} Bedroom ${propertyType.replace('_', ' ')} in ${location.city}`,
        description: `Beautiful ${bedrooms} bedroom ${propertyType.replace('_', ' ')} located in the heart of ${location.city}. Features modern amenities, spacious living areas, and excellent neighborhood.`,
        addressLine1: `${10 + i} ${['Admiralty', 'Banana Island', 'Parkview', 'GRA'][i % 4]} Road`,
        city: location.city,
        state: location.state,
        postalCode: `${100000 + i}`,
        country: "Nigeria",
        latitude: 6.5244 + (i * 0.01),
        longitude: 3.3792 + (i * 0.01),
        propertyType,
        price,
        bedrooms,
        bathrooms,
        sqft,
        lotSize: sqft * 2,
        yearBuilt: 2015 + (i % 8),
        status: "active",
        images: JSON.stringify([
          propertyImages[i % propertyImages.length],
          propertyImages[(i + 1) % propertyImages.length],
          propertyImages[(i + 2) % propertyImages.length],
        ]),
        primaryImage: propertyImages[i % propertyImages.length],
        features: JSON.stringify({
          parking: i % 3 !== 0,
          pool: i % 4 === 0,
          gym: i % 5 === 0,
          security: i % 2 === 0,
          garden: i % 3 === 0,
        }),
      });
    }

    await db.insert(schema.properties).values(properties);
    console.log(`✅ Seeded ${properties.length} properties`);

    // 2. Seed Builder Projects
    console.log("🏗️ Seeding builder projects...");
    const constructionStatuses = ["pre_construction", "under_construction", "completed"];
    const builderProjects = [];

    for (let i = 0; i < 15; i++) {
      const location = locations[i % locations.length];
      const status = constructionStatuses[i % constructionStatuses.length];
      const units = 10 + (i * 5);
      const basePrice = 25000000 + (i * 10000000);
      const progress = status === "pre_construction" ? 0 : status === "under_construction" ? 30 + (i % 50) : 100;
      
      builderProjects.push({
        projectName: `${['Luxury', 'Premium', 'Executive', 'Royal'][i % 4]} ${['Heights', 'Gardens', 'Estate', 'Residences'][i % 4]} ${location.city}`,
        description: `Modern residential development in ${location.city} featuring ${units} luxury units with world-class amenities and finishes.`,
        addressLine1: `Plot ${100 + i}, ${['Lekki', 'Ikoyi', 'GRA', 'Asokoro'][i % 4]} Phase ${1 + (i % 3)}`,
        city: location.city,
        state: location.state,
        postalCode: `${100000 + i}`,
        country: "Nigeria",
        latitude: 6.5244 + (i * 0.02),
        longitude: 3.3792 + (i * 0.02),
        builderId: 1, // We'll create builders next
        constructionStatus: status,
        totalUnits: units,
        availableUnits: Math.floor(units * 0.7),
        currentPrice: basePrice,
        estimatedCompletion: status === "completed" ? new Date(2024, 0, 1) : new Date(2025, 6 + (i % 12), 1),
        completionPercentage: progress,
        images: JSON.stringify([
          buildingImages[i % buildingImages.length],
          buildingImages[(i + 1) % buildingImages.length],
        ]),
        amenities: JSON.stringify({
          pool: true,
          gym: true,
          parking: true,
          security: true,
          playground: i % 2 === 0,
          clubhouse: i % 3 === 0,
        }),
        paymentPlan: JSON.stringify({
          initial: "30%",
          milestones: ["20% at foundation", "20% at roofing", "30% at completion"],
        }),
      });
    }

    await db.insert(schema.builderProjects).values(builderProjects);
    console.log(`✅ Seeded ${builderProjects.length} builder projects`);

    // 3. Seed Short-let Properties
    console.log("🏠 Seeding short-let properties...");
    const shortLetProperties = [];

    for (let i = 0; i < 25; i++) {
      const location = locations[i % locations.length];
      const bedrooms = 1 + (i % 4);
      const pricePerNight = 50000 + (i * 10000);
      
      // Create the property first
      const propertyData = {
        title: `${bedrooms} Bedroom Apartment - ${location.city}`,
        description: `Cozy ${bedrooms} bedroom apartment perfect for short stays in ${location.city}. Fully furnished with modern amenities.`,
        addressLine1: `${20 + i} ${['Adeola Odeku', 'Ozumba Mbadiwe', 'Ademola Adetokunbo'][i % 3]} Street`,
        city: location.city,
        state: location.state,
        postalCode: `${100000 + i}`,
        country: "Nigeria",
        latitude: 6.5244 + (i * 0.015),
        longitude: 3.3792 + (i * 0.015),
        propertyType: "condo",
        price: pricePerNight * 30, // Monthly equivalent
        bedrooms,
        bathrooms: 1 + (i % 2),
        sqft: 800 + (i * 100),
        status: "active",
        images: JSON.stringify([
          apartmentImages[i % apartmentImages.length],
          apartmentImages[(i + 1) % apartmentImages.length],
        ]),
        primaryImage: apartmentImages[i % apartmentImages.length],
      };

      const [insertedProperty] = await db.insert(schema.properties).values(propertyData);
      const propertyId = insertedProperty.insertId;

      shortLetProperties.push({
        propertyId,
        pricePerNight,
        minNights: i % 3 === 0 ? 1 : 2,
        maxNights: 30 + (i * 10),
        maxGuests: bedrooms * 2,
        amenities: JSON.stringify({
          wifi: true,
          kitchen: true,
          parking: i % 2 === 0,
          pool: i % 5 === 0,
          gym: i % 4 === 0,
          airConditioning: true,
          tv: true,
          washer: i % 3 === 0,
        }),
        houseRules: JSON.stringify({
          noSmoking: true,
          noPets: i % 3 !== 0,
          noParties: true,
        }),
        checkInTime: "14:00",
        checkOutTime: "11:00",
      });
    }

    await db.insert(schema.shortLetProperties).values(shortLetProperties);
    console.log(`✅ Seeded ${shortLetProperties.length} short-let properties`);

    // 4. Seed Builders
    console.log("👷 Seeding builders...");
    const builders = [
      {
        companyName: "Premium Builders Nigeria Ltd",
        registrationNumber: "RC123456",
        yearsOfExperience: 15,
        completedProjects: 45,
        specialization: "Luxury Residential",
        contactEmail: "info@premiumbuilders.ng",
        contactPhone: "+234-803-123-4567",
        addressLine1: "15 Adeola Hopewell Street",
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        verificationStatus: "verified",
        verifiedAt: new Date(),
      },
      {
        companyName: "Royal Construction Co.",
        registrationNumber: "RC789012",
        yearsOfExperience: 12,
        completedProjects: 32,
        specialization: "Commercial & Residential",
        contactEmail: "contact@royalconstruction.ng",
        contactPhone: "+234-806-987-6543",
        addressLine1: "Plot 234, Central Business District",
        city: "Abuja",
        state: "FCT",
        country: "Nigeria",
        verificationStatus: "verified",
        verifiedAt: new Date(),
      },
      {
        companyName: "Elite Developers Ltd",
        registrationNumber: "RC345678",
        yearsOfExperience: 8,
        completedProjects: 18,
        specialization: "Mixed-Use Developments",
        contactEmail: "info@elitedev.ng",
        contactPhone: "+234-809-555-1234",
        addressLine1: "45 Trans Amadi Industrial Layout",
        city: "Port Harcourt",
        state: "Rivers",
        country: "Nigeria",
        verificationStatus: "pending",
      },
    ];

    await db.insert(schema.builders).values(builders);
    console.log(`✅ Seeded ${builders.length} builders`);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\nSummary:");
    console.log(`  - ${properties.length} properties (Buy/Sell)`);
    console.log(`  - ${builderProjects.length} builder projects`);
    console.log(`  - ${shortLetProperties.length} short-let properties`);
    console.log(`  - ${builders.length} builders`);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
