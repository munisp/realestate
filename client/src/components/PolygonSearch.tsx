// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Search, X } from 'lucide-react';
import { spatial } from '@/lib/spatial';
import type { Property } from '@/types';

/**
 * Polygon Search Component
 * 
 * Allows users to draw polygons on the map and search for properties within
 * Uses Google Maps Drawing Manager and Turf.js for spatial analysis
 */

interface PolygonSearchProps {
  map: google.maps.Map | null;
  properties: Property[];
  onResultsChange: (results: Property[]) => void;
}

export function PolygonSearch({ map, properties, onResultsChange }: PolygonSearchProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [results, setResults] = useState<Property[]>([]);

  /**
   * Initialize drawing manager
   */
  useEffect(() => {
    if (!map) return;

    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#2196F3',
        fillOpacity: 0.2,
        strokeColor: '#2196F3',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    manager.setMap(map);
    setDrawingManager(manager);

    // Listen for polygon complete
    google.maps.event.addListener(manager, 'polygoncomplete', (poly: google.maps.Polygon) => {
      handlePolygonComplete(poly);
    });

    return () => {
      manager.setMap(null);
    };
  }, [map]);

  /**
   * Handle polygon drawing complete
   */
  const handlePolygonComplete = (poly: google.maps.Polygon) => {
    // Remove previous polygon
    if (polygon) {
      polygon.setMap(null);
    }

    setPolygon(poly);
    setIsDrawing(false);

    // Stop drawing mode
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }

    // Search properties
    searchInPolygon(poly);

    // Listen for polygon edits
    google.maps.event.addListener(poly.getPath(), 'set_at', () => {
      searchInPolygon(poly);
    });

    google.maps.event.addListener(poly.getPath(), 'insert_at', () => {
      searchInPolygon(poly);
    });
  };

  /**
   * Search properties within polygon
   */
  const searchInPolygon = (poly: google.maps.Polygon) => {
    const path = poly.getPath();
    const coordinates: number[][] = [];

    // Convert Google Maps path to GeoJSON coordinates
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push([point.lng(), point.lat()]);
    }

    // Close the polygon
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    // Search using Turf.js
    const found = spatial.withinPolygon([coordinates], properties);
    setResults(found);
    onResultsChange(found);
  };

  /**
   * Start drawing
   */
  const startDrawing = () => {
    if (!drawingManager) return;

    setIsDrawing(true);
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  };

  /**
   * Cancel drawing
   */
  const cancelDrawing = () => {
    if (!drawingManager) return;

    setIsDrawing(false);
    drawingManager.setDrawingMode(null);
  };

  /**
   * Clear polygon
   */
  const clearPolygon = () => {
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
    }

    setResults([]);
    onResultsChange([]);
  };

  /**
   * Calculate polygon area
   */
  const getPolygonArea = () => {
    if (!polygon) return 0;

    const path = polygon.getPath();
    const coordinates: number[][] = [];

    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push([point.lng(), point.lat()]);
    }

    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    return spatial.area([coordinates]);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Polygon Search</h3>

      {/* Controls */}
      <div className="space-y-2 mb-4">
        {!polygon && !isDrawing && (
          <Button
            onClick={startDrawing}
            className="w-full"
            variant="default"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Draw Search Area
          </Button>
        )}

        {isDrawing && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Click on the map to draw a polygon. Double-click to finish.
            </p>
            <Button
              onClick={cancelDrawing}
              className="w-full"
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Drawing
            </Button>
          </div>
        )}

        {polygon && !isDrawing && (
          <div className="space-y-2">
            <Button
              onClick={clearPolygon}
              className="w-full"
              variant="outline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Polygon
            </Button>

            <Button
              onClick={startDrawing}
              className="w-full"
              variant="outline"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Draw New Polygon
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {polygon && (
        <div className="border-t pt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Area:</span>
              <span className="font-semibold">{getPolygonArea().toFixed(2)} km²</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Properties Found:</span>
              <span className="font-semibold">{results.length}</span>
            </div>

            {results.length > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Price:</span>
                  <span className="font-semibold">
                    ₦{(results.reduce((sum, p) => sum + (typeof p.price === 'string' ? parseFloat(p.price) : p.price), 0) / results.length).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Price Range:</span>
                  <span className="font-semibold">
                    ₦{Math.min(...results.map(p => typeof p.price === 'string' ? parseFloat(p.price) : p.price)).toLocaleString()}
                    {' - '}
                    ₦{Math.max(...results.map(p => typeof p.price === 'string' ? parseFloat(p.price) : p.price)).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {results.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No properties found in this area
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      {!polygon && !isDrawing && (
        <div className="text-xs text-gray-500 mt-4">
          <p className="mb-1">💡 <strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Draw custom search areas on the map</li>
            <li>Edit polygons by dragging vertices</li>
            <li>See instant property counts and statistics</li>
          </ul>
        </div>
      )}
    </Card>
  );
}

export default PolygonSearch;
