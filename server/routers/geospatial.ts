/**
 * Geospatial tRPC Router
 *
 * Exposes all spatial query capabilities as tRPC procedures:
 * - geospatial.radiusSearch        — find properties within N metres
 * - geospatial.polygonSearch       — find properties within drawn polygon
 * - geospatial.bboxSearch          — find properties in map viewport
 * - geospatial.isochrone           — compute travel-time polygon
 * - geospatial.geocode             — address → lat/lng (Nominatim)
 * - geospatial.reverseGeocode      — lat/lng → address
 * - geospatial.clusters            — H3 hexagonal clusters for viewport
 * - geospatial.priceHeatmap        — price heatmap points for viewport
 * - geospatial.nearest             — K nearest properties
 * - geospatial.boundaryLookup      — Nigerian LGA/ward for a point
 * - geospatial.isochroneProperties — properties within travel-time polygon
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { spatialQueryEngine } from '../services/geospatial/SpatialQueryEngine';
import { logger } from '../_core/logger';

const LatLngSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const BboxSchema = z.object({
  north: z.number(), south: z.number(), east: z.number(), west: z.number(),
});
const SpatialFilterSchema = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  propertyType: z.string().optional(),
  bedrooms: z.number().int().optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

export const geospatialRouter = router({

  // ── Radius Search ──────────────────────────────────────────────────────────
  radiusSearch: publicProcedure
    .input(z.object({
      center: LatLngSchema,
      radiusMetres: z.number().int().min(100).max(100000).default(5000),
      ...SpatialFilterSchema.shape,
    }))
    .query(async ({ input }) => {
      logger.info('[geospatial] radiusSearch', { center: input.center, radius: input.radiusMetres });
      return spatialQueryEngine.searchByRadius(input);
    }),

  // ── Polygon Search ─────────────────────────────────────────────────────────
  polygonSearch: publicProcedure
    .input(z.object({
      polygon: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.array(z.array(z.array(z.number()))),
      }),
      ...SpatialFilterSchema.shape,
    }))
    .query(async ({ input }) => {
      const { polygon, ...filter } = input;
      logger.info('[geospatial] polygonSearch');
      return spatialQueryEngine.searchByPolygon(polygon as any, filter);
    }),

  // ── Bounding Box Search ────────────────────────────────────────────────────
  bboxSearch: publicProcedure
    .input(z.object({
      bbox: BboxSchema,
      ...SpatialFilterSchema.shape,
    }))
    .query(async ({ input }) => {
      const { bbox, ...filter } = input;
      return spatialQueryEngine.searchByBbox(bbox, filter);
    }),

  // ── Isochrone ──────────────────────────────────────────────────────────────
  isochrone: publicProcedure
    .input(z.object({
      origin: LatLngSchema,
      durationMins: z.number().int().min(5).max(120).default(30),
      mode: z.enum(['driving', 'walking', 'cycling', 'transit']).default('driving'),
    }))
    .query(async ({ input }) => {
      logger.info('[geospatial] isochrone', { origin: input.origin, duration: input.durationMins, mode: input.mode });
      return spatialQueryEngine.getIsochrone(input.origin, input.durationMins, input.mode);
    }),

  // ── Properties within isochrone ────────────────────────────────────────────
  isochroneProperties: publicProcedure
    .input(z.object({
      origin: LatLngSchema,
      durationMins: z.number().int().min(5).max(120).default(30),
      mode: z.enum(['driving', 'walking', 'cycling', 'transit']).default('driving'),
      ...SpatialFilterSchema.shape,
    }))
    .query(async ({ input }) => {
      const { origin, durationMins, mode, ...filter } = input;
      const isochrone = await spatialQueryEngine.getIsochrone(origin, durationMins, mode);
      const properties = await spatialQueryEngine.searchByPolygon(isochrone.polygon, filter);
      return { isochrone, properties, count: properties.length };
    }),

  // ── Geocoding ──────────────────────────────────────────────────────────────
  geocode: publicProcedure
    .input(z.object({ query: z.string().min(3).max(500) }))
    .query(async ({ input }) => {
      return spatialQueryEngine.geocode(input.query);
    }),

  // ── Reverse Geocoding ──────────────────────────────────────────────────────
  reverseGeocode: publicProcedure
    .input(LatLngSchema)
    .query(async ({ input }) => {
      return spatialQueryEngine.reverseGeocode(input.lat, input.lng);
    }),

  // ── H3 Clusters ────────────────────────────────────────────────────────────
  clusters: publicProcedure
    .input(z.object({ bbox: BboxSchema, zoom: z.number().min(1).max(22) }))
    .query(async ({ input }) => {
      return spatialQueryEngine.getH3Clusters(input.bbox, input.zoom);
    }),

  // ── Price Heatmap ──────────────────────────────────────────────────────────
  priceHeatmap: publicProcedure
    .input(z.object({ bbox: BboxSchema }))
    .query(async ({ input }) => {
      return spatialQueryEngine.getPriceHeatmap(input.bbox);
    }),

  // ── Nearest Properties ─────────────────────────────────────────────────────
  nearest: publicProcedure
    .input(z.object({ origin: LatLngSchema, limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      return spatialQueryEngine.findNearest(input.origin, input.limit);
    }),

  // ── Nigerian Boundary Lookup ───────────────────────────────────────────────
  boundaryLookup: publicProcedure
    .input(LatLngSchema)
    .query(async ({ input }) => {
      return spatialQueryEngine.getBoundaryForPoint(input.lat, input.lng);
    }),

  // ── Commute Analysis ───────────────────────────────────────────────────────
  commuteAnalysis: publicProcedure
    .input(z.object({
      propertyLocation: LatLngSchema,
      destinations: z.array(z.object({
        name: z.string(),
        lat: z.number(),
        lng: z.number(),
      })).max(5),
      mode: z.enum(['driving', 'walking', 'cycling', 'transit']).default('driving'),
    }))
    .query(async ({ input }) => {
      const results = await Promise.all(
        input.destinations.map(async dest => {
          // Compute straight-line distance as baseline
          const R = 6371000;
          const dLat = (dest.lat - input.propertyLocation.lat) * Math.PI / 180;
          const dLng = (dest.lng - input.propertyLocation.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(input.propertyLocation.lat * Math.PI / 180) *
            Math.cos(dest.lat * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
          const distanceMetres = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          // Estimate travel time based on mode and Lagos traffic
          const speedKmh: Record<string, number> = {
            driving: 20, // Lagos traffic
            walking: 5,
            cycling: 12,
            transit: 15,
          };
          const estimatedMins = Math.round((distanceMetres / 1000) / speedKmh[input.mode] * 60);

          return {
            destination: dest.name,
            distanceMetres: Math.round(distanceMetres),
            estimatedMins,
            mode: input.mode,
            note: input.mode === 'driving' ? 'Estimated with Lagos traffic factor' : undefined,
          };
        })
      );
      return results;
    }),

  // ── Tile Server Proxy ──────────────────────────────────────────────────────
  tileConfig: publicProcedure.query(() => {
    return {
      // Use OpenStreetMap tiles (free, no API key required)
      // For production: use self-hosted Martin/Tegola or Mapbox
      styleUrl: process.env.MAPLIBRE_STYLE_URL || 'https://demotiles.maplibre.org/style.json',
      osmTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      // Nigerian-specific tile servers
      naijaTileUrl: process.env.NAIJA_TILE_URL || null,
      // Self-hosted Martin tile server (PostGIS → MVT)
      martinUrl: process.env.MARTIN_URL || null,
    };
  }),
});
