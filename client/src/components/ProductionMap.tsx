/**
 * ProductionMap — Full-featured MapLibre GL map component
 *
 * Features:
 * - MapLibre GL JS with OpenStreetMap tiles (no API key required)
 * - Supercluster-based property clustering with zoom-aware expansion
 * - Price heatmap layer (WebGL-accelerated)
 * - Freehand polygon draw tool (lasso search)
 * - Isochrone overlay (travel-time polygon)
 * - Nigerian LGA/ward boundary layer
 * - Geocoding search bar (Nominatim)
 * - Property popup cards on click
 * - Responsive: works on mobile and desktop
 * - Accessibility: keyboard navigation, ARIA labels
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import Supercluster from 'supercluster';
import { trpc } from '../lib/trpc';
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: string;
  title: string;
  price: number;
  lat: number;
  lng: number;
  propertyType?: string;
  bedrooms?: number;
  city?: string;
  imageUrl?: string;
}

interface ProductionMapProps {
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  height?: string;
  onPropertyClick?: (property: Property) => void;
  onPolygonDraw?: (geojson: GeoJSON.Polygon) => void;
  showHeatmap?: boolean;
  showClusters?: boolean;
  showDrawTool?: boolean;
  showIsochrone?: boolean;
  showBoundaries?: boolean;
  properties?: Property[];
  className?: string;
}

// ── Nigerian defaults ─────────────────────────────────────────────────────────
const LAGOS_CENTER: [number, number] = [3.3792, 6.5244];
const NIGERIA_BOUNDS: [[number, number], [number, number]] = [[2.6, 4.2], [14.7, 13.9]];

// ── Colour helpers ────────────────────────────────────────────────────────────
function priceToColour(price: number, maxPrice: number): string {
  const ratio = Math.min(price / maxPrice, 1);
  const r = Math.round(255 * ratio);
  const g = Math.round(255 * (1 - ratio));
  return `rgb(${r},${g},50)`;
}

function clusterColour(count: number): string {
  if (count > 100) return '#e74c3c';
  if (count > 50)  return '#e67e22';
  if (count > 20)  return '#f39c12';
  if (count > 10)  return '#27ae60';
  return '#3498db';
}

// ── Format price ──────────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000)     return `₦${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000)         return `₦${(price / 1_000).toFixed(0)}K`;
  return `₦${price}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

const ProductionMap: React.FC<ProductionMapProps> = ({
  initialCenter = LAGOS_CENTER,
  initialZoom = 11,
  height = '600px',
  onPropertyClick,
  onPolygonDraw,
  showHeatmap = false,
  showClusters = true,
  showDrawTool = false,
  showIsochrone = false,
  showBoundaries = false,
  properties: externalProperties,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [viewport, setViewport] = useState({
    bbox: { north: 6.7, south: 6.3, east: 3.7, west: 3.0 },
    zoom: initialZoom,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isochroneOrigin, setIsochroneOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [isochroneDuration, setIsochroneDuration] = useState(30);
  const [isochroneMode, setIsochroneMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<any[]>([]);

  // ── tRPC queries ─────────────────────────────────────────────────────────
  const bboxQuery = trpc.geospatial.bboxSearch.useQuery(
    { bbox: viewport.bbox, limit: 300 },
    { enabled: isMapReady && !externalProperties, staleTime: 30000 }
  );

  const heatmapQuery = trpc.geospatial.priceHeatmap.useQuery(
    { bbox: viewport.bbox },
    { enabled: isMapReady && showHeatmap, staleTime: 60000 }
  );

  const isochroneQuery = trpc.geospatial.isochrone.useQuery(
    { origin: isochroneOrigin!, durationMins: isochroneDuration, mode: isochroneMode },
    { enabled: !!isochroneOrigin && showIsochrone }
  );

  const properties = externalProperties || bboxQuery.data || [];

  // ── Supercluster ──────────────────────────────────────────────────────────
  const supercluster = useMemo(() => {
    const sc = new Supercluster({ radius: 60, maxZoom: 16, minPoints: 3 });
    const points: GeoJSON.Feature<GeoJSON.Point>[] = properties.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, price: p.price, title: p.title, propertyType: p.propertyType },
    }));
    sc.load(points);
    return sc;
  }, [properties]);

  // ── Map initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxzoom: 19,
          },
        },
        layers: [{
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 22,
        }],
      },
      center: initialCenter,
      zoom: initialZoom,
      maxBounds: NIGERIA_BOUNDS,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setIsMapReady(true);
      initLayers();
    });

    map.current.on('moveend', () => {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      setViewport({
        bbox: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        zoom: map.current.getZoom(),
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── Layer initialisation ──────────────────────────────────────────────────
  const initLayers = useCallback(() => {
    if (!map.current) return;
    const m = map.current;

    // Cluster source
    m.addSource('properties', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Cluster circles
    m.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'properties',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#3498db', 10, '#27ae60', 50, '#f39c12', 100, '#e74c3c',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40, 100, 50],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.85,
      },
    });

    // Cluster count labels
    m.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'properties',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 13,
      },
      paint: { 'text-color': '#ffffff' },
    });

    // Individual property markers
    m.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'properties',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#007AFF',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Heatmap layer
    m.addSource('heatmap', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({
      id: 'price-heatmap',
      type: 'heatmap',
      source: 'heatmap',
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
        'heatmap-opacity': 0.7,
      },
      layout: { visibility: showHeatmap ? 'visible' : 'none' },
    });

    // Isochrone layer
    m.addSource('isochrone', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({
      id: 'isochrone-fill',
      type: 'fill',
      source: 'isochrone',
      paint: { 'fill-color': '#007AFF', 'fill-opacity': 0.15 },
    });
    m.addLayer({
      id: 'isochrone-outline',
      type: 'line',
      source: 'isochrone',
      paint: { 'line-color': '#007AFF', 'line-width': 2, 'line-dasharray': [4, 2] },
    });

    // Draw polygon layer
    m.addSource('draw-polygon', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({
      id: 'draw-fill',
      type: 'fill',
      source: 'draw-polygon',
      paint: { 'fill-color': '#FF6B35', 'fill-opacity': 0.2 },
    });
    m.addLayer({
      id: 'draw-outline',
      type: 'line',
      source: 'draw-polygon',
      paint: { 'line-color': '#FF6B35', 'line-width': 2 },
    });

    // Nigerian boundaries layer
    m.addSource('boundaries', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({
      id: 'boundaries-outline',
      type: 'line',
      source: 'boundaries',
      paint: { 'line-color': '#666', 'line-width': 1, 'line-opacity': 0.5 },
      layout: { visibility: showBoundaries ? 'visible' : 'none' },
    });

    // Load Lagos GeoJSON boundaries
    fetch('/data/lagos-neighborhoods.geojson')
      .then(r => r.json())
      .then(data => {
        (m.getSource('boundaries') as maplibregl.GeoJSONSource)?.setData(data);
      })
      .catch(() => {});

    // Click handlers
    m.on('click', 'clusters', (e) => {
      const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      if (clusterId) {
        (m.getSource('properties') as maplibregl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (!err) {
              m.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom! });
            }
          }
        );
      }
    });

    m.on('click', 'unclustered-point', (e) => {
      const props = e.features?.[0]?.properties;
      if (props) {
        const property = properties.find(p => p.id === props.id);
        if (property) {
          setSelectedProperty(property);
          onPropertyClick?.(property);
        }
      }
    });

    m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
    m.on('mouseenter', 'unclustered-point', () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'unclustered-point', () => { m.getCanvas().style.cursor = ''; });
  }, [showHeatmap, showBoundaries, properties, onPropertyClick]);

  // ── Update property source ────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !isMapReady) return;
    const source = map.current.getSource('properties') as maplibregl.GeoJSONSource;
    if (!source) return;
    const features: GeoJSON.Feature[] = properties.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, price: p.price, title: p.title },
    }));
    source.setData({ type: 'FeatureCollection', features });
  }, [properties, isMapReady]);

  // ── Update heatmap source ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !isMapReady || !heatmapQuery.data) return;
    const source = map.current.getSource('heatmap') as maplibregl.GeoJSONSource;
    if (!source) return;
    const features: GeoJSON.Feature[] = heatmapQuery.data.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { weight: p.weight },
    }));
    source.setData({ type: 'FeatureCollection', features });
    map.current.setLayoutProperty('price-heatmap', 'visibility', showHeatmap ? 'visible' : 'none');
  }, [heatmapQuery.data, showHeatmap, isMapReady]);

  // ── Update isochrone layer ────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !isMapReady || !isochroneQuery.data) return;
    const source = map.current.getSource('isochrone') as maplibregl.GeoJSONSource;
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: isochroneQuery.data.polygon, properties: {} }],
    });
  }, [isochroneQuery.data, isMapReady]);

  // ── Draw tool ─────────────────────────────────────────────────────────────
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    if (!isDrawing) return;
    const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    setDrawPoints(prev => {
      const next = [...prev, point];
      if (map.current) {
        const source = map.current.getSource('draw-polygon') as maplibregl.GeoJSONSource;
        if (next.length >= 3) {
          const polygon: GeoJSON.Polygon = {
            type: 'Polygon',
            coordinates: [[...next, next[0]]],
          };
          source?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: polygon, properties: {} }] });
        }
      }
      return next;
    });
  }, [isDrawing]);

  const finishDrawing = useCallback(() => {
    if (drawPoints.length < 3) return;
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[...drawPoints, drawPoints[0]]],
    };
    onPolygonDraw?.(polygon);
    setIsDrawing(false);
    setDrawPoints([]);
  }, [drawPoints, onPolygonDraw]);

  useEffect(() => {
    if (!map.current || !isMapReady) return;
    map.current.on('click', handleMapClick);
    return () => { map.current?.off('click', handleMapClick); };
  }, [handleMapClick, isMapReady]);

  // ── Geocode search ────────────────────────────────────────────────────────
  const handleGeocode = useCallback(async () => {
    if (!geocodeQuery.trim() || !map.current) return;
    try {
      const encoded = encodeURIComponent(`${geocodeQuery}, Nigeria`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=ng`, {
        headers: { 'User-Agent': 'RealEstateNG/1.0' },
      });
      const data = await res.json();
      setGeocodeSuggestions(data);
    } catch (_) {}
  }, [geocodeQuery]);

  const flyToResult = useCallback((result: any) => {
    map.current?.flyTo({
      center: [parseFloat(result.lon), parseFloat(result.lat)],
      zoom: 14,
      duration: 1500,
    });
    setGeocodeSuggestions([]);
    setGeocodeQuery(result.display_name.split(',')[0]);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" aria-label="Interactive property map" role="application" />

      {/* Geocode search bar */}
      <div className="absolute top-3 left-3 z-10 w-72">
        <div className="flex gap-1">
          <input
            type="text"
            value={geocodeQuery}
            onChange={e => setGeocodeQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGeocode()}
            placeholder="Search area in Nigeria..."
            className="flex-1 px-3 py-2 text-sm rounded-lg shadow-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search location"
          />
          <button
            onClick={handleGeocode}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 text-sm font-medium"
            aria-label="Search"
          >
            🔍
          </button>
        </div>
        {geocodeSuggestions.length > 0 && (
          <div className="mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
            {geocodeSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => flyToResult(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
              >
                {s.display_name.split(',').slice(0, 3).join(', ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map controls toolbar */}
      <div className="absolute top-3 right-16 z-10 flex flex-col gap-1">
        {showDrawTool && (
          <button
            onClick={() => isDrawing ? finishDrawing() : setIsDrawing(true)}
            className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${isDrawing ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            aria-label={isDrawing ? 'Finish drawing' : 'Draw search area'}
            title={isDrawing ? `Click to finish (${drawPoints.length} points)` : 'Draw search area'}
          >
            {isDrawing ? `✓ Done (${drawPoints.length}pts)` : '✏️ Draw'}
          </button>
        )}
        {showHeatmap && (
          <button
            onClick={() => {
              if (!map.current) return;
              const vis = map.current.getLayoutProperty('price-heatmap', 'visibility');
              map.current.setLayoutProperty('price-heatmap', 'visibility', vis === 'visible' ? 'none' : 'visible');
            }}
            className="px-3 py-2 bg-white rounded-lg shadow-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            aria-label="Toggle heatmap"
          >
            🌡️ Heat
          </button>
        )}
        {showIsochrone && (
          <div className="bg-white rounded-lg shadow-lg p-2 text-xs">
            <div className="font-medium mb-1 text-gray-700">Travel Time</div>
            <select
              value={isochroneDuration}
              onChange={e => setIsochroneDuration(Number(e.target.value))}
              className="w-full border rounded px-1 py-0.5 mb-1 text-xs"
              aria-label="Isochrone duration"
            >
              {[10, 15, 20, 30, 45, 60].map(d => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
            <select
              value={isochroneMode}
              onChange={e => setIsochroneMode(e.target.value as any)}
              className="w-full border rounded px-1 py-0.5 mb-1 text-xs"
              aria-label="Travel mode"
            >
              <option value="driving">🚗 Driving</option>
              <option value="walking">🚶 Walking</option>
              <option value="cycling">🚲 Cycling</option>
            </select>
            <button
              onClick={() => {
                if (map.current) {
                  const c = map.current.getCenter();
                  setIsochroneOrigin({ lat: c.lat, lng: c.lng });
                }
              }}
              className="w-full bg-blue-600 text-white rounded px-2 py-1 text-xs hover:bg-blue-700"
            >
              Show Isochrone
            </button>
          </div>
        )}
      </div>

      {/* Property popup */}
      {selectedProperty && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-white rounded-xl shadow-2xl p-4 w-72 border border-gray-100">
          <button
            onClick={() => setSelectedProperty(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close property card"
          >
            ×
          </button>
          <div className="font-semibold text-gray-900 text-sm mb-1 pr-6 line-clamp-2">{selectedProperty.title}</div>
          <div className="text-blue-600 font-bold text-lg mb-1">{formatPrice(selectedProperty.price)}</div>
          {selectedProperty.bedrooms && (
            <div className="text-gray-500 text-xs mb-2">{selectedProperty.bedrooms} bed · {selectedProperty.propertyType}</div>
          )}
          {selectedProperty.city && (
            <div className="text-gray-400 text-xs mb-3">📍 {selectedProperty.city}</div>
          )}
          <button
            onClick={() => onPropertyClick?.(selectedProperty)}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
          >
            View Details
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {bboxQuery.isLoading && (
        <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow px-3 py-1.5 text-xs text-gray-500 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading properties...
        </div>
      )}

      {/* Property count badge */}
      {properties.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow px-3 py-1.5 text-xs text-gray-600 font-medium">
          {properties.length.toLocaleString()} properties
        </div>
      )}
    </div>
  );
};

export default ProductionMap;
