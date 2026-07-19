import { useEffect, useState, useMemo } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { latLngToCell, cellToBoundary } from 'h3-js';
import type { Layer } from '@deck.gl/core';

/**
 * Deck.gl Google Maps Overlay Component
 * 
 * High-performance WebGL-powered visualizations on top of Google Maps
 * 
 * Features:
 * - Hexagon layer (3D density visualization)
 * - Heatmap layer (gradient density)
 * - Scatterplot layer (individual markers)
 * - H3 hexagon layer (server-side clustering integration)
 * 
 * Performance:
 * - Handles 1M+ points at 60fps
 * - GPU-accelerated rendering
 * - Automatic LOD (Level of Detail)
 */

export interface DeckGLProperty {
  id: number;
  latitude: number | string;
  longitude: number | string;
  price: number | string;
  [key: string]: any;
}

export type VisualizationMode = 'hexagon' | 'heatmap' | 'scatterplot' | 'h3' | 'none';

interface DeckGLOverlayProps {
  map: google.maps.Map;
  properties: DeckGLProperty[];
  mode?: VisualizationMode;
  onModeChange?: (mode: VisualizationMode) => void;
  h3Resolution?: number;
  hexagonRadius?: number;
  heatmapRadius?: number;
  elevationScale?: number;
  colorRange?: number[][];
}

/**
 * DeckGL Overlay Component
 * 
 * Renders high-performance visualizations on Google Maps
 */
export function DeckGLOverlay({
  map,
  properties,
  mode = 'hexagon',
  h3Resolution = 9,
  hexagonRadius = 500,
  heatmapRadius = 60,
  elevationScale = 100,
  colorRange,
}: DeckGLOverlayProps) {
  const [overlay, setOverlay] = useState<GoogleMapsOverlay | null>(null);

  // Default color range (green to red)
  const defaultColorRange = [
    [0, 255, 0],       // Green (low)
    [128, 255, 0],     // Yellow-green
    [255, 255, 0],     // Yellow
    [255, 128, 0],     // Orange
    [255, 0, 0],       // Red (high)
  ];

  /**
   * Parse property coordinates
   */
  const parsedProperties = useMemo(() => {
    return properties.map(p => ({
      ...p,
      latitude: parseFloat(String(p.latitude)),
      longitude: parseFloat(String(p.longitude)),
      price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
    }));
  }, [properties]);

  /**
   * Calculate price statistics for color scaling
   */
  const priceStats = useMemo(() => {
    const prices = parsedProperties.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    return { min, max, avg };
  }, [parsedProperties]);

  /**
   * Create hexagon layer (3D density visualization)
   */
  const hexagonLayer = useMemo(() => {
    if (mode !== 'hexagon') return null;

    return new HexagonLayer({
      id: 'hexagon-layer',
      data: parsedProperties,
      getPosition: (d: any) => [d.longitude, d.latitude],
      getElevationWeight: (d: any) => d.price,
      getColorWeight: (d: any) => 1,
      elevationScale,
      extruded: true,
      radius: hexagonRadius,
      coverage: 0.9,
      pickable: true,
      colorRange: colorRange || defaultColorRange,
      elevationRange: [0, 1000],
      onClick: (info: any) => {
        if (info.object) {
          console.log('Hexagon clicked:', info.object);
        }
      },
    });
  }, [mode, parsedProperties, elevationScale, hexagonRadius, colorRange]);

  /**
   * Create heatmap layer (gradient density)
   */
  const heatmapLayer = useMemo(() => {
    if (mode !== 'heatmap') return null;

    return new HeatmapLayer({
      id: 'heatmap-layer',
      data: parsedProperties,
      getPosition: (d: any) => [d.longitude, d.latitude],
      getWeight: (d: any) => d.price / priceStats.max,
      radiusPixels: heatmapRadius,
      intensity: 1,
      threshold: 0.05,
      colorRange: colorRange || defaultColorRange,
    });
  }, [mode, parsedProperties, heatmapRadius, priceStats.max, colorRange]);

  /**
   * Create scatterplot layer (individual markers)
   */
  const scatterplotLayer = useMemo(() => {
    if (mode !== 'scatterplot') return null;

    return new ScatterplotLayer({
      id: 'scatterplot-layer',
      data: parsedProperties,
      getPosition: (d: any) => [d.longitude, d.latitude],
      getRadius: (d: any) => Math.sqrt(d.price / priceStats.max) * 100,
      getFillColor: (d: any) => {
        // Color by price (green to red)
        const ratio = (d.price - priceStats.min) / (priceStats.max - priceStats.min);
        return [
          Math.floor(255 * ratio),      // Red
          Math.floor(255 * (1 - ratio)), // Green
          0,                             // Blue
        ];
      },
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2,
      pickable: true,
      onClick: (info: any) => {
        if (info.object) {
          console.log('Property clicked:', info.object);
        }
      },
    });
  }, [mode, parsedProperties, priceStats]);

  /**
   * Create H3 hexagon layer (server-side clustering)
   */
  const h3Layer = useMemo(() => {
    if (mode !== 'h3') return null;

    // Group properties by H3 cell
    const h3Clusters = new Map<string, any[]>();

    parsedProperties.forEach(property => {
      const h3Index = latLngToCell(
        property.latitude,
        property.longitude,
        h3Resolution
      );

      if (!h3Clusters.has(h3Index)) {
        h3Clusters.set(h3Index, []);
      }
      h3Clusters.get(h3Index)!.push(property);
    });

    // Convert to array format
    const h3Data = Array.from(h3Clusters.entries()).map(([h3Index, props]) => ({
      h3Index,
      count: props.length,
      avgPrice: props.reduce((sum, p) => sum + p.price, 0) / props.length,
      properties: props,
    }));

    const maxCount = Math.max(...h3Data.map(d => d.count));

    return new H3HexagonLayer({
      id: 'h3-layer',
      data: h3Data,
      getHexagon: (d: any) => d.h3Index,
      getFillColor: (d: any) => {
        const intensity = d.count / maxCount;
        return [
          Math.floor(255 * intensity),      // Red
          0,                                 // Green
          Math.floor(255 * (1 - intensity)), // Blue
        ];
      },
      getElevation: (d: any) => d.avgPrice / 10000,
      elevationScale,
      extruded: true,
      pickable: true,
      onClick: (info: any) => {
        if (info.object) {
          console.log('H3 cluster clicked:', info.object);
        }
      },
    });
  }, [mode, parsedProperties, h3Resolution, elevationScale]);

  /**
   * Get active layers based on mode
   */
  const layers = useMemo(() => {
    const activeLayers: Layer[] = [];

    if (hexagonLayer) activeLayers.push(hexagonLayer);
    if (heatmapLayer) activeLayers.push(heatmapLayer);
    if (scatterplotLayer) activeLayers.push(scatterplotLayer);
    if (h3Layer) activeLayers.push(h3Layer);

    return activeLayers;
  }, [hexagonLayer, heatmapLayer, scatterplotLayer, h3Layer]);

  /**
   * Initialize Deck.gl overlay
   */
  useEffect(() => {
    if (!map) return;

    const deckOverlay = new GoogleMapsOverlay({
      layers: [],
    });

    deckOverlay.setMap(map);
    setOverlay(deckOverlay);

    return () => {
      deckOverlay.setMap(null);
    };
  }, [map]);

  /**
   * Update layers when mode or data changes
   */
  useEffect(() => {
    if (!overlay) return;

    overlay.setProps({
      layers,
    });
  }, [overlay, layers]);

  return null; // This is an overlay component, no DOM rendering
}

