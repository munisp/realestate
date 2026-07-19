import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
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
  createValuation,
  getPropertyValuations,
  createTransaction,
  getTransactionById,
  createPayment,
  getPaymentById,
  addFavorite,
  removeFavorite,
  getUserFavorites,
} from '../../server/db';

describe('Database Unit Tests - PostgreSQL Migration', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    // Use test database
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
    // Clean up test data before each test
    await db.delete(favorites);
    await db.delete(propertyViews);
    await db.delete(savedSearches);
    await db.delete(payments);
    await db.delete(transactions);
    await db.delete(valuations);
    await db.delete(properties);
    await db.delete(agents);
    await db.delete(users);
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const testUser = {
        openId: 'test-open-id-001',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
      };

      await upsertUser(testUser);

      const user = await getUserByOpenId('test-open-id-001');
      expect(user).toBeDefined();
      expect(user?.name).toBe('Test User');
      expect(user?.email).toBe('test@example.com');
      expect(user?.role).toBe('user');
    });

    it('should update existing user on upsert', async () => {
      const testUser = {
        openId: 'test-open-id-002',
        name: 'Original Name',
        email: 'original@example.com',
        role: 'user' as const,
      };

      await upsertUser(testUser);

      // Update the user
      await upsertUser({
        openId: 'test-open-id-002',
        name: 'Updated Name',
        email: 'updated@example.com',
      });

      const user = await getUserByOpenId('test-open-id-002');
      expect(user?.name).toBe('Updated Name');
      expect(user?.email).toBe('updated@example.com');
    });

    it('should handle user with null fields', async () => {
      const testUser = {
        openId: 'test-open-id-003',
        name: null,
        email: null,
        role: 'user' as const,
      };

      await upsertUser(testUser);

      const user = await getUserByOpenId('test-open-id-003');
      expect(user).toBeDefined();
      expect(user?.name).toBeNull();
      expect(user?.email).toBeNull();
    });
  });

  describe('Property Operations', () => {
    let testUserId: number;

    beforeEach(async () => {
      // Create a test user for property operations
      const [user] = await db.insert(users).values({
        openId: 'property-test-user',
        name: 'Property Test User',
        email: 'property@test.com',
        role: 'user',
      }).returning({ id: users.id });
      testUserId = user.id;
    });

    it('should create a new property', async () => {
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

      const property = await getPropertyById(propertyId);
      expect(property).toBeDefined();
      expect(property?.addressLine1).toBe('123 Test St');
      expect(property?.price).toBe(500000);
      expect(property?.propertyType).toBe('single_family');
    });

    it('should update property', async () => {
      const propertyData = {
        addressLine1: '456 Update St',
        city: 'Update City',
        state: 'UP',
        zipCode: '54321',
        country: 'USA',
        latitude: '34.0522',
        longitude: '-118.2437',
        propertyType: 'condo' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 350000,
        ownerId: testUserId,
      };

      const propertyId = await createProperty(propertyData);

      await updateProperty(propertyId, {
        price: 375000,
        status: 'pending' as const,
      });

      const property = await getPropertyById(propertyId);
      expect(property?.price).toBe(375000);
      expect(property?.status).toBe('pending');
    });

    it('should delete property', async () => {
      const propertyData = {
        addressLine1: '789 Delete St',
        city: 'Delete City',
        state: 'DL',
        zipCode: '99999',
        country: 'USA',
        latitude: '37.7749',
        longitude: '-122.4194',
        propertyType: 'townhouse' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 450000,
        ownerId: testUserId,
      };

      const propertyId = await createProperty(propertyData);
      await deleteProperty(propertyId);

      const property = await getPropertyById(propertyId);
      expect(property).toBeUndefined();
    });

    it('should search properties by filters', async () => {
      // Create multiple properties
      await createProperty({
        addressLine1: '100 Search St',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        country: 'USA',
        latitude: '47.6062',
        longitude: '-122.3321',
        propertyType: 'single_family' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 600000,
        bedrooms: 4,
        bathrooms: 3,
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
        propertyType: 'condo' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 400000,
        bedrooms: 2,
        bathrooms: 2,
        ownerId: testUserId,
      });

      const results = await searchProperties({
        city: 'Seattle',
        state: 'WA',
        status: 'active',
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(p => p.city === 'Seattle')).toBe(true);
      expect(results.every(p => p.status === 'active')).toBe(true);
    });

    it('should find nearby properties', async () => {
      // Create properties in a specific area
      await createProperty({
        addressLine1: '300 Nearby St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
        country: 'USA',
        latitude: '45.5155',
        longitude: '-122.6789',
        propertyType: 'single_family' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 550000,
        ownerId: testUserId,
      });

      const nearbyProps = await getNearbyProperties(45.5155, -122.6789, 10);
      expect(nearbyProps.length).toBeGreaterThan(0);
    });
  });

  describe('Valuation Operations', () => {
    let testPropertyId: number;

    beforeEach(async () => {
      const [user] = await db.insert(users).values({
        openId: 'valuation-test-user',
        name: 'Valuation Test User',
        email: 'valuation@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '400 Valuation St',
        city: 'Valuation City',
        state: 'VC',
        zipCode: '11111',
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

    it('should create valuation', async () => {
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

    it('should get property valuations', async () => {
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
    });
  });

  describe('Transaction and Payment Operations', () => {
    let testPropertyId: number;
    let testBuyerId: number;
    let testSellerId: number;

    beforeEach(async () => {
      const [buyer] = await db.insert(users).values({
        openId: 'buyer-test',
        name: 'Test Buyer',
        email: 'buyer@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [seller] = await db.insert(users).values({
        openId: 'seller-test',
        name: 'Test Seller',
        email: 'seller@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '500 Transaction St',
        city: 'Transaction City',
        state: 'TC',
        zipCode: '22222',
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

    it('should create transaction', async () => {
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

      const transaction = await getTransactionById(transactionId);
      expect(transaction).toBeDefined();
      expect(transaction?.amount).toBe(600000);
      expect(transaction?.status).toBe('pending');
    });

    it('should create payment for transaction', async () => {
      const transactionId = await createTransaction({
        propertyId: testPropertyId,
        buyerId: testBuyerId,
        sellerId: testSellerId,
        transactionType: 'sale' as const,
        amount: 600000,
        status: 'pending' as const,
      });

      const paymentData = {
        transactionId,
        userId: testBuyerId,
        amount: 60000, // 10% deposit
        paymentType: 'deposit' as const,
        status: 'pending' as const,
        paymentMethod: 'stripe',
      };

      const paymentId = await createPayment(paymentData);
      expect(paymentId).toBeGreaterThan(0);

      const payment = await getPaymentById(paymentId);
      expect(payment).toBeDefined();
      expect(payment?.amount).toBe(60000);
      expect(payment?.paymentType).toBe('deposit');
    });
  });

  describe('Favorites Operations', () => {
    let testUserId: number;
    let testPropertyId: number;

    beforeEach(async () => {
      const [user] = await db.insert(users).values({
        openId: 'favorites-test-user',
        name: 'Favorites Test User',
        email: 'favorites@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '600 Favorites St',
        city: 'Favorites City',
        state: 'FC',
        zipCode: '33333',
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

    it('should add favorite', async () => {
      const favoriteId = await addFavorite(testUserId, testPropertyId, 'Great location!');
      expect(favoriteId).toBeGreaterThan(0);

      const favorites = await getUserFavorites(testUserId);
      expect(favorites.length).toBe(1);
      expect(favorites[0].propertyId).toBe(testPropertyId);
    });

    it('should remove favorite', async () => {
      await addFavorite(testUserId, testPropertyId);
      await removeFavorite(testUserId, testPropertyId);

      const favorites = await getUserFavorites(testUserId);
      expect(favorites.length).toBe(0);
    });
  });

  describe('PostgreSQL-Specific Features', () => {
    it('should handle JSONB data type', async () => {
      const [user] = await db.insert(users).values({
        openId: 'jsonb-test-user',
        name: 'JSONB Test User',
        email: 'jsonb@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const propertyData = {
        addressLine1: '700 JSONB St',
        city: 'JSONB City',
        state: 'JB',
        zipCode: '44444',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 500000,
        ownerId: user.id,
        features: JSON.stringify(['pool', 'garage', 'garden']),
        images: JSON.stringify(['image1.jpg', 'image2.jpg']),
      };

      const propertyId = await createProperty(propertyData);
      const property = await getPropertyById(propertyId);

      expect(property).toBeDefined();
      expect(property?.features).toBeTruthy();
      const features = JSON.parse(property!.features!);
      expect(features).toContain('pool');
    });

    it('should handle case-sensitive queries', async () => {
      const [user] = await db.insert(users).values({
        openId: 'case-test-user',
        name: 'Case Test User',
        email: 'CASE@TEST.COM', // Uppercase email
        role: 'user',
      }).returning({ id: users.id });

      // PostgreSQL is case-sensitive by default
      const foundUser = await getUserByOpenId('case-test-user');
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('CASE@TEST.COM');
    });

    it('should handle concurrent inserts', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          upsertUser({
            openId: `concurrent-user-${i}`,
            name: `Concurrent User ${i}`,
            email: `concurrent${i}@test.com`,
            role: 'user',
          })
        );
      }

      await Promise.all(promises);

      // Verify all users were created
      for (let i = 0; i < 10; i++) {
        const user = await getUserByOpenId(`concurrent-user-${i}`);
        expect(user).toBeDefined();
      }
    });
  });
});
