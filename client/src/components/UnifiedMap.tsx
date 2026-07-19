// @ts-nocheck
import { useMapProvider } from '@/contexts/MapProviderContext';
import { MapView } from './Map'; // Google Maps component
import { MapLibreMap } from './MapLibreMap';
import { Button } from './ui/button';
import { MapPin } from 'lucide-react';

interface UnifiedMapProps {
  center?: { lat: number; lng: number } | [number, number];
  zoom?: number;
  className?: string;
  onMapReady?: (map: any) => void;
  markers?: Array<{
    id: string | number;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    title?: string;
    price?: number;
    onClick?: () => void;
  }>;
  showControls?: boolean;
  show3DBuildings?: boolean;
  showProviderToggle?: boolean;
}

/**
 * Unified Map Component
 * Automatically switches between Google Maps and MapLibre based on user preference
 * 
 * Features:
 * - Seamless provider switching
 * - Consistent API across providers
 * - Feature flag support
 * - A/B testing ready
 */
export function UnifiedMap({
  center,
  zoom = 12,
  className = 'w-full h-[600px]',
  onMapReady,
  markers = [],
  showControls = true,
  show3DBuildings = false,
  showProviderToggle = true,
}: UnifiedMapProps) {
  const { provider, toggleProvider, isMapLibreEnabled } = useMapProvider();

  // Normalize center format
  const normalizedCenter = Array.isArray(center)
    ? { lat: center[1], lng: center[0] }
    : center || { lat: 6.5244, lng: 3.3792 }; // Lagos default

  // Normalize markers format
  const normalizedMarkers = markers.map((m) => ({
    id: m.id,
    lat: m.lat || m.latitude || 0,
    lng: m.lng || m.longitude || 0,
    title: m.title,
    price: m.price,
    onClick: m.onClick,
  }));

  return (
    <div className="relative">
      {/* Provider toggle button */}
      {showProviderToggle && isMapLibreEnabled && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleProvider}
            className="bg-white shadow-md"
          >
            <MapPin className="mr-2 h-4 w-4" />
            {provider === 'google' ? 'Switch to MapLibre' : 'Switch to Google Maps'}
          </Button>
        </div>
      )}

      {/* Provider badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white px-3 py-1 rounded-full shadow-md text-xs font-medium">
          {provider === 'google' ? '🗺️ Google Maps' : '🌍 MapLibre (Open Source)'}
        </div>
      </div>

      {/* Render appropriate map */}
      {provider === 'google' ? (
        <MapView
          center={normalizedCenter}
          zoom={zoom}
          onMapReady={onMapReady}
          className={className}
        />
      ) : (
        <MapLibreMap
          center={[normalizedCenter.lng, normalizedCenter.lat]}
          zoom={zoom}
          className={className}
          onMapReady={onMapReady}
          markers={normalizedMarkers}
          showControls={showControls}
          show3DBuildings={show3DBuildings}
        />
      )}
    </div>
  );
}

export default UnifiedMap;
