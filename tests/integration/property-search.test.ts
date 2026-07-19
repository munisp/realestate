import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../../server/routers';
import { getDb } from '../../server/db';

/**
 * Integration tests for property search functionality
 * Tests the complete flow from search to property details
 */

describe('Property Search Integration', () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available for testing');
    }
  });

  it('should search properties by location', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.properties.search({
      query: 'Lagos',
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should filter properties by price range', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.properties.search({
      query: '',
      priceMin: 1000000,
      priceMax: 5000000,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // All results should be within price range
    result.forEach((property: any) => {
      if (property.price) {
        expect(property.price).toBeGreaterThanOrEqual(1000000);
        expect(property.price).toBeLessThanOrEqual(5000000);
      }
    });
  });

  it('should filter properties by bedrooms', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.properties.search({
      query: '',
      bedrooms: 3,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // All results should have 3 bedrooms
    result.forEach((property: any) => {
      if (property.bedrooms !== undefined) {
        expect(property.bedrooms).toBe(3);
      }
    });
  });

  it('should get property by ID', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // First get a property from search
    const searchResults = await caller.properties.search({
      query: '',
      limit: 1,
    });

    if (searchResults.length > 0) {
      const propertyId = searchResults[0].id;
      
      const property = await caller.properties.getById({ id: propertyId });
      
      expect(property).toBeDefined();
      expect(property.id).toBe(propertyId);
    }
  });

  it('should handle empty search results gracefully', async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.properties.search({
      query: 'NonExistentLocation12345',
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
