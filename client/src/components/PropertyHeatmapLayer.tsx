// @ts-nocheck
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Flame, X } from 'lucide-react';

interface PropertyHeatmapLayerProps {
  map: google.maps.Map | null;
  enabled?: boolean;
}

/**
 * PropertyHeatmapLayer Component
 * 
 * Displays property listing density as a heatmap overlay
 * Features:
 * - Real-time property location data
 * - Adjustable intensity and radius
 * - Color gradient customization
 * - Performance optimized for large datasets
 */
export function PropertyHeatmapLayer({ map, enabled = false }: PropertyHeatmapLayerProps) {
  const [heatmap, setHeatmap] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const [intensity, setIntensity] = useState(1);
  const [radius, setRadius] = useState(20);

  // Fetch property locations for heatmap
  const { data: properties } = trpc.propertyHeatmap.getLocations.useQuery(
    undefined,
    { enabled: enabled && !!map }
  );

  useEffect(() => {
    if (!map || !enabled) {
      if (heatmap) {
        heatmap.setMap(null);
        setHeatmap(null);
      }
      return;
    }

    // Create heatmap data points
    const heatmapData: google.maps.LatLng[] = [];
    
    if (properties) {
      properties.forEach(property => {
        if (property.latitude && property.longitude) {
          heatmapData.push(
            new google.maps.LatLng(property.latitude, property.longitude)
          );
        }
      });
    }

    // Create or update heatmap layer
    if (!heatmap) {
      const newHeatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius,
        opacity: intensity,
      });
      setHeatmap(newHeatmap);
    } else {
      heatmap.setData(heatmapData);
      heatmap.setMap(map);
    }

    return () => {
      if (heatmap) {
        heatmap.setMap(null);
      }
    };
  }, [map, enabled, properties]);

  // Update heatmap intensity
  useEffect(() => {
    if (heatmap) {
      heatmap.setOptions({ opacity: intensity });
    }
  }, [heatmap, intensity]);

  // Update heatmap radius
  useEffect(() => {
    if (heatmap) {
      heatmap.setOptions({ radius });
    }
  }, [heatmap, radius]);

  return null; // This component only manages map overlays
}

/**
 * HeatmapControl Component
 * 
 * UI controls for heatmap visualization
 */
interface HeatmapControlProps {
  onToggle: (enabled: boolean) => void;
  enabled: boolean;
}

export function HeatmapControl({ onToggle, enabled }: HeatmapControlProps) {
  const [intensity, setIntensity] = useState(1);
  const [radius, setRadius] = useState(20);
  const [gradient, setGradient] = useState<'default' | 'blue' | 'green'>('default');

  const gradients = {
    default: [
      'rgba(0, 255, 255, 0)',
      'rgba(0, 255, 255, 1)',
      'rgba(0, 191, 255, 1)',
      'rgba(0, 127, 255, 1)',
      'rgba(0, 63, 255, 1)',
      'rgba(0, 0, 255, 1)',
      'rgba(0, 0, 223, 1)',
      'rgba(0, 0, 191, 1)',
      'rgba(0, 0, 159, 1)',
      'rgba(0, 0, 127, 1)',
      'rgba(63, 0, 91, 1)',
      'rgba(127, 0, 63, 1)',
      'rgba(191, 0, 31, 1)',
      'rgba(255, 0, 0, 1)'
    ],
    blue: [
      'rgba(0, 0, 255, 0)',
      'rgba(0, 0, 255, 0.2)',
      'rgba(0, 0, 255, 0.4)',
      'rgba(0, 0, 255, 0.6)',
      'rgba(0, 0, 255, 0.8)',
      'rgba(0, 0, 255, 1)'
    ],
    green: [
      'rgba(0, 255, 0, 0)',
      'rgba(0, 255, 0, 0.2)',
      'rgba(0, 255, 0, 0.4)',
      'rgba(0, 255, 0, 0.6)',
      'rgba(0, 255, 0, 0.8)',
      'rgba(0, 255, 0, 1)'
    ],
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Property Density Heatmap
          </CardTitle>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-4">
          {/* Intensity Slider */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Intensity: {intensity.toFixed(1)}
            </Label>
            <Slider
              value={[intensity]}
              onValueChange={([value]) => setIntensity(value)}
              min={0.1}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Radius Slider */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Radius: {radius}px
            </Label>
            <Slider
              value={[radius]}
              onValueChange={([value]) => setRadius(value)}
              min={10}
              max={50}
              step={5}
              className="w-full"
            />
          </div>

          {/* Gradient Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Color Gradient
            </Label>
            <div className="flex gap-2">
              <Button
                variant={gradient === 'default' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGradient('default')}
                className="flex-1"
              >
                Default
              </Button>
              <Button
                variant={gradient === 'blue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGradient('blue')}
                className="flex-1"
              >
                Blue
              </Button>
              <Button
                variant={gradient === 'green' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGradient('green')}
                className="flex-1"
              >
                Green
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Density Legend
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Low</span>
              <div 
                className="flex-1 h-4 rounded"
                style={{
                  background: `linear-gradient(to right, ${gradients[gradient].join(', ')})`
                }}
              />
              <span className="text-xs text-muted-foreground">High</span>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <p>
              <strong>Tip:</strong> Heatmap shows property listing concentration. 
              Darker areas indicate higher property density.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
