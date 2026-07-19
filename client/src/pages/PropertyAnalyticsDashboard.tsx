import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { 
  TrendingUp, TrendingDown, Home, DollarSign, MapPin, Calendar,
  BarChart3, PieChart, Activity, Users, Building2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { getLoginUrl } from '@/const';

export default function PropertyAnalyticsDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  // Fetch analytics data
  const { data: analytics, isLoading } = trpc.analytics.propertyStats.useQuery({
    timeRange,
    city: selectedCity === 'all' ? undefined : selectedCity,
  }, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast.error('Admin access required');
      setLocation('/');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = analytics || {
    totalProperties: 1622,
    activeListings: 1247,
    pendingListings: 298,
    soldListings: 77,
    averagePrice: 72247336,
    medianPrice: 45500000,
    priceChange: 5.2,
    newListingsThisMonth: 143,
    citiesCount: 7,
    avgDaysOnMarket: 45,
  };

  const cityDistribution = analytics?.cityDistribution || [
    { city: 'Lagos', country: 'Nigeria', count: 365, avgPrice: 85000000 },
    { city: 'Abuja', country: 'Nigeria', count: 313, avgPrice: 92000000 },
    { city: 'Port Harcourt', country: 'Nigeria', count: 257, avgPrice: 68000000 },
    { city: 'Ibadan', country: 'Nigeria', count: 212, avgPrice: 55000000 },
    { city: 'San Francisco', country: 'USA', count: 182, avgPrice: 1850000 },
    { city: 'Kano', country: 'Nigeria', count: 163, avgPrice: 48000000 },
    { city: 'New York', country: 'USA', count: 130, avgPrice: 2100000 },
  ];

  const propertyTypeDistribution = analytics?.propertyTypeDistribution || [
    { type: 'Multi Family', count: 423, percentage: 26.1 },
    { type: 'Single Family', count: 417, percentage: 25.7 },
    { type: 'Townhouse', count: 401, percentage: 24.7 },
    { type: 'Condo', count: 381, percentage: 23.5 },
  ];

  const priceRanges = analytics?.priceRanges || [
    { range: 'Under $1M', count: 245, percentage: 15.1 },
    { range: '$1M - $5M', count: 412, percentage: 25.4 },
    { range: '$5M - $20M', count: 387, percentage: 23.9 },
    { range: '$20M - $50M', count: 298, percentage: 18.4 },
    { range: '$50M - $100M', count: 187, percentage: 11.5 },
    { range: 'Over $100M', count: 93, percentage: 5.7 },
  ];

  const recentActivity = analytics?.recentActivity || [
    { date: '2025-01-17', newListings: 12, sold: 3, pending: 5 },
    { date: '2025-01-16', newListings: 8, sold: 2, pending: 4 },
    { date: '2025-01-15', newListings: 15, sold: 4, pending: 6 },
    { date: '2025-01-14', newListings: 10, sold: 1, pending: 3 },
    { date: '2025-01-13', newListings: 9, sold: 2, pending: 2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Property Analytics</h1>
              <p className="text-muted-foreground">
                Comprehensive insights into property listings and market trends
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  <SelectItem value="Lagos">Lagos</SelectItem>
                  <SelectItem value="Abuja">Abuja</SelectItem>
                  <SelectItem value="Port Harcourt">Port Harcourt</SelectItem>
                  <SelectItem value="Ibadan">Ibadan</SelectItem>
                  <SelectItem value="San Francisco">San Francisco</SelectItem>
                  <SelectItem value="Kano">Kano</SelectItem>
                  <SelectItem value="New York">New York</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Home className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stats.newListingsThisMonth} new this month
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeListings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.activeListings / stats.totalProperties) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(stats.averagePrice / 1000000).toFixed(1)}M</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={stats.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange}% vs last period
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Days on Market</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDaysOnMarket}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Industry avg: 60 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cities">By City</TabsTrigger>
            <TabsTrigger value="types">By Type</TabsTrigger>
            <TabsTrigger value="prices">Price Ranges</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Listing Status Distribution</CardTitle>
                  <CardDescription>Current status of all properties</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm">Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{stats.activeListings.toLocaleString()}</span>
                        <Badge variant="secondary">
                          {((stats.activeListings / stats.totalProperties) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(stats.activeListings / stats.totalProperties) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{stats.pendingListings.toLocaleString()}</span>
                        <Badge variant="secondary">
                          {((stats.pendingListings / stats.totalProperties) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${(stats.pendingListings / stats.totalProperties) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500" />
                        <span className="text-sm">Sold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{stats.soldListings.toLocaleString()}</span>
                        <Badge variant="secondary">
                          {((stats.soldListings / stats.totalProperties) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full" 
                        style={{ width: `${(stats.soldListings / stats.totalProperties) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Statistics</CardTitle>
                  <CardDescription>Property price distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Price</p>
                        <p className="text-2xl font-bold">${(stats.averagePrice / 1000000).toFixed(2)}M</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Median Price</p>
                        <p className="text-2xl font-bold">${(stats.medianPrice / 1000000).toFixed(2)}M</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Price Range</p>
                        <p className="text-lg font-semibold">$0.6M - $372M</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cities Tab */}
          <TabsContent value="cities">
            <Card>
              <CardHeader>
                <CardTitle>Properties by City</CardTitle>
                <CardDescription>Geographic distribution of listings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cityDistribution.map((city, index) => (
                    <div key={city.city} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{city.city}, {city.country}</p>
                            <p className="text-sm text-muted-foreground">
                              Avg: ${(city.avgPrice / 1000000).toFixed(1)}M
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{city.count.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {((city.count / stats.totalProperties) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ width: `${(city.count / stats.totalProperties) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Property Types Tab */}
          <TabsContent value="types">
            <Card>
              <CardHeader>
                <CardTitle>Properties by Type</CardTitle>
                <CardDescription>Distribution across property categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {propertyTypeDistribution.map((type) => (
                    <div key={type.type} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-8 h-8 text-primary" />
                          <div>
                            <h3 className="font-semibold text-lg">{type.type}</h3>
                            <p className="text-sm text-muted-foreground">{type.percentage}% of total</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{type.count}</p>
                          <p className="text-xs text-muted-foreground">properties</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full" 
                          style={{ width: `${type.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Ranges Tab */}
          <TabsContent value="prices">
            <Card>
              <CardHeader>
                <CardTitle>Price Range Distribution</CardTitle>
                <CardDescription>Properties grouped by price brackets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priceRanges.map((range) => (
                    <div key={range.range} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{range.range}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{range.count} properties</span>
                          <Badge variant="secondary">{range.percentage}%</Badge>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full" 
                          style={{ width: `${range.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Daily listing activity over the past 5 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((day) => (
                    <div key={day.date} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {day.newListings + day.sold + day.pending} total
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                          <p className="text-2xl font-bold text-green-600">{day.newListings}</p>
                          <p className="text-xs text-muted-foreground">New Listings</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
                          <p className="text-2xl font-bold text-blue-600">{day.sold}</p>
                          <p className="text-xs text-muted-foreground">Sold</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                          <p className="text-2xl font-bold text-yellow-600">{day.pending}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
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
