import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageSquare, 
  DollarSign,
  Plus,
  BarChart3,
  Activity,
  Calendar
} from "lucide-react";
import { Link } from "wouter";

export default function OwnerDashboard() {
  const { user, isAuthenticated } = useAuth();

  const { data: properties, isLoading: propertiesLoading } = trpc.properties.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  const { data: analytics } = trpc.properties.ownerAnalytics.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: recentActivity } = trpc.properties.recentActivity.useQuery(
    undefined,
    { enabled: isAuthenticated }
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
              Please sign in to access your owner dashboard
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
  const activeListings = myProperties.filter(p => p.status === "active").length;
  const totalViews = analytics?.totalViews || 0;
  const totalFavorites = analytics?.totalFavorites || 0;
  const totalInquiries = analytics?.totalInquiries || 0;

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
                <Link href="/listings">View All Listings</Link>
              </Button>
              <Button asChild>
                <Link href="/listings/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your property listings
          </p>
        </div>

        {/* Analytics Overview Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeListings}</div>
              <p className="text-xs text-muted-foreground">
                of {myProperties.length} total properties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.viewsChange && (
                  <span className={analytics.viewsChange > 0 ? "text-green-600" : "text-red-600"}>
                    {analytics.viewsChange > 0 ? "+" : ""}{analytics.viewsChange}% from last month
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFavorites}</div>
              <p className="text-xs text-muted-foreground">
                Saved by potential buyers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInquiries}</div>
              <p className="text-xs text-muted-foreground">
                Messages received
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Different Views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Top Performing Properties */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Properties</CardTitle>
                <CardDescription>Your most viewed and favorited listings</CardDescription>
              </CardHeader>
              <CardContent>
                {propertiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex gap-4">
                        <div className="h-20 w-32 bg-muted rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : myProperties.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding your first property listing
                    </p>
                    <Button asChild>
                      <Link href="/listings/new">Add Property</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myProperties.slice(0, 5).map((property) => {
                      const images = property.images ? JSON.parse(property.images) : [];
                      const primaryImage = property.primaryImage || images[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400";

                      return (
                        <div key={property.id} className="flex gap-4 items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <img
                            src={primaryImage}
                            alt={property.title || property.addressLine1}
                            className="h-20 w-32 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {property.title || property.addressLine1}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {property.city}, {property.state}
                            </p>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {property.viewCount || 0} views
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {property.favoriteCount || 0} favorites
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              ${property.price.toLocaleString()}
                            </div>
                            <Badge variant={property.status === "active" ? "default" : "secondary"}>
                              {property.status}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/property/${property.id}`}>View</Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Engagement Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Views to Favorites</span>
                        <span className="text-sm font-semibold">
                          {totalViews > 0 ? ((totalFavorites / totalViews) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={totalViews > 0 ? (totalFavorites / totalViews) * 100 : 0} 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Views to Inquiries</span>
                        <span className="text-sm font-semibold">
                          {totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={totalViews > 0 ? (totalInquiries / totalViews) * 100 : 0} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                      <span>Add high-quality photos to increase views by up to 40%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                      <span>Properties with virtual tours get 2x more inquiries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                      <span>Respond to inquiries within 24 hours to improve conversion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                      <span>Update pricing based on market trends and analytics</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Comparison</CardTitle>
                <CardDescription>Compare performance across all your listings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myProperties.map((property) => (
                    <div key={property.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">{property.title || property.addressLine1}</h3>
                          <p className="text-sm text-muted-foreground">{property.city}, {property.state}</p>
                        </div>
                        <Badge variant={property.status === "active" ? "default" : "secondary"}>
                          {property.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">{property.viewCount || 0}</div>
                          <div className="text-xs text-muted-foreground">Views</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{property.favoriteCount || 0}</div>
                          <div className="text-xs text-muted-foreground">Favorites</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {property.viewCount > 0 
                              ? ((property.favoriteCount || 0) / property.viewCount * 100).toFixed(1)
                              : 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">Conversion</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest interactions with your properties</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity: any, index: number) => (
                      <div key={index} className="flex gap-4 items-start pb-4 border-b last:border-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {activity.type === "view" && <Eye className="h-5 w-5 text-primary" />}
                          {activity.type === "favorite" && <Heart className="h-5 w-5 text-primary" />}
                          {activity.type === "inquiry" && <MessageSquare className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">{activity.propertyTitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
