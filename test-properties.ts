import { drizzle } from "drizzle-orm/node-postgres";
import { properties } from "./drizzle/schema";
import { sql } from "drizzle-orm";

async function testProperties() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Count total properties
  const total = await db.select({ count: sql<number>`count(*)` }).from(properties);
  console.log(`✅ Total properties: ${total[0].count}`);
  
  // Count by city
  const byCityQuery = await db.select({
    city: properties.city,
    count: sql<number>`count(*)`
  })
  .from(properties)
  .groupBy(properties.city);
  
  console.log('\n📍 Properties by city:');
  byCityQuery.forEach(row => {
    console.log(`  ${row.city}: ${row.count} properties`);
  });
  
  // Sample properties
  const samples = await db.select().from(properties).limit(5);
  console.log('\n🏠 Sample properties:');
  samples.forEach(p => {
    console.log(`  ${p.title} - ${p.city}, ${p.country} - ${p.price.toLocaleString()}`);
  });
  
  process.exit(0);
}

testProperties().catch(console.error);
