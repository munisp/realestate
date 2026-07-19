import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeospatialMap } from '@/components/GeospatialMap';
import { trpc } from '@/lib/trpc';
import {
  MapPin,
  TrendingUp,
  Home,
  DollarSign,
  Users,
  Building,
  Coffee,
  School,
  ShoppingCart,
  Activity,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

export default function NeighborhoodAnalytics() {
  const [h3Index, setH3Index] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // Get neighborhood stats
  const { data: stats, isLoading, refetch } = trpc.geospatial.getNeighborhoodStats.useQuery(
    { h3Index },
    { enabled: !!h3Index }
  );

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    
    // In a real implementation, you would convert lat/lng to H3 index
    // For now, we'll use a mock H3 index
    const mockH3 = `89283082837ffff`;
    setH3Index(mockH3);
    toast.success('Neighborhood selected');
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <h1 className="text-3xl font-bold mb-2">Neighborhood Analytics</h1>
          <p className="text-muted-foreground">
            Explore neighborhood statistics, demographics, and market trends using H3 spatial indexing
          </p>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Select Neighborhood
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] rounded-lg overflow-hidden border">
                  <GeospatialMap
                    properties={[]}
                    searchCenter={selectedLocation || { lat: 37.7749, lng: -122.4194 }}
                    radius={2}
                    onLocationClick={handleLocationSelect}
                    showHeatmap={false}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Click anywhere on the map to analyze that neighborhood
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : stats ? (
                  <>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium">Properties</span>
                      </div>
                      <span className="text-xl font-bold">{(stats as any).propertyCount || 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">Avg Price</span>
                      </div>
                      <span className="text-xl font-bold">
                        ${((stats as any).avgPrice || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium">Price Trend</span>
                      </div>
                      <Badge variant={(stats as any).priceChange >= 0 ? 'default' : 'destructive'}>
                        {(stats as any).priceChange >= 0 ? '+' : ''}
                        {(stats as any).priceChange || 0}%
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium">Population</span>
                      </div>
                      <span className="text-xl font-bold">
                        {((stats as any).population || 0).toLocaleString()}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a location on the map</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {h3Index && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">H3 Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-xs bg-muted p-2 rounded block break-all">
                    {h3Index}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolution 9 hexagon (~0.1 km²)
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Detailed Analytics */}
        {stats && (
          <div className="mt-6">
            <Tabs defaultValue="market">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="market">Market Trends</TabsTrigger>
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
              </TabsList>

              <TabsContent value="market" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Price Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Min Price</span>
                          <span className="font-semibold">
                            ${((stats as any).minPrice || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Median Price</span>
                          <span className="font-semibold">
                            ${((stats as any).medianPrice || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Max Price</span>
                          <span className="font-semibold">
                            ${((stats as any).maxPrice || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Market Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Listings (30d)</span>
                          <span className="font-semibold">{(stats as any).recentListings || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sales (30d)</span>
                          <span className="font-semibold">{(stats as any).recentSales || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Days on Market</span>
                          <span className="font-semibold">{(stats as any).avgDaysOnMarket || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Growth Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">YoY Price Change</span>
                          <Badge variant={(stats as any).yoyPriceChange >= 0 ? 'default' : 'destructive'}>
                            {(stats as any).yoyPriceChange >= 0 ? '+' : ''}
                            {(stats as any).yoyPriceChange || 0}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Inventory Change</span>
                          <Badge
                            variant={(stats as any).inventoryChange >= 0 ? 'default' : 'destructive'}
                          >
                            {(stats as any).inventoryChange >= 0 ? '+' : ''}
                            {(stats as any).inventoryChange || 0}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Demand Score</span>
                          <span className="font-semibold">{(stats as any).demandScore || 0}/100</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="demographics" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Population
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold mb-2">
                        {((stats as any).population || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Density: {(stats as any).populationDensity || 0}/km²
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Median Age</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats as any).medianAge || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Median Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${((stats as any).medianIncome || 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Education</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats as any).collegeGradRate || 0}%</div>
                      <div className="text-xs text-muted-foreground">College graduates</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="amenities" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <School className="w-4 h-4" />
                        Schools
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold mb-2">{(stats as any).schoolCount || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        Avg Rating: {(stats as any).avgSchoolRating || 0}/10
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Shopping
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats as any).shoppingCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Retail locations</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Coffee className="w-4 h-4" />
                        Dining
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats as any).restaurantCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Restaurants & cafes</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Transit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(stats as any).transitScore || 0}/100</div>
                      <div className="text-xs text-muted-foreground">Walk Score</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="comparison" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compare with Nearby Neighborhoods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Neighborhood comparison feature coming soon</p>
                      <p className="text-sm mt-2">
                        Compare prices, demographics, and amenities across multiple H3 hexagons
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
