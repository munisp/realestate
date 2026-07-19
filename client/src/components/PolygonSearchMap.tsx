// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { MapView } from './Map';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Pencil,
  Trash2,
  Save,
  X,
  MapPin,
  Square,
  Circle,
  Polygon as PolygonIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface PolygonSearchMapProps {
  onPolygonComplete?: (coordinates: Array<{ lat: number; lng: number }>) => void;
  onPolygonDelete?: () => void;
  savedPolygons?: Array<{
    id: string;
    name: string;
    coordinates: Array<{ lat: number; lng: number }>;
  }>;
}

export function PolygonSearchMap({
  onPolygonComplete,
  onPolygonDelete,
  savedPolygons = [],
}: PolygonSearchMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [google, setGoogle] = useState<typeof window.google | null>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(
    null
  );
  const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonArea, setPolygonArea] = useState<number>(0);
  const [polygonName, setPolygonName] = useState<string>('');
  const savedPolygonsRef = useRef<google.maps.Polygon[]>([]);

  const handleMapReady = (mapInstance: google.maps.Map, googleInstance: typeof window.google) => {
    setMap(mapInstance);
    setGoogle(googleInstance);

    // Initialize Drawing Manager
    const manager = new googleInstance.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        strokeColor: '#3b82f6',
        strokeWeight: 2,
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    manager.setMap(mapInstance);
    setDrawingManager(manager);

    // Listen for polygon complete
    googleInstance.maps.event.addListener(
      manager,
      'polygoncomplete',
      (polygon: google.maps.Polygon) => {
        handlePolygonComplete(polygon);
      }
    );
  };

  const handlePolygonComplete = (polygon: google.maps.Polygon) => {
    // Remove previous polygon if exists
    if (currentPolygon) {
      currentPolygon.setMap(null);
    }

    setCurrentPolygon(polygon);
    setIsDrawing(false);

    // Calculate area
    const path = polygon.getPath();
    const area = google!.maps.geometry.spherical.computeArea(path);
    setPolygonArea(area);

    // Get coordinates
    const coordinates = path.getArray().map((latLng) => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    // Stop drawing mode
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }

    toast.success('Polygon drawn! You can now edit or save it.');

    if (onPolygonComplete) {
      onPolygonComplete(coordinates);
    }

    // Listen for path changes (editing)
    google!.maps.event.addListener(path, 'set_at', () => {
      updatePolygonArea(polygon);
    });

    google!.maps.event.addListener(path, 'insert_at', () => {
      updatePolygonArea(polygon);
    });
  };

  const updatePolygonArea = (polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const area = google!.maps.geometry.spherical.computeArea(path);
    setPolygonArea(area);

    const coordinates = path.getArray().map((latLng) => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    if (onPolygonComplete) {
      onPolygonComplete(coordinates);
    }
  };

  const startDrawing = () => {
    if (drawingManager) {
      drawingManager.setDrawingMode(google!.maps.drawing.OverlayType.POLYGON);
      setIsDrawing(true);
      toast.info('Click on the map to draw a polygon. Click the first point again to complete.');
    }
  };

  const cancelDrawing = () => {
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
      setIsDrawing(false);
    }
  };

  const deletePolygon = () => {
    if (currentPolygon) {
      currentPolygon.setMap(null);
      setCurrentPolygon(null);
      setPolygonArea(0);
      toast.success('Polygon deleted');

      if (onPolygonDelete) {
        onPolygonDelete();
      }
    }
  };

  const savePolygon = () => {
    if (!currentPolygon) {
      toast.error('No polygon to save');
      return;
    }

    const path = currentPolygon.getPath();
    const coordinates = path.getArray().map((latLng) => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    // In a real implementation, you would save to database
    console.log('Saving polygon:', { name: polygonName || 'Custom Area', coordinates });
    toast.success('Polygon saved! (Mock implementation)');
  };

  const loadSavedPolygon = (polygonData: {
    id: string;
    name: string;
    coordinates: Array<{ lat: number; lng: number }>;
  }) => {
    if (!map || !google) return;

    const polygon = new google.maps.Polygon({
      paths: polygonData.coordinates,
      fillColor: '#10b981',
      fillOpacity: 0.2,
      strokeColor: '#10b981',
      strokeWeight: 2,
      clickable: true,
      editable: false,
      map,
    });

    savedPolygonsRef.current.push(polygon);
    toast.success(`Loaded saved area: ${polygonData.name}`);
  };

  const formatArea = (areaInSquareMeters: number): string => {
    if (areaInSquareMeters < 1000000) {
      return `${(areaInSquareMeters / 1000).toFixed(2)} km²`;
    } else {
      return `${(areaInSquareMeters / 1000000).toFixed(2)} km²`;
    }
  };

  return (
    <div className="relative w-full h-full">
      <MapView onMapReady={handleMapReady} />

      {/* Drawing Controls */}
      <div className="absolute top-4 left-4 space-y-2 z-10">
        <Card className="w-72">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <PolygonIcon className="w-4 h-4" />
              Polygon Search Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!currentPolygon && !isDrawing && (
              <Button onClick={startDrawing} className="w-full" size="sm">
                <Pencil className="w-4 h-4 mr-2" />
                Draw Search Area
              </Button>
            )}

            {isDrawing && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  Click on the map to draw points. Complete the polygon by clicking the first point.
                </div>
                <Button onClick={cancelDrawing} variant="outline" className="w-full" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel Drawing
                </Button>
              </div>
            )}

            {currentPolygon && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-medium">Area Information</div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-xs text-muted-foreground">Total Area</span>
                    <Badge variant="secondary">{formatArea(polygonArea)}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Name this search area..."
                    value={polygonName}
                    onChange={(e) => setPolygonName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={savePolygon} size="sm" variant="default">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button onClick={deletePolygon} size="sm" variant="destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950 p-2 rounded">
                  You can drag the points to edit the polygon shape.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Polygons */}
        {savedPolygons.length > 0 && (
          <Card className="w-72">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Saved Search Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedPolygons.map((poly) => (
                  <button
                    key={poly.id}
                    onClick={() => loadSavedPolygon(poly)}
                    className="w-full text-left px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {poly.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {poly.coordinates.length} points
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drawing Tips */}
      {!currentPolygon && !isDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <Card className="bg-background/95 backdrop-blur">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground text-center">
                Draw a custom polygon to search for properties in a specific area
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
