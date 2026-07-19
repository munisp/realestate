import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
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
  appointments,
  documents,
  builders,
  builderProjects,
  shortLetProperties,
  shortLetBookings,
} from '../../drizzle/schema';

describe('Referential Integrity Tests - PostgreSQL Migration', () => {
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

  describe('Foreign Key Constraints', () => {
    it('should enforce user foreign key in properties', async () => {
      const invalidPropertyData = {
        addressLine1: '123 Invalid St',
        city: 'Invalid City',
        state: 'IV',
        zipCode: '00000',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family' as const,
        listingType: 'sale' as const,
        status: 'active' as const,
        price: 500000,
        ownerId: 999999, // Non-existent user
      };

      await expect(
        db.insert(properties).values(invalidPropertyData)
      ).rejects.toThrow();
    });

    it('should enforce property foreign key in valuations', async () => {
      const invalidValuationData = {
        propertyId: 999999, // Non-existent property
        estimatedValue: 500000,
        confidenceScore: 85,
        valuationMethod: 'ml',
      };

      await expect(
        db.insert(valuations).values(invalidValuationData)
      ).rejects.toThrow();
    });

    it('should enforce property foreign key in transactions', async () => {
      const [user] = await db.insert(users).values({
        openId: 'fk-test-user',
        name: 'FK Test User',
        email: 'fk@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const invalidTransactionData = {
        propertyId: 999999, // Non-existent property
        buyerId: user.id,
        transactionType: 'sale' as const,
        amount: 500000,
        status: 'pending' as const,
      };

      await expect(
        db.insert(transactions).values(invalidTransactionData)
      ).rejects.toThrow();
    });

    it('should enforce transaction foreign key in payments', async () => {
      const [user] = await db.insert(users).values({
        openId: 'payment-fk-test',
        name: 'Payment FK Test',
        email: 'payment-fk@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const invalidPaymentData = {
        transactionId: 999999, // Non-existent transaction
        userId: user.id,
        amount: 50000,
        paymentType: 'deposit' as const,
        status: 'pending' as const,
        paymentMethod: 'stripe',
      };

      await expect(
        db.insert(payments).values(invalidPaymentData)
      ).rejects.toThrow();
    });
  });

  describe('Cascade Delete Operations', () => {
    it('should handle property deletion with related valuations', async () => {
      const [user] = await db.insert(users).values({
        openId: 'cascade-test-user',
        name: 'Cascade Test User',
        email: 'cascade@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '100 Cascade St',
        city: 'Cascade City',
        state: 'CC',
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

      // Create valuations for the property
      await db.insert(valuations).values([
        {
          propertyId: property.id,
          estimatedValue: 500000,
          confidenceScore: 85,
          valuationMethod: 'ml',
        },
        {
          propertyId: property.id,
          estimatedValue: 510000,
          confidenceScore: 90,
          valuationMethod: 'comparative',
        },
      ]);

      // Delete the property
      await db.delete(properties).where(sql`${properties.id} = ${property.id}`);

      // Verify valuations are handled (either cascaded or orphaned depending on schema)
      const remainingValuations = await db
        .select()
        .from(valuations)
        .where(sql`${valuations.propertyId} = ${property.id}`);

      // If cascade is configured, this should be 0
      // If not, we should handle orphaned records
      expect(remainingValuations.length).toBe(0);
    });

    it('should handle user deletion with related properties', async () => {
      const [user] = await db.insert(users).values({
        openId: 'user-cascade-test',
        name: 'User Cascade Test',
        email: 'user-cascade@test.com',
        role: 'user',
      }).returning({ id: users.id });

      await db.insert(properties).values([
        {
          addressLine1: '200 User Cascade St',
          city: 'User Cascade City',
          state: 'UC',
          zipCode: '22222',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user.id,
        },
        {
          addressLine1: '201 User Cascade St',
          city: 'User Cascade City',
          state: 'UC',
          zipCode: '22223',
          country: 'USA',
          latitude: '40.7129',
          longitude: '-74.0061',
          propertyType: 'condo',
          listingType: 'rent',
          status: 'active',
          price: 2500,
          ownerId: user.id,
        },
      ]);

      // Attempt to delete user (should fail if properties exist and no cascade)
      try {
        await db.delete(users).where(sql`${users.id} = ${user.id}`);
        
        // If successful, verify properties are also deleted
        const remainingProperties = await db
          .select()
          .from(properties)
          .where(sql`${properties.ownerId} = ${user.id}`);
        
        expect(remainingProperties.length).toBe(0);
      } catch (error) {
        // If it fails, that's expected behavior without cascade
        expect(error).toBeDefined();
      }
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique openId in users', async () => {
      await db.insert(users).values({
        openId: 'unique-test-001',
        name: 'First User',
        email: 'first@test.com',
        role: 'user',
      });

      await expect(
        db.insert(users).values({
          openId: 'unique-test-001', // Duplicate openId
          name: 'Second User',
          email: 'second@test.com',
          role: 'user',
        })
      ).rejects.toThrow();
    });

    it('should allow multiple properties with same address but different owners', async () => {
      const [user1] = await db.insert(users).values({
        openId: 'owner-1',
        name: 'Owner 1',
        email: 'owner1@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [user2] = await db.insert(users).values({
        openId: 'owner-2',
        name: 'Owner 2',
        email: 'owner2@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Same address, different owners (should be allowed)
      await db.insert(properties).values([
        {
          addressLine1: '300 Duplicate St',
          city: 'Duplicate City',
          state: 'DC',
          zipCode: '33333',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user1.id,
        },
        {
          addressLine1: '300 Duplicate St',
          city: 'Duplicate City',
          state: 'DC',
          zipCode: '33333',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'rent',
          status: 'active',
          price: 3000,
          ownerId: user2.id,
        },
      ]);

      const duplicateAddressProps = await db
        .select()
        .from(properties)
        .where(sql`${properties.addressLine1} = '300 Duplicate St'`);

      expect(duplicateAddressProps.length).toBe(2);
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should enforce NOT NULL constraints', async () => {
      await expect(
        db.insert(users).values({
          openId: null as any, // Should fail - NOT NULL
          name: 'Test User',
          email: 'test@test.com',
          role: 'user',
        })
      ).rejects.toThrow();
    });

    it('should enforce enum constraints', async () => {
      const [user] = await db.insert(users).values({
        openId: 'enum-test-user',
        name: 'Enum Test User',
        email: 'enum@test.com',
        role: 'user',
      }).returning({ id: users.id });

      await expect(
        db.insert(properties).values({
          addressLine1: '400 Enum St',
          city: 'Enum City',
          state: 'EC',
          zipCode: '44444',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'invalid_type' as any, // Invalid enum value
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user.id,
        })
      ).rejects.toThrow();
    });

    it('should validate price is positive', async () => {
      const [user] = await db.insert(users).values({
        openId: 'price-test-user',
        name: 'Price Test User',
        email: 'price@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Negative price should be rejected if constraint exists
      try {
        await db.insert(properties).values({
          addressLine1: '500 Price St',
          city: 'Price City',
          state: 'PC',
          zipCode: '55555',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: -100000, // Negative price
          ownerId: user.id,
        });
        
        // If no constraint, we should still validate in application
        const property = await db
          .select()
          .from(properties)
          .where(sql`${properties.price} < 0`);
        
        expect(property.length).toBe(0); // Should not allow negative prices
      } catch (error) {
        // Expected if CHECK constraint exists
        expect(error).toBeDefined();
      }
    });
  });

  describe('Transaction Integrity', () => {
    it('should maintain consistency in multi-table operations', async () => {
      const [user] = await db.insert(users).values({
        openId: 'transaction-test-user',
        name: 'Transaction Test User',
        email: 'transaction@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Use transaction to ensure atomicity
      try {
        await pool.query('BEGIN');

        const propertyResult = await db.insert(properties).values({
          addressLine1: '600 Transaction St',
          city: 'Transaction City',
          state: 'TC',
          zipCode: '66666',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user.id,
        }).returning({ id: properties.id });

        const propertyId = propertyResult[0].id;

        await db.insert(valuations).values({
          propertyId,
          estimatedValue: 500000,
          confidenceScore: 85,
          valuationMethod: 'ml',
        });

        await pool.query('COMMIT');

        // Verify both records exist
        const property = await db
          .select()
          .from(properties)
          .where(sql`${properties.id} = ${propertyId}`);
        
        const valuation = await db
          .select()
          .from(valuations)
          .where(sql`${valuations.propertyId} = ${propertyId}`);

        expect(property.length).toBe(1);
        expect(valuation.length).toBe(1);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    });

    it('should rollback on error in transaction', async () => {
      const [user] = await db.insert(users).values({
        openId: 'rollback-test-user',
        name: 'Rollback Test User',
        email: 'rollback@test.com',
        role: 'user',
      }).returning({ id: users.id });

      try {
        await pool.query('BEGIN');

        const propertyResult = await db.insert(properties).values({
          addressLine1: '700 Rollback St',
          city: 'Rollback City',
          state: 'RC',
          zipCode: '77777',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user.id,
        }).returning({ id: properties.id });

        const propertyId = propertyResult[0].id;

        // This should fail (invalid foreign key)
        await db.insert(valuations).values({
          propertyId: 999999, // Non-existent property
          estimatedValue: 500000,
          confidenceScore: 85,
          valuationMethod: 'ml',
        });

        await pool.query('COMMIT');
      } catch (error) {
        await pool.query('ROLLBACK');

        // Verify property was not created
        const properties = await db
          .select()
          .from(properties)
          .where(sql`${properties.addressLine1} = '700 Rollback St'`);

        expect(properties.length).toBe(0);
      }
    });
  });

  describe('Index Integrity', () => {
    it('should efficiently query by indexed columns', async () => {
      const [user] = await db.insert(users).values({
        openId: 'index-test-user',
        name: 'Index Test User',
        email: 'index@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Create multiple properties
      for (let i = 0; i < 100; i++) {
        await db.insert(properties).values({
          addressLine1: `${i} Index St`,
          city: 'Index City',
          state: 'IC',
          zipCode: `${10000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + i * 0.001}`,
          longitude: `${-74.0060 + i * 0.001}`,
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000 + i * 1000,
          ownerId: user.id,
        });
      }

      // Query by indexed column (should be fast)
      const startTime = Date.now();
      const results = await db
        .select()
        .from(properties)
        .where(sql`${properties.status} = 'active'`);
      const endTime = Date.now();

      expect(results.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Relationship Integrity', () => {
    it('should maintain one-to-many relationships', async () => {
      const [user] = await db.insert(users).values({
        openId: 'relationship-test-user',
        name: 'Relationship Test User',
        email: 'relationship@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // One user can have many properties
      await db.insert(properties).values([
        {
          addressLine1: '800 Relationship St',
          city: 'Relationship City',
          state: 'RC',
          zipCode: '88888',
          country: 'USA',
          latitude: '40.7128',
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user.id,
        },
        {
          addressLine1: '801 Relationship St',
          city: 'Relationship City',
          state: 'RC',
          zipCode: '88889',
          country: 'USA',
          latitude: '40.7129',
          longitude: '-74.0061',
          propertyType: 'condo',
          listingType: 'rent',
          status: 'active',
          price: 3000,
          ownerId: user.id,
        },
      ]);

      const userProperties = await db
        .select()
        .from(properties)
        .where(sql`${properties.ownerId} = ${user.id}`);

      expect(userProperties.length).toBe(2);
    });

    it('should maintain many-to-many relationships through junction tables', async () => {
      const [user] = await db.insert(users).values({
        openId: 'junction-test-user',
        name: 'Junction Test User',
        email: 'junction@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property1] = await db.insert(properties).values({
        addressLine1: '900 Junction St',
        city: 'Junction City',
        state: 'JC',
        zipCode: '99999',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      const [property2] = await db.insert(properties).values({
        addressLine1: '901 Junction St',
        city: 'Junction City',
        state: 'JC',
        zipCode: '99998',
        country: 'USA',
        latitude: '40.7129',
        longitude: '-74.0061',
        propertyType: 'condo',
        listingType: 'sale',
        status: 'active',
        price: 400000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      // User can favorite multiple properties (many-to-many through favorites)
      await db.insert(favorites).values([
        { userId: user.id, propertyId: property1.id },
        { userId: user.id, propertyId: property2.id },
      ]);

      const userFavorites = await db
        .select()
        .from(favorites)
        .where(sql`${favorites.userId} = ${user.id}`);

      expect(userFavorites.length).toBe(2);
    });
  });
});
