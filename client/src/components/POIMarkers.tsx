import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Phone, Globe, Clock, X } from 'lucide-react';

export interface POI {
  id: string;
  name: string;
  category: 'shopping' | 'hotel' | 'airport' | 'hospital' | 'recreation';
  position: google.maps.LatLngLiteral;
  rating: number;
  reviews: number;
  description: string;
  amenities: string[];
  hours: string;
  phone: string;
  website: string;
}

interface POIMarkersProps {
  map: google.maps.Map | null;
  selectedCategories?: string[];
  onPOIClick?: (poi: POI) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  shopping: '🛍️',
  hotel: '🏨',
  airport: '✈️',
  hospital: '🏥',
  recreation: '🎭',
};

const CATEGORY_COLORS: Record<string, string> = {
  shopping: '#10b981',
  hotel: '#3b82f6',
  airport: '#f59e0b',
  hospital: '#ef4444',
  recreation: '#8b5cf6',
};

/**
 * POIMarkers Component
 * 
 * Displays Lagos-specific points of interest on the map
 * Features:
 * - Category-based filtering
 * - Custom markers with icons
 * - Info windows with details
 * - Click handlers for detailed views
 */
export function POIMarkers({ map, selectedCategories, onPOIClick }: POIMarkersProps) {
  const [pois, setPois] = useState<POI[]>([]);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindows, setInfoWindows] = useState<google.maps.InfoWindow[]>([]);

  // Load POI data
  useEffect(() => {
    fetch('/data/lagos-pois.json')
      .then(res => res.json())
      .then(data => setPois(data.pois))
      .catch(err => console.error('Failed to load POI data:', err));
  }, []);

  // Create markers
  useEffect(() => {
    if (!map || pois.length === 0) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    infoWindows.forEach(infoWindow => infoWindow.close());

    const newMarkers: google.maps.Marker[] = [];
    const newInfoWindows: google.maps.InfoWindow[] = [];

    pois.forEach(poi => {
      // Filter by category if specified
      if (selectedCategories && selectedCategories.length > 0 && !selectedCategories.includes(poi.category)) {
        return;
      }

      // Create custom marker icon
      const icon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: CATEGORY_COLORS[poi.category],
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      };

      const marker = new google.maps.Marker({
        position: poi.position,
        map,
        icon,
        title: poi.name,
        animation: google.maps.Animation.DROP,
      });

      // Create info window content
      const infoWindowContent = `
        <div style="padding: 8px; max-width: 280px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 24px;">${CATEGORY_ICONS[poi.category]}</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${poi.name}</h3>
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                <span style="color: #f59e0b;">⭐</span>
                <span style="font-size: 14px; font-weight: 500;">${poi.rating}</span>
                <span style="font-size: 12px; color: #6b7280;">(${poi.reviews.toLocaleString()} reviews)</span>
              </div>
            </div>
          </div>
          <p style="margin: 8px 0; font-size: 14px; color: #4b5563;">${poi.description}</p>
          <div style="display: flex; flex-wrap: gap: 4px; margin: 8px 0;">
            ${poi.amenities.slice(0, 3).map(amenity => 
              `<span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${amenity}</span>`
            ).join('')}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
            <div style="margin-bottom: 4px;">⏰ ${poi.hours}</div>
            <div>📞 ${poi.phone}</div>
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent,
      });

      marker.addListener('click', () => {
        // Close all other info windows
        newInfoWindows.forEach(iw => iw.close());
        infoWindow.open(map, marker);
        if (onPOIClick) {
          onPOIClick(poi);
        }
      });

      newMarkers.push(marker);
      newInfoWindows.push(infoWindow);
    });

    setMarkers(newMarkers);
    setInfoWindows(newInfoWindows);

    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
      newInfoWindows.forEach(infoWindow => infoWindow.close());
    };
  }, [map, pois, selectedCategories]);

  return null; // This component only manages markers, no UI
}

/**
 * POIDetailCard Component
 * 
 * Shows detailed information about a selected POI
 */
interface POIDetailCardProps {
  poi: POI;
  onClose?: () => void;
}

export function POIDetailCard({ poi, onClose }: POIDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{CATEGORY_ICONS[poi.category]}</span>
            <div>
              <CardTitle>{poi.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{poi.rating}</span>
                  <span className="text-xs">({poi.reviews.toLocaleString()} reviews)</span>
                </div>
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground">{poi.description}</p>

        {/* Amenities */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Amenities</h4>
          <div className="flex flex-wrap gap-2">
            {poi.amenities.map((amenity, i) => (
              <Badge key={i} variant="secondary">{amenity}</Badge>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{poi.hours}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <a href={`tel:${poi.phone}`} className="hover:underline">{poi.phone}</a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <a href={poi.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Visit Website
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${poi.position.lat},${poi.position.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Get Directions
            </a>
          </div>
        </div>

        {/* Category Badge */}
        <div>
          <Badge
            style={{
              backgroundColor: CATEGORY_COLORS[poi.category],
              color: 'white',
            }}
          >
            {poi.category.charAt(0).toUpperCase() + poi.category.slice(1)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * POICategoryFilter Component
 * 
 * Filter controls for POI categories
 */
interface POICategoryFilterProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}

export function POICategoryFilter({ selectedCategories, onChange }: POICategoryFilterProps) {
  const categories = ['shopping', 'hotel', 'airport', 'hospital', 'recreation'];

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(category => (
        <Button
          key={category}
          variant={selectedCategories.includes(category) ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleCategory(category)}
          style={{
            backgroundColor: selectedCategories.includes(category) ? CATEGORY_COLORS[category] : undefined,
            borderColor: CATEGORY_COLORS[category],
          }}
        >
          <span className="mr-1">{CATEGORY_ICONS[category]}</span>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </Button>
      ))}
    </div>
  );
}
