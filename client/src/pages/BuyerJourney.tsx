// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, Eye, Heart, MessageSquare, Search, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function BuyerJourney() {
  const { user, isAuthenticated } = useAuth();
  const { data: profile } = trpc.analytics.getBuyerProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: intentData } = trpc.analytics.getBuyerIntent.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Please sign in to view your buyer journey</p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const intentScore = intentData?.intentScore || 0;
  const getIntentLevel = (score: number) => {
    if (score >= 70) return { label: 'High Intent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 40) return { label: 'Medium Intent', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Browsing', color: 'text-blue-600', bg: 'bg-blue-100' };
  };

  const intentLevel = getIntentLevel(intentScore);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Buyer Journey</h1>
        <p className="text-muted-foreground">
          Track your property search progress and get personalized insights
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Intent Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Buyer Intent Score
            </CardTitle>
            <CardDescription>How serious you are about buying</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">{intentScore}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${intentLevel.bg} ${intentLevel.color}`}>
                  {intentLevel.label}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${intentScore}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Based on your activity: property views, favorites, inquiries, and comparisons
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Properties Viewed</span>
                </div>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Favorites</span>
                </div>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Inquiries Sent</span>
                </div>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Searches</span>
                </div>
                <span className="font-semibold">-</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Your Preferences</CardTitle>
            <CardDescription>Based on your activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile?.priceRange && (
                <div>
                  <span className="text-sm font-medium">Price Range</span>
                  <p className="text-sm text-muted-foreground">
                    {JSON.parse(profile.priceRange).min} - {JSON.parse(profile.priceRange).max}
                  </p>
                </div>
              )}
              {profile?.minBedrooms && (
                <div>
                  <span className="text-sm font-medium">Bedrooms</span>
                  <p className="text-sm text-muted-foreground">{profile.minBedrooms}+ bedrooms</p>
                </div>
              )}
              {profile?.preferredLocations && (
                <div>
                  <span className="text-sm font-medium">Preferred Locations</span>
                  <p className="text-sm text-muted-foreground">
                    {JSON.parse(profile.preferredLocations).join(', ')}
                  </p>
                </div>
              )}
              {!profile && (
                <p className="text-sm text-muted-foreground">
                  No preferences set yet. Browse properties to build your profile.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>Personalized recommendations based on your journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {intentScore < 30 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-1">Start Exploring</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Browse our property listings to find homes that match your needs
                </p>
                <Button asChild size="sm">
                  <Link href="/properties">Browse Properties</Link>
                </Button>
              </div>
            )}
            {intentScore >= 30 && intentScore < 70 && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium mb-1">Narrow Down Your Search</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Save your favorite properties and set up search alerts
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href="/favorites">View Favorites</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/alerts">Set Alerts</Link>
                  </Button>
                </div>
              </div>
            )}
            {intentScore >= 70 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium mb-1">Ready to Take Action</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Schedule viewings and connect with agents for your favorite properties
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href="/agents">Find an Agent</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/favorites">View Saved Properties</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
