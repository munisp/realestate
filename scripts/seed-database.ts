import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/realestate";

async function seed() {
  console.log("🌱 Starting database seeding...");
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  const connection = pool;
  const db = drizzle(pool, { schema });

  // Check if already seeded
  const existingUsers = await db.select().from(schema.users).where(eq(schema.users.openId, "sample-user-1"));
  if (existingUsers.length > 0) {
    console.log("✅ Database already seeded. Skipping...");
    await pool.end();
    return;
  }

  // Sample Nigerian cities
  const cities = [
    { name: "Lagos", state: "Lagos", lat: "6.5244", lng: "3.3792" },
    { name: "Abuja", state: "FCT", lat: "9.0765", lng: "7.3986" },
    { name: "Port Harcourt", state: "Rivers", lat: "4.8156", lng: "7.0498" },
    { name: "Lekki", state: "Lagos", lat: "6.4474", lng: "3.5528" },
    { name: "Victoria Island", state: "Lagos", lat: "6.4281", lng: "3.4219" },
  ];

  // 1. Create sample users
  console.log("Creating sample users...");
  const userIds: number[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const [result] = await db.insert(schema.users).values({
      openId: `sample-user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      loginMethod: "email",
      role: i === 1 ? "admin" : "user",
    });
    userIds.push(result.insertId);
  }

  // 2. Create sample builders
  console.log("Creating sample builders...");
  const builderIds: number[] = [];
  
  const builders = [
    { name: "Premium Homes Ltd", description: "Luxury residential developer", yearsInBusiness: 15 },
    { name: "Urban Estates", description: "Modern urban development", yearsInBusiness: 10 },
    { name: "Green Valley Developers", description: "Eco-friendly housing", yearsInBusiness: 8 },
  ];

  for (const builder of builders) {
    const [result] = await db.insert(schema.builders).values({
      userId: userIds[builderIds.length],
      companyName: builder.name,
      description: builder.description,
      yearsInBusiness: builder.yearsInBusiness,
      verificationStatus: "verified",
      cacNumber: `RC${Math.floor(Math.random() * 1000000)}`,
      phoneNumber: `+234${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    });
    builderIds.push(result.insertId);
  }

  // 3. Create sample properties (for sale)
  console.log("Creating sample properties...");
  const propertyTypes = ["house", "apartment", "condo", "land"];
  const propertyIds: number[] = [];

  for (let i = 0; i < 30; i++) {
    const city = cities[i % cities.length];
    const type = propertyTypes[i % propertyTypes.length];
    const bedrooms = [2, 3, 4, 5][i % 4];
    const price = Math.floor(Math.random() * 100000000) + 20000000; // 20M - 120M Naira

    const [result] = await db.insert(schema.properties).values({
      externalId: `PROP-${Date.now()}-${i}`,
      addressLine1: `${i + 1} Sample Street`,
      city: city.name,
      state: city.state,
      zipCode: `${100000 + i}`,
      country: "Nigeria",
      latitude: city.lat,
      longitude: city.lng,
      propertyType: type,
      listingType: "sale",
      price: price,
      bedrooms: bedrooms,
      bathrooms: bedrooms - 1,
      squareFeet: 1500 + (i * 100),
      yearBuilt: 2015 + (i % 10),
      description: `Beautiful ${bedrooms}-bedroom ${type} in ${city.name}. Modern amenities and prime location.`,
      features: JSON.stringify(["Air Conditioning", "Parking", "Security", "Generator"]),
      images: JSON.stringify([`https://picsum.photos/800/600?random=${i}`]),
      status: "active",
      ownerId: userIds[i % userIds.length],
    });
    propertyIds.push(result.insertId);
  }

  // 4. Create builder projects
  console.log("Creating builder projects...");
  const projectIds: number[] = [];
  
  for (let i = 0; i < 15; i++) {
    const city = cities[i % cities.length];
    const bedrooms = [2, 3, 4][i % 3];
    const price = Math.floor(Math.random() * 80000000) + 30000000; // 30M - 110M Naira
    const status = ["pre_construction", "under_construction", "completed"][i % 3];

    const [result] = await db.insert(schema.builderProjects).values({
      builderId: builderIds[i % builderIds.length],
      title: `${city.name} ${bedrooms}BR Project ${i + 1}`,
      description: `Modern ${bedrooms}-bedroom development in ${city.name}`,
      location: `${city.name}, ${city.state}`,
      constructionStatus: status,
      startDate: new Date(2024, i % 12, 1),
      estimatedCompletion: new Date(2025, (i + 6) % 12, 1),
      totalUnits: 10 + (i * 2),
      availableUnits: 5 + i,
      pricePerUnit: price,
      images: JSON.stringify([`https://picsum.photos/800/600?random=project${i}`]),
    });
    projectIds.push(result.insertId);

    // Add milestones for each project
    const milestones = [
      { name: "Foundation", percentage: 20 },
      { name: "Structure", percentage: 40 },
      { name: "Roofing", percentage: 60 },
      { name: "Finishing", percentage: 80 },
      { name: "Completion", percentage: 100 },
    ];

    for (const milestone of milestones) {
      const completed = status === "completed" || (status === "under_construction" && milestone.percentage <= 60);
      await db.insert(schema.projectMilestones).values({
        projectId: result.insertId,
        name: milestone.name,
        description: `${milestone.name} phase completion`,
        targetDate: new Date(2024, i % 12, milestone.percentage / 4),
        completionPercentage: milestone.percentage,
        status: completed ? "completed" : "pending",
      });
    }
  }

  // 5. Create short-let properties
  console.log("Creating short-let properties...");
  const shortLetIds: number[] = [];
  
  for (let i = 0; i < 20; i++) {
    const city = cities[i % cities.length];
    const bedrooms = [1, 2, 3][i % 3];
    const nightlyRate = Math.floor(Math.random() * 50000) + 15000; // 15k - 65k per night

    const [result] = await db.insert(schema.shortLetProperties).values({
      propertyId: propertyIds[i % propertyIds.length],
      title: `Cozy ${bedrooms}BR Apartment in ${city.name}`,
      nightlyRate: nightlyRate,
      cleaningFee: 5000,
      maxGuests: bedrooms * 2,
      minimumStay: [1, 2, 3][i % 3],
      amenities: JSON.stringify(["WiFi", "Kitchen", "TV", "AC", "Parking"]),
      houseRules: JSON.stringify(["No smoking", "No pets", "No parties"]),
      status: "active",
    });
    shortLetIds.push(result.insertId);
  }

  // 6. Create sample bookings
  console.log("Creating sample bookings...");
  
  for (let i = 0; i < 10; i++) {
    const checkIn = new Date(2025, 0, i * 3 + 1);
    const checkOut = new Date(2025, 0, i * 3 + 4);
    const nights = 3;
    const property = shortLetIds[i % shortLetIds.length];

    await db.insert(schema.shortLetBookings).values({
      propertyId: property,
      guestId: userIds[i % userIds.length],
      checkIn: checkIn,
      checkOut: checkOut,
      numberOfGuests: 2,
      totalPrice: 45000,
      status: ["pending", "confirmed", "completed"][i % 3],
    });
  }

  // 7. Create sample reviews
  console.log("Creating sample reviews...");
  
  for (let i = 0; i < 15; i++) {
    await db.insert(schema.builderReviews).values({
      builderId: builderIds[i % builderIds.length],
      userId: userIds[i % userIds.length],
      rating: 4 + (i % 2),
      comment: `Great experience working with this builder. Professional and timely delivery.`,
    });
  }

  console.log("✅ Database seeding completed!");
  await pool.end();
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
