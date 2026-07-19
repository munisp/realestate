// @ts-nocheck
import { useState, useEffect } from 'react';
import { MapView } from '@/components/Map';
import { StreetViewThumbnail } from '@/components/StreetViewPanorama';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Search, MapPin, Layers, TrendingUp, Home, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface SearchFilters {
  location?: { lat: number; lng: number };
  radius: number; // in kilometers
  propertyType?: string;
  priceRange: { min: number; max: number };
  bedrooms?: number;
  bathrooms?: number;
}

export default function PropertySearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    radius: 5,
    priceRange: { min: 0, max: 2000000 },
  });
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Search properties using geospatial service
  const { data: searchResults, isLoading, refetch } = trpc.geospatial.searchNearby.useQuery(
    {
      center: searchCenter || { lat: 37.7749, lng: -122.4194 },
      radiusKm: filters.radius,
      filters: {
        propertyType: filters.propertyType ? [filters.propertyType] : undefined,
        priceRange: filters.priceRange,
        bedrooms: filters.bedrooms,
      },
      limit: 50,
    },
    {
      enabled: !!searchCenter,
    }
  );

  // Get heatmap data
  const { data: heatmapData } = trpc.geospatial.getHeatmap.useQuery(
    {
      bounds: searchCenter
        ? {
            north: searchCenter.lat + 0.1,
            south: searchCenter.lat - 0.1,
            east: searchCenter.lng + 0.1,
            west: searchCenter.lng - 0.1,
          }
        : {
            north: 37.8749,
            south: 37.6749,
            east: -122.3194,
            west: -122.5194,
          },
      resolution: 9,
    },
    {
      enabled: showHeatmap,
    }
  );

  const handleLocationSearch = async (address: string) => {
    // Use Google Maps Geocoding via the proxy
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });
      
      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        setSearchCenter({
          lat: location.lat(),
          lng: location.lng(),
        });
        toast.success(`Found location: ${result.results[0].formatted_address}`);
      }
    } catch (error) {
      toast.error('Failed to find location');
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSearchCenter({ lat, lng });
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <h1 className="text-3xl font-bold mb-2">Property Search</h1>
          <p className="text-muted-foreground">
            Find properties using advanced geospatial search and AI-powered analytics
          </p>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter city or address..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleLocationSearch(e.currentTarget.value);
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        handleLocationSearch(input.value);
                      }}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  {searchCenter && (
                    <Badge variant="secondary" className="mt-2">
                      <MapPin className="w-3 h-3 mr-1" />
                      {searchCenter.lat.toFixed(4)}, {searchCenter.lng.toFixed(4)}
                    </Badge>
                  )}
                </div>

                {/* Radius */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Search Radius: {filters.radius} km
                  </label>
                  <Slider
                    value={[filters.radius]}
                    onValueChange={([value]) => setFilters({ ...filters, radius: value })}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>

                {/* Property Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Property Type</label>
                  <Select
                    value={filters.propertyType}
                    onValueChange={(value) => setFilters({ ...filters, propertyType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Single Family">Single Family</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Price Range: ${filters.priceRange.min.toLocaleString()} - $
                    {filters.priceRange.max.toLocaleString()}
                  </label>
                  <Slider
                    value={[filters.priceRange.min, filters.priceRange.max]}
                    onValueChange={([min, max]) =>
                      setFilters({ ...filters, priceRange: { min, max } })
                    }
                    min={0}
                    max={5000000}
                    step={50000}
                  />
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Bedrooms</label>
                  <Select
                    value={filters.bedrooms?.toString()}
                    onValueChange={(value) =>
                      setFilters({ ...filters, bedrooms: value === 'any' ? undefined : parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Bathrooms</label>
                  <Select
                    value={filters.bathrooms?.toString()}
                    onValueChange={(value) =>
                      setFilters({ ...filters, bathrooms: value === 'any' ? undefined : parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Map Options */}
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Map Layers
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="heatmap"
                      checked={showHeatmap}
                      onChange={(e) => setShowHeatmap(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="heatmap" className="text-sm">
                      Price Heatmap
                    </label>
                  </div>
                </div>

                {/* Search Button */}
                <Button className="w-full" onClick={() => refetch()} disabled={!searchCenter}>
                  <Search className="w-4 h-4 mr-2" />
                  Search Properties
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {searchResults?.total || 0} Properties Found
                  </h2>
                  {searchCenter && (
                    <p className="text-sm text-muted-foreground">
                      Within {filters.radius} km of search location
                    </p>
                  )}
                </div>
                <TabsList>
                  <TabsTrigger value="list">List View</TabsTrigger>
                  <TabsTrigger value="map">Map View</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="list" className="mt-0">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="h-48 bg-muted" />
                        <CardContent className="p-4 space-y-2">
                          <div className="h-4 bg-muted rounded" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchResults?.properties.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No properties found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search filters or location
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults?.properties.map((property) => (
                      <Card key={property.id} className="hover:shadow-lg transition-shadow">
                        <div className="h-48 relative overflow-hidden">
                          {property.location ? (
                            <StreetViewThumbnail
                              position={property.location}
                              width={600}
                              height={300}
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center h-full">
                              <Home className="w-16 h-16 text-blue-400" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg">{property.title}</h3>
                            <Badge variant="secondary">
                              {property.distance < 1000
                                ? `${Math.round(property.distance)}m`
                                : `${(property.distance / 1000).toFixed(1)}km`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-2xl font-bold text-primary mb-2">
                            <DollarSign className="w-6 h-6" />
                            {property.price?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>H3: {property.h3Index}</span>
                          </div>
                          <Button className="w-full mt-4" variant="outline">
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <div className="h-[600px] relative">
                      <MapView
                        onMapReady={(map, google) => {
                          // Add search center marker
                          if (searchCenter) {
                            new google.maps.Marker({
                              position: searchCenter,
                              map,
                              icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 10,
                                fillColor: '#3b82f6',
                                fillOpacity: 0.8,
                                strokeColor: '#1e40af',
                                strokeWeight: 2,
                              },
                            });

                            // Add radius circle
                            new google.maps.Circle({
                              map,
                              center: searchCenter,
                              radius: filters.radius * 1000, // Convert km to meters
                              fillColor: '#3b82f6',
                              fillOpacity: 0.1,
                              strokeColor: '#3b82f6',
                              strokeWeight: 2,
                            });
                          }

                          // Add property markers
                          searchResults?.properties.forEach((property) => {
                            new google.maps.Marker({
                              position: property.location,
                              map,
                              title: property.title,
                            });
                          });

                          // Add heatmap if enabled
                          if (showHeatmap && heatmapData?.points) {
                            const heatmapPoints = heatmapData.points.map(
                              (point: any) =>
                                new google.maps.LatLng(point.lat, point.lng)
                            );
                            new google.maps.visualization.HeatmapLayer({
                              data: heatmapPoints,
                              map,
                            });
                          }

                          // Click to set search center
                          map.addListener('click', (e: any) => {
                            handleMapClick(e.latLng.lat(), e.latLng.lng());
                          });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
