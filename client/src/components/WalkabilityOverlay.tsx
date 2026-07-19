import { useEffect, useState } from 'react';
import {
  calculateWalkabilityScore,
  getWalkabilityColor,
  getTransitScoreColor,
  amenityCategories,
  WalkabilityScore,
} from '@/services/walkabilityScore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, MapPin, Clock, Navigation } from 'lucide-react';

interface WalkabilityOverlayProps {
  map: google.maps.Map | null;
  neighborhoodId: string | null;
}

export default function WalkabilityOverlay({
  map,
  neighborhoodId,
}: WalkabilityOverlayProps) {
  const [walkabilityData, setWalkabilityData] = useState<WalkabilityScore | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [circles, setCircles] = useState<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map || !neighborhoodId) {
      // Clear overlays
      markers.forEach((m) => m.setMap(null));
      circles.forEach((c) => c.setMap(null));
      setWalkabilityData(null);
      return;
    }

    // Calculate walkability score
    const score = calculateWalkabilityScore(neighborhoodId);
    setWalkabilityData(score);

    // Clear existing overlays
    markers.forEach((m) => m.setMap(null));
    circles.forEach((c) => c.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const newCircles: google.maps.Circle[] = [];

    // Add markers for nearby amenities
    score.nearbyAmenities.forEach((amenity) => {
      const category = amenityCategories.find((c) => c.name === amenity.category);
      if (!category) return;

      // Create marker
      const marker = new google.maps.Marker({
        position: amenity.location,
        map,
        title: `${amenity.name} (${amenity.walkTime} min walk)`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: category.color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        label: {
          text: category.icon,
          fontSize: '14px',
        },
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${amenity.name}</h3>
            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${amenity.category}</p>
            <p style="font-size: 12px;">
              <strong>${amenity.distance}m</strong> (${amenity.walkTime} min walk)
            </p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);

      // Add walking radius circle for transit stations
      if (amenity.category === 'Transit') {
        const circle = new google.maps.Circle({
          center: amenity.location,
          radius: 400, // 5-minute walk radius
          strokeColor: category.color,
          strokeOpacity: 0.5,
          strokeWeight: 1,
          fillColor: category.color,
          fillOpacity: 0.1,
          map,
        });
        newCircles.push(circle);
      }
    });

    setMarkers(newMarkers);
    setCircles(newCircles);

    return () => {
      newMarkers.forEach((m) => m.setMap(null));
      newCircles.forEach((c) => c.setMap(null));
    };
  }, [map, neighborhoodId]);

  if (!walkabilityData) return null;

  return (
    <Card className="absolute top-4 right-4 w-80 shadow-lg z-10 max-h-[90vh] overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Walkability Score
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div
            className="text-4xl font-bold mb-1"
            style={{ color: getWalkabilityColor(walkabilityData.overall) }}
          >
            {walkabilityData.overall}
          </div>
          <Badge
            variant="secondary"
            style={{
              backgroundColor: getWalkabilityColor(walkabilityData.overall),
              color: 'white',
            }}
          >
            {walkabilityData.label}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            {walkabilityData.description}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Score Breakdown</h4>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Amenities</span>
              <span className="font-medium">{walkabilityData.breakdown.amenities}/100</span>
            </div>
            <Progress
              value={walkabilityData.breakdown.amenities}
              className="h-2"
              style={{
                backgroundColor: '#e5e7eb',
              }}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Transit</span>
              <span className="font-medium">{walkabilityData.breakdown.transit}/100</span>
            </div>
            <Progress
              value={walkabilityData.breakdown.transit}
              className="h-2"
              style={{
                backgroundColor: '#e5e7eb',
              }}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Pedestrian Infrastructure</span>
              <span className="font-medium">{walkabilityData.breakdown.pedestrian}/100</span>
            </div>
            <Progress
              value={walkabilityData.breakdown.pedestrian}
              className="h-2"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Safety</span>
              <span className="font-medium">{walkabilityData.breakdown.safety}/100</span>
            </div>
            <Progress
              value={walkabilityData.breakdown.safety}
              className="h-2"
            />
          </div>
        </div>

        {/* Daily Errands */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium">Daily Errands</span>
            <span className="text-sm font-bold">{walkabilityData.dailyErrandsScore}%</span>
          </div>
          <Progress value={walkabilityData.dailyErrandsScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Can be accomplished without a car
          </p>
        </div>

        {/* Nearby Amenities */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Nearby Amenities ({walkabilityData.nearbyAmenities.length})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {walkabilityData.nearbyAmenities.map((amenity, i) => {
              const category = amenityCategories.find((c) => c.name === amenity.category);
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs"
                >
                  <span className="text-base">{category?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{amenity.name}</p>
                    <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {amenity.distance}m
                      <Clock className="h-3 w-3 ml-1" />
                      {amenity.walkTime} min walk
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="pt-3 border-t">
          <p className="text-xs font-medium mb-2">Amenity Categories</p>
          <div className="grid grid-cols-2 gap-2">
            {amenityCategories.map((category) => (
              <div key={category.name} className="flex items-center gap-1 text-xs">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
