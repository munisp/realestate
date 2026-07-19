import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Eye, Heart, TrendingUp, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function PropertyAnalytics() {
  const { user, isAuthenticated } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState("30"); // days

  const { data: properties } = trpc.properties.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  const { data: viewStats, isLoading: statsLoading } = trpc.properties.viewStats.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to view property analytics
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myProperties = properties?.filter(p => p.ownerId === user?.id) || [];
  const selectedProperty = myProperties.find(p => p.id === selectedPropertyId);

  // Calculate aggregate stats
  const totalViews = viewStats?.totalViews || 0;
  const uniqueVisitors = viewStats?.uniqueVisitors || 0;
  const avgViewDuration = viewStats?.avgViewDuration || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-8 w-8 text-primary" />
              <span>{APP_TITLE}</span>
            </Link>
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/my-listings">My Listings</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Property Analytics</h1>
          <p className="text-muted-foreground">
            Track performance and engagement metrics for your property listings
          </p>
        </div>

        {myProperties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Add properties to start tracking analytics
              </p>
              <Button asChild>
                <Link href="/listings/new">Add Your First Property</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Property Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Property</CardTitle>
                <CardDescription>Choose a property to view detailed analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Select
                      value={selectedPropertyId?.toString() || ""}
                      onValueChange={(value) => setSelectedPropertyId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                      <SelectContent>
                        {myProperties.map((property) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.title || property.addressLine1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedProperty && (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <img
                      src={selectedProperty.primaryImage || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200"}
                      alt={selectedProperty.title || selectedProperty.addressLine1}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-semibold">
                        {selectedProperty.title || selectedProperty.addressLine1}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedProperty.city}, {selectedProperty.state} • ₦{selectedProperty.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics Overview */}
            {selectedPropertyId && (
              <>
                {statsLoading ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader>
                          <div className="h-6 bg-muted rounded w-1/2 mb-2" />
                          <div className="h-8 bg-muted rounded w-3/4" />
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Key Metrics */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            All-time property views
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{uniqueVisitors.toLocaleString()}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Distinct users who viewed
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Avg. View Time</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {Math.round(avgViewDuration / 60)}m {Math.round(avgViewDuration % 60)}s
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Average time on page
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Engagement Insights */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Engagement Insights
                        </CardTitle>
                        <CardDescription>
                          Performance analysis for the selected time period
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Engagement Rate</span>
                              <span className="font-semibold">
                                {totalViews > 0
                                  ? ((uniqueVisitors / totalViews) * 100).toFixed(1)
                                  : 0}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${totalViews > 0 ? (uniqueVisitors / totalViews) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Return Visitors</span>
                              <span className="font-semibold">
                                {totalViews > 0
                                  ? (((totalViews - uniqueVisitors) / totalViews) * 100).toFixed(1)
                                  : 0}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{
                                  width: `${totalViews > 0 ? ((totalViews - uniqueVisitors) / totalViews) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <h4 className="font-semibold mb-3">Performance Tips</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {totalViews < 10 && (
                              <li className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                                <span>Your listing needs more visibility. Consider sharing on social media.</span>
                              </li>
                            )}
                            {avgViewDuration < 60 && (
                              <li className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                                <span>Add more photos and detailed description to increase engagement time.</span>
                              </li>
                            )}
                            {uniqueVisitors > 20 && totalViews / uniqueVisitors < 1.5 && (
                              <li className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5" />
                                <span>Great! Most visitors are new, indicating good reach.</span>
                              </li>
                            )}
                            {totalViews / uniqueVisitors > 2 && (
                              <li className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5" />
                                <span>Excellent! High return visitor rate shows strong interest.</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-3">
                        <Button variant="outline" asChild>
                          <Link href={`/property/${selectedPropertyId}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Property
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href={`/listings/edit/${selectedPropertyId}`}>
                            Edit Listing
                          </Link>
                        </Button>
                        <Button variant="outline">
                          <Heart className="mr-2 h-4 w-4" />
                          Share Listing
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
