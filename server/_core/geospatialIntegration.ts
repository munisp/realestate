/**
 * Enhanced Geospatial Integration
 * Integrates PostGIS database with geospatial-service for advanced spatial queries
 */

import { geospatialClient } from './serviceClients';

// ============================================================================
// Geospatial Integration Layer
// ============================================================================

export class GeospatialIntegration {
  /**
   * Index a property in the geospatial service
   */
  async indexProperty(property: {
    id: string;
    location: {
      lat: number;
      lng: number;
      address: string;
      city: string;
      state: string;
      zipCode: string;
    };
    features: {
      propertyType: string;
      price: number;
      bedrooms: number;
      bathrooms: number;
      sqft: number;
    };
  }): Promise<{
    indexed: boolean;
    h3Index: string;
  }> {
    try {
      // Call geospatial service to index property
      const result = await geospatialClient.post('/index/property', {
        propertyId: property.id,
        location: property.location,
        metadata: property.features,
      });

      console.log(`[Geospatial] Indexed property ${property.id} with H3 index ${result.h3Index}`);
      
      return {
        indexed: true,
        h3Index: result.h3Index,
      };
    } catch (error) {
      console.error('[Geospatial] Failed to index property:', error);
      return {
        indexed: false,
        h3Index: '',
      };
    }
  }

  /**
   * Search properties within radius
   */
  async searchNearby(params: {
    center: { lat: number; lng: number };
    radius: number; // meters
    filters?: {
      propertyType?: string[];
      priceRange?: { min: number; max: number };
      bedrooms?: number;
      bathrooms?: number;
    };
    limit?: number;
  }): Promise<{
    properties: Array<{
      id: string;
      location: { lat: number; lng: number };
      distance: number;
      h3Index: string;
      features: any;
    }>;
    total: number;
  }> {
    try {
      const result = await geospatialClient.searchNearby({
        center: params.center,
        radius: params.radius,
        filters: params.filters,
        limit: params.limit || 50,
      });

      return result;
    } catch (error) {
      console.error('[Geospatial] Search nearby failed:', error);
      return {
        properties: [],
        total: 0,
      };
    }
  }

  /**
   * Search properties within polygon
   */
  async searchWithinPolygon(params: {
    polygon: Array<{ lat: number; lng: number }>;
    filters?: any;
  }): Promise<{
    properties: Array<any>;
    total: number;
  }> {
    try {
      const result = await geospatialClient.searchPolygon(
        params.polygon,
        params.filters
      );

      return result;
    } catch (error) {
      console.error('[Geospatial] Polygon search failed:', error);
      return {
        properties: [],
        total: 0,
      };
    }
  }

  /**
   * Get heatmap data for price visualization
   */
  async getPriceHeatmap(params: {
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    resolution: number; // H3 resolution (1-15)
  }): Promise<{
    cells: Array<{
      h3Index: string;
      center: { lat: number; lng: number };
      averagePrice: number;
      propertyCount: number;
      pricePerSqft: number;
    }>;
    metadata: {
      resolution: number;
      totalCells: number;
    };
  }> {
    try {
      const result = await geospatialClient.getHeatmap(params.bounds, params.resolution);
      return result;
    } catch (error) {
      console.error('[Geospatial] Heatmap generation failed:', error);
      return {
        cells: [],
        metadata: {
          resolution: params.resolution,
          totalCells: 0,
        },
      };
    }
  }

  /**
   * Get neighborhood statistics
   */
  async getNeighborhoodStats(h3Index: string): Promise<{
    h3Index: string;
    propertyCount: number;
    averagePrice: number;
    medianPrice: number;
    pricePerSqft: number;
    demographics: {
      population?: number;
      medianIncome?: number;
      schools?: number;
      crimeRate?: number;
    };
    amenities: {
      restaurants: number;
      parks: number;
      transit: number;
      shopping: number;
    };
  }> {
    try {
      const result = await geospatialClient.getNeighborhoodStats(h3Index);
      return result;
    } catch (error) {
      console.error('[Geospatial] Failed to get neighborhood stats:', error);
      return {
        h3Index,
        propertyCount: 0,
        averagePrice: 0,
        medianPrice: 0,
        pricePerSqft: 0,
        demographics: {},
        amenities: {
          restaurants: 0,
          parks: 0,
          transit: 0,
          shopping: 0,
        },
      };
    }
  }

  /**
   * Calculate route between two points
   */
  async calculateRoute(params: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode?: 'driving' | 'walking' | 'transit' | 'bicycling';
  }): Promise<{
    distance: number; // meters
    duration: number; // seconds
    route: Array<{ lat: number; lng: number }>;
  }> {
    try {
      const result = await geospatialClient.post('/route/calculate', {
        origin: params.origin,
        destination: params.destination,
        mode: params.mode || 'driving',
      });

      return result;
    } catch (error) {
      console.error('[Geospatial] Route calculation failed:', error);
      return {
        distance: 0,
        duration: 0,
        route: [],
      };
    }
  }

  /**
   * Get isochrone (travel time polygon)
   */
  async getIsochrone(params: {
    center: { lat: number; lng: number };
    travelTime: number; // minutes
    mode?: 'driving' | 'walking' | 'transit' | 'bicycling';
  }): Promise<{
    polygon: Array<{ lat: number; lng: number }>;
    area: number; // square meters
  }> {
    try {
      const result = await geospatialClient.post('/isochrone', {
        center: params.center,
        travelTime: params.travelTime,
        mode: params.mode || 'driving',
      });

      return result;
    } catch (error) {
      console.error('[Geospatial] Isochrone generation failed:', error);
      return {
        polygon: [],
        area: 0,
      };
    }
  }

  /**
   * Geocode an address
   */
  async geocodeAddress(address: string): Promise<{
    lat: number;
    lng: number;
    formattedAddress: string;
    components: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  } | null> {
    try {
      const result = await geospatialClient.post('/geocode', { address });
      return result;
    } catch (error) {
      console.error('[Geospatial] Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates
   */
  async reverseGeocode(lat: number, lng: number): Promise<{
    address: string;
    components: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  } | null> {
    try {
      const result = await geospatialClient.post('/reverse-geocode', { lat, lng });
      return result;
    } catch (error) {
      console.error('[Geospatial] Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Get points of interest near a location
   */
  async getPointsOfInterest(params: {
    center: { lat: number; lng: number };
    radius: number; // meters
    types?: string[]; // e.g., ['restaurant', 'school', 'park']
    limit?: number;
  }): Promise<{
    pois: Array<{
      id: string;
      name: string;
      type: string;
      location: { lat: number; lng: number };
      distance: number;
      rating?: number;
    }>;
    total: number;
  }> {
    try {
      const result = await geospatialClient.post('/poi/search', {
        center: params.center,
        radius: params.radius,
        types: params.types,
        limit: params.limit || 50,
      });

      return result;
    } catch (error) {
      console.error('[Geospatial] POI search failed:', error);
      return {
        pois: [],
        total: 0,
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let geospatialIntegrationInstance: GeospatialIntegration | null = null;

export function getGeospatialIntegration(): GeospatialIntegration {
  if (!geospatialIntegrationInstance) {
    geospatialIntegrationInstance = new GeospatialIntegration();
  }
  return geospatialIntegrationInstance;
}

// Export singleton
export const geospatialIntegration = getGeospatialIntegration();
