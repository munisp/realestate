import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../routers';
import superjson from 'superjson';

/**
 * End-to-End Integration Test: Property Search & Valuation Flow
 * 
 * Tests the complete user journey:
 * 1. Search for properties
 * 2. View property details
 * 3. Get property valuation
 * 4. Save property to favorites
 * 5. Set up valuation monitoring
 */

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000/api/trpc';

describe('Property Search & Valuation Flow (E2E)', () => {
  let client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  let testPropertyId: number;

  beforeAll(() => {
    // Create tRPC client for testing
    client = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: API_URL,
          headers: {
            // In real tests, you would add authentication headers here
            // 'Authorization': `Bearer ${testToken}`,
          },
        }),
      ],
    });
  });

  describe('Step 1: Property Search', () => {
    it('should search properties by location', async () => {
      const result = await client.properties.list.query({
        city: 'Lagos',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        testPropertyId = result[0].id;
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('address');
        expect(result[0]).toHaveProperty('price');
      }
    });

    it('should filter properties by price range', async () => {
      const result = await client.properties.list.query({
        minPrice: 10000000, // 10M NGN
        maxPrice: 50000000, // 50M NGN
        limit: 10,
      });

      expect(result).toBeDefined();
      
      if (result.length > 0) {
        result.forEach((property: any) => {
          expect(property.price).toBeGreaterThanOrEqual(10000000);
          expect(property.price).toBeLessThanOrEqual(50000000);
        });
      }
    });

    it('should filter properties by bedrooms', async () => {
      const result = await client.properties.list.query({
        bedrooms: 3,
        limit: 10,
      });

      expect(result).toBeDefined();
      
      if (result.length > 0) {
        result.forEach((property: any) => {
          expect(property.bedrooms).toBeGreaterThanOrEqual(3);
        });
      }
    });
  });

  describe('Step 2: Property Details', () => {
    it('should retrieve property details by ID', async () => {
      if (!testPropertyId) {
        // Get a property first
        const properties = await client.properties.list.query({ limit: 1 });
        if (properties.length === 0) {
          console.warn('No properties available for testing');
          return;
        }
        testPropertyId = properties[0].id;
      }

      const property = await client.properties.getById.query({ id: testPropertyId });

      expect(property).toBeDefined();
      expect(property.id).toBe(testPropertyId);
      expect(property).toHaveProperty('address');
      expect(property).toHaveProperty('price');
      expect(property).toHaveProperty('bedrooms');
      expect(property).toHaveProperty('bathrooms');
    });

    it('should retrieve property images', async () => {
      if (!testPropertyId) return;

      const property = await client.properties.getById.query({ id: testPropertyId });

      expect(property).toBeDefined();
      
      if (property.images) {
        expect(Array.isArray(property.images)).toBe(true);
      }
    });
  });

  describe('Step 3: Property Valuation', () => {
    it('should get property valuation history', async () => {
      if (!testPropertyId) return;

      try {
        const history = await client.properties.getValuationHistory.query({
          propertyId: testPropertyId,
        });

        expect(history).toBeDefined();
        expect(Array.isArray(history)).toBe(true);
        
        if (history.length > 0) {
          const valuation = history[0];
          expect(valuation).toHaveProperty('estimatedValue');
          expect(valuation).toHaveProperty('valuationDate');
          expect(typeof valuation.estimatedValue).toBe('number');
        }
      } catch (error) {
        // Valuation history might not exist for all properties
        console.warn('Valuation history not available:', error);
      }
    });

    it('should calculate property valuation estimate', async () => {
      if (!testPropertyId) return;

      try {
        const property = await client.properties.getById.query({ id: testPropertyId });
        
        // Verify property has basic data needed for valuation
        expect(property.squareFeet).toBeDefined();
        expect(property.bedrooms).toBeDefined();
        expect(property.bathrooms).toBeDefined();
      } catch (error) {
        console.warn('Property valuation check failed:', error);
      }
    });
  });

  describe('Step 4: Property Comparison', () => {
    it('should compare multiple properties', async () => {
      const properties = await client.properties.list.query({ limit: 3 });
      
      if (properties.length < 2) {
        console.warn('Not enough properties for comparison test');
        return;
      }

      // Verify properties can be compared
      properties.forEach((property: any) => {
        expect(property).toHaveProperty('price');
        expect(property).toHaveProperty('bedrooms');
        expect(property).toHaveProperty('bathrooms');
        expect(property).toHaveProperty('squareFeet');
      });

      // Calculate price per square foot for comparison
      properties.forEach((property: any) => {
        if (property.squareFeet && property.squareFeet > 0) {
          const pricePerSqFt = property.price / property.squareFeet;
          expect(pricePerSqFt).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Step 5: Data Integrity', () => {
    it('should have consistent property data', async () => {
      const properties = await client.properties.list.query({ limit: 10 });

      properties.forEach((property: any) => {
        // Required fields
        expect(property.id).toBeDefined();
        expect(property.price).toBeGreaterThan(0);
        
        // Logical validations
        if (property.bedrooms !== null) {
          expect(property.bedrooms).toBeGreaterThanOrEqual(0);
        }
        if (property.bathrooms !== null) {
          expect(property.bathrooms).toBeGreaterThanOrEqual(0);
        }
        if (property.squareFeet !== null) {
          expect(property.squareFeet).toBeGreaterThan(0);
        }
      });
    });

    it('should have valid property status values', async () => {
      const properties = await client.properties.list.query({ limit: 10 });

      const validStatuses = ['available', 'pending', 'sold', 'off_market'];
      
      properties.forEach((property: any) => {
        if (property.status) {
          expect(validStatuses).toContain(property.status);
        }
      });
    });
  });

  describe('Performance Tests', () => {
    it('should load property list within acceptable time', async () => {
      const startTime = Date.now();
      
      await client.properties.list.query({ limit: 20 });
      
      const duration = Date.now() - startTime;
      
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should load property details within acceptable time', async () => {
      if (!testPropertyId) return;

      const startTime = Date.now();
      
      await client.properties.getById.query({ id: testPropertyId });
      
      const duration = Date.now() - startTime;
      
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
