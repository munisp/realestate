/**
 * Custom Map Styles for Real Estate Platform
 * Branded MapLibre GL JS styles matching platform design
 */

export const TILE_SERVER_URL = import.meta.env.VITE_TILE_SERVER_URL || 'http://localhost:8080';

/**
 * Brand Colors
 */
const BRAND_COLORS = {
  primary: '#3b82f6', // Blue
  secondary: '#8b5cf6', // Purple
  accent: '#10b981', // Green
  warning: '#f59e0b', // Orange
  danger: '#ef4444', // Red
  dark: '#1e293b', // Dark slate
  light: '#f8fafc', // Light slate
};

/**
 * Property Type Colors
 */
const PROPERTY_COLORS = {
  residential: '#3b82f6',
  commercial: '#8b5cf6',
  land: '#10b981',
  industrial: '#f59e0b',
};

/**
 * Tier Colors (for neighborhoods)
 */
const TIER_COLORS = {
  luxury: '#8b5cf6',
  premium: '#3b82f6',
  'mid-range': '#10b981',
  affordable: '#f59e0b',
};

/**
 * Default Style - Clean and professional
 */
export const defaultStyle = {
  version: 8 as const,
  name: 'Real Estate Platform - Default',
  sources: {
    'osm-tiles': {
      type: 'raster' as const,
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
    properties: {
      type: 'vector' as const,
      tiles: [`${TILE_SERVER_URL}/tiles/properties/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 22,
    },
    neighborhoods: {
      type: 'vector' as const,
      tiles: [`${TILE_SERVER_URL}/tiles/neighborhoods/{z}/{x}/{y}.pbf`],
      minzoom: 8,
      maxzoom: 22,
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 22,
    },
    {
      id: 'neighborhoods-fill',
      type: 'fill' as const,
      source: 'neighborhoods',
      'source-layer': 'neighborhoods',
      paint: {
        'fill-color': [
          'match',
          ['get', 'tier'],
          'Luxury',
          TIER_COLORS.luxury,
          'Premium',
          TIER_COLORS.premium,
          'Mid-Range',
          TIER_COLORS['mid-range'],
          'Affordable',
          TIER_COLORS.affordable,
          '#6b7280',
        ],
        'fill-opacity': 0.15,
      },
    },
    {
      id: 'neighborhoods-outline',
      type: 'line' as const,
      source: 'neighborhoods',
      'source-layer': 'neighborhoods',
      paint: {
        'line-color': '#ffffff',
        'line-width': 2,
        'line-opacity': 0.8,
      },
    },
  ],
};

/**
 * Satellite Style - Aerial imagery with property overlay
 */
export const satelliteStyle = {
  version: 8 as const,
  name: 'Real Estate Platform - Satellite',
  sources: {
    'satellite-tiles': {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
    properties: {
      type: 'vector' as const,
      tiles: [`${TILE_SERVER_URL}/tiles/properties/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 22,
    },
  },
  layers: [
    {
      id: 'satellite-tiles',
      type: 'raster' as const,
      source: 'satellite-tiles',
    },
  ],
};

/**
 * Dark Style - Night mode with high contrast
 */
export const darkStyle = {
  version: 8 as const,
  name: 'Real Estate Platform - Dark',
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© CARTO',
    },
    properties: {
      type: 'vector' as const,
      tiles: [`${TILE_SERVER_URL}/tiles/properties/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 22,
    },
    neighborhoods: {
      type: 'vector' as const,
      tiles: [`${TILE_SERVER_URL}/tiles/neighborhoods/{z}/{x}/{y}.pbf`],
      minzoom: 8,
      maxzoom: 22,
    },
  },
  layers: [
    {
      id: 'carto-dark',
      type: 'raster' as const,
      source: 'carto-dark',
    },
    {
      id: 'neighborhoods-fill',
      type: 'fill' as const,
      source: 'neighborhoods',
      'source-layer': 'neighborhoods',
      paint: {
        'fill-color': [
          'match',
          ['get', 'tier'],
          'Luxury',
          TIER_COLORS.luxury,
          'Premium',
          TIER_COLORS.primary,
          'Mid-Range',
          TIER_COLORS['mid-range'],
          'Affordable',
          TIER_COLORS.affordable,
          '#6b7280',
        ],
        'fill-opacity': 0.25,
      },
    },
    {
      id: 'neighborhoods-outline',
      type: 'line' as const,
      source: 'neighborhoods',
      'source-layer': 'neighborhoods',
      paint: {
        'line-color': '#ffffff',
        'line-width': 1.5,
        'line-opacity': 0.6,
      },
    },
  ],
};

/**
 * Branded Style - Full brand colors and custom styling
 */
export const brandedStyle = {
  version: 8 as const,
  name: 'Real Estate Platform - Branded',
  sources: {
    'positron': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© CARTO',
    },
    properties: {
      type: 'vector' as const,
      tiles: [`${TILE_SERVER_URL}/tiles/properties/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 22,
    },
    neighborhoods: {
      type: 'vector' as const,
      tiles: [`${TILE_SERVER_URL}/tiles/neighborhoods/{z}/{x}/{y}.pbf`],
      minzoom: 8,
      maxzoom: 22,
    },
  },
  layers: [
    {
      id: 'positron',
      type: 'raster' as const,
      source: 'positron',
    },
    {
      id: 'neighborhoods-fill',
      type: 'fill' as const,
      source: 'neighborhoods',
      'source-layer': 'neighborhoods',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'median_price'],
          0,
          '#10b981',
          100000000,
          '#3b82f6',
          200000000,
          '#8b5cf6',
          300000000,
          '#ef4444',
        ],
        'fill-opacity': 0.2,
      },
    },
    {
      id: 'neighborhoods-outline',
      type: 'line' as const,
      source: 'neighborhoods',
      'source-layer': 'neighborhoods',
      paint: {
        'line-color': BRAND_COLORS.primary,
        'line-width': 2,
        'line-opacity': 0.8,
      },
    },
    {
      id: 'neighborhoods-labels',
      type: 'symbol' as const,
      source: 'neighborhoods',
      'source-layer': 'neighborhoods',
      minzoom: 12,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 14,
        'text-transform': 'uppercase' as const,
      },
      paint: {
        'text-color': BRAND_COLORS.dark,
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    },
  ],
};

/**
 * Map style registry
 */
export const mapStyles = {
  default: defaultStyle,
  satellite: satelliteStyle,
  dark: darkStyle,
  branded: brandedStyle,
};

export type MapStyleName = keyof typeof mapStyles;

/**
 * Get map style by name
 */
export function getMapStyle(name: MapStyleName) {
  return mapStyles[name] || mapStyles.default;
}
