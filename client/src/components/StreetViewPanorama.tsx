import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Navigation, ZoomIn, ZoomOut } from 'lucide-react';

interface StreetViewPanoramaProps {
  position: google.maps.LatLngLiteral;
  onClose?: () => void;
  heading?: number;
  pitch?: number;
  zoom?: number;
  className?: string;
}

/**
 * StreetViewPanorama Component
 * 
 * Displays Google Street View panorama for virtual neighborhood exploration
 * Features:
 * - 360° panoramic view
 * - Navigation controls
 * - Zoom controls
 * - Heading and pitch adjustment
 */
export function StreetViewPanorama({
  position,
  onClose,
  heading = 0,
  pitch = 0,
  zoom = 1,
  className = '',
}: StreetViewPanoramaProps) {
  const panoramaRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (!panoramaRef.current) return;

    // Initialize Street View panorama
    const panorama = new google.maps.StreetViewPanorama(panoramaRef.current, {
      position,
      pov: {
        heading,
        pitch,
      },
      zoom,
      addressControl: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
      zoomControl: true,
      fullscreenControl: true,
    });

    streetViewRef.current = panorama;

    // Check if Street View is available at this location
    const streetViewService = new google.maps.StreetViewService();
    streetViewService.getPanorama(
      { location: position, radius: 50 },
      (data, status) => {
        if (status !== google.maps.StreetViewStatus.OK) {
          console.warn('Street View not available at this location');
        }
      }
    );

    return () => {
      // Cleanup
      if (streetViewRef.current) {
        streetViewRef.current = null;
      }
    };
  }, [position, heading, pitch, zoom]);

  const handleZoomIn = () => {
    if (streetViewRef.current) {
      const currentZoom = streetViewRef.current.getZoom();
      streetViewRef.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (streetViewRef.current) {
      const currentZoom = streetViewRef.current.getZoom();
      streetViewRef.current.setZoom(Math.max(0, currentZoom - 1));
    }
  };

  const handleResetView = () => {
    if (streetViewRef.current) {
      streetViewRef.current.setPov({ heading: 0, pitch: 0 });
      streetViewRef.current.setZoom(1);
    }
  };

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Street View Container */}
      <div ref={panoramaRef} className="w-full h-full min-h-[400px]" />

      {/* Custom Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {onClose && (
          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
            className="shadow-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        
        <Button
          variant="secondary"
          size="icon"
          onClick={handleResetView}
          className="shadow-lg"
          title="Reset View"
        >
          <Navigation className="w-4 h-4" />
        </Button>

        <div className="flex flex-col gap-1">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="shadow-lg"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="shadow-lg"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground">
          Use mouse to navigate • Arrow keys to move • Scroll to zoom
        </p>
      </div>
    </Card>
  );
}

/**
 * StreetViewThumbnail Component
 * 
 * Shows a static Street View thumbnail that opens full panorama on click
 */
interface StreetViewThumbnailProps {
  position: google.maps.LatLngLiteral;
  heading?: number;
  pitch?: number;
  width?: number;
  height?: number;
  onClick?: () => void;
  className?: string;
}

export function StreetViewThumbnail({
  position,
  heading = 0,
  pitch = 0,
  width = 400,
  height = 300,
  onClick,
  className = '',
}: StreetViewThumbnailProps) {
  // Google Street View Static API URL
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const thumbnailUrl = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${position.lat},${position.lng}&heading=${heading}&pitch=${pitch}&key=${apiKey}`;

  return (
    <div
      className={`relative cursor-pointer group overflow-hidden rounded-lg ${className}`}
      onClick={onClick}
    >
      <img
        src={thumbnailUrl}
        alt="Street View"
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="text-white text-center">
          <Navigation className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-medium">Open Street View</p>
        </div>
      </div>
    </div>
  );
}
