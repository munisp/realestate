// @ts-nocheck
/**
 * MapWithClustering Component
 * 
 * Enhanced map component with marker clustering for displaying 10,000+ properties
 * Uses @googlemaps/markerclusterer for performance optimization
 * 
 * USAGE:
 * <MapWithClustering
 *   properties={properties}
 *   onPropertyClick={(property) => navigate(`/properties/${property.id}`)}
 *   clusteringEnabled={true}
 * />
 */

import { useEffect, useRef, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Layers, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || 'https://forge.butterfly-effect.dev';
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

interface Property {
  id: number;
  latitude: string | number;
  longitude: string | number;
  title?: string;
  price?: number;
  [key: string]: any;
}

interface MapWithClusteringProps {
  properties: Property[];
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  className?: string;
  onPropertyClick?: (property: Property) => void;
  clusteringEnabled?: boolean;
  minClusterSize?: number;
  showControls?: boolean;
}

export function MapWithClustering({
  properties,
  center = { lat: 6.5244, lng: 3.3792 },
  zoom = 12,
  className,
  onPropertyClick,
  clusteringEnabled = true,
  minClusterSize = 2,
  showControls = true,
}: MapWithClusteringProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  
  const [isClusteringEnabled, setIsClusteringEnabled] = useState(clusteringEnabled);
  const [propertyCount, setPropertyCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        // Load Google Maps script if not already loaded
        if (!window.google) {
          await loadMapScript();
        }

        if (!mounted || !containerRef.current) return;

        // Create map
        const map = new window.google!.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          mapId: 'DEMO_MAP_ID',
        });

        mapRef.current = map;
      } catch (err) {
        console.error('Failed to initialize map:', err);
        toast.error('Failed to load map');
      }
    };

    initMap();

    return () => {
      mounted = false;
      // Cleanup markers and clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      markersRef.current = [];
    };
  }, []);

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Clear existing markers
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.forEach(marker => {
      // Cleanup marker
    });
    markersRef.current = [];

    // Create new markers
    const markers = properties.map((property) => {
      const lat = typeof property.latitude === 'string' 
        ? parseFloat(property.latitude) 
        : property.latitude;
      const lng = typeof property.longitude === 'string' 
        ? parseFloat(property.longitude) 
        : property.longitude;

      const marker = new window.google!.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map: isClusteringEnabled ? null : mapRef.current!,
        title: property.title || `Property ${property.id}`,
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onPropertyClick) {
          onPropertyClick(property);
        }
      });

      return marker;
    });

    markersRef.current = markers;
    setPropertyCount(markers.length);

    // Initialize clustering if enabled
    if (isClusteringEnabled && markers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map: mapRef.current,
        markers,
        algorithm: new window.google!.maps.marker.SuperClusterAlgorithm({
          minPoints: minClusterSize,
          radius: 100,
        }),
        renderer: {
          render: ({ count, position }) => {
            // Custom cluster renderer
            const color = count > 100 ? '#dc2626' : count > 50 ? '#ea580c' : count > 10 ? '#f59e0b' : '#3b82f6';
            
            const svg = `
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="25" r="20" fill="${color}" fill-opacity="0.6" stroke="${color}" stroke-width="2"/>
                <text x="25" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="white">${count}</text>
              </svg>
            `;

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;

            return new window.google!.maps.marker.AdvancedMarkerElement({
              position,
              content: svgElement,
            });
          },
        },
      });
    } else if (!isClusteringEnabled && markers.length > 0) {
      // Show all markers without clustering
      markers.forEach(marker => {
        marker.map = mapRef.current;
      });
    }

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const bounds = new window.google!.maps.LatLngBounds();
      markers.forEach(marker => {
        const position = marker.position as google.maps.LatLng;
        if (position) {
          bounds.extend(position);
        }
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [properties, isClusteringEnabled, minClusterSize, onPropertyClick]);

  const toggleClustering = () => {
    const newState = !isClusteringEnabled;
    setIsClusteringEnabled(newState);
    
    if (newState) {
      toast.success('Clustering enabled');
    } else {
      toast.info('Clustering disabled - showing all markers');
    }
  };

  return (
    <div className={cn('relative w-full h-full', className)}>
      <div ref={containerRef} className="w-full h-full" />

      {showControls && (
        <Card className="absolute top-4 right-4 p-3 shadow-lg">
          <div className="flex flex-col gap-2">
            {/* Clustering Toggle */}
            <Button
              variant={isClusteringEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleClustering}
              className="w-full justify-start gap-2"
            >
              <Layers className="h-4 w-4" />
              {isClusteringEnabled ? 'Clustering On' : 'Clustering Off'}
            </Button>

            {/* Property Count */}
            <div className="text-xs text-center text-muted-foreground border-t pt-2">
              <MapPin className="h-3 w-3 inline mr-1" />
              {propertyCount.toLocaleString()} properties
            </div>
          </div>
        </Card>
      )}

      {/* Info Badge */}
      {isClusteringEnabled && propertyCount > 100 && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground">
            📍 Clustering active • Click clusters to zoom in
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Load Google Maps script with marker clustering support
 */
function loadMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      resolve();
      script.remove();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };
    
    document.head.appendChild(script);
  });
}
