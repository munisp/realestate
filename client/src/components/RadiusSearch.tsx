import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MapPin, X, Search } from 'lucide-react';
import { spatial } from '@/lib/spatial';
import type { Property } from '@/types';

/**
 * Radius Search Component
 * 
 * Allows users to click on the map and search for properties within a radius
 * Uses Turf.js for spatial analysis and Google Maps for visualization
 */

interface RadiusSearchProps {
  map: google.maps.Map | null;
  properties: Property[];
  onResultsChange: (results: Array<Property & { distance: number }>) => void;
}

export function RadiusSearch({ map, properties, onResultsChange }: RadiusSearchProps) {
  const [isActive, setIsActive] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [circle, setCircle] = useState<google.maps.Circle | null>(null);
  const [results, setResults] = useState<Array<Property & { distance: number }>>([]);

  /**
   * Initialize map click listener
   */
  useEffect(() => {
    if (!map || !isActive) return;

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setCenter({ lat, lng });
      }
    });

    // Change cursor
    map.setOptions({ draggableCursor: 'crosshair' });

    return () => {
      google.maps.event.removeListener(listener);
      map.setOptions({ draggableCursor: null });
    };
  }, [map, isActive]);

  /**
   * Update marker and circle when center or radius changes
   */
  useEffect(() => {
    if (!map || !center) return;

    // Remove old marker
    if (marker) {
      marker.setMap(null);
    }

    // Remove old circle
    if (circle) {
      circle.setMap(null);
    }

    // Create new marker
    const newMarker = new google.maps.Marker({
      position: center,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#2196F3',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      draggable: true,
    });

    // Listen for marker drag
    newMarker.addListener('dragend', () => {
      const pos = newMarker.getPosition();
      if (pos) {
        setCenter({ lat: pos.lat(), lng: pos.lng() });
      }
    });

    setMarker(newMarker);

    // Create new circle
    const newCircle = new google.maps.Circle({
      center,
      radius: radiusKm * 1000, // Convert km to meters
      map,
      fillColor: '#2196F3',
      fillOpacity: 0.1,
      strokeColor: '#2196F3',
      strokeOpacity: 0.5,
      strokeWeight: 2,
      clickable: false,
    });

    setCircle(newCircle);

    // Search properties
    searchInRadius();

    return () => {
      newMarker.setMap(null);
      newCircle.setMap(null);
    };
  }, [map, center, radiusKm]);

  /**
   * Search properties within radius
   */
  const searchInRadius = () => {
    if (!center) return;

    const found = spatial.withinRadius(
      center.lat,
      center.lng,
      radiusKm,
      properties
    );

    setResults(found);
    onResultsChange(found);
  };

  /**
   * Start radius search
   */
  const startSearch = () => {
    setIsActive(true);
  };

  /**
   * Clear search
   */
  const clearSearch = () => {
    setIsActive(false);
    setCenter(null);

    if (marker) {
      marker.setMap(null);
      setMarker(null);
    }

    if (circle) {
      circle.setMap(null);
      setCircle(null);
    }

    setResults([]);
    onResultsChange([]);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Radius Search</h3>

      {/* Controls */}
      <div className="space-y-4">
        {!isActive && (
          <Button
            onClick={startSearch}
            className="w-full"
            variant="default"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Click Map to Search
          </Button>
        )}

        {isActive && !center && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Click anywhere on the map to set search center
            </p>
            <Button
              onClick={clearSearch}
              className="w-full"
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}

        {center && (
          <>
            {/* Radius slider */}
            <div className="space-y-2">
              <Label>Search Radius: {radiusKm} km</Label>
              <Slider
                value={[radiusKm]}
                onValueChange={(value) => setRadiusKm(value[0])}
                min={0.5}
                max={50}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.5 km</span>
                <span>50 km</span>
              </div>
            </div>

            {/* Quick radius buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 20].map(km => (
                <Button
                  key={km}
                  onClick={() => setRadiusKm(km)}
                  variant={radiusKm === km ? 'default' : 'outline'}
                  size="sm"
                >
                  {km}km
                </Button>
              ))}
            </div>

            {/* Clear button */}
            <Button
              onClick={clearSearch}
              className="w-full"
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Search
            </Button>
          </>
        )}
      </div>

      {/* Results */}
      {center && (
        <div className="border-t pt-4 mt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Center:</span>
              <span className="font-mono text-xs">
                {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Radius:</span>
              <span className="font-semibold">{radiusKm} km</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Properties Found:</span>
              <span className="font-semibold">{results.length}</span>
            </div>

            {results.length > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nearest:</span>
                  <span className="font-semibold">
                    {results[0].distance.toFixed(2)} km
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Farthest:</span>
                  <span className="font-semibold">
                    {results[results.length - 1].distance.toFixed(2)} km
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Price:</span>
                  <span className="font-semibold">
                    ₦{(results.reduce((sum, p) => sum + (typeof p.price === 'string' ? parseFloat(p.price) : p.price), 0) / results.length).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {results.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No properties found within {radiusKm} km
            </p>
          )}

          {/* Top 5 nearest properties */}
          {results.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Nearest Properties:</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.slice(0, 5).map((property, index) => (
                  <div
                    key={property.id}
                    className="text-xs p-2 bg-gray-50 rounded flex justify-between items-center"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{property.title}</p>
                      <p className="text-gray-600">
                        ₦{typeof property.price === 'string' ? parseFloat(property.price).toLocaleString() : property.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-2 text-right">
                      <p className="font-semibold text-primary">
                        {property.distance.toFixed(2)} km
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!isActive && (
        <div className="text-xs text-gray-500 mt-4">
          <p className="mb-1">💡 <strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click map to set search center</li>
            <li>Drag marker to reposition</li>
            <li>Adjust radius with slider</li>
            <li>Results sorted by distance</li>
          </ul>
        </div>
      )}
    </Card>
  );
}

export default RadiusSearch;
