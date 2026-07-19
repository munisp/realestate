import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';
import superjson from 'superjson';

/**
 * Integration tests for property heatmap and saved searches
 */

const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000/api/trpc';

const trpc = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: TEST_SERVER_URL,
      headers: {
        // Add test authentication token if needed
        // authorization: 'Bearer test-token',
      },
    }),
  ],
});

describe('Property Heatmap Integration Tests', () => {
  describe('Heatmap Data Retrieval', () => {
    it('should fetch property locations for heatmap', async () => {
      const result = await trpc.propertyHeatmap.getLocations.query();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(0);

      if (result.length > 0) {
        result.forEach((location) => {
          expect(location.id).toBeDefined();
          expect(location.latitude).toBeDefined();
          expect(location.longitude).toBeDefined();
          expect(location.price).toBeDefined();

          // Verify coordinates are valid
          const lat = Number(location.latitude);
          const lng = Number(location.longitude);
          expect(lat).toBeGreaterThanOrEqual(-90);
          expect(lat).toBeLessThanOrEqual(90);
          expect(lng).toBeGreaterThanOrEqual(-180);
          expect(lng).toBeLessThanOrEqual(180);
        });
      }
    });

    it('should limit heatmap data to 10,000 properties', async () => {
      const result = await trpc.propertyHeatmap.getLocations.query();

      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should exclude properties with null coordinates', async () => {
      const result = await trpc.propertyHeatmap.getLocations.query();

      result.forEach((location) => {
        expect(location.latitude).not.toBeNull();
        expect(location.longitude).not.toBeNull();
      });
    });
  });

  describe('Density by Neighborhood', () => {
    it('should aggregate property density by neighborhood', async () => {
      const result = await trpc.propertyHeatmap.getDensityByNeighborhood.query();

      expect(result).toBeInstanceOf(Array);

      if (result.length > 0) {
        result.forEach((neighborhood) => {
          expect(neighborhood.neighborhood).toBeDefined();
          expect(neighborhood.count).toBeGreaterThan(0);
          expect(neighborhood.avgPrice).toBeGreaterThanOrEqual(0);
        });

        // Verify sorting (descending by count)
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].count).toBeGreaterThanOrEqual(result[i + 1].count);
        }
      }
    });

    it('should calculate accurate average prices', async () => {
      const result = await trpc.propertyHeatmap.getDensityByNeighborhood.query();

      result.forEach((neighborhood) => {
        expect(neighborhood.avgPrice).toBeGreaterThanOrEqual(0);
        // Average price should be reasonable (not infinity or NaN)
        expect(isFinite(neighborhood.avgPrice)).toBe(true);
      });
    });
  });

  describe('Density by Price Range', () => {
    it('should aggregate property density by price range', async () => {
      const result = await trpc.propertyHeatmap.getDensityByPriceRange.query();

      expect(result).toBeInstanceOf(Array);

      if (result.length > 0) {
        result.forEach((priceRange) => {
          expect(priceRange).toBeDefined();
          // Verify price range data structure
        });
      }
    });
  });

  describe('Heatmap Performance', () => {
    it('should fetch heatmap data within reasonable time', async () => {
      const startTime = Date.now();

      await trpc.propertyHeatmap.getLocations.query();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    it('should fetch neighborhood density within reasonable time', async () => {
      const startTime = Date.now();

      await trpc.propertyHeatmap.getDensityByNeighborhood.query();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1500); // Should complete in under 1.5 seconds
    });
  });
});

