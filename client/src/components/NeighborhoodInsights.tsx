import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapView } from '@/components/Map';
import { 
  School, Hospital, ShoppingCart, Coffee, Train, 
  Utensils, Building2, TreePine, Shield, TrendingUp 
} from 'lucide-react';

interface NeighborhoodInsightsProps {
  latitude: string;
  longitude: string;
  address: string;
}

interface PlaceResult {
  name: string;
  vicinity: string;
  rating?: number;
  distance?: number;
  types: string[];
}

export function NeighborhoodInsights({ latitude, longitude, address }: NeighborhoodInsightsProps) {
  const [mapReady, setMapReady] = useState(false);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [schools, setSchools] = useState<PlaceResult[]>([]);
  const [hospitals, setHospitals] = useState<PlaceResult[]>([]);
  const [restaurants, setRestaurants] = useState<PlaceResult[]>([]);
  const [shopping, setShopping] = useState<PlaceResult[]>([]);
  const [transit, setTransit] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(true);

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const location = { lat, lng };

  const handleMapReady = (map: google.maps.Map) => {
    const service = new google.maps.places.PlacesService(map);
    setPlacesService(service);
    setMapReady(true);

    // Add marker for property
    new google.maps.marker.AdvancedMarkerElement({
      position: location,
      map,
      title: address,
    });

    map.setCenter(location);
    map.setZoom(14);
  };

  useEffect(() => {
    if (!placesService) return;

    const searchNearby = (type: string, callback: (results: PlaceResult[]) => void) => {
      const request = {
        location,
        radius: 1000, // 1km radius
        type,
      };

      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const processed = results.slice(0, 5).map(place => ({
            name: place.name || 'Unknown',
            vicinity: place.vicinity || '',
            rating: place.rating,
            types: place.types || [],
            distance: place.geometry?.location 
              ? google.maps.geometry.spherical.computeDistanceBetween(
                  new google.maps.LatLng(location),
                  place.geometry.location
                ) / 1000 // Convert to km
              : undefined,
          }));
          callback(processed);
        } else {
          callback([]);
        }
      });
    };

    setLoading(true);

    // Search for different types of places
    searchNearby('school', setSchools);
    searchNearby('hospital', setHospitals);
    searchNearby('restaurant', setRestaurants);
    searchNearby('shopping_mall', setShopping);
    searchNearby('transit_station', setTransit);

    // Set loading to false after a delay to allow all searches to complete
    setTimeout(() => setLoading(false), 2000);
  }, [placesService]);

  const renderPlacesList = (places: PlaceResult[], icon: React.ReactNode, emptyMessage: string) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      );
    }

    if (places.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {places.map((place, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
            <div className="mt-1">{icon}</div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{place.name}</h4>
                  <p className="text-sm text-muted-foreground">{place.vicinity}</p>
                </div>
                {place.distance && (
                  <Badge variant="secondary" className="ml-2">
                    {place.distance.toFixed(1)} km
                  </Badge>
                )}
              </div>
              {place.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Calculate walkability score (simplified)
  const calculateWalkabilityScore = () => {
    const totalPlaces = schools.length + hospitals.length + restaurants.length + shopping.length + transit.length;
    const maxPlaces = 25; // 5 per category
    return Math.min(Math.round((totalPlaces / maxPlaces) * 100), 100);
  };

  const walkabilityScore = calculateWalkabilityScore();
  const walkabilityLabel = 
    walkabilityScore >= 80 ? 'Very Walkable' :
    walkabilityScore >= 60 ? 'Walkable' :
    walkabilityScore >= 40 ? 'Somewhat Walkable' :
    'Car-Dependent';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neighborhood Insights</CardTitle>
        <CardDescription>
          Explore local amenities and services within 1km radius
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Walkability Score */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">Walkability Score</h3>
              <p className="text-sm text-muted-foreground">{walkabilityLabel}</p>
            </div>
            <div className="text-4xl font-bold text-primary">{walkabilityScore}</div>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all" 
              style={{ width: `${walkabilityScore}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on proximity to schools, hospitals, restaurants, shopping, and transit
          </p>
        </div>

        {/* Map */}
        <div className="h-[300px] rounded-lg overflow-hidden border">
          <MapView onMapReady={handleMapReady} />
        </div>

        {/* Amenities Tabs */}
        <Tabs defaultValue="schools" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="schools" className="flex items-center gap-1">
              <School className="w-4 h-4" />
              <span className="hidden sm:inline">Schools</span>
            </TabsTrigger>
            <TabsTrigger value="healthcare" className="flex items-center gap-1">
              <Hospital className="w-4 h-4" />
              <span className="hidden sm:inline">Healthcare</span>
            </TabsTrigger>
            <TabsTrigger value="dining" className="flex items-center gap-1">
              <Utensils className="w-4 h-4" />
              <span className="hidden sm:inline">Dining</span>
            </TabsTrigger>
            <TabsTrigger value="shopping" className="flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Shopping</span>
            </TabsTrigger>
            <TabsTrigger value="transit" className="flex items-center gap-1">
              <Train className="w-4 h-4" />
              <span className="hidden sm:inline">Transit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schools" className="mt-4">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <School className="w-5 h-5 text-primary" />
                Nearby Schools
              </h3>
              {renderPlacesList(
                schools,
                <School className="w-5 h-5 text-blue-600" />,
                'No schools found within 1km'
              )}
            </div>
          </TabsContent>

          <TabsContent value="healthcare" className="mt-4">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Hospital className="w-5 h-5 text-primary" />
                Healthcare Facilities
              </h3>
              {renderPlacesList(
                hospitals,
                <Hospital className="w-5 h-5 text-red-600" />,
                'No healthcare facilities found within 1km'
              )}
            </div>
          </TabsContent>

          <TabsContent value="dining" className="mt-4">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                Restaurants & Cafes
              </h3>
              {renderPlacesList(
                restaurants,
                <Utensils className="w-5 h-5 text-orange-600" />,
                'No restaurants found within 1km'
              )}
            </div>
          </TabsContent>

          <TabsContent value="shopping" className="mt-4">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Shopping Centers
              </h3>
              {renderPlacesList(
                shopping,
                <ShoppingCart className="w-5 h-5 text-green-600" />,
                'No shopping centers found within 1km'
              )}
            </div>
          </TabsContent>

          <TabsContent value="transit" className="mt-4">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Train className="w-5 h-5 text-primary" />
                Public Transit
              </h3>
              {renderPlacesList(
                transit,
                <Train className="w-5 h-5 text-purple-600" />,
                'No transit stations found within 1km'
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <School className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{schools.length}</div>
            <div className="text-xs text-muted-foreground">Schools</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Hospital className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold">{hospitals.length}</div>
            <div className="text-xs text-muted-foreground">Healthcare</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Utensils className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{restaurants.length}</div>
            <div className="text-xs text-muted-foreground">Dining</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold">{shopping.length}</div>
            <div className="text-xs text-muted-foreground">Shopping</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Train className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">{transit.length}</div>
            <div className="text-xs text-muted-foreground">Transit</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
