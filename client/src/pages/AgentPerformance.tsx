import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  DollarSign,
  Users,
  Home,
  Target,
  Star,
  Calendar,
  Award,
  BarChart3,
  Clock,
} from 'lucide-react';
import { getLoginUrl } from '@/const';

export default function AgentPerformance() {
  const { user, isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const { data: metrics, isLoading } = trpc.agentPerformance.getMetrics.useQuery(
    { period },
    { enabled: isAuthenticated }
  );

  const { data: funnel } = trpc.agentPerformance.getSalesFunnel.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: trends } = trpc.agentPerformance.getMonthlyTrends.useQuery(
    { months: 6 },
    { enabled: isAuthenticated }
  );

  const { data: topProperties } = trpc.agentPerformance.getTopProperties.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: ratings } = trpc.agentPerformance.getClientRatings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: goals } = trpc.agentPerformance.getGoals.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: comparison } = trpc.agentPerformance.getComparativeAnalysis.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: timeline } = trpc.agentPerformance.getActivityTimeline.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Agent Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Sign in to view your performance dashboard and analytics.
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
          <p className="text-muted-foreground">Loading performance data...</p>
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
                <BarChart3 className="h-8 w-8 text-primary" />
                Performance Dashboard
              </h1>
              <p className="text-muted-foreground">
                Track your sales, leads, and performance metrics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="px-4 py-2 border rounded-md"
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Key Metrics */}
        {metrics && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₦{(metrics.sales.totalRevenue / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.sales.soldProperties} properties sold
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.sales.activeListings}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.sales.totalListings} total listings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.leads.conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.leads.converted} of {metrics.leads.total} leads
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Client Satisfaction</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.performance.clientSatisfaction}/5</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ratings?.totalReviews} reviews
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Sales Funnel */}
              {funnel && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {funnel.stages.map((stage, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{stage.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {stage.count} ({stage.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3">
                            <div
                              className="bg-primary h-3 rounded-full transition-all"
                              style={{ width: `${stage.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Metrics */}
              {metrics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Avg. Response Time</span>
                      </div>
                      <span className="font-semibold">{metrics.performance.responseTime}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Showings Completed</span>
                      </div>
                      <span className="font-semibold">
                        {metrics.performance.showingsCompleted}/{metrics.performance.showingsScheduled}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Avg. Days on Market</span>
                      </div>
                      <span className="font-semibold">{metrics.sales.avgDaysOnMarket} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total Commission</span>
                      </div>
                      <span className="font-semibold">
                        ₦{(metrics.commission.total / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Properties */}
            {topProperties && topProperties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topProperties.map((property, idx) => (
                      <div
                        key={property.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-lg font-bold">
                            #{idx + 1}
                          </Badge>
                          <div>
                            <h4 className="font-semibold">{property.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Sold: ₦{(property.soldPrice / 1000000).toFixed(1)}M •{' '}
                              {property.daysOnMarket} days
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            ₦{(property.commission / 1000000).toFixed(2)}M
                          </p>
                          <p className="text-xs text-muted-foreground">Commission</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Ratings */}
            {ratings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    Client Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-center mb-4">
                        <div className="text-5xl font-bold mb-2">{ratings.overall}</div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                star <= Math.round(ratings.overall)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Based on {ratings.totalReviews} reviews
                        </p>
                      </div>
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <div key={rating} className="flex items-center gap-2">
                            <span className="text-sm w-8">{rating}★</span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full"
                                style={{
                                  width: `${(ratings.breakdown[rating] / ratings.totalReviews) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-8">
                              {ratings.breakdown[rating]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-4">Recent Reviews</h4>
                      <div className="space-y-4">
                        {ratings.recentReviews.map((review) => (
                          <div key={review.id} className="border-b pb-3 last:border-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{review.client}</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= review.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{review.comment}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.date).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            {goals && goals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        {goal.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Period: {goal.period}
                      </p>
                    </div>
                    <Badge variant={goal.progress >= 100 ? 'default' : 'secondary'}>
                      {goal.progress.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Current: {goal.current.toLocaleString()} {goal.unit}</span>
                      <span>Target: {goal.target.toLocaleString()} {goal.unit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          goal.progress >= 100 ? 'bg-green-600' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison">
            {comparison && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Performance Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Metric</th>
                          <th className="text-center py-3 px-4">You</th>
                          <th className="text-center py-3 px-4">Team Avg</th>
                          <th className="text-center py-3 px-4">Top Performer</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4">Sales</td>
                          <td className="text-center py-3 px-4 font-semibold">
                            {comparison.yourPerformance.sales}
                          </td>
                          <td className="text-center py-3 px-4">
                            {comparison.teamAverage.sales}
                          </td>
                          <td className="text-center py-3 px-4 text-green-600 font-semibold">
                            {comparison.topPerformer.sales}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Revenue</td>
                          <td className="text-center py-3 px-4 font-semibold">
                            ₦{(comparison.yourPerformance.revenue / 1000000).toFixed(0)}M
                          </td>
                          <td className="text-center py-3 px-4">
                            ₦{(comparison.teamAverage.revenue / 1000000).toFixed(0)}M
                          </td>
                          <td className="text-center py-3 px-4 text-green-600 font-semibold">
                            ₦{(comparison.topPerformer.revenue / 1000000).toFixed(0)}M
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Avg Days on Market</td>
                          <td className="text-center py-3 px-4 font-semibold">
                            {comparison.yourPerformance.avgDaysOnMarket}
                          </td>
                          <td className="text-center py-3 px-4">
                            {comparison.teamAverage.avgDaysOnMarket}
                          </td>
                          <td className="text-center py-3 px-4 text-green-600 font-semibold">
                            {comparison.topPerformer.avgDaysOnMarket}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4">Conversion Rate</td>
                          <td className="text-center py-3 px-4 font-semibold">
                            {comparison.yourPerformance.conversionRate}%
                          </td>
                          <td className="text-center py-3 px-4">
                            {comparison.teamAverage.conversionRate}%
                          </td>
                          <td className="text-center py-3 px-4 text-green-600 font-semibold">
                            {comparison.topPerformer.conversionRate}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            {timeline && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timeline.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="p-2 rounded-full bg-primary/10">
                          {activity.type === 'sale' && <DollarSign className="h-4 w-4 text-primary" />}
                          {activity.type === 'showing' && <Calendar className="h-4 w-4 text-primary" />}
                          {activity.type === 'lead' && <Users className="h-4 w-4 text-primary" />}
                          {activity.type === 'offer' && <FileText className="h-4 w-4 text-primary" />}
                          {activity.type === 'listing' && <Home className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
