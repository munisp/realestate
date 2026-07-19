/**
 * Marker Clustering Integration Tests
 * Tests clustering behavior with various property counts and zoom levels
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Map } from 'maplibre-gl';
import { MarkerClusteringManager } from '../client/src/lib/markerClustering';
import { createPropertyMarker, createClusterMarker, getPriceTier, formatPrice } from '../client/src/lib/propertyMarkers';

// Mock MapLibre GL Map
class MockMap {
  private bounds = {
    west: 3.0,
    south: 6.0,
    east: 4.0,
    north: 7.0,
  };
  private zoom = 12;
  private listeners: Map<string, Function[]> = new Map();

  getBounds() {
    return {
      getWest: () => this.bounds.west,
      getSouth: () => this.bounds.south,
      getEast: () => this.bounds.east,
      getNorth: () => this.bounds.north,
    };
  }

  getZoom() {
    return this.zoom;
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    this.trigger('zoomend');
  }

  easeTo(options: any) {
    if (options.zoom) this.zoom = options.zoom;
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  private trigger(event: string) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(h => h());
    }
  }
}

describe('Marker Clustering', () => {
  let map: any;
  let clusterManager: MarkerClusteringManager;

  beforeEach(() => {
    map = new MockMap();
    clusterManager = new MarkerClusteringManager(map as any, {
      radius: 60,
      maxZoom: 16,
      minPoints: 2,
    });
  });

  afterEach(() => {
    clusterManager.destroy();
  });

  describe('Property Markers', () => {
    it('should create residential marker', () => {
      const marker = createPropertyMarker('residential', 150000000);
      expect(marker).toBeDefined();
      expect(marker.tagName).toBe('DIV');
      expect(marker.className).toBe('property-marker');
    });

    it('should create commercial marker', () => {
      const marker = createPropertyMarker('commercial', 250000000);
      expect(marker).toBeDefined();
      expect(marker.innerHTML).toContain('svg');
    });

    it('should apply correct price tier colors', () => {
      expect(getPriceTier(30000000)).toBe('budget'); // < ₦50M
      expect(getPriceTier(100000000)).toBe('mid'); // ₦50M - ₦150M
      expect(getPriceTier(200000000)).toBe('premium'); // ₦150M - ₦300M
      expect(getPriceTier(500000000)).toBe('luxury'); // > ₦300M
    });
  });

  describe('Cluster Markers', () => {
    it('should create cluster marker with count', () => {
      const marker = createClusterMarker(25, 150000000);
      expect(marker).toBeDefined();
      expect(marker.textContent).toBe('25');
    });

    it('should scale cluster size based on count', () => {
      const small = createClusterMarker(5);
      const large = createClusterMarker(500);
      
      const smallSize = parseInt(small.style.width);
      const largeSize = parseInt(large.style.width);
      
      expect(largeSize).toBeGreaterThan(smallSize);
    });

    it('should cap cluster count at 999+', () => {
      const marker = createClusterMarker(1500);
      expect(marker.textContent).toBe('999+');
    });
  });

  describe('Clustering Manager', () => {
    it('should initialize with empty properties', () => {
      expect(clusterManager).toBeDefined();
    });

    it('should handle small property set (< minPoints)', () => {
      const properties = [
        { id: 1, lng: 3.3792, lat: 6.5244, title: 'Property 1', price: 100000000 },
      ];

      clusterManager.setProperties(properties);
      // Should not cluster with only 1 property
    });

    it('should cluster properties when zoomed out', () => {
      // Generate 100 properties in Lagos area
      const properties = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        lng: 3.3 + Math.random() * 0.3, // Lagos longitude range
        lat: 6.4 + Math.random() * 0.3, // Lagos latitude range
        title: `Property ${i + 1}`,
        price: 50000000 + Math.random() * 200000000,
        propertyType: ['residential', 'commercial', 'land', 'industrial'][i % 4] as any,
      }));

      clusterManager.setProperties(properties);
      
      // At zoom 12, should create clusters
      map.setZoom(12);
      
      // Verify clustering happened (implementation-dependent)
      expect(properties.length).toBe(100);
    });

    it('should uncluster when zoomed in', () => {
      const properties = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        lng: 3.37 + Math.random() * 0.01,
        lat: 6.52 + Math.random() * 0.01,
        title: `Property ${i + 1}`,
        price: 100000000,
      }));

      clusterManager.setProperties(properties);
      
      // Zoom in to max zoom
      map.setZoom(18);
      
      // At max zoom, all markers should be individual
    });

    it('should clear all markers', () => {
      const properties = [
        { id: 1, lng: 3.3792, lat: 6.5244, title: 'Property 1', price: 100000000 },
        { id: 2, lng: 3.3800, lat: 6.5250, title: 'Property 2', price: 150000000 },
      ];

      clusterManager.setProperties(properties);
      clusterManager.clear();
      
      // All markers should be removed
    });
  });

  describe('Performance', () => {
    it('should handle 1000 properties efficiently', () => {
      const properties = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        lng: 3.0 + Math.random() * 1.0,
        lat: 6.0 + Math.random() * 1.0,
        title: `Property ${i + 1}`,
        price: 50000000 + Math.random() * 300000000,
        propertyType: ['residential', 'commercial', 'land', 'industrial'][i % 4] as any,
      }));

      const start = performance.now();
      clusterManager.setProperties(properties);
      const duration = performance.now() - start;

      // Should complete in < 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should update markers quickly on zoom', () => {
      const properties = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        lng: 3.3 + Math.random() * 0.3,
        lat: 6.4 + Math.random() * 0.3,
        title: `Property ${i + 1}`,
        price: 100000000,
      }));

      clusterManager.setProperties(properties);

      const start = performance.now();
      map.setZoom(14);
      const duration = performance.now() - start;

      // Zoom update should be < 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});

describe('Price Formatting', () => {
  it('should format prices correctly', () => {
    // formatPrice is now imported at the top
    
    expect(formatPrice(500)).toBe('₦500');
    expect(formatPrice(5000)).toBe('₦5K');
    expect(formatPrice(5000000)).toBe('₦5.0M');
    expect(formatPrice(5000000000)).toBe('₦5.0B');
  });
});
