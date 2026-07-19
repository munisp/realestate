/**
 * Simplified Data Seeding Script
 * Run with: npx tsx scripts/seed-simple.ts
 */

import { getDb } from '../server/db';

// Nigerian and USA sample data
const sampleData = {
  nigeria: {
    cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'],
    neighborhoods: {
      Lagos: ['Victoria Island', 'Lekki', 'Ikoyi', 'Banana Island'],
      Abuja: ['Maitama', 'Asokoro', 'Wuse', 'Garki'],
      'Port Harcourt': ['GRA', 'Old GRA', 'Trans Amadi'],
      Kano: ['Nassarawa', 'Bompai'],
      Ibadan: ['Bodija', 'Jericho', 'Agodi']
    }
  },
  usa: {
    cities: ['New York', 'Los Angeles', 'Miami', 'Houston', 'Chicago'],
    neighborhoods: {
      'New York': ['Manhattan', 'Brooklyn', 'Queens'],
      'Los Angeles': ['Beverly Hills', 'Hollywood', 'Santa Monica'],
      Miami: ['South Beach', 'Brickell', 'Coral Gables'],
      Houston: ['Downtown', 'Midtown', 'River Oaks'],
      Chicago: ['Loop', 'Lincoln Park', 'Wicker Park']
    }
  }
};

async function seed() {
  console.log('🌱 Seeding database with Nigerian and USA properties...\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  try {
    let totalInserted = 0;

    // Seed Nigerian properties
    console.log('📍 Seeding Nigerian properties...');
    for (const city of sampleData.nigeria.cities) {
      const neighborhoods = sampleData.nigeria.neighborhoods[city as keyof typeof sampleData.nigeria.neighborhoods] || [];
      for (const neighborhood of neighborhoods) {
        const count = Math.floor(Math.random() * 3) + 2; // 2-4 properties per neighborhood
        for (let i = 0; i < count; i++) {
          const bedrooms = Math.floor(Math.random() * 4) + 2;
          const price = Math.floor((Math.random() * 50 + 20) * 1000000); // 20M - 70M NGN
          
          await db.execute(
            `INSERT INTO properties (title, description, type, price, bedrooms, bathrooms, sqft, address, city, state, country, status, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              `${bedrooms}-Bedroom ${['House', 'Apartment', 'Duplex'][Math.floor(Math.random() * 3)]} in ${neighborhood}`,
              `Beautiful property in ${neighborhood}, ${city}. Modern amenities and excellent location.`,
              ['House', 'Apartment', 'Duplex', 'Villa'][Math.floor(Math.random() * 4)],
              price,
              bedrooms,
              Math.floor(Math.random() * bedrooms) + 1,
              Math.floor(Math.random() * 2000) + 1000,
              `${Math.floor(Math.random() * 99) + 1} ${neighborhood} Street`,
              city,
              city === 'Lagos' ? 'Lagos State' : city === 'Abuja' ? 'FCT' : `${city} State`,
              'Nigeria',
              'available'
            ]
          );
          totalInserted++;
        }
      }
    }
    console.log(`✓ Inserted Nigerian properties\n`);

    // Seed USA properties
    console.log('📍 Seeding USA properties...');
    for (const city of sampleData.usa.cities) {
      const neighborhoods = sampleData.usa.neighborhoods[city as keyof typeof sampleData.usa.neighborhoods] || [];
      for (const neighborhood of neighborhoods) {
        const count = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < count; i++) {
          const bedrooms = Math.floor(Math.random() * 4) + 2;
          const price = Math.floor((Math.random() * 500 + 200) * 1000); // $200K - $700K
          
          await db.execute(
            `INSERT INTO properties (title, description, type, price, bedrooms, bathrooms, sqft, address, city, state, country, status, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              `${bedrooms}-Bedroom ${['House', 'Condo', 'Townhouse'][Math.floor(Math.random() * 3)]} in ${neighborhood}`,
              `Stunning property in ${neighborhood}, ${city}. Premium location with modern features.`,
              ['House', 'Condo', 'Townhouse', 'Apartment'][Math.floor(Math.random() * 4)],
              price,
              bedrooms,
              Math.floor(Math.random() * bedrooms) + 1,
              Math.floor(Math.random() * 2500) + 1200,
              `${Math.floor(Math.random() * 999) + 1} ${neighborhood} Ave`,
              city,
              city === 'New York' ? 'NY' : city === 'Los Angeles' ? 'CA' : city === 'Miami' ? 'FL' : city === 'Houston' ? 'TX' : 'IL',
              'USA',
              'available'
            ]
          );
          totalInserted++;
        }
      }
    }
    console.log(`✓ Inserted USA properties\n`);

    console.log(`\n🎉 Seeding completed!`);
    console.log(`Total properties inserted: ${totalInserted}`);
    console.log(`  - Nigerian cities: ${sampleData.nigeria.cities.join(', ')}`);
    console.log(`  - USA cities: ${sampleData.usa.cities.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}

seed();
