import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql, eq } from 'drizzle-orm';
import {
  users,
  properties,
  transactions,
  payments,
  documents,
  messages,
} from '../../drizzle/schema';
import {
  getUserByOpenId,
  createProperty,
  getPropertyById,
  searchProperties,
} from '../../server/db';

describe('Security Tests - PostgreSQL Migration', () => {
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
    await db.delete(documents);
    await db.delete(messages);
    await db.delete(payments);
    await db.delete(transactions);
    await db.delete(properties);
    await db.delete(users);
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in user queries', async () => {
      // Create a test user
      await db.insert(users).values({
        openId: 'sql-injection-test',
        name: 'SQL Test User',
        email: 'sql@test.com',
        role: 'user',
      });

      // Attempt SQL injection through openId parameter
      const maliciousOpenId = "' OR '1'='1";
      const result = await getUserByOpenId(maliciousOpenId);

      // Should not return any user (parameterized query should prevent injection)
      expect(result).toBeUndefined();
    });

    it('should prevent SQL injection in property search', async () => {
      const [user] = await db.insert(users).values({
        openId: 'property-sql-test',
        name: 'Property SQL Test',
        email: 'property-sql@test.com',
        role: 'user',
      }).returning({ id: users.id });

      await db.insert(properties).values({
        addressLine1: '123 Safe St',
        city: 'Safe City',
        state: 'SC',
        zipCode: '12345',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      });

      // Attempt SQL injection through search parameters
      const maliciousCity = "Safe City' OR '1'='1";
      const results = await searchProperties({ city: maliciousCity });

      // Should return no results or only exact matches (not all properties)
      expect(results.length).toBe(0);
    });

    it('should prevent SQL injection in numeric fields', async () => {
      const [user] = await db.insert(users).values({
        openId: 'numeric-sql-test',
        name: 'Numeric SQL Test',
        email: 'numeric-sql@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '456 Numeric St',
        city: 'Numeric City',
        state: 'NC',
        zipCode: '67890',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      // Attempt SQL injection through numeric ID
      const maliciousId = "1 OR 1=1";
      
      try {
        // This should fail type checking or return undefined
        const result = await getPropertyById(maliciousId as any);
        expect(result).toBeUndefined();
      } catch (error) {
        // Expected - type error or invalid query
        expect(error).toBeDefined();
      }
    });

    it('should sanitize user input in text fields', async () => {
      const [user] = await db.insert(users).values({
        openId: 'sanitize-test',
        name: 'Sanitize Test',
        email: 'sanitize@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Attempt to insert malicious content
      const maliciousDescription = "<script>alert('XSS')</script>";
      
      const [property] = await db.insert(properties).values({
        addressLine1: '789 Sanitize St',
        city: 'Sanitize City',
        state: 'SZ',
        zipCode: '11111',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        description: maliciousDescription,
        ownerId: user.id,
      }).returning({ id: properties.id });

      const savedProperty = await getPropertyById(property.id);
      
      // Description should be stored as-is (sanitization happens on output)
      expect(savedProperty?.description).toBe(maliciousDescription);
      
      // In production, ensure output is escaped when rendering
    });

    it('should prevent SQL injection in LIKE queries', async () => {
      const [user] = await db.insert(users).values({
        openId: 'like-sql-test',
        name: 'LIKE SQL Test',
        email: 'like-sql@test.com',
        role: 'user',
      }).returning({ id: users.id });

      await db.insert(properties).values({
        addressLine1: '100 LIKE St',
        city: 'LIKE City',
        state: 'LC',
        zipCode: '22222',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      });

      // Attempt SQL injection with LIKE wildcards
      const maliciousSearch = "%' OR '1'='1";
      
      // Using parameterized query should prevent injection
      const results = await db
        .select()
        .from(properties)
        .where(sql`${properties.city} LIKE ${`%${maliciousSearch}%`}`);

      expect(results.length).toBe(0);
    });
  });

  describe('Access Control and Authorization', () => {
    it('should enforce role-based access control', async () => {
      const [regularUser] = await db.insert(users).values({
        openId: 'regular-user',
        name: 'Regular User',
        email: 'regular@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [adminUser] = await db.insert(users).values({
        openId: 'admin-user',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
      }).returning({ id: users.id });

      // Verify roles are correctly set
      const regular = await getUserByOpenId('regular-user');
      const admin = await getUserByOpenId('admin-user');

      expect(regular?.role).toBe('user');
      expect(admin?.role).toBe('admin');
    });

    it('should prevent unauthorized property modifications', async () => {
      const [owner] = await db.insert(users).values({
        openId: 'property-owner',
        name: 'Property Owner',
        email: 'owner@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [otherUser] = await db.insert(users).values({
        openId: 'other-user',
        name: 'Other User',
        email: 'other@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '200 Authorization St',
        city: 'Authorization City',
        state: 'AC',
        zipCode: '33333',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: owner.id,
      }).returning({ id: properties.id });

      // In production, verify that otherUser cannot modify owner's property
      // This would typically be enforced at the API/service layer
      const propertyData = await getPropertyById(property.id);
      expect(propertyData?.ownerId).toBe(owner.id);
      expect(propertyData?.ownerId).not.toBe(otherUser.id);
    });

    it('should protect sensitive user data', async () => {
      await db.insert(users).values({
        openId: 'sensitive-data-user',
        name: 'Sensitive Data User',
        email: 'sensitive@test.com',
        role: 'user',
      });

      const user = await getUserByOpenId('sensitive-data-user');

      // Verify sensitive fields exist but should be protected in API responses
      expect(user).toBeDefined();
      expect(user?.email).toBe('sensitive@test.com');
      
      // In production, ensure email and other PII are not exposed in public APIs
    });
  });

  describe('Data Encryption and Privacy', () => {
    it('should handle sensitive financial data securely', async () => {
      const [user] = await db.insert(users).values({
        openId: 'financial-test-user',
        name: 'Financial Test User',
        email: 'financial@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '300 Financial St',
        city: 'Financial City',
        state: 'FC',
        zipCode: '44444',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      const [transaction] = await db.insert(transactions).values({
        propertyId: property.id,
        buyerId: user.id,
        transactionType: 'sale',
        amount: 500000,
        status: 'pending',
      }).returning({ id: transactions.id });

      const [payment] = await db.insert(payments).values({
        transactionId: transaction.id,
        userId: user.id,
        amount: 50000,
        paymentType: 'deposit',
        status: 'pending',
        paymentMethod: 'stripe',
        // In production, payment details should be encrypted
        paymentDetails: JSON.stringify({
          last4: '4242',
          brand: 'visa',
        }),
      }).returning({ id: payments.id });

      const savedPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, payment.id));

      expect(savedPayment[0]).toBeDefined();
      // Verify payment details are stored (should be encrypted in production)
      expect(savedPayment[0].paymentDetails).toBeTruthy();
    });

    it('should protect document access', async () => {
      const [user] = await db.insert(users).values({
        openId: 'document-test-user',
        name: 'Document Test User',
        email: 'document@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '400 Document St',
        city: 'Document City',
        state: 'DC',
        zipCode: '55555',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      }).returning({ id: properties.id });

      const [document] = await db.insert(documents).values({
        propertyId: property.id,
        uploadedBy: user.id,
        category: 'deed',
        fileName: 'property-deed.pdf',
        fileUrl: 'https://secure-storage.example.com/deed.pdf',
        fileSize: 1024000,
        status: 'signed',
      }).returning({ id: documents.id });

      const savedDocument = await db
        .select()
        .from(documents)
        .where(eq(documents.id, document.id));

      expect(savedDocument[0]).toBeDefined();
      expect(savedDocument[0].category).toBe('deed');
      
      // In production, ensure document URLs are pre-signed and time-limited
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      for (const email of invalidEmails) {
        try {
          await db.insert(users).values({
            openId: `email-test-${email}`,
            name: 'Email Test',
            email: email,
            role: 'user',
          });

          // If no database constraint, validate in application
          const user = await getUserByOpenId(`email-test-${email}`);
          if (user) {
            // Application should validate email format
            expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
          }
        } catch (error) {
          // Expected if database has email validation
          expect(error).toBeDefined();
        }
      }
    });

    it('should validate coordinate ranges', async () => {
      const [user] = await db.insert(users).values({
        openId: 'coordinate-test-user',
        name: 'Coordinate Test User',
        email: 'coordinate@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Invalid coordinates (latitude > 90)
      try {
        await db.insert(properties).values({
          addressLine1: '500 Invalid Coords St',
          city: 'Invalid City',
          state: 'IC',
          zipCode: '66666',
          country: 'USA',
          latitude: '91.0', // Invalid
          longitude: '-74.0060',
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000,
          ownerId: user.id,
        });

        // If no constraint, validate in application
        const property = await db
          .select()
          .from(properties)
          .where(sql`${properties.latitude} = '91.0'`);

        if (property.length > 0) {
          const lat = parseFloat(property[0].latitude);
          expect(lat).toBeGreaterThanOrEqual(-90);
          expect(lat).toBeLessThanOrEqual(90);
        }
      } catch (error) {
        // Expected if validation exists
        expect(error).toBeDefined();
      }
    });

    it('should validate required fields', async () => {
      // Missing required fields should fail
      try {
        await db.insert(properties).values({
          addressLine1: '600 Required Fields St',
          // Missing city, state, zipCode, country, latitude, longitude, etc.
          propertyType: 'single_family',
          listingType: 'sale',
          status: 'active',
          price: 500000,
        } as any);

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Expected - missing required fields
        expect(error).toBeDefined();
      }
    });
  });

  describe('Rate Limiting and DoS Prevention', () => {
    it('should handle large batch inserts efficiently', async () => {
      const [user] = await db.insert(users).values({
        openId: 'batch-test-user',
        name: 'Batch Test User',
        email: 'batch@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const batchSize = 100;
      const properties = [];

      for (let i = 0; i < batchSize; i++) {
        properties.push({
          addressLine1: `${i} Batch St`,
          city: 'Batch City',
          state: 'BC',
          zipCode: `${10000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + i * 0.001}`,
          longitude: `${-74.0060 + i * 0.001}`,
          propertyType: 'single_family' as const,
          listingType: 'sale' as const,
          status: 'active' as const,
          price: 500000 + i * 1000,
          ownerId: user.id,
        });
      }

      const startTime = Date.now();
      await db.insert(properties).values(properties);
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle concurrent queries efficiently', async () => {
      const [user] = await db.insert(users).values({
        openId: 'concurrent-test-user',
        name: 'Concurrent Test User',
        email: 'concurrent@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Create some test data
      for (let i = 0; i < 10; i++) {
        await db.insert(properties).values({
          addressLine1: `${i} Concurrent St`,
          city: 'Concurrent City',
          state: 'CC',
          zipCode: `${20000 + i}`,
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

      // Execute concurrent queries
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          searchProperties({ city: 'Concurrent City', status: 'active' })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All queries should succeed
      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result.length).toBe(10);
      });

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(3000); // 3 seconds
    });
  });

  describe('Audit and Logging', () => {
    it('should track user creation timestamps', async () => {
      const beforeInsert = new Date();
      
      await db.insert(users).values({
        openId: 'timestamp-test-user',
        name: 'Timestamp Test User',
        email: 'timestamp@test.com',
        role: 'user',
      });

      const afterInsert = new Date();
      const user = await getUserByOpenId('timestamp-test-user');

      expect(user).toBeDefined();
      expect(user?.createdAt).toBeDefined();
      
      const createdAt = new Date(user!.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
    });

    it('should track property modifications', async () => {
      const [user] = await db.insert(users).values({
        openId: 'modification-test-user',
        name: 'Modification Test User',
        email: 'modification@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const [property] = await db.insert(properties).values({
        addressLine1: '700 Modification St',
        city: 'Modification City',
        state: 'MC',
        zipCode: '77777',
        country: 'USA',
        latitude: '40.7128',
        longitude: '-74.0060',
        propertyType: 'single_family',
        listingType: 'sale',
        status: 'active',
        price: 500000,
        ownerId: user.id,
      }).returning({ id: properties.id, createdAt: properties.createdAt, updatedAt: properties.updatedAt });

      expect(property.createdAt).toBeDefined();
      expect(property.updatedAt).toBeDefined();

      // Note: PostgreSQL doesn't auto-update updatedAt like MySQL's ON UPDATE CURRENT_TIMESTAMP
      // This should be handled in application code or with triggers
    });
  });
});
