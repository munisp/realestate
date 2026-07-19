import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Building2, Sun, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Buildings3DToggleProps {
  map: google.maps.Map | null;
}

export default function Buildings3DToggle({ map }: Buildings3DToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [tilt, setTilt] = useState(45);
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    if (!map) return;

    if (enabled) {
      // Enable 3D buildings
      map.setTilt(tilt);
      map.setHeading(heading);
      
      // Set map type to satellite or hybrid for better 3D visualization
      // Keeping roadmap but with 3D buildings enabled
      const mapTypeId = map.getMapTypeId();
      if (mapTypeId !== 'satellite' && mapTypeId !== 'hybrid') {
        // Keep current map type but enable 3D
      }
    } else {
      // Disable 3D buildings (reset to 2D view)
      map.setTilt(0);
      map.setHeading(0);
    }
  }, [map, enabled, tilt, heading]);

  const toggle3D = () => {
    if (!map) return;
    
    if (!enabled) {
      // Enable 3D view
      setEnabled(true);
      map.setTilt(45);
      map.setHeading(0);
      
      // Zoom in a bit for better 3D effect if zoomed out
      const currentZoom = map.getZoom() || 11;
      if (currentZoom < 16) {
        map.setZoom(16);
      }
    } else {
      // Disable 3D view
      setEnabled(false);
      map.setTilt(0);
      map.setHeading(0);
    }
  };

  const rotate = (direction: 'left' | 'right') => {
    const newHeading = direction === 'left' ? heading - 45 : heading + 45;
    setHeading(newHeading % 360);
  };

  const adjustTilt = (value: number[]) => {
    setTilt(value[0]);
  };

  const resetView = () => {
    setHeading(0);
    setTilt(45);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          3D Buildings
          {enabled && <Badge variant="secondary" className="ml-auto">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          className="w-full"
          onClick={toggle3D}
        >
          {enabled ? "Disable" : "Enable"} 3D View
        </Button>

        {enabled && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Tilt Angle</span>
                <span className="font-medium">{tilt}°</span>
              </div>
              <Slider
                value={[tilt]}
                onValueChange={adjustTilt}
                min={0}
                max={75}
                step={15}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Top-down</span>
                <span>Angled</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs mb-2">
                <span>Rotation</span>
                <span className="font-medium">{heading}°</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rotate('left')}
                >
                  ← Rotate Left
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rotate('right')}
                >
                  Rotate Right →
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={resetView}
            >
              Reset View
            </Button>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Zoom in to see detailed 3D buildings in Victoria Island, Ikoyi, and Lekki high-rise areas
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium">Best Areas for 3D View:</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">Victoria Island</Badge>
                <Badge variant="outline" className="text-xs">Ikoyi</Badge>
                <Badge variant="outline" className="text-xs">Lekki Phase 1</Badge>
                <Badge variant="outline" className="text-xs">Eko Atlantic</Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
