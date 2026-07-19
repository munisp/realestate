import { useState, useEffect, useRef } from 'react';
import { MapView } from '@/components/Map';
import { ClusterHeatmapOverlay } from '@/components/ClusterHeatmapOverlay';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeftRight,
  Lock,
  Unlock,
  X,
  Maximize2,
  SplitSquareHorizontal,
} from 'lucide-react';

/**
 * Map Comparison View Component
 * 
 * Side-by-side map comparison for analyzing different visualizations
 * 
 * Features:
 * - Dual synchronized maps
 * - Independent heatmap mode selection
 * - Synchronized zoom and pan (lockable)
 * - Swap views
 * - Full-screen mode
 * - Comparison controls
 */

interface MapComparisonViewProps {
  properties: Array<{
    id: number;
    latitude: number | string;
    longitude: number | string;
    price: number | string;
  }>;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onClose?: () => void;
}

export function MapComparisonView({
  properties,
  initialCenter = { lat: 6.5244, lng: 3.3792 },
  initialZoom = 12,
  onClose,
}: MapComparisonViewProps) {
  // Map instances
  const [mapLeft, setMapLeft] = useState<google.maps.Map | null>(null);
  const [mapRight, setMapRight] = useState<google.maps.Map | null>(null);

  // Heatmap modes
  const [leftMode, setLeftMode] = useState<'density' | 'price' | 'combined'>('density');
  const [rightMode, setRightMode] = useState<'density' | 'price' | 'combined'>('price');

  // Synchronization
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Prevent infinite loop during sync
  const syncingRef = useRef(false);

  /**
   * Synchronize map movements
   */
  useEffect(() => {
    if (!mapLeft || !mapRight || !syncEnabled) return;

    const syncMaps = (source: google.maps.Map, target: google.maps.Map) => {
      if (syncingRef.current) return;

      syncingRef.current = true;

      const center = source.getCenter();
      const zoom = source.getZoom();

      if (center && zoom !== undefined) {
        target.setCenter(center);
        target.setZoom(zoom);
      }

      setTimeout(() => {
        syncingRef.current = false;
      }, 100);
    };

    // Listen to left map changes
    const leftBoundsListener = mapLeft.addListener('bounds_changed', () => {
      syncMaps(mapLeft, mapRight);
    });

    // Listen to right map changes
    const rightBoundsListener = mapRight.addListener('bounds_changed', () => {
      syncMaps(mapRight, mapLeft);
    });

    return () => {
      google.maps.event.removeListener(leftBoundsListener);
      google.maps.event.removeListener(rightBoundsListener);
    };
  }, [mapLeft, mapRight, syncEnabled]);

  /**
   * Swap heatmap modes between left and right
   */
  const handleSwapModes = () => {
    const temp = leftMode;
    setLeftMode(rightMode);
    setRightMode(temp);
  };

  /**
   * Toggle fullscreen mode
   */
  const handleToggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative'}`}>
      {/* Header Controls */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <SplitSquareHorizontal className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Map Comparison</h3>
            </div>

            <Badge variant="secondary" className="text-xs">
              {properties.length.toLocaleString()} properties
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Toggle */}
            <Button
              variant={syncEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSyncEnabled(!syncEnabled)}
            >
              {syncEnabled ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Synced
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Independent
                </>
              )}
            </Button>

            {/* Swap Modes */}
            <Button variant="outline" size="sm" onClick={handleSwapModes}>
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Swap
            </Button>

            {/* Fullscreen */}
            <Button variant="outline" size="sm" onClick={handleToggleFullscreen}>
              <Maximize2 className="w-4 h-4" />
            </Button>

            {/* Close */}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Left Map Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Left Map</Label>
            <RadioGroup value={leftMode} onValueChange={(value) => setLeftMode(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="density" id="left-density" />
                <Label htmlFor="left-density" className="cursor-pointer text-sm">
                  Density
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price" id="left-price" />
                <Label htmlFor="left-price" className="cursor-pointer text-sm">
                  Price
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="combined" id="left-combined" />
                <Label htmlFor="left-combined" className="cursor-pointer text-sm">
                  Combined
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Right Map Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Right Map</Label>
            <RadioGroup value={rightMode} onValueChange={(value) => setRightMode(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="density" id="right-density" />
                <Label htmlFor="right-density" className="cursor-pointer text-sm">
                  Density
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price" id="right-price" />
                <Label htmlFor="right-price" className="cursor-pointer text-sm">
                  Price
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="combined" id="right-combined" />
                <Label htmlFor="right-combined" className="cursor-pointer text-sm">
                  Combined
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Sync Status */}
        {syncEnabled && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg">
            <p className="text-sm text-primary">
              <Lock className="w-4 h-4 inline mr-2" />
              Maps are synchronized. Pan and zoom will affect both maps.
            </p>
          </div>
        )}
      </Card>

      {/* Dual Maps */}
      <div className="grid grid-cols-2 gap-4" style={{ height: fullscreen ? 'calc(100vh - 200px)' : '600px' }}>
        {/* Left Map */}
        <div className="relative border rounded-lg overflow-hidden">
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-primary text-white">
              {leftMode.charAt(0).toUpperCase() + leftMode.slice(1)} Mode
            </Badge>
          </div>
          
          <MapView
            onMapReady={(map) => {
              setMapLeft(map);
              map.setCenter(initialCenter);
              map.setZoom(initialZoom);
            }}
            className="w-full h-full"
          />

          {mapLeft && (
            <ClusterHeatmapOverlay
              map={mapLeft}
              properties={properties}
              mode={leftMode}
              onModeChange={setLeftMode}
            />
          )}
        </div>

        {/* Right Map */}
        <div className="relative border rounded-lg overflow-hidden">
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-secondary text-white">
              {rightMode.charAt(0).toUpperCase() + rightMode.slice(1)} Mode
            </Badge>
          </div>
          
          <MapView
            onMapReady={(map) => {
              setMapRight(map);
              map.setCenter(initialCenter);
              map.setZoom(initialZoom);
            }}
            className="w-full h-full"
          />

          {mapRight && (
            <ClusterHeatmapOverlay
              map={mapRight}
              properties={properties}
              mode={rightMode}
              onModeChange={setRightMode}
            />
          )}
        </div>
      </div>

      {/* Comparison Insights */}
      <Card className="p-4 mt-4">
        <h4 className="font-semibold mb-3">Comparison Insights</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-2">Left Map ({leftMode})</p>
            <ul className="space-y-1">
              {leftMode === 'density' && (
                <>
                  <li>• Shows property concentration</li>
                  <li>• Blue = Low density</li>
                  <li>• Red = High density</li>
                </>
              )}
              {leftMode === 'price' && (
                <>
                  <li>• Shows average prices</li>
                  <li>• Green = Lower prices</li>
                  <li>• Red = Higher prices</li>
                </>
              )}
              {leftMode === 'combined' && (
                <>
                  <li>• Shows density + price</li>
                  <li>• Intensity = Density</li>
                  <li>• Color = Price level</li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-muted-foreground mb-2">Right Map ({rightMode})</p>
            <ul className="space-y-1">
              {rightMode === 'density' && (
                <>
                  <li>• Shows property concentration</li>
                  <li>• Blue = Low density</li>
                  <li>• Red = High density</li>
                </>
              )}
              {rightMode === 'price' && (
                <>
                  <li>• Shows average prices</li>
                  <li>• Green = Lower prices</li>
                  <li>• Red = Higher prices</li>
                </>
              )}
              {rightMode === 'combined' && (
                <>
                  <li>• Shows density + price</li>
                  <li>• Intensity = Density</li>
                  <li>• Color = Price level</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">💡 Tips</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Compare density vs. price to find undervalued high-density areas</li>
            <li>• Use sync mode to analyze the same area with different visualizations</li>
            <li>• Disable sync to explore different regions simultaneously</li>
            <li>• Swap modes to quickly compare opposite visualizations</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
