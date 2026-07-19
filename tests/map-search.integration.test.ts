import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';
import superjson from 'superjson';

/**
 * Integration tests for map search functionality
 * Tests the full stack: tRPC router -> database -> response
 */

const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000/api/trpc';

const trpc = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: TEST_SERVER_URL,
    }),
  ],
});

describe('Map Search Integration Tests', () => {
  describe('Circle Search', () => {
    it('should search properties within a circular boundary', async () => {
      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5244, lng: 3.3792 }, // Lagos, Nigeria
          radius: 5000, // 5km radius
        },
        filters: {
          minPrice: 50000000,
          maxPrice: 200000000,
        },
      });

      expect(result).toBeDefined();
      expect(result.properties).toBeInstanceOf(Array);
      expect(result.count).toBeGreaterThanOrEqual(0);

      // Verify all properties are within the radius
      if (result.properties.length > 0) {
        result.properties.forEach((property) => {
          expect(property.latitude).toBeDefined();
          expect(property.longitude).toBeDefined();

          // Calculate distance using Haversine formula
          const distance = calculateDistance(
            6.5244,
            3.3792,
            Number(property.latitude),
            Number(property.longitude)
          );

          expect(distance).toBeLessThanOrEqual(5); // 5km
        });
      }
    });

    it('should respect price filters in circle search', async () => {
      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5244, lng: 3.3792 },
          radius: 10000,
        },
        filters: {
          minPrice: 100000000,
          maxPrice: 150000000,
        },
      });

      result.properties.forEach((property) => {
        if (property.price) {
          expect(property.price).toBeGreaterThanOrEqual(100000000);
          expect(property.price).toBeLessThanOrEqual(150000000);
        }
      });
    });

    it('should respect bedroom filters in circle search', async () => {
      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5244, lng: 3.3792 },
          radius: 10000,
        },
        filters: {
          minBedrooms: 3,
        },
      });

      result.properties.forEach((property) => {
        if (property.bedrooms) {
          expect(property.bedrooms).toBeGreaterThanOrEqual(3);
        }
      });
    });
  });

  describe('Rectangle Search', () => {
    it('should search properties within a rectangular boundary', async () => {
      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'rectangle',
        boundaryData: {
          bounds: {
            north: 6.6,
            south: 6.4,
            east: 3.5,
            west: 3.3,
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.properties).toBeInstanceOf(Array);

      // Verify all properties are within bounds
      result.properties.forEach((property) => {
        const lat = Number(property.latitude);
        const lng = Number(property.longitude);

        expect(lat).toBeGreaterThanOrEqual(6.4);
        expect(lat).toBeLessThanOrEqual(6.6);
        expect(lng).toBeGreaterThanOrEqual(3.3);
        expect(lng).toBeLessThanOrEqual(3.5);
      });
    });

    it('should handle empty rectangle search results', async () => {
      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'rectangle',
        boundaryData: {
          bounds: {
            north: 0.1,
            south: 0.0,
            east: 0.1,
            west: 0.0,
          },
        },
      });

      expect(result.properties).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('Polygon Search', () => {
    it('should search properties within a polygon boundary', async () => {
      // Triangle polygon around Lagos
      const polygon = [
        { lat: 6.5, lng: 3.3 },
        { lat: 6.6, lng: 3.4 },
        { lat: 6.5, lng: 3.5 },
      ];

      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'polygon',
        boundaryData: {
          coordinates: polygon,
        },
      });

      expect(result).toBeDefined();
      expect(result.properties).toBeInstanceOf(Array);

      // Verify all properties are within polygon
      result.properties.forEach((property) => {
        const point = {
          lat: Number(property.latitude),
          lng: Number(property.longitude),
        };

        const isInside = isPointInPolygon(point, polygon);
        expect(isInside).toBe(true);
      });
    });

    it('should handle complex polygon shapes', async () => {
      // Pentagon polygon
      const polygon = [
        { lat: 6.5, lng: 3.35 },
        { lat: 6.55, lng: 3.38 },
        { lat: 6.54, lng: 3.42 },
        { lat: 6.48, lng: 3.41 },
        { lat: 6.47, lng: 3.37 },
      ];

      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'polygon',
        boundaryData: {
          coordinates: polygon,
        },
      });

      expect(result).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Heatmap Data', () => {
    it('should return heatmap points for density visualization', async () => {
      const result = await trpc.mapSearch.getHeatmapData.query({
        bounds: {
          north: 6.6,
          south: 6.4,
          east: 3.5,
          west: 3.3,
        },
        metric: 'density',
      });

      expect(result).toBeDefined();
      expect(result.points).toBeInstanceOf(Array);

      result.points.forEach((point) => {
        expect(point.lat).toBeDefined();
        expect(point.lng).toBeDefined();
        expect(point.weight).toBeDefined();
        expect(point.weight).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return price-based heatmap data', async () => {
      const result = await trpc.mapSearch.getHeatmapData.query({
        bounds: {
          north: 6.6,
          south: 6.4,
          east: 3.5,
          west: 3.3,
        },
        metric: 'price',
      });

      expect(result.points).toBeInstanceOf(Array);

      result.points.forEach((point) => {
        expect(point.weight).toBeGreaterThanOrEqual(0);
        // Price-based weight should be normalized
      });
    });

    it('should filter heatmap data by bounds', async () => {
      const result = await trpc.mapSearch.getHeatmapData.query({
        bounds: {
          north: 6.55,
          south: 6.45,
          east: 3.45,
          west: 3.35,
        },
        metric: 'density',
      });

      result.points.forEach((point) => {
        expect(point.lat).toBeGreaterThanOrEqual(6.45);
        expect(point.lat).toBeLessThanOrEqual(6.55);
        expect(point.lng).toBeGreaterThanOrEqual(3.35);
        expect(point.lng).toBeLessThanOrEqual(3.45);
      });
    });
  });

  describe('Combined Filters', () => {
    it('should apply multiple filters simultaneously', async () => {
      const result = await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5244, lng: 3.3792 },
          radius: 10000,
        },
        filters: {
          minPrice: 80000000,
          maxPrice: 120000000,
          minBedrooms: 3,
          minBathrooms: 2,
          propertyType: 'apartment',
          status: 'active',
        },
      });

      result.properties.forEach((property) => {
        // Verify all filters are applied
        if (property.price) {
          expect(property.price).toBeGreaterThanOrEqual(80000000);
          expect(property.price).toBeLessThanOrEqual(120000000);
        }
        if (property.bedrooms) {
          expect(property.bedrooms).toBeGreaterThanOrEqual(3);
        }
        if (property.bathrooms) {
          expect(property.bathrooms).toBeGreaterThanOrEqual(2);
        }
        expect(property.propertyType).toBe('apartment');
        expect(property.status).toBe('active');
      });
    });
  });

  describe('Performance', () => {
    it('should complete circle search within reasonable time', async () => {
      const startTime = Date.now();

      await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'circle',
        boundaryData: {
          center: { lat: 6.5244, lng: 3.3792 },
          radius: 20000,
        },
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    it('should complete polygon search within reasonable time', async () => {
      const startTime = Date.now();

      await trpc.mapSearch.searchWithinBoundary.query({
        boundaryType: 'polygon',
        boundaryData: {
          coordinates: [
            { lat: 6.4, lng: 3.3 },
            { lat: 6.6, lng: 3.3 },
            { lat: 6.6, lng: 3.5 },
            { lat: 6.4, lng: 3.5 },
          ],
        },
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });
});

// Helper functions

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 */
function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
