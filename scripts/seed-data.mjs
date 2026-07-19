#!/usr/bin/env node

/**
 * Data Seeding Script for Real Estate Platform
 * Populates initial data for Nigerian and USA markets
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// Nigerian Cities Data
const nigerianCities = [
  {
    name: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    neighborhoods: ['Victoria Island', 'Lekki', 'Ikoyi', 'Banana Island', 'Surulere', 'Yaba'],
    coordinates: { lat: 6.5244, lng: 3.3792 }
  },
  {
    name: 'Abuja',
    state: 'FCT',
    country: 'Nigeria',
    neighborhoods: ['Maitama', 'Asokoro', 'Wuse', 'Garki', 'Gwarinpa', 'Jabi'],
    coordinates: { lat: 9.0765, lng: 7.3986 }
  },
  {
    name: 'Port Harcourt',
    state: 'Rivers State',
    country: 'Nigeria',
    neighborhoods: ['GRA', 'Old GRA', 'Trans Amadi', 'Rumuola', 'Eliozu', 'Ada George'],
    coordinates: { lat: 4.8156, lng: 7.0498 }
  },
  {
    name: 'Kano',
    state: 'Kano State',
    country: 'Nigeria',
    neighborhoods: ['Nassarawa', 'Bompai', 'Kano Municipal', 'Fagge', 'Gwale', 'Tarauni'],
    coordinates: { lat: 12.0022, lng: 8.5920 }
  },
  {
    name: 'Ibadan',
    state: 'Oyo State',
    country: 'Nigeria',
    neighborhoods: ['Bodija', 'Jericho', 'Agodi', 'Oke-Ado', 'Ring Road', 'UI'],
    coordinates: { lat: 7.3775, lng: 3.9470 }
  }
];

// USA Cities Data
const usaCities = [
  {
    name: 'New York',
    state: 'New York',
    country: 'USA',
    neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Harlem'],
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  {
    name: 'Los Angeles',
    state: 'California',
    country: 'USA',
    neighborhoods: ['Beverly Hills', 'Hollywood', 'Santa Monica', 'Venice', 'Downtown LA', 'Pasadena'],
    coordinates: { lat: 34.0522, lng: -118.2437 }
  },
  {
    name: 'Miami',
    state: 'Florida',
    country: 'USA',
    neighborhoods: ['South Beach', 'Brickell', 'Coral Gables', 'Coconut Grove', 'Wynwood', 'Downtown Miami'],
    coordinates: { lat: 25.7617, lng: -80.1918 }
  },
  {
    name: 'Houston',
    state: 'Texas',
    country: 'USA',
    neighborhoods: ['Downtown', 'Midtown', 'Montrose', 'River Oaks', 'The Heights', 'Memorial'],
    coordinates: { lat: 29.7604, lng: -95.3698 }
  },
  {
    name: 'Chicago',
    state: 'Illinois',
    country: 'USA',
    neighborhoods: ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast', 'Hyde Park'],
    coordinates: { lat: 41.8781, lng: -87.6298 }
  }
];

// Property types and features
const propertyTypes = ['House', 'Apartment', 'Condo', 'Townhouse', 'Villa', 'Duplex'];
const features = ['Pool', 'Gym', 'Security', 'Parking', 'Generator', 'AC', 'Garden', 'Balcony'];

// Generate realistic property data
function generateProperties(cities, country) {
  const properties = [];
  const priceMultiplier = country === 'Nigeria' ? 1000000 : 100000; // NGN vs USD base
  
  cities.forEach(city => {
    city.neighborhoods.forEach(neighborhood => {
      // Generate 5-10 properties per neighborhood
      const propertyCount = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < propertyCount; i++) {
        const type = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
        const bedrooms = Math.floor(Math.random() * 5) + 1;
        const bathrooms = Math.floor(Math.random() * bedrooms) + 1;
        const sqft = Math.floor(Math.random() * 3000) + 800;
        const price = Math.floor((Math.random() * 10 + 1) * priceMultiplier * bedrooms);
        
        // Select random features
        const propertyFeatures = features
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 4) + 3);
        
        properties.push({
          title: `${bedrooms}-Bedroom ${type} in ${neighborhood}`,
          description: `Beautiful ${bedrooms} bedroom ${type.toLowerCase()} located in the heart of ${neighborhood}, ${city.name}. Features ${propertyFeatures.join(', ').toLowerCase()}.`,
          type,
          price,
          currency: country === 'Nigeria' ? 'NGN' : 'USD',
          bedrooms,
          bathrooms,
          sqft,
          address: `${Math.floor(Math.random() * 999) + 1} ${neighborhood} Street`,
          city: city.name,
          state: city.state,
          country,
          zipCode: country === 'Nigeria' ? `${Math.floor(Math.random() * 90000) + 10000}` : `${Math.floor(Math.random() * 90000) + 10000}`,
          latitude: city.coordinates.lat + (Math.random() - 0.5) * 0.1,
          longitude: city.coordinates.lng + (Math.random() - 0.5) * 0.1,
          features: propertyFeatures.join(','),
          status: Math.random() > 0.3 ? 'available' : 'sold',
          yearBuilt: Math.floor(Math.random() * 20) + 2004,
          images: [
            'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
            'https://images.unsplash.com/photo-1570129477492-45c003edd2be'
          ].join(',')
        });
      }
    });
  });
  
  return properties;
}

// Generate agent data
function generateAgents(cities, country) {
  const agents = [];
  const firstNames = country === 'Nigeria' 
    ? ['Chidi', 'Amaka', 'Tunde', 'Ngozi', 'Emeka', 'Folake', 'Adeola', 'Chioma']
    : ['John', 'Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'Robert', 'Lisa'];
  const lastNames = country === 'Nigeria'
    ? ['Okafor', 'Adeyemi', 'Nwosu', 'Ibrahim', 'Okonkwo', 'Bello', 'Eze', 'Mohammed']
    : ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  cities.forEach(city => {
    // 2-3 agents per city
    const agentCount = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < agentCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const phone = country === 'Nigeria' 
        ? `+234${Math.floor(Math.random() * 900000000) + 100000000}`
        : `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      
      agents.push({
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@realestate.com`,
        phone,
        bio: `Experienced real estate agent specializing in ${city.name} properties with over ${Math.floor(Math.random() * 10) + 3} years of experience.`,
        city: city.name,
        state: city.state,
        country,
        licenseNumber: `${country === 'Nigeria' ? 'NG' : 'US'}-${Math.floor(Math.random() * 900000) + 100000}`,
        yearsExperience: Math.floor(Math.random() * 15) + 3,
        specialization: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
        rating: (Math.random() * 2 + 3).toFixed(1) // 3.0 to 5.0
      });
    }
  });
  
  return agents;
}

// Main seeding function
async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');
  
  try {
    // Connect to database
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);
    
    console.log('✓ Connected to database\n');
    
    // Generate data
    console.log('📊 Generating data...');
    const nigerianProperties = generateProperties(nigerianCities, 'Nigeria');
    const usaProperties = generateProperties(usaCities, 'USA');
    const nigerianAgents = generateAgents(nigerianCities, 'Nigeria');
    const usaAgents = generateAgents(usaCities, 'USA');
    
    console.log(`  - ${nigerianProperties.length} Nigerian properties`);
    console.log(`  - ${usaProperties.length} USA properties`);
    console.log(`  - ${nigerianAgents.length} Nigerian agents`);
    console.log(`  - ${usaAgents.length} USA agents\n`);
    
    // Insert data (using raw SQL for compatibility)
    console.log('💾 Inserting data into database...');
    
    // Insert properties
    for (const property of [...nigerianProperties, ...usaProperties]) {
      await connection.execute(
        `INSERT INTO properties (title, description, type, price, currency, bedrooms, bathrooms, sqft, address, city, state, country, zipCode, latitude, longitude, features, status, yearBuilt, images, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          property.title, property.description, property.type, property.price, property.currency,
          property.bedrooms, property.bathrooms, property.sqft, property.address, property.city,
          property.state, property.country, property.zipCode, property.latitude, property.longitude,
          property.features, property.status, property.yearBuilt, property.images
        ]
      );
    }
    console.log(`✓ Inserted ${nigerianProperties.length + usaProperties.length} properties`);
    
    // Insert agents
    for (const agent of [...nigerianAgents, ...usaAgents]) {
      await connection.execute(
        `INSERT INTO agents (name, email, phone, bio, city, state, country, licenseNumber, yearsExperience, specialization, rating, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          agent.name, agent.email, agent.phone, agent.bio, agent.city, agent.state,
          agent.country, agent.licenseNumber, agent.yearsExperience, agent.specialization, agent.rating
        ]
      );
    }
    console.log(`✓ Inserted ${nigerianAgents.length + usaAgents.length} agents`);
    
    await connection.end();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log('========');
    console.log(`Total Properties: ${nigerianProperties.length + usaProperties.length}`);
    console.log(`  - Nigeria: ${nigerianProperties.length}`);
    console.log(`  - USA: ${usaProperties.length}`);
    console.log(`Total Agents: ${nigerianAgents.length + usaAgents.length}`);
    console.log(`  - Nigeria: ${nigerianAgents.length}`);
    console.log(`  - USA: ${usaAgents.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
