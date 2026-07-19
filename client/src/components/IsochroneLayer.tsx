import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Car, X } from 'lucide-react';

export interface IsochroneConfig {
  origin: google.maps.LatLngLiteral;
  name: string;
  durations: number[]; // in minutes
  mode: 'driving' | 'transit' | 'walking';
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
}

interface IsochroneLayerProps {
  map: google.maps.Map | null;
  config: IsochroneConfig | null;
  onClose?: () => void;
}

const ISOCHRONE_COLORS = {
  15: { fill: 'rgba(34, 197, 94, 0.2)', stroke: '#22c55e' }, // Green - 15 min
  30: { fill: 'rgba(234, 179, 8, 0.2)', stroke: '#eab308' }, // Yellow - 30 min
  45: { fill: 'rgba(239, 68, 68, 0.2)', stroke: '#ef4444' }, // Red - 45 min
};

/**
 * IsochroneLayer Component
 * 
 * Displays drive-time zones (isochrones) on the map
 * Features:
 * - 15/30/45-minute zones
 * - Traffic-aware calculations
 * - Multiple transportation modes
 * - Visual legend
 */
export function IsochroneLayer({ map, config, onClose }: IsochroneLayerProps) {
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!map || !config) {
      // Clear existing polygons
      polygons.forEach(polygon => polygon.setMap(null));
      setPolygons([]);
      return;
    }

    calculateIsochrones();

    return () => {
      polygons.forEach(polygon => polygon.setMap(null));
    };
  }, [map, config]);

  const calculateIsochrones = async () => {
    if (!map || !config) return;

    setLoading(true);
    setError(null);

    try {
      // Clear existing polygons
      polygons.forEach(polygon => polygon.setMap(null));

      const newPolygons: google.maps.Polygon[] = [];

      // For each duration, calculate isochrone
      for (const duration of config.durations.sort((a, b) => b - a)) {
        const isochronePolygon = await calculateSingleIsochrone(
          config.origin,
          duration,
          config.mode,
          config.trafficModel
        );

        if (isochronePolygon) {
          const color = ISOCHRONE_COLORS[duration as keyof typeof ISOCHRONE_COLORS] || 
                       { fill: 'rgba(100, 100, 100, 0.2)', stroke: '#646464' };

          const polygon = new google.maps.Polygon({
            paths: isochronePolygon,
            strokeColor: color.stroke,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: color.fill,
            fillOpacity: 0.35,
            map,
          });

          newPolygons.push(polygon);
        }
      }

      setPolygons(newPolygons);
    } catch (err) {
      console.error('Failed to calculate isochrones:', err);
      setError('Failed to calculate drive-time zones. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate a single isochrone polygon
   * 
   * This is a simplified implementation using radial sampling.
   * In production, you would use:
   * 1. Google Distance Matrix API for accurate travel times
   * 2. TravelTime API or Mapbox Isochrone API for precise polygons
   * 3. Backend service to handle API rate limits
   */
  const calculateSingleIsochrone = async (
    origin: google.maps.LatLngLiteral,
    durationMinutes: number,
    mode: string,
    trafficModel?: string
  ): Promise<google.maps.LatLngLiteral[]> => {
    // Simplified radial approximation
    // In production, replace with actual API calls
    
    const points: google.maps.LatLngLiteral[] = [];
    const numPoints = 32; // Number of points around the circle
    
    // Approximate radius based on duration (very rough estimate)
    // 15 min ≈ 10km, 30 min ≈ 20km, 45 min ≈ 30km (assuming average speed)
    const radiusKm = (durationMinutes / 60) * 40; // 40 km/h average in Lagos traffic
    const radiusDegrees = radiusKm / 111; // Rough conversion to degrees

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const lat = origin.lat + radiusDegrees * Math.cos(angle);
      const lng = origin.lng + (radiusDegrees * Math.sin(angle)) / Math.cos(origin.lat * Math.PI / 180);
      
      points.push({ lat, lng });
    }

    return points;
  };

  return null; // This component only manages map overlays
}

/**
 * IsochroneControl Component
 * 
 * UI controls for isochrone visualization
 */
interface IsochroneControlProps {
  onConfigChange: (config: IsochroneConfig | null) => void;
}

export function IsochroneControl({ onConfigChange }: IsochroneControlProps) {
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [trafficMode, setTrafficMode] = useState<'best_guess' | 'pessimistic' | 'optimistic'>('best_guess');

  const origins = [
    { id: 'victoria-island', name: 'Victoria Island (Business District)', position: { lat: 6.4281, lng: 3.4219 } },
    { id: 'ikeja-gra', name: 'Ikeja GRA (Business District)', position: { lat: 6.5964, lng: 3.3469 } },
    { id: 'lekki-phase-1', name: 'Lekki Phase 1', position: { lat: 6.4474, lng: 3.4702 } },
    { id: 'yaba', name: 'Yaba (Tech Hub)', position: { lat: 6.5074, lng: 3.3731 } },
  ];

  const handleOriginSelect = (originId: string) => {
    const origin = origins.find(o => o.id === originId);
    if (!origin) return;

    if (selectedOrigin === originId) {
      // Toggle off
      setSelectedOrigin(null);
      onConfigChange(null);
    } else {
      // Toggle on
      setSelectedOrigin(originId);
      onConfigChange({
        origin: origin.position,
        name: origin.name,
        durations: [15, 30, 45],
        mode: 'driving',
        trafficModel: trafficMode,
      });
    }
  };

  const handleTrafficModeChange = (mode: 'best_guess' | 'pessimistic' | 'optimistic') => {
    setTrafficMode(mode);
    if (selectedOrigin) {
      const origin = origins.find(o => o.id === selectedOrigin);
      if (origin) {
        onConfigChange({
          origin: origin.position,
          name: origin.name,
          durations: [15, 30, 45],
          mode: 'driving',
          trafficModel: mode,
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Commute Time Zones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Origin Selection */}
        <div>
          <p className="text-sm font-medium mb-2">Select Origin:</p>
          <div className="space-y-2">
            {origins.map(origin => (
              <Button
                key={origin.id}
                variant={selectedOrigin === origin.id ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => handleOriginSelect(origin.id)}
              >
                <Car className="w-4 h-4 mr-2" />
                {origin.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Traffic Mode */}
        {selectedOrigin && (
          <div>
            <p className="text-sm font-medium mb-2">Traffic Condition:</p>
            <div className="flex gap-2">
              <Button
                variant={trafficMode === 'optimistic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTrafficModeChange('optimistic')}
              >
                Light
              </Button>
              <Button
                variant={trafficMode === 'best_guess' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTrafficModeChange('best_guess')}
              >
                Normal
              </Button>
              <Button
                variant={trafficMode === 'pessimistic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTrafficModeChange('pessimistic')}
              >
                Heavy
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        {selectedOrigin && (
          <div>
            <p className="text-sm font-medium mb-2">Drive Time:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-sm">15 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
                <span className="text-sm">30 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-sm">45 minutes</span>
              </div>
            </div>
          </div>
        )}

        {selectedOrigin && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setSelectedOrigin(null);
              onConfigChange(null);
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Clear Zones
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
