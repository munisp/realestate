import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Layers, TrendingUp, Users, DollarSign, X } from 'lucide-react';

/**
 * Cluster Heatmap Overlay Component
 * 
 * Displays property density and price heatmaps on Google Maps
 * Supports three visualization modes:
 * - Density: Property concentration
 * - Price: Average price per area
 * - Combined: Density + Price gradient
 * 
 * Features:
 * - Adjustable intensity and radius
 * - Custom color gradients
 * - Price range legend
 * - Real-time updates
 */

interface ClusterHeatmapOverlayProps {
  map: google.maps.Map | null;
  properties: Array<{
    id: number;
    latitude: number | string;
    longitude: number | string;
    price: number | string;
  }>;
  mode?: 'density' | 'price' | 'combined';
  onModeChange?: (mode: 'density' | 'price' | 'combined') => void;
}

export function ClusterHeatmapOverlay({
  map,
  properties,
  mode = 'density',
  onModeChange,
}: ClusterHeatmapOverlayProps) {
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const [intensity, setIntensity] = useState<number>(1.0);
  const [radius, setRadius] = useState<number>(25);
  const [gradient, setGradient] = useState<string>('default');
  const [priceRanges, setPriceRanges] = useState<Array<{ min: number; max: number; color: string; label: string }>>([]);
  const [showLegend, setShowLegend] = useState<boolean>(true);

  // Color gradients
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
      'rgba(255, 0, 0, 1)',
    ],
    price: [
      'rgba(0, 255, 0, 0)',     // Transparent green (low price)
      'rgba(0, 255, 0, 1)',     // Green
      'rgba(127, 255, 0, 1)',   // Yellow-green
      'rgba(255, 255, 0, 1)',   // Yellow
      'rgba(255, 191, 0, 1)',   // Orange-yellow
      'rgba(255, 127, 0, 1)',   // Orange
      'rgba(255, 63, 0, 1)',    // Red-orange
      'rgba(255, 0, 0, 1)',     // Red (high price)
    ],
    blue: [
      'rgba(0, 0, 255, 0)',
      'rgba(0, 0, 255, 1)',
      'rgba(0, 127, 255, 1)',
      'rgba(0, 191, 255, 1)',
      'rgba(0, 255, 255, 1)',
    ],
    green: [
      'rgba(0, 255, 0, 0)',
      'rgba(0, 255, 0, 1)',
      'rgba(127, 255, 127, 1)',
      'rgba(191, 255, 191, 1)',
      'rgba(255, 255, 255, 1)',
    ],
  };

  /**
   * Calculate price ranges for legend
   */
  useEffect(() => {
    if (properties.length === 0) return;

    const prices = properties.map(p => parseFloat(String(p.price)));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    const step = range / 5;

    const ranges = [];
    for (let i = 0; i < 5; i++) {
      const min = minPrice + (step * i);
      const max = minPrice + (step * (i + 1));
      
      // Color based on price level
      const colors = ['#10b981', '#84cc16', '#eab308', '#f97316', '#dc2626'];
      
      ranges.push({
        min,
        max,
        color: colors[i],
        label: formatPriceRange(min, max),
      });
    }

    setPriceRanges(ranges);
  }, [properties]);

  /**
   * Format price range for display
   */
  function formatPriceRange(min: number, max: number): string {
    const formatPrice = (price: number) => {
      if (price >= 1_000_000_000) {
        return `₦${(price / 1_000_000_000).toFixed(1)}B`;
      }
      if (price >= 1_000_000) {
        return `₦${(price / 1_000_000).toFixed(1)}M`;
      }
      if (price >= 1_000) {
        return `₦${(price / 1_000).toFixed(0)}K`;
      }
      return `₦${price.toFixed(0)}`;
    };

    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }

  /**
   * Create or update heatmap layer
   */
  useEffect(() => {
    if (!map || !window.google) return;

    // Remove existing layer
    if (heatmapLayer) {
      heatmapLayer.setMap(null);
    }

    // Create heatmap data
    const heatmapData: google.maps.visualization.WeightedLocation[] = [];

    properties.forEach(property => {
      const lat = parseFloat(String(property.latitude));
      const lng = parseFloat(String(property.longitude));
      const price = parseFloat(String(property.price));

      if (isNaN(lat) || isNaN(lng) || isNaN(price)) return;

      const location = new google.maps.LatLng(lat, lng);

      // Calculate weight based on mode
      let weight = 1;

      if (mode === 'price') {
        // Weight by price (normalized)
        const prices = properties.map(p => parseFloat(String(p.price)));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        weight = maxPrice > minPrice ? (price - minPrice) / (maxPrice - minPrice) : 1;
      } else if (mode === 'combined') {
        // Combined: density (1) + price weight (0-1)
        const prices = properties.map(p => parseFloat(String(p.price)));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceWeight = maxPrice > minPrice ? (price - minPrice) / (maxPrice - minPrice) : 0.5;
        weight = 1 + priceWeight; // 1-2 range
      }

      heatmapData.push({
        location,
        weight,
      });
    });

    // Create new heatmap layer
    const newHeatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map,
    });

    // Configure heatmap options
    const selectedGradient = mode === 'price' ? gradients.price : gradients[gradient as keyof typeof gradients] || gradients.default;
    
    newHeatmap.set('radius', radius);
    newHeatmap.set('opacity', intensity);
    newHeatmap.set('gradient', selectedGradient);

    setHeatmapLayer(newHeatmap);

    // Cleanup
    return () => {
      newHeatmap.setMap(null);
    };
  }, [map, properties, mode, intensity, radius, gradient]);

  /**
   * Update heatmap options when controls change
   */
  useEffect(() => {
    if (!heatmapLayer) return;

    heatmapLayer.set('radius', radius);
    heatmapLayer.set('opacity', intensity);
    
    const selectedGradient = mode === 'price' ? gradients.price : gradients[gradient as keyof typeof gradients] || gradients.default;
    heatmapLayer.set('gradient', selectedGradient);
  }, [heatmapLayer, intensity, radius, gradient, mode]);

  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      {/* Controls Card */}
      <Card className="p-4 w-80 bg-white/95 backdrop-blur shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Heatmap Overlay</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLegend(!showLegend)}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <Label>Visualization Mode</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => onModeChange?.(value as 'density' | 'price' | 'combined')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="density" id="density" />
              <Label htmlFor="density" className="flex items-center gap-2 cursor-pointer">
                <Users className="w-4 h-4" />
                Density
                <Badge variant="secondary" className="text-xs">Property Count</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="price" id="price" />
              <Label htmlFor="price" className="flex items-center gap-2 cursor-pointer">
                <DollarSign className="w-4 h-4" />
                Price
                <Badge variant="secondary" className="text-xs">Average Price</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="combined" id="combined" />
              <Label htmlFor="combined" className="flex items-center gap-2 cursor-pointer">
                <TrendingUp className="w-4 h-4" />
                Combined
                <Badge variant="secondary" className="text-xs">Density + Price</Badge>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Intensity Control */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <Label>Intensity</Label>
            <span className="text-sm text-muted-foreground">{intensity.toFixed(1)}</span>
          </div>
          <Slider
            value={[intensity]}
            onValueChange={(value) => setIntensity(value[0])}
            min={0.1}
            max={2.0}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Radius Control */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <Label>Radius</Label>
            <span className="text-sm text-muted-foreground">{radius}px</span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={(value) => setRadius(value[0])}
            min={10}
            max={50}
            step={5}
            className="w-full"
          />
        </div>

        {/* Gradient Selection (only for density mode) */}
        {mode === 'density' && (
          <div className="space-y-2 mt-4">
            <Label>Color Gradient</Label>
            <RadioGroup value={gradient} onValueChange={setGradient}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default" className="cursor-pointer">Default (Blue-Red)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blue" id="blue" />
                <Label htmlFor="blue" className="cursor-pointer">Blue</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="green" id="green" />
                <Label htmlFor="green" className="cursor-pointer">Green</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Property Count */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Properties</span>
            <span className="font-semibold">{properties.length.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Legend Card */}
      {showLegend && mode === 'price' && priceRanges.length > 0 && (
        <Card className="p-4 w-80 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Price Ranges</h4>
          </div>
          <div className="space-y-2">
            {priceRanges.map((range, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: range.color }}
                />
                <span className="text-sm">{range.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <p>Green = Lower prices</p>
            <p>Red = Higher prices</p>
          </div>
        </Card>
      )}

      {/* Density Legend */}
      {showLegend && mode === 'density' && (
        <Card className="p-4 w-80 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Density Legend</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm">Low density</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm">Medium density</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm">High density</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <p>Darker colors = More properties</p>
          </div>
        </Card>
      )}

      {/* Combined Legend */}
      {showLegend && mode === 'combined' && (
        <Card className="p-4 w-80 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Combined Metrics</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Intensity</p>
              <p className="text-xs text-muted-foreground">
                Based on property density (more properties = brighter)
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Color</p>
              <p className="text-xs text-muted-foreground">
                Based on average price (green = low, red = high)
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
