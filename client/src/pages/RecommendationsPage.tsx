import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  TrendingUp,
  Calendar,
  Star,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

/**
 * AI-Powered Property Recommendations Page
 * 
 * Displays personalized property recommendations based on user preferences
 * and browsing history
 */
export default function RecommendationsPage() {
  const [selectedPreferences, setSelectedPreferences] = useState<any>(null);
  
  const { data: recommendations, isLoading, refetch } = trpc.recommendations.getRecommendations.useQuery({
    preferences: selectedPreferences,
    limit: 12,
  });
  
  const { data: insights } = trpc.recommendations.getInsights.useQuery();
  const { data: preferences } = trpc.recommendations.getPreferences.useQuery();
  
  const trackClick = trpc.recommendations.provideFeedback.useMutation();
  
  const handlePropertyClick = (propertyId: number) => {
    trackClick.mutate({
      propertyId,
      feedback: 'interested',
    });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-96" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Your Personalized Recommendations</h1>
          </div>
          <p className="text-muted-foreground">
            Properties curated just for you based on your preferences and browsing history
          </p>
        </div>
      </div>
      
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Insights */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recommendation Insights */}
            {insights && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Why These Properties?</CardTitle>
                  <CardDescription>Based on your activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights.topFactors.map((factor, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{factor.factor}</span>
                        <Badge variant="secondary">{factor.weight}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{factor.description}</p>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full"
                          style={{ width: `${factor.weight}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Activity Summary */}
            {insights && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Views</span>
                    <span className="font-semibold">{insights.behaviorSummary.totalViews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Saved Properties</span>
                    <span className="font-semibold">{insights.behaviorSummary.savedProperties}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tours Scheduled</span>
                    <span className="font-semibold">{insights.behaviorSummary.tourScheduled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg. View Time</span>
                    <span className="font-semibold">{insights.behaviorSummary.avgViewTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Top Area</span>
                    <span className="font-semibold">{insights.behaviorSummary.mostViewedArea}</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Preferences */}
            {preferences && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Preferences</CardTitle>
                  <CardDescription>
                    <Link href="/dashboard/preferences">
                      <Button variant="link" className="p-0 h-auto text-xs">
                        Edit Preferences
                      </Button>
                    </Link>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Budget: </span>
                    <span className="font-medium">
                      ₦{(preferences.priceRange.min / 1000000).toFixed(0)}M - ₦{(preferences.priceRange.max / 1000000).toFixed(0)}M
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bedrooms: </span>
                    <span className="font-medium">{preferences.bedrooms.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Locations: </span>
                    <span className="font-medium">{preferences.locations.join(', ')}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Main Content - Recommendations */}
          <div className="lg:col-span-3">
            {recommendations && recommendations.length > 0 ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    {recommendations.length} Properties Recommended For You
                  </h2>
                  <Button variant="outline" onClick={() => refetch()}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {recommendations.map((property: any) => (
                    <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <Link href={`/properties/${property.id}`}>
                        <a onClick={() => handlePropertyClick(property.id)}>
                          <div className="relative h-48 bg-muted">
                            {property.imageUrl && (
                              <img
                                src={property.imageUrl}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-primary/90 backdrop-blur">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {property.matchScore}% Match
                              </Badge>
                            </div>
                          </div>
                        </a>
                      </Link>
                      
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                            {property.title}
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-1" />
                            {property.location}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center">
                            <Bed className="w-4 h-4 mr-1" />
                            {property.bedrooms}
                          </div>
                          <div className="flex items-center">
                            <Bath className="w-4 h-4 mr-1" />
                            {property.bathrooms}
                          </div>
                          <div className="flex items-center">
                            <Square className="w-4 h-4 mr-1" />
                            {property.sqft} sqft
                          </div>
                        </div>
                        
                        <div className="text-2xl font-bold text-primary">
                          ₦{property.price.toLocaleString()}
                        </div>
                        
                        {property.explanation && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {property.explanation}
                          </p>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Link href={`/properties/${property.id}`}>
                            <Button className="flex-1" size="sm">
                              View Details
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Calendar className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start browsing properties to get personalized recommendations!
                  </p>
                  <Link href="/properties">
                    <Button>Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