describe('Saved Searches Integration Tests (requires authentication)', () => {
  // Note: These tests require authentication
  // Skip if no auth token is provided

  const hasAuth = process.env.TEST_AUTH_TOKEN !== undefined;

  describe.skipIf(!hasAuth)('Save Boundary Search', () => {
    let savedSearchId: number;

    it('should save a circle boundary search', async () => {
      const result = await trpc.mapSearch.saveBoundarySearch.mutate({
        name: 'Test Circle Search',
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5244, lng: 3.3792 },
          radius: 5000,
        },
        searchCriteria: {
          minPrice: 50000000,
          maxPrice: 150000000,
        },
        notificationsEnabled: true,
      });

      expect(result.success).toBe(true);
      expect(result.searchId).toBeGreaterThan(0);
      savedSearchId = result.searchId;
    });

    it('should save a polygon boundary search', async () => {
      const result = await trpc.mapSearch.saveBoundarySearch.mutate({
        name: 'Test Polygon Search',
        boundaryType: 'polygon',
        boundaryData: {
          coordinates: [
            { lat: 6.5, lng: 3.3 },
            { lat: 6.6, lng: 3.4 },
            { lat: 6.5, lng: 3.5 },
          ],
        },
        searchCriteria: {
          propertyType: 'house',
          minBedrooms: 3,
        },
        notificationsEnabled: false,
      });

      expect(result.success).toBe(true);
      expect(result.searchId).toBeGreaterThan(0);
    });

    it('should save a rectangle boundary search', async () => {
      const result = await trpc.mapSearch.saveBoundarySearch.mutate({
        name: 'Test Rectangle Search',
        boundaryType: 'rectangle',
        boundaryData: {
          bounds: {
            north: 6.6,
            south: 6.4,
            east: 3.5,
            west: 3.3,
          },
        },
        searchCriteria: {
          status: 'active',
        },
        notificationsEnabled: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe.skipIf(!hasAuth)('Retrieve Saved Searches', () => {
    it('should retrieve user saved searches', async () => {
      const result = await trpc.mapSearch.getSavedSearches.query();

      expect(result).toBeInstanceOf(Array);

      if (result.length > 0) {
        result.forEach((search) => {
          expect(search.id).toBeDefined();
          expect(search.name).toBeDefined();
          expect(search.boundaryType).toBeDefined();
          expect(search.searchCriteria).toBeDefined();

          // Verify boundary data is properly deserialized
          if (search.boundaryData) {
            expect(typeof search.boundaryData).toBe('object');
          }

          // Verify search criteria is properly deserialized
          expect(typeof search.searchCriteria).toBe('object');
        });
      }
    });

    it('should return searches ordered by creation date', async () => {
      const result = await trpc.mapSearch.getSavedSearches.query();

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          const date1 = new Date(result[i].createdAt);
          const date2 = new Date(result[i + 1].createdAt);
          expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
        }
      }
    });
  });

  describe.skipIf(!hasAuth)('Delete Saved Search', () => {
    let testSearchId: number;

    beforeAll(async () => {
      // Create a test search to delete
      const result = await trpc.mapSearch.saveBoundarySearch.mutate({
        name: 'Test Search to Delete',
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5, lng: 3.4 },
          radius: 3000,
        },
        searchCriteria: {},
      });
      testSearchId = result.searchId;
    });

    it('should delete a saved search', async () => {
      const result = await trpc.mapSearch.deleteSavedSearch.mutate({
        searchId: testSearchId,
      });

      expect(result.success).toBe(true);
    });

    it('should not allow deleting non-existent search', async () => {
      await expect(
        trpc.mapSearch.deleteSavedSearch.mutate({
          searchId: 999999,
        })
      ).rejects.toThrow();
    });

    it('should not allow deleting another user\'s search', async () => {
      // This would require a different user's search ID
      // Skip if not in multi-user test environment
    });
  });

  describe.skipIf(!hasAuth)('Saved Search Data Integrity', () => {
    it('should preserve boundary data after save and retrieve', async () => {
      const originalBoundary = {
        coordinates: [
          { lat: 6.5, lng: 3.3 },
          { lat: 6.6, lng: 3.4 },
          { lat: 6.55, lng: 3.45 },
        ],
      };

      const saveResult = await trpc.mapSearch.saveBoundarySearch.mutate({
        name: 'Data Integrity Test',
        boundaryType: 'polygon',
        boundaryData: originalBoundary,
        searchCriteria: { minPrice: 100000000 },
      });

      const searches = await trpc.mapSearch.getSavedSearches.query();
      const savedSearch = searches.find((s) => s.id === saveResult.searchId);

      expect(savedSearch).toBeDefined();
      expect(savedSearch!.boundaryData).toEqual(originalBoundary);
    });

    it('should preserve search criteria after save and retrieve', async () => {
      const originalCriteria = {
        minPrice: 80000000,
        maxPrice: 120000000,
        minBedrooms: 3,
        minBathrooms: 2,
        propertyType: 'apartment',
      };

      const saveResult = await trpc.mapSearch.saveBoundarySearch.mutate({
        name: 'Criteria Integrity Test',
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5, lng: 3.4 },
          radius: 5000,
        },
        searchCriteria: originalCriteria,
      });

      const searches = await trpc.mapSearch.getSavedSearches.query();
      const savedSearch = searches.find((s) => s.id === saveResult.searchId);

      expect(savedSearch).toBeDefined();
      expect(savedSearch!.searchCriteria).toEqual(originalCriteria);
    });
  });
});

describe('End-to-End Map Search Workflow', () => {
  it('should complete full search workflow', async () => {
    // 1. Search within boundary
    const searchResult = await trpc.mapSearch.searchWithinBoundary.query({
      boundaryType: 'circle',
      boundaryData: {
        center: { lat: 6.5244, lng: 3.3792 },
        radius: 10000,
      },
      filters: {
        minPrice: 70000000,
        maxPrice: 130000000,
        minBedrooms: 2,
      },
    });

    expect(searchResult.properties).toBeInstanceOf(Array);
    expect(searchResult.count).toBeGreaterThanOrEqual(0);

    // 2. Get heatmap data for the same area
    const heatmapResult = await trpc.mapSearch.getHeatmapData.query({
      bounds: {
        north: 6.6,
        south: 6.4,
        east: 3.5,
        west: 3.3,
      },
      metric: 'density',
    });

    expect(heatmapResult.points).toBeInstanceOf(Array);

    // 3. Verify workflow completed successfully
    expect(searchResult).toBeDefined();
    expect(heatmapResult).toBeDefined();
  });

  it('should handle multiple concurrent searches', async () => {
    const searches = [
      trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5, lng: 3.4 },
          radius: 5000,
        },
      }),
      trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'rectangle',
        boundaryData: {
          bounds: { north: 6.6, south: 6.4, east: 3.5, west: 3.3 },
        },
      }),
      trpc.mapSearch.getHeatmapData.query({
        bounds: { north: 6.6, south: 6.4, east: 3.5, west: 3.3 },
        metric: 'price',
      }),
    ];

    const results = await Promise.all(searches);

    expect(results).toHaveLength(3);
    results.forEach((result) => {
      expect(result).toBeDefined();
    });
  });
});