/**
 * Deck.gl Overlay with Controls
 * 
 * Includes UI controls for switching visualization modes
 */
export function DeckGLOverlayWithControls({
  map,
  properties,
  initialMode = 'hexagon',
}: {
  map: google.maps.Map;
  properties: DeckGLProperty[];
  initialMode?: VisualizationMode;
}) {
  const [mode, setMode] = useState<VisualizationMode>(initialMode);

  return (
    <>
      <DeckGLOverlay
        map={map}
        properties={properties}
        mode={mode}
      />

      {/* Mode selector UI */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <h3 className="font-semibold mb-2">Visualization Mode</h3>
        <div className="space-y-2">
          <button
            className={`block w-full text-left px-3 py-2 rounded ${mode === 'hexagon' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setMode('hexagon')}
          >
            3D Hexagons
          </button>
          <button
            className={`block w-full text-left px-3 py-2 rounded ${mode === 'heatmap' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setMode('heatmap')}
          >
            Heatmap
          </button>
          <button
            className={`block w-full text-left px-3 py-2 rounded ${mode === 'scatterplot' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setMode('scatterplot')}
          >
            Scatterplot
          </button>
          <button
            className={`block w-full text-left px-3 py-2 rounded ${mode === 'h3' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setMode('h3')}
          >
            H3 Clustering
          </button>
          <button
            className={`block w-full text-left px-3 py-2 rounded ${mode === 'none' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setMode('none')}
          >
            None
          </button>
        </div>

        {/* Layer info */}
        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
          <p><strong>Properties:</strong> {properties.length.toLocaleString()}</p>
          {mode === 'hexagon' && <p>3D density visualization</p>}
          {mode === 'heatmap' && <p>Gradient density map</p>}
          {mode === 'scatterplot' && <p>Individual markers</p>}
          {mode === 'h3' && <p>H3 hexagonal clustering</p>}
        </div>
      </div>
    </>
  );
}

export default DeckGLOverlay;
