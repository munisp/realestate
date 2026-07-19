import { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  School,
  Shield,
  TrendingUp,
  MapPin,
  Users,
  Home,
  Navigation,
  Star,
  Clock,
  DollarSign,
} from 'lucide-react';
import { MapView } from '@/components/Map';

export default function NeighborhoodIntelligence() {
  const params = useParams();
  const neighborhoodId = params.id || 'victoria-island';
  
  const [commuteDestination, setCommuteDestination] = useState('');
  const [commuteMode, setCommuteMode] = useState<'driving' | 'transit' | 'walking'>('driving');

  const { data: neighborhoodData, isLoading } = trpc.neighborhood.getNeighborhoodData.useQuery({
    neighborhoodId,
  });

  const { data: reviews } = trpc.neighborhood.getCommunityReviews.useQuery({
    neighborhoodId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading neighborhood data...</p>
        </div>
      </div>
    );
  }

  if (!neighborhoodData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Neighborhood Not Found</h2>
          <p className="text-muted-foreground">Unable to load neighborhood data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{neighborhoodData.name}</h1>
              <p className="text-muted-foreground">
                {neighborhoodData.city}, {neighborhoodData.state}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <Badge variant="default" className="text-sm">
                  <Shield className="h-3 w-3 mr-1" />
                  Safety Score: {neighborhoodData.crime.score}/100
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {neighborhoodData.propertyTrends.priceChange1Year > 0 ? '+' : ''}
                  {neighborhoodData.propertyTrends.priceChange1Year}% YoY
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schools">Schools</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
            <TabsTrigger value="commute">Commute</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Scores */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Walk Score</h3>
                    <Badge variant="default">{neighborhoodData.scores.walkScore}/100</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${neighborhoodData.scores.walkScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Very Walkable</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Transit Score</h3>
                    <Badge variant="default">{neighborhoodData.scores.transitScore}/100</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${neighborhoodData.scores.transitScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Excellent Transit</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Bike Score</h3>
                    <Badge variant="default">{neighborhoodData.scores.bikeScore}/100</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${neighborhoodData.scores.bikeScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Bikeable</p>
                </CardContent>
              </Card>
            </div>

            {/* Crime Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Crime & Safety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Overall Safety Rating</p>
                      <p className="text-sm text-muted-foreground">
                        {neighborhoodData.crime.overall} Crime Area
                      </p>
                    </div>
                    <Badge variant="default" className="text-lg">
                      {neighborhoodData.crime.score}/100
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 pt-4 border-t">
                    {neighborhoodData.crime.categories.map((category) => (
                      <div key={category.type}>
                        <p className="text-sm font-medium">{category.type}</p>
                        <p className="text-2xl font-bold">{category.rate}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.change > 0 ? '+' : ''}
                          {category.change}% vs last year
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Population</p>
                    <p className="text-2xl font-bold">
                      {neighborhoodData.demographics.population.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Median Age</p>
                    <p className="text-2xl font-bold">{neighborhoodData.demographics.medianAge}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Median Income</p>
                    <p className="text-2xl font-bold">
                      ₦{(neighborhoodData.demographics.medianIncome / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Employment</p>
                    <p className="text-2xl font-bold">
                      {neighborhoodData.demographics.employmentRate}%
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm font-medium mb-3">Education Level</p>
                  <div className="space-y-2">
                    {Object.entries(neighborhoodData.demographics.educationLevel).map(
                      ([level, percent]) => (
                        <div key={level} className="flex items-center gap-3">
                          <span className="text-sm capitalize w-24">{level}</span>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{percent}%</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Community Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews?.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.author}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">{review.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{review.text}</p>
                      <p className="text-xs text-muted-foreground">{review.helpful} found helpful</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schools Tab */}
          <TabsContent value="schools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  Nearby Schools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {neighborhoodData.schools.map((school) => (
                    <div key={school.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{school.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{school.type}</Badge>
                            <Badge variant="outline">{school.level}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold">{school.rating}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{school.distance} km</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Enrollment</p>
                          <p className="font-medium">{school.enrollment} students</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Student-Teacher Ratio</p>
                          <p className="font-medium">{school.studentTeacherRatio}:1</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Amenities Tab */}
          <TabsContent value="amenities" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(neighborhoodData.amenities).map(([type, count]) => (
                <Card key={type}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground capitalize">{type}</p>
                        <p className="text-3xl font-bold">{count}</p>
                      </div>
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Map View */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] rounded-lg overflow-hidden">
                  <MapView
                    onMapReady={(map, google) => {
                      // Center on neighborhood
                      map.setCenter({
                        lat: neighborhoodData.coordinates.lat,
                        lng: neighborhoodData.coordinates.lng,
                      });
                      map.setZoom(14);

                      // Add marker for neighborhood center
                      new google.maps.Marker({
                        position: {
                          lat: neighborhoodData.coordinates.lat,
                          lng: neighborhoodData.coordinates.lng,
                        },
                        map,
                        title: neighborhoodData.name,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Median Price</p>
                  <p className="text-2xl font-bold">
                    ₦{(neighborhoodData.propertyTrends.medianPrice / 1000000).toFixed(1)}M
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">1-Year Change</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{neighborhoodData.propertyTrends.priceChange1Year}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">5-Year Change</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{neighborhoodData.propertyTrends.priceChange5Year}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-1">Days on Market</p>
                  <p className="text-2xl font-bold">
                    {neighborhoodData.propertyTrends.averageDaysOnMarket}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Price History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {neighborhoodData.propertyTrends.priceHistory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm">{item.month}</span>
                      <span className="font-semibold">
                        ₦{(item.price / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commute Tab */}
          <TabsContent value="commute" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Popular Destinations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {neighborhoodData.commuteDestinations.map((dest, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{dest.name}</p>
                        <p className="text-sm text-muted-foreground">{dest.distance} km</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{dest.time} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
