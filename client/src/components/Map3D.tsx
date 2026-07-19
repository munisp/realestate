/**
 * Map3D Component
 * 
 * Enhanced map component with 3D buildings visualization
 * Provides toggle controls for 3D view, tilt, and rotation
 * 
 * USAGE:
 * <Map3D
 *   center={{ lat: 6.5244, lng: 3.3792 }}
 *   zoom={17}
 *   enable3D={true}
 *   onMapReady={(map) => console.log('Map ready')}
 * />
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Box, RotateCw, Move3d, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || 'https://forge.butterfly-effect.dev';
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

interface Map3DProps {
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  enable3D?: boolean;
  className?: string;
  onMapReady?: (map: google.maps.Map) => void;
  showControls?: boolean;
}

export function Map3D({
  center = { lat: 6.5244, lng: 3.3792 },
  zoom = 17,
  enable3D = true,
  className,
  onMapReady,
  showControls = true,
}: Map3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [is3DEnabled, setIs3DEnabled] = useState(enable3D);
  const [tilt, setTilt] = useState(enable3D ? 45 : 0);
  const [heading, setHeading] = useState(0);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('satellite');

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        // Load Google Maps script if not already loaded
        if (!window.google) {
          await loadMapScript();
        }

        if (!mounted || !containerRef.current) return;

        // Create map with 3D support
        const map = new window.google!.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeId: mapType,
          tilt: is3DEnabled ? 45 : 0,
          heading: 0,
          mapTypeControl: false, // We'll use custom controls
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          rotateControl: is3DEnabled,
          // Map ID is required for 3D buildings
          mapId: 'DEMO_MAP_ID',
        });

        mapRef.current = map;

        // Notify parent component
        if (onMapReady) {
          onMapReady(map);
        }
      } catch (err) {
        console.error('Failed to initialize map:', err);
        toast.error('Failed to load map');
      }
    };

    initMap();

    return () => {
      mounted = false;
    };
  }, []);

  // Update map when 3D settings change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setTilt(tilt);
      mapRef.current.setHeading(heading);
      mapRef.current.setMapTypeId(mapType);
    }
  }, [tilt, heading, mapType]);

  const toggle3D = () => {
    const newIs3D = !is3DEnabled;
    setIs3DEnabled(newIs3D);
    setTilt(newIs3D ? 45 : 0);
    
    if (newIs3D) {
      toast.success('3D buildings enabled');
    } else {
      toast.info('3D buildings disabled');
    }
  };

  const rotateLeft = () => {
    const newHeading = (heading - 45) % 360;
    setHeading(newHeading);
  };

  const rotateRight = () => {
    const newHeading = (heading + 45) % 360;
    setHeading(newHeading);
  };

  const increaseTilt = () => {
    if (!is3DEnabled) {
      toast.info('Enable 3D view first');
      return;
    }
    const newTilt = Math.min(tilt + 15, 67.5);
    setTilt(newTilt);
  };

  const decreaseTilt = () => {
    if (!is3DEnabled) return;
    const newTilt = Math.max(tilt - 15, 0);
    setTilt(newTilt);
    if (newTilt === 0) {
      setIs3DEnabled(false);
    }
  };

  const toggleMapType = () => {
    const newType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(newType);
    toast.info(`Switched to ${newType} view`);
  };

  const resetView = () => {
    setHeading(0);
    setTilt(is3DEnabled ? 45 : 0);
    if (mapRef.current) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(zoom);
    }
    toast.info('View reset');
  };

  return (
    <div className={cn('relative w-full h-full', className)}>
      <div ref={containerRef} className="w-full h-full" />

      {showControls && (
        <Card className="absolute top-4 right-4 p-2 shadow-lg">
          <div className="flex flex-col gap-2">
            {/* 3D Toggle */}
            <Button
              variant={is3DEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggle3D}
              className="w-full justify-start gap-2"
            >
              <Box className="h-4 w-4" />
              {is3DEnabled ? '3D On' : '3D Off'}
            </Button>

            {/* Map Type Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMapType}
              className="w-full justify-start gap-2"
            >
              <MapIcon className="h-4 w-4" />
              {mapType === 'roadmap' ? 'Road' : 'Satellite'}
            </Button>

            {is3DEnabled && (
              <>
                {/* Rotation Controls */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={rotateLeft}
                    title="Rotate Left"
                    className="flex-1"
                  >
                    <RotateCw className="h-4 w-4 scale-x-[-1]" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={rotateRight}
                    title="Rotate Right"
                    className="flex-1"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tilt Controls */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={decreaseTilt}
                    title="Decrease Tilt"
                    className="flex-1"
                  >
                    <Move3d className="h-4 w-4 rotate-180" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={increaseTilt}
                    title="Increase Tilt"
                    className="flex-1"
                  >
                    <Move3d className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tilt Indicator */}
                <div className="text-xs text-center text-muted-foreground">
                  Tilt: {tilt.toFixed(0)}° | Heading: {heading.toFixed(0)}°
                </div>
              </>
            )}

            {/* Reset View */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              className="w-full"
            >
              Reset View
            </Button>
          </div>
        </Card>
      )}

      {/* Info Badge */}
      {is3DEnabled && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground">
            🏙️ 3D Buildings Active • Use controls to rotate and tilt
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Load Google Maps script with 3D support
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
