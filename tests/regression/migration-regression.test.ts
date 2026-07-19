import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql, eq, and, desc } from 'drizzle-orm';
import {
  users,
  properties,
  valuations,
  transactions,
  payments,
  favorites,
  savedSearches,
  propertyViews,
  agents,
  messages,
  notifications,
  appointments,
  documents,
  builders,
  builderProjects,
  shortLetProperties,
  shortLetBookings,
} from '../../drizzle/schema';
import {
  upsertUser,
  getUserByOpenId,
  createProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
  searchProperties,
  getNearbyProperties,
  incrementPropertyViews,
  createValuation,
  getPropertyValuations,
  getLatestValuation,
  createTransaction,
  getTransactionById,
  getUserTransactions,
  updateTransaction,
  createPayment,
  getPaymentById,
  getTransactionPayments,
  updatePayment,
  addFavorite,
  removeFavorite,
  getUserFavorites,
} from '../../server/db';

describe('Regression Tests - MySQL to PostgreSQL Migration', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set');
    }

    pool = new Pool({ connectionString: testDbUrl });
    db = drizzle(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(shortLetBookings);
    await db.delete(shortLetProperties);
    await db.delete(builderProjects);
    await db.delete(builders);
    await db.delete(documents);
    await db.delete(appointments);
    await db.delete(notifications);
    await db.delete(messages);
    await db.delete(propertyViews);
    await db.delete(savedSearches);
    await db.delete(favorites);
    await db.delete(payments);
    await db.delete(transactions);
    await db.delete(valuations);
    await db.delete(properties);
    await db.delete(agents);
    await db.delete(users);
  });

  describe('User Management Regression', () => {
    it('should maintain user upsert functionality', async () => {
      // Test case from original MySQL implementation
      const user = {
        openId: 'test-user-001',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
      };

      await upsertUser(user);
      let savedUser = await getUserByOpenId('test-user-001');
      
      expect(savedUser).toBeDefined();
      expect(savedUser?.name).toBe('Test User');
      expect(savedUser?.email).toBe('test@example.com');

      // Update user
      await upsertUser({
        openId: 'test-user-001',
        name: 'Updated User',
        email: 'updated@example.com',
      });

      savedUser = await getUserByOpenId('test-user-001');
      expect(savedUser?.name).toBe('Updated User');
      expect(savedUser?.email).toBe('updated@example.com');
    });

    it('should maintain user role assignment', async () => {
      await upsertUser({
        openId: 'admin-user',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      });

      const user = await getUserByOpenId('admin-user');
      expect(user?.role).toBe('admin');
    });

    it('should handle user with null optional fields', async () => {
      await upsertUser({
        openId: 'minimal-user',
        name: null,
        email: null,
        role: 'user',
      });

      const user = await getUserByOpenId('minimal-user');
      expect(user).toBeDefined();
      expect(user?.name).toBeNull();
      expect(user?.email).toBeNull();
    });
  });

  describe('Property Management Regression', () => {
    let testUserId: number;

    beforeEach(async () => {
      const [user] = await db.insert(users).values({
        openId: 'property-test-user',
        name: 'Property Test User',
        email: 'property@test.com',
        role: 'user',
      }).returning({ id: users.id });
      testUserId = user.id;
    });

    it('should maintain property CRUD operations', async () => {
      // Create
      const propertyData = {
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 2000,
        ownerId: testUserId,
      };

      const propertyId = await createProperty(propertyData);
      expect(propertyId).toBeGreaterThan(0);

      // Read
      let property = await getPropertyById(propertyId);
      expect(property).toBeDefined();
      expect(property?.addressLine1).toBe('123 Test St');
      expect(property?.price).toBe(500000);

      // Update
      await updateProperty(propertyId, {
        price: 525000,
        status: 'pending',
      });

      property = await getPropertyById(propertyId);
      expect(property?.price).toBe(525000);
      expect(property?.status).toBe('pending');

      // Delete
      await deleteProperty(propertyId);
      property = await getPropertyById(propertyId);
      expect(property).toBeUndefined();
    });

    it('should maintain property search functionality', async () => {
      // Create multiple properties
      await createProperty({
        addressLine1: '100 Search St',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        country: 'USA',
        latitude: '47.6062',
        longitude: '-122.3321',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 600000,
        bedrooms: 4,
        ownerId: testUserId,
      });

      await createProperty({
        addressLine1: '200 Search St',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98102',
        country: 'USA',
        latitude: '47.6205',
        longitude: '-122.3493',
        propertyType: 'condo',
        listingType: 'sale',
        status: 'active',
        price: 400000,
        bedrooms: 2,
        ownerId: testUserId,
      });

      const results = await searchProperties({
        city: 'Seattle',
        state: 'WA',
        status: 'active',
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(p => p.city === 'Seattle')).toBe(true);
    });

    it('should maintain nearby properties functionality', async () => {
      await createProperty({
        addressLine1: '300 Nearby St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
        country: 'USA',
        latitude: '45.5155',
        longitude: '-122.6789',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 550000,
        ownerId: testUserId,
      });

      const nearby = await getNearbyProperties(45.5155, -122.6789, 10);
      expect(nearby.length).toBeGreaterThan(0);
    });

    it('should maintain property view counter', async () => {
      const propertyId = await createProperty({
        addressLine1: '400 Views St',
        city: 'Views City',
        state: 'VC',
        zipCode: '11111',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: testUserId,
      });

      let property = await getPropertyById(propertyId);
      const initialViews = property?.viewCount || 0;

      await incrementPropertyViews(propertyId);

      property = await getPropertyById(propertyId);
      expect(property?.viewCount).toBe(initialViews + 1);
    });
  });

  describe('Valuation Regression', () => {
    let testPropertyId: number;

    beforeEach(async () => {
      const [user] = await db.insert(users).values({
        openId: 'valuation-user',
        name: 'Valuation User',
        email: 'valuation@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '500 Valuation St',
        city: 'Valuation City',
        state: 'VC',
        zipCode: '22222',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      testPropertyId = property.id;
    });

    it('should maintain valuation creation', async () => {
      const valuationData = {
        propertyId: testPropertyId,
        estimatedValue: 525000,
        confidenceLower: 500000,
        confidenceUpper: 550000,
        confidenceScore: 85,
        valuationMethod: 'ml',
      };

      const valuationId = await createValuation(valuationData);
      expect(valuationId).toBeGreaterThan(0);
    });

    it('should maintain valuation retrieval', async () => {
      await createValuation({
        propertyId: testPropertyId,
        estimatedValue: 525000,
        confidenceScore: 85,
        valuationMethod: 'ml',
      });

      await createValuation({
        propertyId: testPropertyId,
        estimatedValue: 530000,
        confidenceScore: 90,
        valuationMethod: 'comparative',
      });

      const valuations = await getPropertyValuations(testPropertyId);
      expect(valuations.length).toBe(2);

      const latest = await getLatestValuation(testPropertyId);
      expect(latest).toBeDefined();
    });
  });

  describe('Transaction and Payment Regression', () => {
    let testPropertyId: number;
    let testBuyerId: number;
    let testSellerId: number;

    beforeEach(async () => {
      const [buyer] = await db.insert(users).values({
        openId: 'buyer',
        name: 'Buyer',
        email: 'buyer@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [seller] = await db.insert(users).values({
        openId: 'seller',
        name: 'Seller',
        email: 'seller@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '600 Transaction St',
        city: 'Transaction City',
        state: 'TC',
        zipCode: '33333',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 600000,
        ownerId: seller.id,
      }).returning({ id: properties.id });

      testBuyerId = buyer.id;
      testSellerId = seller.id;
      testPropertyId = property.id;
    });

    it('should maintain transaction CRUD operations', async () => {
      // Create
      const transactionData = {
        propertyId: testPropertyId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        transactionType: 'sale' as const,
        amount: 600000,
        status: 'pending' as const,
      };

      const transactionId = await createTransaction(transactionData);
      expect(transactionId).toBeGreaterThan(0);

      // Read
      let transaction = await getTransactionById(transactionId);
      expect(transaction).toBeDefined();
      expect(transaction?.amount).toBe(600000);
      expect(transaction?.status).toBe('pending');

      // Update
      await updateTransaction(transactionId, {
        status: 'in_progress',
      });

      transaction = await getTransactionById(transactionId);
      expect(transaction?.status).toBe('in_progress');

      // Get user transactions
      const userTransactions = await getUserTransactions(testBuyerId);
      expect(userTransactions.length).toBeGreaterThan(0);
    });

    it('should maintain payment operations', async () => {
      const transactionId = await createTransaction({
        propertyId: testPropertyId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        transactionType: 'sale',
        amount: 600000,
        status: 'pending',
      });

      // Create payment
      const paymentData = {
        transactionId,
        userId: testBuyerId,
        amount: 60000,
        paymentType: 'deposit' as const,
        status: 'pending' as const,
        paymentMethod: 'stripe',
      };

      const paymentId = await createPayment(paymentData);
      expect(paymentId).toBeGreaterThan(0);

      // Read payment
      let payment = await getPaymentById(paymentId);
      expect(payment).toBeDefined();
      expect(payment?.amount).toBe(60000);

      // Update payment
      await updatePayment(paymentId, {
        status: 'completed',
      });

      payment = await getPaymentById(paymentId);
      expect(payment?.status).toBe('completed');

      // Get transaction payments
      const payments = await getTransactionPayments(transactionId);
      expect(payments.length).toBe(1);
    });
  });

  describe('Favorites Regression', () => {
    let testUserId: number;
    let testPropertyId: number;

    beforeEach(async () => {
      const [user] = await db.insert(users).values({
        openId: 'favorites-user',
        name: 'Favorites User',
        email: 'favorites@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '700 Favorites St',
        city: 'Favorites City',
        state: 'FC',
        zipCode: '44444',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 450000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      testUserId = user.id;
      testPropertyId = property.id;
    });

    it('should maintain favorites operations', async () => {
      // Add favorite
      const favoriteId = await addFavorite(testUserId, testPropertyId, 'Great location!');
      expect(favoriteId).toBeGreaterThan(0);

      // Get favorites
      let favorites = await getUserFavorites(testUserId);
      expect(favorites.length).toBe(1);
      expect(favorites[0].propertyId).toBe(testPropertyId);

      // Remove favorite
      await removeFavorite(testUserId, testPropertyId);

      favorites = await getUserFavorites(testUserId);
      expect(favorites.length).toBe(0);
    });
  });

  describe('Data Type Compatibility', () => {
    it('should handle integer types correctly', async () => {
      const [user] = await db.insert(users).values({
        openId: 'integer-test',
        name: 'Integer Test',
        email: 'integer@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '800 Integer St',
        city: 'Integer City',
        state: 'IC',
        zipCode: '55555',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 2147483647, // Max 32-bit integer
        bedrooms: 10,
        bathrooms: 8,
        squareFeet: 10000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      const savedProperty = await getPropertyById(property.id);
      expect(savedProperty?.price).toBe(2147483647);
      expect(savedProperty?.bedrooms).toBe(10);
    });

    it('should handle varchar types correctly', async () => {
      const [user] = await db.insert(users).values({
        openId: 'varchar-test',
        name: 'A'.repeat(255), // Max varchar length
        email: 'varchar@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const savedUser = await getUserByOpenId('varchar-test');
      expect(savedUser?.name?.length).toBe(255);
    });

    it('should handle text types correctly', async () => {
      const [user] = await db.insert(users).values({
        openId: 'text-test',
        name: 'Text Test',
        email: 'text@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const longDescription = 'A'.repeat(10000); // Long text

      const [property] = await db.insert(properties).values({
        addressLine1: '900 Text St',
        city: 'Text City',
        state: 'TC',
        zipCode: '66666',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        description: longDescription,
        ownerId: user.id,
      }).returning({ id: properties.id });

      const savedProperty = await getPropertyById(property.id);
      expect(savedProperty?.description?.length).toBe(10000);
    });

    it('should handle timestamp types correctly', async () => {
      const now = new Date();

      const [user] = await db.insert(users).values({
        openId: 'timestamp-test',
        name: 'Timestamp Test',
        email: 'timestamp@test.com',
        role: 'user',
        lastSignedIn: now,
      }).returning({ id: users.id });

      const savedUser = await getUserByOpenId('timestamp-test');
      expect(savedUser?.lastSignedIn).toBeDefined();
      
      const savedTime = new Date(savedUser!.lastSignedIn);
      expect(Math.abs(savedTime.getTime() - now.getTime())).toBeLessThan(1000); // Within 1 second
    });

    it('should handle JSON types correctly', async () => {
      const [user] = await db.insert(users).values({
        openId: 'json-test',
        name: 'JSON Test',
        email: 'json@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const features = ['pool', 'garage', 'garden', 'fireplace'];
      const images = ['image1.jpg', 'image2.jpg', 'image3.jpg'];

      const [property] = await db.insert(properties).values({
        addressLine1: '1000 JSON St',
        city: 'JSON City',
        state: 'JC',
        zipCode: '77777',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        features: JSON.stringify(features),
        images: JSON.stringify(images),
        ownerId: user.id,
      }).returning({ id: properties.id });

      const savedProperty = await getPropertyById(property.id);
      expect(savedProperty?.features).toBeTruthy();
      
      const savedFeatures = JSON.parse(savedProperty!.features!);
      expect(savedFeatures).toEqual(features);
    });
  });

  describe('Enum Type Compatibility', () => {
    it('should handle all property type enums', async () => {
      const [user] = await db.insert(users).values({
        openId: 'enum-test',
        name: 'Enum Test',
        email: 'enum@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const propertyTypes = ['single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial'];

      for (const propertyType of propertyTypes) {
        const [property] = await db.insert(properties).values({
          addressLine1: `${propertyType} St`,
          city: 'Enum City',
          state: 'EC',
          zipCode: '88888',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: propertyType as any,
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user.id,
        }).returning({ id: properties.id });

        const savedProperty = await getPropertyById(property.id);
        expect(savedProperty?.propertyType).toBe(propertyType);
      }
    });

    it('should handle all status enums', async () => {
      const [user] = await db.insert(users).values({
        openId: 'status-enum-test',
        name: 'Status Enum Test',
        email: 'status-enum@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const statuses = ['active', 'pending', 'sold', 'off_market', 'archived'];

      for (const status of statuses) {
        const [property] = await db.insert(properties).values({
          addressLine1: `${status} St`,
          city: 'Status City',
          state: 'SC',
          zipCode: '99999',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: status as any,
          price: 500000,
          ownerId: user.id,
        }).returning({ id: properties.id });

        const savedProperty = await getPropertyById(property.id);
        expect(savedProperty?.status).toBe(status);
      }
    });
  });

  describe('Default Values', () => {
    it('should apply default values correctly', async () => {
      const [user] = await db.insert(users).values({
        openId: 'default-test',
        name: 'Default Test',
        email: 'default@test.com',
        // role not specified - should default to 'user'
      }).returning({ id: users.id, role: users.role });

      expect(user.role).toBe('user');
    });

    it('should apply property default values', async () => {
      const [user] = await db.insert(users).values({
        openId: 'property-default-test',
        name: 'Property Default Test',
        email: 'property-default@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '1100 Default St',
        city: 'Default City',
        state: 'DC',
        zipCode: '11111',
        // country not specified - should default to 'USA'
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        // status not specified - should default to 'active'
        price: 500000,
        ownerId: user.id,
        // viewCount not specified - should default to 0
      }).returning({ 
        id: properties.id, 
        country: properties.country, 
        status: properties.status,
        viewCount: properties.viewCount 
      });

      expect(property.country).toBe('USA');
      expect(property.status).toBe('active');
      expect(property.viewCount).toBe(0);
    });
  });
});
