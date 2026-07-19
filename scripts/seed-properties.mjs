/**
 * Property Seeding Script
 * Populates the database with realistic sample properties for testing
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Sample properties data for Lagos, Nigeria
const sampleProperties = [
  {
    title: 'Luxury 4-Bedroom Duplex in Lekki Phase 1',
    description: 'Modern duplex with spacious rooms, fitted kitchen, swimming pool, and 24/7 security. Located in prime Lekki Phase 1 area with easy access to shopping centers and beaches.',
    addressLine1: '15 Admiralty Way, Lekki Phase 1',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '101245',
    country: 'Nigeria',
    latitude: '6.4474',
    longitude: '3.4706',
    propertyType: 'single_family',
    listingType: 'sale',
    status: 'active',
    bedrooms: 4,
    bathrooms: 5,
    squareFeet: 3200,
    price: 85000000,
    pricePerSqFt: 26562,
    yearBuilt: 2020,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    ]),
    features: JSON.stringify(['Swimming Pool', 'Security', 'Parking', 'Generator', 'Gym']),
  },
  {
    title: 'Spacious 3-Bedroom Apartment in Victoria Island',
    description: 'Well-maintained apartment with ocean view, modern finishes, and access to gym and pool. Perfect for professionals and families.',
    addressLine1: '23 Ahmadu Bello Way',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '101241',
    country: 'Nigeria',
    latitude: '6.4281',
    longitude: '3.4219',
    propertyType: 'condo',
    listingType: 'sale',
    status: 'active',
    bedrooms: 3,
    bathrooms: 3,
    squareFeet: 1800,
    price: 45000000,
    pricePerSqFt: 25000,
    yearBuilt: 2018,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ]),
    features: JSON.stringify(['Ocean View', 'Gym', 'Pool', 'Security', 'Parking']),
  },
  {
    title: 'Modern 2-Bedroom Flat in Ikeja GRA',
    description: 'Newly renovated flat with contemporary design, fitted kitchen, and excellent security. Close to Ikeja City Mall and airport.',
    addressLine1: '45 Mobolaji Bank Anthony Way',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '100271',
    country: 'Nigeria',
    latitude: '6.5964',
    longitude: '3.3466',
    propertyType: 'condo',
    listingType: 'sale',
    status: 'active',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    price: 28000000,
    pricePerSqFt: 23333,
    yearBuilt: 2019,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ]),
    features: JSON.stringify(['Security', 'Parking', 'Generator']),
  },
  {
    title: '5-Bedroom Detached House in Ikoyi',
    description: 'Exquisite mansion with smart home features, private garden, staff quarters, and panoramic city views. Premium location in Old Ikoyi.',
    addressLine1: '12 Queens Drive',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '101233',
    country: 'Nigeria',
    latitude: '6.4541',
    longitude: '3.4316',
    propertyType: 'single_family',
    listingType: 'sale',
    status: 'active',
    bedrooms: 5,
    bathrooms: 6,
    squareFeet: 5000,
    price: 250000000,
    pricePerSqFt: 50000,
    yearBuilt: 2021,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ]),
    features: JSON.stringify(['Smart Home', 'Garden', 'Staff Quarters', 'Security', 'Parking', 'Generator', 'Pool']),
  },
  {
    title: 'Affordable 1-Bedroom Apartment in Yaba',
    description: 'Compact and efficient apartment perfect for young professionals. Close to tech hubs and universities.',
    addressLine1: '78 Herbert Macaulay Way',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '101245',
    country: 'Nigeria',
    latitude: '6.5092',
    longitude: '3.3758',
    propertyType: 'condo',
    listingType: 'sale',
    status: 'active',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 650,
    price: 15000000,
    pricePerSqFt: 23076,
    yearBuilt: 2017,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ]),
    features: JSON.stringify(['Security', 'Parking']),
  },
  {
    title: '3-Bedroom Terrace in Ajah',
    description: 'Modern terrace house in a gated estate with recreational facilities. Great for families seeking suburban lifestyle.',
    addressLine1: 'Estate Road',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '101245',
    country: 'Nigeria',
    latitude: '6.4698',
    longitude: '3.5852',
    propertyType: 'townhouse',
    listingType: 'sale',
    status: 'active',
    bedrooms: 3,
    bathrooms: 4,
    squareFeet: 1500,
    price: 35000000,
    pricePerSqFt: 23333,
    yearBuilt: 2019,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    ]),
    features: JSON.stringify(['Gated Estate', 'Security', 'Parking', 'Generator', 'Playground']),
  },
  {
    title: 'Commercial Office Space in Marina',
    description: 'Prime office space in the heart of Lagos business district. Fully serviced with backup power and high-speed internet.',
    addressLine1: '5 Broad Street',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '101241',
    country: 'Nigeria',
    latitude: '6.4541',
    longitude: '3.3947',
    propertyType: 'commercial',
    listingType: 'sale',
    status: 'active',
    bedrooms: 0,
    bathrooms: 4,
    squareFeet: 2500,
    price: 120000000,
    pricePerSqFt: 48000,
    yearBuilt: 2020,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    ]),
    features: JSON.stringify(['High-Speed Internet', 'Backup Power', 'Security', 'Parking', 'Elevator']),
  },
  {
    title: 'Luxury Penthouse in Banana Island',
    description: 'Ultra-luxury penthouse with breathtaking lagoon views, private elevator, infinity pool, and world-class finishes.',
    addressLine1: 'Ocean Parade',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '101241',
    country: 'Nigeria',
    latitude: '6.4281',
    longitude: '3.4319',
    propertyType: 'condo',
    listingType: 'sale',
    status: 'active',
    bedrooms: 6,
    bathrooms: 7,
    squareFeet: 7000,
    price: 500000000,
    pricePerSqFt: 71428,
    yearBuilt: 2022,
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ]),
    features: JSON.stringify(['Private Elevator', 'Infinity Pool', 'Lagoon View', 'Smart Home', 'Cinema', 'Gym', 'Security', 'Parking']),
  },
];

async function seedProperties() {
  console.log('🌱 Starting property seeding...\n');

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);

    console.log('✅ Database connected');

    // Check if properties already exist
    const [existingProperties] = await connection.execute(
      'SELECT COUNT(*) as count FROM properties'
    );
    
    const count = existingProperties[0].count;
    
    if (count > 0) {
      console.log(`\n⚠️  Database already has ${count} properties`);
      console.log('Adding sample properties anyway...\n');
    }

    // Insert properties
    console.log(`📝 Inserting ${sampleProperties.length} properties...\n`);

    for (const property of sampleProperties) {
      try {
        const [result] = await connection.execute(
          `INSERT INTO properties (
            title, description, addressLine1, city, state, zipCode, country,
            latitude, longitude, propertyType, listingType, status,
            bedrooms, bathrooms, squareFeet, price, pricePerSqFt,
            yearBuilt, images, features, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            property.title,
            property.description,
            property.addressLine1,
            property.city,
            property.state,
            property.zipCode,
            property.country,
            property.latitude,
            property.longitude,
            property.propertyType,
            property.listingType,
            property.status,
            property.bedrooms,
            property.bathrooms,
            property.squareFeet,
            property.price,
            property.pricePerSqFt,
            property.yearBuilt,
            property.images,
            property.features,
          ]
        );

        console.log(`✅ Added: ${property.title} (ID: ${result.insertId})`);
      } catch (error) {
        console.error(`❌ Failed to add ${property.title}:`, error.message);
      }
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total properties added: ${sampleProperties.length}`);
    console.log(`   - Price range: ₦${Math.min(...sampleProperties.map(p => p.price)).toLocaleString()} - ₦${Math.max(...sampleProperties.map(p => p.price)).toLocaleString()}`);
    console.log(`   - Property types: ${[...new Set(sampleProperties.map(p => p.propertyType))].join(', ')}`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

seedProperties();
