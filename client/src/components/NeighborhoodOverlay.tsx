import { useEffect, useRef } from 'react';

export interface LagosNeighborhoodProperties {
  id: string;
  name: string;
  shortName: string;
  zone: 'island' | 'mainland';
  tier: 'luxury' | 'mid-range' | 'emerging';
  medianPrice: number;
  pricePerSqm: number;
  propertyCount: number;
  population: number;
  avgCommuteToVI: number;
  avgCommuteToIkeja: number;
  walkScore: number;
  description: string;
  amenities: string[];
  schools: Array<{ name: string; rating: number }>;
}

interface NeighborhoodOverlayProps {
  map: google.maps.Map | null;
  onNeighborhoodClick?: (properties: LagosNeighborhoodProperties) => void;
  onNeighborhoodHover?: (properties: LagosNeighborhoodProperties | null) => void;
  colorMode?: 'price' | 'tier' | 'zone';
  showLabels?: boolean;
}

/**
 * NeighborhoodOverlay Component
 * 
 * Renders Lagos neighborhood boundaries on Google Maps with:
 * - Color-coded polygons (by price, tier, or zone)
 * - Hover tooltips with neighborhood stats
 * - Click handlers for neighborhood selection
 * - Optional labels showing neighborhood names
 */
export function NeighborhoodOverlay({
  map,
  onNeighborhoodClick,
  onNeighborhoodHover,
  colorMode = 'price',
  showLabels = true,
}: NeighborhoodOverlayProps) {
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const labelsRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    if (!map) return;

    // Initialize Data Layer
    const dataLayer = new google.maps.Data();
    dataLayer.setMap(map);
    dataLayerRef.current = dataLayer;

    // Load GeoJSON
    fetch('/data/lagos-neighborhoods.geojson')
      .then(res => res.json())
      .then(geojson => {
        dataLayer.addGeoJson(geojson);
      })
      .catch(err => console.error('Failed to load Lagos neighborhoods:', err));

    // Style polygons based on color mode
    dataLayer.setStyle((feature) => {
      const properties = feature.getProperty('tier') as string;
      const medianPrice = feature.getProperty('medianPrice') as number;
      const zone = feature.getProperty('zone') as string;

      let fillColor = '#3b82f6'; // default blue
      let strokeColor = '#1e40af';

      if (colorMode === 'price') {
        // Color by price: green (cheap) → yellow → red (expensive)
        if (medianPrice < 50000000) {
          fillColor = '#10b981'; // green
          strokeColor = '#059669';
        } else if (medianPrice < 100000000) {
          fillColor = '#84cc16'; // lime
          strokeColor = '#65a30d';
        } else if (medianPrice < 150000000) {
          fillColor = '#eab308'; // yellow
          strokeColor = '#ca8a04';
        } else if (medianPrice < 250000000) {
          fillColor = '#f97316'; // orange
          strokeColor = '#ea580c';
        } else {
          fillColor = '#ef4444'; // red
          strokeColor = '#dc2626';
        }
      } else if (colorMode === 'tier') {
        // Color by tier
        if (properties === 'luxury') {
          fillColor = '#8b5cf6'; // purple
          strokeColor = '#7c3aed';
        } else if (properties === 'mid-range') {
          fillColor = '#3b82f6'; // blue
          strokeColor = '#2563eb';
        } else {
          fillColor = '#10b981'; // green
          strokeColor = '#059669';
        }
      } else if (colorMode === 'zone') {
        // Color by zone
        if (zone === 'island') {
          fillColor = '#06b6d4'; // cyan
          strokeColor = '#0891b2';
        } else {
          fillColor = '#a855f7'; // purple
          strokeColor = '#9333ea';
        }
      }

      return {
        fillColor,
        fillOpacity: 0.25,
        strokeColor,
        strokeWeight: 2,
        strokeOpacity: 0.8,
      };
    });

    // Hover effect
    dataLayer.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
      dataLayer.overrideStyle(event.feature, {
        fillOpacity: 0.4,
        strokeWeight: 3,
      });

      if (onNeighborhoodHover) {
        const properties = {} as LagosNeighborhoodProperties;
        event.feature.forEachProperty((value, key) => {
          (properties as any)[key] = value;
        });
        onNeighborhoodHover(properties);
      }
    });

    dataLayer.addListener('mouseout', (event: google.maps.Data.MouseEvent) => {
      dataLayer.revertStyle(event.feature);
      if (onNeighborhoodHover) {
        onNeighborhoodHover(null);
      }
    });

    // Click handler
    dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
      if (onNeighborhoodClick) {
        const properties = {} as LagosNeighborhoodProperties;
        event.feature.forEachProperty((value, key) => {
          (properties as any)[key] = value;
        });
        onNeighborhoodClick(properties);
      }
    });

    // Cleanup
    return () => {
      dataLayer.setMap(null);
      labelsRef.current.forEach(label => {
        label.map = null;
      });
      labelsRef.current = [];
    };
  }, [map, colorMode, onNeighborhoodClick, onNeighborhoodHover]);

  // Add labels when zoom level is appropriate
  useEffect(() => {
    if (!map || !showLabels) return;

    const updateLabels = () => {
      const zoom = map.getZoom() || 10;

      // Clear existing labels
      labelsRef.current.forEach(label => {
        label.map = null;
      });
      labelsRef.current = [];

      // Only show labels at zoom 11-14
      if (zoom < 11 || zoom > 14) return;

      // Fetch GeoJSON and create labels
      fetch('/data/lagos-neighborhoods.geojson')
        .then(res => res.json())
        .then(geojson => {
          geojson.features.forEach((feature: any) => {
            const coords = feature.geometry.coordinates[0];
            // Calculate centroid (simple average for small polygons)
            const lats = coords.map((c: number[]) => c[1]);
            const lngs = coords.map((c: number[]) => c[0]);
            const centerLat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length;
            const centerLng = lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length;

            const labelDiv = document.createElement('div');
            labelDiv.className = 'neighborhood-label';
            labelDiv.style.cssText = `
              background: rgba(255, 255, 255, 0.9);
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 12px;
              color: #1f2937;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              pointer-events: none;
              white-space: nowrap;
            `;
            labelDiv.textContent = feature.properties.shortName || feature.properties.name;

            const label = new google.maps.marker.AdvancedMarkerElement({
              map,
              position: { lat: centerLat, lng: centerLng },
              content: labelDiv,
            });

            labelsRef.current.push(label);
          });
        });
    };

    map.addListener('zoom_changed', updateLabels);
    updateLabels(); // Initial render

    return () => {
      google.maps.event.clearListeners(map, 'zoom_changed');
    };
  }, [map, showLabels]);

  return null; // This component doesn't render anything directly
}

/**
 * Helper function to get color for price
 */
export function getPriceColor(price: number): string {
  if (price < 50000000) return '#10b981'; // green
  if (price < 100000000) return '#84cc16'; // lime
  if (price < 150000000) return '#eab308'; // yellow
  if (price < 250000000) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Helper function to format price in millions
 */
export function formatPriceMillions(price: number): string {
  return `₦${(price / 1000000).toFixed(1)}M`;
}
