// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { MapView } from './Map';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Layers, MapPin, TrendingUp, Home, DollarSign } from 'lucide-react';

interface Property {
  id: number;
  title: string;
  location: { lat: number; lng: number };
  price: number;
  h3Index: string;
  distance?: number;
}

interface GeospatialMapProps {
  properties: Property[];
  searchCenter?: { lat: number; lng: number };
  radius?: number; // in kilometers
  onLocationClick?: (lat: number, lng: number) => void;
  showHeatmap?: boolean;
  heatmapData?: Array<{ lat: number; lng: number; weight: number }>;
}

export function GeospatialMap({
  properties,
  searchCenter,
  radius = 5,
  onLocationClick,
  showHeatmap = false,
  heatmapData,
}: GeospatialMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [google, setGoogle] = useState<typeof window.google | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const [radiusCircle, setRadiusCircle] = useState<google.maps.Circle | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Initialize map
  const handleMapReady = (mapInstance: google.maps.Map, googleInstance: typeof window.google) => {
    setMap(mapInstance);
    setGoogle(googleInstance);

    // Create info window
    infoWindowRef.current = new googleInstance.maps.InfoWindow();

    // Add click listener for setting search center
    if (onLocationClick) {
      mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onLocationClick(e.latLng.lat(), e.latLng.lng());
        }
      });
    }
  };

  // Update radius circle
  useEffect(() => {
    if (!map || !google || !searchCenter) return;

    // Remove old circle
    if (radiusCircle) {
      radiusCircle.setMap(null);
    }

    // Create new circle
    const circle = new google.maps.Circle({
      map,
      center: searchCenter,
      radius: radius * 1000, // Convert km to meters
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      strokeColor: '#3b82f6',
      strokeWeight: 2,
      strokeOpacity: 0.8,
    });

    setRadiusCircle(circle);

    // Add center marker
    new google.maps.Marker({
      position: searchCenter,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      title: 'Search Center',
    });

    // Center map on search location
    map.setCenter(searchCenter);
    map.setZoom(12);

    return () => {
      circle.setMap(null);
    };
  }, [map, google, searchCenter, radius]);

  // Update property markers
  useEffect(() => {
    if (!map || !google) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    properties.forEach((property) => {
      const marker = new google.maps.Marker({
        position: property.location,
        map,
        title: property.title,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#ef4444',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: 180,
        },
      });

      // Add click listener
      marker.addListener('click', () => {
        setSelectedProperty(property);
        
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="padding: 12px; max-width: 250px;">
              <h3 style="font-weight: 600; margin-bottom: 8px;">${property.title}</h3>
              <div style="display: flex; align-items: center; gap: 4px; font-size: 20px; font-weight: 700; color: #3b82f6; margin-bottom: 8px;">
                <span>$${property.price.toLocaleString()}</span>
              </div>
              ${property.distance ? `
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
                  ${property.distance < 1000 
                    ? `${Math.round(property.distance)}m away`
                    : `${(property.distance / 1000).toFixed(1)}km away`
                  }
                </div>
              ` : ''}
              <div style="font-size: 12px; color: #9ca3af;">
                H3: ${property.h3Index}
              </div>
              <button 
                onclick="window.location.href='/property/${property.id}'"
                style="margin-top: 12px; width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;"
              >
                View Details
              </button>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (properties.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      properties.forEach((property) => {
        bounds.extend(property.location);
      });
      map.fitBounds(bounds);
    }
  }, [map, google, properties]);

  // Update heatmap
  useEffect(() => {
    if (!map || !google) return;

    // Remove old heatmap
    if (heatmapLayer) {
      heatmapLayer.setMap(null);
    }

    if (showHeatmap && heatmapData && heatmapData.length > 0) {
      const heatmapPoints = heatmapData.map(
        (point) =>
          new google.maps.LatLng(point.lat, point.lng)
      );

      const newHeatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapPoints,
        map,
        radius: 30,
        opacity: 0.6,
      });

      setHeatmapLayer(newHeatmap);
    }

    return () => {
      if (heatmapLayer) {
        heatmapLayer.setMap(null);
      }
    };
  }, [map, google, showHeatmap, heatmapData]);

  return (
    <div className="relative w-full h-full">
      <MapView onMapReady={handleMapReady} />

      {/* Map Controls Overlay */}
      {showControls && (
        <div className="absolute top-4 right-4 space-y-2 z-10">
          <Card className="w-64">
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Map Layers
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clustering" className="text-sm">
                      Marker Clustering
                    </Label>
                    <Switch
                      id="clustering"
                      checked={clusteringEnabled}
                      onCheckedChange={setClusteringEnabled}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Properties</span>
                  <Badge variant="secondary">{properties.length}</Badge>
                </div>
                {searchCenter && (
                  <div className="text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {searchCenter.lat.toFixed(4)}, {searchCenter.lng.toFixed(4)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Property Card */}
          {selectedProperty && (
            <Card className="w-64">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm">{selectedProperty.title}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProperty(null)}
                  >
                    ×
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xl font-bold text-primary mb-2">
                  <DollarSign className="w-5 h-5" />
                  {selectedProperty.price.toLocaleString()}
                </div>
                {selectedProperty.distance && (
                  <div className="text-sm text-muted-foreground mb-2">
                    {selectedProperty.distance < 1000
                      ? `${Math.round(selectedProperty.distance)}m away`
                      : `${(selectedProperty.distance / 1000).toFixed(1)}km away`}
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => (window.location.href = `/property/${selectedProperty.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Toggle Controls Button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute bottom-4 right-4 z-10"
        onClick={() => setShowControls(!showControls)}
      >
        <Layers className="w-4 h-4 mr-2" />
        {showControls ? 'Hide' : 'Show'} Controls
      </Button>
    </div>
  );
}
