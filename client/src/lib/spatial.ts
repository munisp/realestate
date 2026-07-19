// @ts-nocheck
/**
 * Spatial Utilities Library (Turf.js)
 * 
 * Provides geospatial analysis functions for property search and visualization
 * Built on Turf.js - a powerful JavaScript library for spatial analysis
 * 
 * Features:
 * - Distance calculations
 * - Polygon search
 * - Buffer and radius search
 * - Nearest point finder
 * - Bounding box calculations
 * - Area calculations
 * - Spatial relationships
 */

import * as turf from '@turf/turf';
import type { Feature, Point, Polygon, FeatureCollection, Position } from 'geojson';

/**
 * Property interface for spatial operations
 */
export interface SpatialProperty {
  id: number;
  latitude: number | string;
  longitude: number | string;
  [key: string]: any;
}

/**
 * Distance Units
 */
export type DistanceUnit = 'meters' | 'kilometers' | 'miles' | 'feet';

/**
 * Calculate distance between two points
 * 
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @param units - Distance units (default: kilometers)
 * @returns Distance in specified units
 * 
 * @example
 * const distance = spatial.distance(6.5244, 3.3792, 6.6018, 3.3567);
 * // Returns: 8.7 (km)
 */
export function distance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  units: DistanceUnit = 'kilometers'
): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units });
}

/**
 * Find properties within a radius
 * 
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param radiusKm - Radius in kilometers
 * @param properties - Array of properties to search
 * @returns Properties within radius, sorted by distance
 * 
 * @example
 * const nearby = spatial.withinRadius(6.5244, 3.3792, 5, properties);
 * // Returns properties within 5km of center
 */
export function withinRadius<T extends SpatialProperty>(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  properties: T[]
): Array<T & { distance: number }> {
  const center = turf.point([centerLng, centerLat]);
  const buffer = turf.buffer(center, radiusKm, { units: 'kilometers' });

  const results = properties
    .map(p => {
      const point = turf.point([
        parseFloat(String(p.longitude)),
        parseFloat(String(p.latitude))
      ]);
      
      const isInside = turf.booleanPointInPolygon(point, buffer);
      const dist = turf.distance(center, point, { units: 'kilometers' });

      return {
        ...p,
        distance: dist,
        isInside,
      };
    })
    .filter(p => p.isInside)
    .sort((a, b) => a.distance - b.distance);

  return results;
}

/**
 * Find properties within a polygon
 * 
 * @param polygon - Polygon coordinates [[[lng, lat], ...]]
 * @param properties - Array of properties to search
 * @returns Properties within polygon
 * 
 * @example
 * const polygon = [[[3.35, 6.50], [3.40, 6.50], [3.40, 6.55], [3.35, 6.55], [3.35, 6.50]]];
 * const inArea = spatial.withinPolygon(polygon, properties);
 */
export function withinPolygon<T extends SpatialProperty>(
  polygon: Position[][],
  properties: T[]
): T[] {
  const turfPolygon = turf.polygon(polygon);

  return properties.filter(p => {
    const point = turf.point([
      parseFloat(String(p.longitude)),
      parseFloat(String(p.latitude))
    ]);
    return turf.booleanPointInPolygon(point, turfPolygon);
  });
}

/**
 * Find properties within a bounding box
 * 
 * @param bounds - Bounding box { north, south, east, west }
 * @param properties - Array of properties to search
 * @returns Properties within bounds
 * 
 * @example
 * const bounds = { north: 6.6, south: 6.4, east: 3.5, west: 3.2 };
 * const inBounds = spatial.withinBounds(bounds, properties);
 */
export function withinBounds<T extends SpatialProperty>(
  bounds: { north: number; south: number; east: number; west: number },
  properties: T[]
): T[] {
  const bbox = turf.bboxPolygon([
    bounds.west,
    bounds.south,
    bounds.east,
    bounds.north,
  ]);

  return properties.filter(p => {
    const point = turf.point([
      parseFloat(String(p.longitude)),
      parseFloat(String(p.latitude))
    ]);
    return turf.booleanPointInPolygon(point, bbox);
  });
}

/**
 * Find nearest property to a point
 * 
 * @param lat - Target latitude
 * @param lng - Target longitude
 * @param properties - Array of properties to search
 * @returns Nearest property with distance
 * 
 * @example
 * const nearest = spatial.nearest(6.5244, 3.3792, properties);
 * // Returns: { property: {...}, distance: 0.5 }
 */
export function nearest<T extends SpatialProperty>(
  lat: number,
  lng: number,
  properties: T[]
): { property: T; distance: number } | null {
  if (properties.length === 0) return null;

  const target = turf.point([lng, lat]);
  const points = turf.featureCollection(
    properties.map(p => turf.point(
      [parseFloat(String(p.longitude)), parseFloat(String(p.latitude))],
      p
    ))
  );

  const nearestPoint = turf.nearestPoint(target, points);
  const dist = turf.distance(target, nearestPoint, { units: 'kilometers' });

  return {
    property: nearestPoint.properties as T,
    distance: dist,
  };
}

