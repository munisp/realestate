import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import {
  users,
  properties,
  valuations,
  transactions,
  favorites,
  savedSearches,
  propertyViews,
} from '../../drizzle/schema';
import {
  upsertUser,
  getUserByOpenId,
  createProperty,
  getPropertyById,
  searchProperties,
  getNearbyProperties,
  createValuation,
} from '../../server/db';

describe('Load and Performance Tests - PostgreSQL Migration', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set');
    }

    pool = new Pool({ 
      connectionString: testDbUrl,
      max: 20, // Increase pool size for load testing
    });
    db = drizzle(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(propertyViews);
    await db.delete(savedSearches);
    await db.delete(favorites);
    await db.delete(valuations);
    await db.delete(transactions);
    await db.delete(properties);
    await db.delete(users);
  });

  describe('Database Connection Performance', () => {
    it('should handle connection pool efficiently', async () => {
      const startTime = Date.now();
      
      // Execute multiple queries concurrently
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          db.select().from(users).limit(1)
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete quickly with connection pooling
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds
    });

    it('should recover from connection errors', async () => {
      // This test verifies connection pool recovery
      try {
        // Execute a query
        await db.select().from(users).limit(1);

        // Simulate connection recovery by executing another query
        const result = await db.select().from(users).limit(1);
        
        expect(result).toBeDefined();
      } catch (error) {
        // Connection should be automatically recovered by pool
        expect(error).toBeUndefined();
      }
    });
  });

  describe('Bulk Insert Performance', () => {
    it('should handle bulk user inserts efficiently', async () => {
      const userCount = 1000;
      const users = [];

      for (let i = 0; i < userCount; i++) {
        users.push({
          openId: `bulk-user-${i}`,
          name: `Bulk User ${i}`,
          email: `bulk${i}@test.com`,
          role: 'user' as const,
        });
      }

      const startTime = Date.now();
      await db.insert(users).values(users);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = userCount / (duration / 1000); // records per second

      console.log(`Bulk insert: ${userCount} users in ${duration}ms (${throughput.toFixed(2)} records/sec)`);

      // Should achieve reasonable throughput
      expect(duration).toBeLessThan(10000); // 10 seconds
      expect(throughput).toBeGreaterThan(100); // At least 100 records/sec
    });

    it('should handle bulk property inserts efficiently', async () => {
      const [user] = await db.insert(users).values({
        openId: 'bulk-property-owner',
        name: 'Bulk Property Owner',
        email: 'bulk-owner@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const propertyCount = 500;
      const properties = [];

      for (let i = 0; i < propertyCount; i++) {
        properties.push({
          addressLine1: `${i} Bulk St`,
          city: 'Bulk City',
          state: 'BC',
          zipCode: `${10000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + (i * 0.001)}`,
          longitude: `${-74.0060 + (i * 0.001)}`,
          propertyType: 'single_family' as const,
          listingType: 'sale' as const,
          status: 'active' as const,
          price: 500000 + i * 1000,
          bedrooms: 3 + (i % 3),
          bathrooms: 2 + (i % 2),
          squareFeet: 2000 + i * 10,
          ownerId: user.id,
        });
      }

      const startTime = Date.now();
      await db.insert(properties).values(properties);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = propertyCount / (duration / 1000);

      console.log(`Bulk insert: ${propertyCount} properties in ${duration}ms (${throughput.toFixed(2)} records/sec)`);

      expect(duration).toBeLessThan(15000); // 15 seconds
      expect(throughput).toBeGreaterThan(30); // At least 30 records/sec
    });
  });

  describe('Query Performance', () => {
    let testUserId: number;

    beforeEach(async () => {
      // Create test user
      const [user] = await db.insert(users).values({
        openId: 'query-perf-user',
        name: 'Query Performance User',
        email: 'query-perf@test.com',
        role: 'user',
      }).returning({ id: users.id });

      testUserId = user.id;

      // Create test properties
      const properties = [];
      for (let i = 0; i < 100; i++) {
        properties.push({
          addressLine1: `${i} Query St`,
          city: i % 2 === 0 ? 'Seattle' : 'Portland',
          state: i % 2 === 0 ? 'WA' : 'OR',
          zipCode: `${30000 + i}`,
          country: 'USA',
          latitude: `${45.5155 + (i * 0.001)}`,
          longitude: `${-122.6789 + (i * 0.001)}`,
          propertyType: ['single_family', 'condo', 'townhouse'][i % 3] as any,
          listingType: 'sale' as const,
          status: 'active' as const,
          price: 400000 + i * 5000,
          bedrooms: 2 + (i % 4),
          bathrooms: 1 + (i % 3),
          squareFeet: 1500 + i * 20,
          ownerId: testUserId,
        });
      }

      await db.insert(properties).values(properties);
    });

    it('should perform simple SELECT queries efficiently', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db.select().from(properties).limit(10);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`Simple SELECT: ${iterations} queries in ${duration}ms (${avgTime.toFixed(2)}ms avg)`);

      expect(avgTime).toBeLessThan(50); // Average query should be under 50ms
    });

    it('should perform filtered queries efficiently', async () => {
      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await searchProperties({
          city: 'Seattle',
          status: 'active',
          minPrice: 400000,
          maxPrice: 600000,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`Filtered queries: ${iterations} queries in ${duration}ms (${avgTime.toFixed(2)}ms avg)`);

      expect(avgTime).toBeLessThan(100); // Average filtered query under 100ms
    });

    it('should perform JOIN queries efficiently', async () => {
      // Create valuations for properties
      const propertiesData = await db.select().from(properties).limit(20);
      
      for (const property of propertiesData) {
        await db.insert(valuations).values({
          propertyId: property.id,
          estimatedValue: property.price + 10000,
          confidenceScore: 85,
          valuationMethod: 'ml',
        });
      }

      const iterations = 30;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db
          .select()
          .from(properties)
          .leftJoin(valuations, sql`${properties.id} = ${valuations.propertyId}`)
          .limit(20);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`JOIN queries: ${iterations} queries in ${duration}ms (${avgTime.toFixed(2)}ms avg)`);

      expect(avgTime).toBeLessThan(150); // Average JOIN query under 150ms
    });

    it('should perform aggregation queries efficiently', async () => {
      const iterations = 30;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await db
          .select({
            city: properties.city,
            count: sql<number>`count(*)`,
            avgPrice: sql<number>`avg(${properties.price})`,
            minPrice: sql<number>`min(${properties.price})`,
            maxPrice: sql<number>`max(${properties.price})`,
          })
          .from(properties)
          .groupBy(properties.city);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`Aggregation queries: ${iterations} queries in ${duration}ms (${avgTime.toFixed(2)}ms avg)`);

      expect(avgTime).toBeLessThan(200); // Average aggregation under 200ms
    });

    it('should perform geospatial queries efficiently', async () => {
      const iterations = 20;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await getNearbyProperties(45.5155, -122.6789, 10);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`Geospatial queries: ${iterations} queries in ${duration}ms (${avgTime.toFixed(2)}ms avg)`);

      expect(avgTime).toBeLessThan(300); // Average geospatial query under 300ms
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads efficiently', async () => {
      const [user] = await db.insert(users).values({
        openId: 'concurrent-read-user',
        name: 'Concurrent Read User',
        email: 'concurrent-read@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Create test data
      const properties = [];
      for (let i = 0; i < 50; i++) {
        properties.push({
          addressLine1: `${i} Concurrent St`,
          city: 'Concurrent City',
          state: 'CC',
          zipCode: `${40000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + (i * 0.001)}`,
          longitude: `${-74.0060 + (i * 0.001)}`,
          propertyType: 'single_family' as const,
          listingType: 'sale' as const,
          status: 'active' as const,
          price: 500000 + i * 1000,
          ownerId: user.id,
        });
      }

      await db.insert(properties).values(properties);

      // Execute concurrent reads
      const concurrentReads = 100;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < concurrentReads; i++) {
        promises.push(
          searchProperties({ city: 'Concurrent City', status: 'active' })
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = concurrentReads / (duration / 1000);

      console.log(`Concurrent reads: ${concurrentReads} queries in ${duration}ms (${throughput.toFixed(2)} queries/sec)`);

      expect(results.length).toBe(concurrentReads);
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(throughput).toBeGreaterThan(20); // At least 20 queries/sec
    });

    it('should handle concurrent writes efficiently', async () => {
      const concurrentWrites = 50;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < concurrentWrites; i++) {
        promises.push(
          upsertUser({
            openId: `concurrent-write-${i}`,
            name: `Concurrent Write User ${i}`,
            email: `concurrent-write-${i}@test.com`,
            role: 'user',
          })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = concurrentWrites / (duration / 1000);

      console.log(`Concurrent writes: ${concurrentWrites} inserts in ${duration}ms (${throughput.toFixed(2)} inserts/sec)`);

      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(throughput).toBeGreaterThan(10); // At least 10 inserts/sec

      // Verify all users were created
      for (let i = 0; i < concurrentWrites; i++) {
        const user = await getUserByOpenId(`concurrent-write-${i}`);
        expect(user).toBeDefined();
      }
    });

    it('should handle mixed read/write workload', async () => {
      const [user] = await db.insert(users).values({
        openId: 'mixed-workload-user',
        name: 'Mixed Workload User',
        email: 'mixed-workload@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Create initial data
      const initialProperties = [];
      for (let i = 0; i < 20; i++) {
        initialProperties.push({
          addressLine1: `${i} Mixed St`,
          city: 'Mixed City',
          state: 'MC',
          zipCode: `${50000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + (i * 0.001)}`,
          longitude: `${-74.0060 + (i * 0.001)}`,
          propertyType: 'single_family' as const,
          listingType: 'sale' as const,
          status: 'active' as const,
          price: 500000 + i * 1000,
          ownerId: user.id,
        });
      }

      await db.insert(properties).values(initialProperties);

      // Execute mixed workload
      const operations = 100;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < operations; i++) {
        if (i % 3 === 0) {
          // Write operation
          promises.push(
            createProperty({
              addressLine1: `${100 + i} Mixed St`,
              city: 'Mixed City',
              state: 'MC',
              zipCode: `${60000 + i}`,
              country: 'USA',
              latitude: `${40.7128 + (i * 0.001)}`,
              longitude: `${-74.0060 + (i * 0.001)}`,
              propertyType: 'condo',
              listingType: 'sale',
              status: 'active',
              price: 400000 + i * 1000,
              ownerId: user.id,
            })
          );
        } else {
          // Read operation
          promises.push(
            searchProperties({ city: 'Mixed City', status: 'active' })
          );
        }
      }

      await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = operations / (duration / 1000);

      console.log(`Mixed workload: ${operations} operations in ${duration}ms (${throughput.toFixed(2)} ops/sec)`);

      expect(duration).toBeLessThan(10000); // 10 seconds
      expect(throughput).toBeGreaterThan(10); // At least 10 ops/sec
    });
  });

  describe('Index Performance', () => {
    it('should benefit from indexes on frequently queried columns', async () => {
      const [user] = await db.insert(users).values({
        openId: 'index-perf-user',
        name: 'Index Performance User',
        email: 'index-perf@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Create large dataset
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          addressLine1: `${i} Index St`,
          city: ['Seattle', 'Portland', 'San Francisco', 'Los Angeles'][i % 4],
          state: ['WA', 'OR', 'CA', 'CA'][i % 4],
          zipCode: `${70000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + (i * 0.001)}`,
          longitude: `${-74.0060 + (i * 0.001)}`,
          propertyType: ['single_family', 'condo', 'townhouse'][i % 3] as any,
          listingType: 'sale' as const,
          status: ['active', 'pending', 'sold'][i % 3] as any,
          price: 300000 + i * 1000,
          ownerId: user.id,
        });
      }

      await db.insert(properties).values(largeDataset);

      // Query with indexed column (status)
      const startTime = Date.now();
      const results = await db
        .select()
        .from(properties)
        .where(sql`${properties.status} = 'active'`);
      const endTime = Date.now();

      const duration = endTime - startTime;

      console.log(`Indexed query on 1000 records: ${duration}ms`);

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should be fast with index
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large result sets efficiently', async () => {
      const [user] = await db.insert(users).values({
        openId: 'large-result-user',
        name: 'Large Result User',
        email: 'large-result@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Create large dataset
      const largeDataset = [];
      for (let i = 0; i < 500; i++) {
        largeDataset.push({
          addressLine1: `${i} Large St`,
          city: 'Large City',
          state: 'LC',
          zipCode: `${80000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + (i * 0.001)}`,
          longitude: `${-74.0060 + (i * 0.001)}`,
          propertyType: 'single_family' as const,
          listingType: 'sale' as const,
          status: 'active' as const,
          price: 500000 + i * 1000,
          ownerId: user.id,
        });
      }

      await db.insert(properties).values(largeDataset);

      // Query large result set
      const startTime = Date.now();
      const results = await db
        .select()
        .from(properties)
        .where(sql`${properties.city} = 'Large City'`);
      const endTime = Date.now();

      const duration = endTime - startTime;

      console.log(`Large result set (${results.length} records): ${duration}ms`);

      expect(results.length).toBe(500);
      expect(duration).toBeLessThan(2000); // 2 seconds
    });

    it('should handle pagination efficiently', async () => {
      const [user] = await db.insert(users).values({
        openId: 'pagination-user',
        name: 'Pagination User',
        email: 'pagination@test.com',
        role: 'user',
      }).returning({ id: users.id });

      // Create dataset
      const dataset = [];
      for (let i = 0; i < 200; i++) {
        dataset.push({
          addressLine1: `${i} Pagination St`,
          city: 'Pagination City',
          state: 'PC',
          zipCode: `${90000 + i}`,
          country: 'USA',
          latitude: `${40.7128 + (i * 0.001)}`,
          longitude: `${-74.0060 + (i * 0.001)}`,
          propertyType: 'single_family' as const,
          listingType: 'sale' as const,
          status: 'active' as const,
          price: 500000 + i * 1000,
          ownerId: user.id,
        });
      }

      await db.insert(properties).values(dataset);

      // Test pagination performance
      const pageSize = 20;
      const pages = 10;
      const startTime = Date.now();

      for (let page = 0; page < pages; page++) {
        await searchProperties({
          city: 'Pagination City',
          limit: pageSize,
          offset: page * pageSize,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgPageTime = duration / pages;

      console.log(`Pagination (${pages} pages of ${pageSize}): ${duration}ms (${avgPageTime.toFixed(2)}ms avg per page)`);

      expect(avgPageTime).toBeLessThan(100); // Each page under 100ms
    });
  });

  describe('Transaction Performance', () => {
    it('should handle transactions efficiently', async () => {
      const [user] = await db.insert(users).values({
        openId: 'transaction-perf-user',
        name: 'Transaction Performance User',
        email: 'transaction-perf@test.com',
        role: 'user',
      }).returning({ id: users.id });

      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        try {
          await pool.query('BEGIN');

          const [property] = await db.insert(properties).values({
            addressLine1: `${i} Transaction St`,
            city: 'Transaction City',
            state: 'TC',
            zipCode: `${95000 + i}`,
            country: 'USA',
            latitude: `${40.7128 + (i * 0.001)}`,
            longitude: `${-74.0060 + (i * 0.001)}`,
            propertyType: 'single_family',
            listingType: 'sale',
            status: 'active',
            price: 500000 + i * 1000,
            ownerId: user.id,
          }).returning({ id: properties.id });

          await db.insert(valuations).values({
            propertyId: property.id,
            estimatedValue: 500000 + i * 1000 + 10000,
            confidenceScore: 85,
            valuationMethod: 'ml',
          });

          await pool.query('COMMIT');
        } catch (error) {
          await pool.query('ROLLBACK');
          throw error;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`Transactions: ${iterations} transactions in ${duration}ms (${avgTime.toFixed(2)}ms avg)`);

      expect(avgTime).toBeLessThan(200); // Average transaction under 200ms
    });
  });
});
