import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Eye,
  TrendingUp,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Settings,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { getLoginUrl } from '@/const';

export default function AIRecommendations() {
  const { user, isAuthenticated } = useAuth();
  const [showPreferences, setShowPreferences] = useState(false);

  const { data: recommendations, isLoading } = trpc.recommendations.getRecommendations.useQuery(
    { limit: 10, includeExplanation: true },
    { enabled: isAuthenticated }
  );

  const { data: preferences } = trpc.recommendations.getPreferences.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: insights } = trpc.recommendations.getInsights.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const feedbackMutation = trpc.recommendations.provideFeedback.useMutation({
    onSuccess: () => {
      toast.success('Feedback recorded! We\'ll improve your recommendations.');
    },
  });

  const updatePreferencesMutation = trpc.recommendations.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success('Preferences updated successfully!');
      setShowPreferences(false);
    },
  });

  const handleFeedback = (propertyId: number, feedback: 'interested' | 'not_interested') => {
    feedbackMutation.mutate({ propertyId, feedback });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Property Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Sign in to get personalized property recommendations powered by AI.
            </p>
            <Button className="w-full" asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Generating personalized recommendations...</p>
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
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                AI Recommendations
              </h1>
              <p className="text-muted-foreground">
                Personalized property suggestions based on your preferences and behavior
              </p>
            </div>
            <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Preferences
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Recommendation Preferences</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Price (₦)</Label>
                      <Input
                        type="number"
                        defaultValue={preferences?.priceRange.min}
                        placeholder="50,000,000"
                      />
                    </div>
                    <div>
                      <Label>Max Price (₦)</Label>
                      <Input
                        type="number"
                        defaultValue={preferences?.priceRange.max}
                        placeholder="200,000,000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notification Frequency</Label>
                    <select className="w-full mt-2 px-3 py-2 border rounded-md">
                      <option value="daily">Daily</option>
                      <option value="weekly" selected>
                        Weekly
                      </option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => updatePreferencesMutation.mutate({})}
                  >
                    Save Preferences
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recommendations">For You</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            {recommendations && recommendations.length > 0 ? (
              <div className="grid gap-6">
                {recommendations.map((property: any) => (
                  <Card key={property.id} className="overflow-hidden">
                    <div className="md:flex">
                      {/* Property Image */}
                      <div className="md:w-1/3 bg-muted h-64 md:h-auto relative">
                        <div className="absolute top-4 left-4 z-10">
                          <Badge variant="default" className="text-sm">
                            {property.matchScore}% Match
                          </Badge>
                        </div>
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <MapPin className="h-12 w-12" />
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="md:w-2/3 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{property.title}</h3>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {property.location}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              ₦{(property.price / 1000000).toFixed(1)}M
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {property.bedrooms} beds
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {property.bathrooms} baths
                          </span>
                          <span className="flex items-center gap-1">
                            <Maximize className="h-4 w-4" />
                            {property.sqft} sqft
                          </span>
                        </div>

                        {/* AI Explanation */}
                        {property.explanation && (
                          <div className="bg-muted/50 rounded-lg p-4 mb-4">
                            <p className="text-sm flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{property.explanation}</span>
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={`/property/${property.id}`}>
                            <Button>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFeedback(property.id, 'interested')}
                          >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Interested
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFeedback(property.id, 'not_interested')}
                          >
                            <ThumbsDown className="h-4 w-4 mr-2" />
                            Not for me
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Recommendations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Browse properties to help us understand your preferences
                  </p>
                  <Link href="/properties">
                    <Button>Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {/* Recommendation Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  What Influences Your Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights?.topFactors.map((factor: any) => (
                    <div key={factor.factor}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{factor.factor}</span>
                        <span className="text-sm text-muted-foreground">{factor.weight}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-1">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${factor.weight}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Behavior Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Your Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Properties Viewed</p>
                    <p className="text-3xl font-bold">{insights?.behaviorSummary.totalViews}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Saved Properties</p>
                    <p className="text-3xl font-bold">
                      {insights?.behaviorSummary.savedProperties}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tours Scheduled</p>
                    <p className="text-3xl font-bold">
                      {insights?.behaviorSummary.tourScheduled}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average View Time</p>
                      <p className="text-lg font-semibold">
                        {insights?.behaviorSummary.avgViewTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Most Viewed Area</p>
                      <p className="text-lg font-semibold">
                        {insights?.behaviorSummary.mostViewedArea}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
