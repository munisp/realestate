// @ts-nocheck
/**
 * MapWithSpiderfy Component
 * 
 * Enhanced map component with spiderfy functionality for overlapping markers
 * Elegantly expands markers at the same location into a spiral pattern
 * 
 * USAGE:
 * <MapWithSpiderfy
 *   properties={properties}
 *   onPropertyClick={(property) => navigate(`/properties/${property.id}`)}
 *   spiderfyEnabled={true}
 * />
 */

import { useEffect, useRef, useState } from 'react';
import OverlappingMarkerSpiderfier from 'overlapping-marker-spiderfier';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Layers, MapPin, Maximize2 } from 'lucide-react';
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

interface MapWithSpiderfyProps {
  properties: Property[];
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  className?: string;
  onPropertyClick?: (property: Property) => void;
  spiderfyEnabled?: boolean;
  showControls?: boolean;
  spiderfyOptions?: {
    keepSpiderfied?: boolean;
    markersWontMove?: boolean;
    markersWontHide?: boolean;
    basicFormatEvents?: boolean;
    spiralFootSeparation?: number;
    spiralLengthStart?: number;
    spiralLengthFactor?: number;
    circleFootSeparation?: number;
    circleStartAngle?: number;
  };
}

export function MapWithSpiderfy({
  properties,
  center = { lat: 6.5244, lng: 3.3792 },
  zoom = 12,
  className,
  onPropertyClick,
  spiderfyEnabled = true,
  showControls = true,
  spiderfyOptions = {},
}: MapWithSpiderfyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const omsRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  const [isSpiderfyEnabled, setIsSpiderfyEnabled] = useState(spiderfyEnabled);
  const [propertyCount, setPropertyCount] = useState(0);
  const [spiderfiedCount, setSpiderfiedCount] = useState(0);

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
        });

        mapRef.current = map;

        // Initialize OverlappingMarkerSpiderfier
        if (isSpiderfyEnabled) {
          const defaultOptions = {
            keepSpiderfied: true,
            markersWontMove: true,
            markersWontHide: true,
            basicFormatEvents: true,
            spiralFootSeparation: 26,
            spiralLengthStart: 11,
            spiralLengthFactor: 4,
            circleFootSeparation: 23,
            circleStartAngle: 0,
            ...spiderfyOptions,
          };

          omsRef.current = new OverlappingMarkerSpiderfier(map, defaultOptions);

          // Add event listeners
          omsRef.current.addListener('spiderfy', (markers: google.maps.Marker[]) => {
            setSpiderfiedCount(markers.length);
            toast.info(`Expanded ${markers.length} overlapping properties`);
          });

          omsRef.current.addListener('unspiderfy', () => {
            setSpiderfiedCount(0);
          });
        }
      } catch (err) {
        console.error('Failed to initialize map:', err);
        toast.error('Failed to load map');
      }
    };

    initMap();

    return () => {
      mounted = false;
      // Cleanup
      if (omsRef.current) {
        omsRef.current.clearMarkers();
      }
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [isSpiderfyEnabled]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Clear existing markers
    if (omsRef.current) {
      omsRef.current.clearMarkers();
    }
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    const markers: google.maps.Marker[] = [];
    const bounds = new window.google!.maps.LatLngBounds();

    properties.forEach((property) => {
      const lat = typeof property.latitude === 'string' 
        ? parseFloat(property.latitude) 
        : property.latitude;
      const lng = typeof property.longitude === 'string' 
        ? parseFloat(property.longitude) 
        : property.longitude;

      const position = { lat, lng };

      const marker = new window.google!.maps.Marker({
        position,
        map: mapRef.current!,
        title: property.title || `Property ${property.id}`,
        icon: {
          path: window.google!.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 0.8,
          strokeColor: '#1e40af',
          strokeWeight: 2,
        },
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onPropertyClick) {
          onPropertyClick(property);
        }
      });

      // Add to spiderfy if enabled
      if (isSpiderfyEnabled && omsRef.current) {
        omsRef.current.addMarker(marker);
      }

      markers.push(marker);
      bounds.extend(position);
    });

    markersRef.current = markers;
    setPropertyCount(markers.length);

    // Fit bounds to show all markers
    if (markers.length > 0) {
      mapRef.current.fitBounds(bounds);
    }
  }, [properties, isSpiderfyEnabled, onPropertyClick]);

  const toggleSpiderfy = () => {
    const newState = !isSpiderfyEnabled;
    setIsSpiderfyEnabled(newState);
    
    if (newState) {
      toast.success('Spiderfy enabled - overlapping markers will expand');
    } else {
      toast.info('Spiderfy disabled');
    }
  };

  const resetView = () => {
    if (mapRef.current && markersRef.current.length > 0) {
      const bounds = new window.google!.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      mapRef.current.fitBounds(bounds);
      toast.success('View reset');
    }
  };

  return (
    <div className={cn('relative w-full h-full', className)}>
      <div ref={containerRef} className="w-full h-full" />

      {showControls && (
        <Card className="absolute top-4 right-4 p-3 shadow-lg">
          <div className="flex flex-col gap-2">
            {/* Spiderfy Toggle */}
            <Button
              variant={isSpiderfyEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSpiderfy}
              className="w-full justify-start gap-2"
            >
              <Layers className="h-4 w-4" />
              {isSpiderfyEnabled ? 'Spiderfy On' : 'Spiderfy Off'}
            </Button>

            {/* Reset View */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              className="w-full justify-start gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Reset View
            </Button>

            {/* Property Count */}
            <div className="text-xs text-center text-muted-foreground border-t pt-2">
              <MapPin className="h-3 w-3 inline mr-1" />
              {propertyCount.toLocaleString()} properties
            </div>

            {/* Spiderfied Count */}
            {spiderfiedCount > 0 && (
              <div className="text-xs text-center text-primary border-t pt-2">
                🕷️ {spiderfiedCount} expanded
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Info Badge */}
      {isSpiderfyEnabled && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground">
            🕷️ Spiderfy active • Click overlapping markers to expand
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Load Google Maps script
 */
function loadMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly`;
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

/**
 * Example usage with custom spiderfy options
 */
export function MapWithCircleSpiderfy(props: Omit<MapWithSpiderfyProps, 'spiderfyOptions'>) {
  return (
    <MapWithSpiderfy
      {...props}
      spiderfyOptions={{
        keepSpiderfied: true,
        spiralFootSeparation: 30,
        spiralLengthStart: 15,
        spiralLengthFactor: 5,
        circleFootSeparation: 25,
        circleStartAngle: Math.PI / 6,
      }}
    />
  );
}
