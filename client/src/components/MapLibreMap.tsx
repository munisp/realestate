import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyle, MapStyleName } from '@/lib/mapStyles';

export interface MapLibreMapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  style?: MapStyleName;
  className?: string;
  onMapReady?: (map: Map) => void;
  markers?: Array<{
    id: string | number;
    lng: number;
    lat: number;
    title?: string;
    price?: number;
    onClick?: () => void;
  }>;
  showControls?: boolean;
  show3DBuildings?: boolean;
}

/**
 * MapLibre GL JS Map Component
 * Open-source alternative to Google Maps with custom branded styles
 */
export function MapLibreMap({
  center = [3.3792, 6.5244], // Lagos, Nigeria
  zoom = 12,
  style = 'default',
  className = 'w-full h-[600px]',
  onMapReady,
  markers = [],
  showControls = true,
  show3DBuildings = false,
}: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const markersRef = useRef<Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const selectedStyle = getMapStyle(style);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: selectedStyle as any,
      center: center,
      zoom: zoom,
      attributionControl: true,
    });

    // Add controls
    if (showControls) {
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
      map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');
    }

    map.current.on('load', () => {
      setIsLoaded(true);
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      if (!map.current) return;

      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#3b82f6';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current);

      // Add popup
      if (markerData.title || markerData.price) {
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            ${markerData.title ? `<h3 style="margin: 0 0 4px 0; font-weight: 600;">${markerData.title}</h3>` : ''}
            ${markerData.price ? `<p style="margin: 0; color: #3b82f6; font-weight: 600;">₦${markerData.price.toLocaleString()}</p>` : ''}
          </div>
        `);

        marker.setPopup(popup);
      }

      // Add click handler
      if (markerData.onClick) {
        el.addEventListener('click', markerData.onClick);
      }

      markersRef.current.push(marker);
    });
  }, [markers, isLoaded]);

  // Update center and zoom
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    map.current.setCenter(center);
    map.current.setZoom(zoom);
  }, [center, zoom, isLoaded]);

  return (
    <div className="relative">
      <div ref={mapContainer} className={className} />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapLibreMap;