/**
 * Find N nearest properties to a point
 * 
 * @param lat - Target latitude
 * @param lng - Target longitude
 * @param properties - Array of properties to search
 * @param count - Number of properties to return
 * @returns N nearest properties sorted by distance
 * 
 * @example
 * const nearest5 = spatial.nearestN(6.5244, 3.3792, properties, 5);
 */
export function nearestN<T extends SpatialProperty>(
  lat: number,
  lng: number,
  properties: T[],
  count: number
): Array<T & { distance: number }> {
  const target = turf.point([lng, lat]);

  const withDistances = properties.map(p => {
    const point = turf.point([
      parseFloat(String(p.longitude)),
      parseFloat(String(p.latitude))
    ]);
    const dist = turf.distance(target, point, { units: 'kilometers' });

    return {
      ...p,
      distance: dist,
    };
  });

  return withDistances
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/**
 * Calculate bounding box for properties
 * 
 * @param properties - Array of properties
 * @returns Bounding box [minLng, minLat, maxLng, maxLat]
 * 
 * @example
 * const bbox = spatial.bbox(properties);
 * // Returns: [3.2, 6.4, 3.5, 6.6]
 */
export function bbox<T extends SpatialProperty>(
  properties: T[]
): [number, number, number, number] {
  if (properties.length === 0) {
    return [0, 0, 0, 0];
  }

  const points = turf.featureCollection(
    properties.map(p => turf.point([
      parseFloat(String(p.longitude)),
      parseFloat(String(p.latitude))
    ]))
  );

  return turf.bbox(points) as [number, number, number, number];
}

/**
 * Calculate center point of properties
 * 
 * @param properties - Array of properties
 * @returns Center point { lat, lng }
 * 
 * @example
 * const center = spatial.center(properties);
 * // Returns: { lat: 6.5244, lng: 3.3792 }
 */
export function center<T extends SpatialProperty>(
  properties: T[]
): { lat: number; lng: number } {
  if (properties.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const points = turf.featureCollection(
    properties.map(p => turf.point([
      parseFloat(String(p.longitude)),
      parseFloat(String(p.latitude))
    ]))
  );

  const centerPoint = turf.center(points);
  const [lng, lat] = centerPoint.geometry.coordinates;

  return { lat, lng };
}

/**
 * Create a buffer around a point
 * 
 * @param lat - Center latitude
 * @param lng - Center longitude
 * @param radiusKm - Radius in kilometers
 * @returns Polygon representing buffer zone
 * 
 * @example
 * const buffer = spatial.createBuffer(6.5244, 3.3792, 5);
 * // Returns GeoJSON polygon
 */
export function createBuffer(
  lat: number,
  lng: number,
  radiusKm: number
): Feature<Polygon> {
  const point = turf.point([lng, lat]);
  return turf.buffer(point, radiusKm, { units: 'kilometers' }) as Feature<Polygon>;
}

/**
 * Create a buffer around a polygon
 * 
 * @param polygon - Polygon coordinates
 * @param distanceKm - Buffer distance in kilometers
 * @returns Buffered polygon
 * 
 * @example
 * const polygon = [[[3.35, 6.50], [3.40, 6.50], [3.40, 6.55], [3.35, 6.55], [3.35, 6.50]]];
 * const buffered = spatial.bufferPolygon(polygon, 1);
 */
export function bufferPolygon(
  polygon: Position[][],
  distanceKm: number
): Feature<Polygon> {
  const turfPolygon = turf.polygon(polygon);
  return turf.buffer(turfPolygon, distanceKm, { units: 'kilometers' }) as Feature<Polygon>;
}

/**
 * Calculate area of a polygon
 * 
 * @param polygon - Polygon coordinates
 * @returns Area in square kilometers
 * 
 * @example
 * const polygon = [[[3.35, 6.50], [3.40, 6.50], [3.40, 6.55], [3.35, 6.55], [3.35, 6.50]]];
 * const area = spatial.area(polygon);
 * // Returns: 30.5 (km²)
 */
export function area(polygon: Position[][]): number {
  const turfPolygon = turf.polygon(polygon);
  const areaMeters = turf.area(turfPolygon);
  return areaMeters / 1_000_000; // Convert to km²
}

/**
 * Find properties along a route (line)
 * 
 * @param route - Array of coordinates [[lng, lat], ...]
 * @param bufferKm - Buffer distance from route in kilometers
 * @param properties - Array of properties to search
 * @returns Properties along route
 * 
 * @example
 * const route = [[3.3792, 6.5244], [3.3567, 6.6018]];
 * const alongRoute = spatial.alongRoute(route, 1, properties);
 * // Returns properties within 1km of route
 */
export function alongRoute<T extends SpatialProperty>(
  route: Position[],
  bufferKm: number,
  properties: T[]
): T[] {
  const line = turf.lineString(route);
  const buffer = turf.buffer(line, bufferKm, { units: 'kilometers' });

  return properties.filter(p => {
    const point = turf.point([
      parseFloat(String(p.longitude)),
      parseFloat(String(p.latitude))
    ]);
    return turf.booleanPointInPolygon(point, buffer);
  });
}

/**
 * Check if a point is within a polygon
 * 
 * @param lat - Point latitude
 * @param lng - Point longitude
 * @param polygon - Polygon coordinates
 * @returns True if point is inside polygon
 * 
 * @example
 * const isInside = spatial.isPointInPolygon(6.5244, 3.3792, polygon);
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: Position[][]
): boolean {
  const point = turf.point([lng, lat]);
  const turfPolygon = turf.polygon(polygon);
  return turf.booleanPointInPolygon(point, turfPolygon);
}

/**
 * Calculate centroid of a polygon
 * 
 * @param polygon - Polygon coordinates
 * @returns Centroid { lat, lng }
 * 
 * @example
 * const centroid = spatial.centroid(polygon);
 * // Returns: { lat: 6.525, lng: 3.375 }
 */
export function centroid(polygon: Position[][]): { lat: number; lng: number } {
  const turfPolygon = turf.polygon(polygon);
  const center = turf.centroid(turfPolygon);
  const [lng, lat] = center.geometry.coordinates;
  return { lat, lng };
}

/**
 * Create a convex hull around properties
 * 
 * @param properties - Array of properties
 * @returns Polygon representing convex hull
 * 
 * @example
 * const hull = spatial.convexHull(properties);
 * // Returns smallest polygon containing all properties
 */
export function convexHull<T extends SpatialProperty>(
  properties: T[]
): Feature<Polygon> | null {
  if (properties.length < 3) return null;

  const points = turf.featureCollection(
    properties.map(p => turf.point([
      parseFloat(String(p.longitude)),
      parseFloat(String(p.latitude))
    ]))
  );

  return turf.convex(points) as Feature<Polygon>;
}

/**
 * Convert properties to GeoJSON FeatureCollection
 * 
 * @param properties - Array of properties
 * @returns GeoJSON FeatureCollection
 * 
 * @example
 * const geojson = spatial.toGeoJSON(properties);
 */
export function toGeoJSON<T extends SpatialProperty>(
  properties: T[]
): FeatureCollection<Point, T> {
  return turf.featureCollection(
    properties.map(p => turf.point(
      [parseFloat(String(p.longitude)), parseFloat(String(p.latitude))],
      p
    ))
  );
}

/**
 * Simplify a polygon (reduce number of points)
 * 
 * @param polygon - Polygon coordinates
 * @param tolerance - Simplification tolerance (0-1)
 * @returns Simplified polygon
 * 
 * @example
 * const simplified = spatial.simplifyPolygon(complexPolygon, 0.01);
 */
export function simplifyPolygon(
  polygon: Position[][],
  tolerance: number = 0.01
): Position[][] {
  const turfPolygon = turf.polygon(polygon);
  const simplified = turf.simplify(turfPolygon, { tolerance, highQuality: true });
  return simplified.geometry.coordinates;
}

/**
 * Calculate bearing between two points
 * 
 * @param lat1 - Start latitude
 * @param lng1 - Start longitude
 * @param lat2 - End latitude
 * @param lng2 - End longitude
 * @returns Bearing in degrees (0-360)
 * 
 * @example
 * const bearing = spatial.bearing(6.5244, 3.3792, 6.6018, 3.3567);
 * // Returns: 315 (NW direction)
 */
export function bearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.bearing(from, to);
}

/**
 * Calculate destination point given distance and bearing
 * 
 * @param lat - Start latitude
 * @param lng - Start longitude
 * @param distanceKm - Distance in kilometers
 * @param bearing - Bearing in degrees
 * @returns Destination point { lat, lng }
 * 
 * @example
 * const destination = spatial.destination(6.5244, 3.3792, 10, 45);
 * // Returns point 10km NE of start
 */
export function destination(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDegrees: number
): { lat: number; lng: number } {
  const point = turf.point([lng, lat]);
  const dest = turf.destination(point, distanceKm, bearingDegrees, { units: 'kilometers' });
  const [destLng, destLat] = dest.geometry.coordinates;
  return { lat: destLat, lng: destLng };
}

/**
 * Spatial utilities namespace
 */
export const spatial = {
  distance,
  withinRadius,
  withinPolygon,
  withinBounds,
  nearest,
  nearestN,
  bbox,
  center,
  createBuffer,
  bufferPolygon,
  area,
  alongRoute,
  isPointInPolygon,
  centroid,
  convexHull,
  toGeoJSON,
  simplifyPolygon,
  bearing,
  destination,
};

export default spatial;
