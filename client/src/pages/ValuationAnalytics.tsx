import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  Users, 
  Eye, 
  MousePointerClick, 
  Clock, 
  DollarSign,
  Download,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function ValuationAnalytics() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  
  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "all":
        startDate = new Date(2020, 0, 1);
        break;
    }
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  
  // Fetch analytics data
  const { data: dashboard, isLoading } = trpc.analytics.getDashboard.useQuery({
    startDate,
    endDate,
  });

  const { data: funnel } = trpc.analytics.getFunnel.useQuery({
    startDate,
    endDate,
  });

  // Calculate metrics
  const totalViews = dashboard?.overall?.totalViews || 0;
  const uniqueUsers = dashboard?.overall?.uniqueUsers || 0;
  const avgDuration = Math.round((dashboard?.overall?.avgDuration || 0) / 60); // Convert to minutes
  const totalConversions = dashboard?.overall?.totalConversions || 0;
  const conversionRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(1) : "0.0";

  // Calculate ROI (estimated)
  const avgPropertyValue = 100000000; // ₦100M average
  const commissionRate = 0.05; // 5% commission
  const estimatedRevenue = totalConversions * avgPropertyValue * commissionRate;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Valuation Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track AI valuation engagement and conversion metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {uniqueUsers.toLocaleString()} unique users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDuration}m</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per valuation view
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConversions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {conversionRate}% conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Est. Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{(estimatedRevenue / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From valuation leads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        {funnel && (
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                User journey from viewing valuation to taking action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FunnelStep
                  label="Viewed Valuation"
                  count={funnel.totalViews || 0}
                  percentage={100}
                  color="bg-blue-500"
                />
                <FunnelStep
                  label="Viewed Visual Assessment"
                  count={funnel.viewedVisual || 0}
                  percentage={((funnel.viewedVisual || 0) / (funnel.totalViews || 1)) * 100}
                  color="bg-blue-400"
                />
                <FunnelStep
                  label="Viewed Neighborhood Analysis"
                  count={funnel.viewedNeighborhood || 0}
                  percentage={((funnel.viewedNeighborhood || 0) / (funnel.totalViews || 1)) * 100}
                  color="bg-blue-300"
                />
                <FunnelStep
                  label="Added to Favorites"
                  count={funnel.addedFavorite || 0}
                  percentage={((funnel.addedFavorite || 0) / (funnel.totalViews || 1)) * 100}
                  color="bg-green-500"
                />
                <FunnelStep
                  label="Contacted Agent"
                  count={funnel.contacted || 0}
                  percentage={((funnel.contacted || 0) / (funnel.totalViews || 1)) * 100}
                  color="bg-green-600"
                />
                <FunnelStep
                  label="Scheduled Tour"
                  count={funnel.scheduledTour || 0}
                  percentage={((funnel.scheduledTour || 0) / (funnel.totalViews || 1)) * 100}
                  color="bg-green-700"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Properties</CardTitle>
            <CardDescription>
              Properties with highest valuation engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : dashboard?.topProperties && dashboard.topProperties.length > 0 ? (
              <div className="space-y-3">
                {dashboard.topProperties.map((property: any, index: number) => (
                  <div
                    key={property.propertyId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <Link href={`/property/${property.propertyId}`}>
                          <span className="font-semibold hover:underline cursor-pointer">
                            Property #{property.propertyId}
                          </span>
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {property.views} views • {property.conversions} conversions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {((property.conversions / property.views) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        conversion rate
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device & Referrer Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
              <CardDescription>Views by device type</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.deviceStats && dashboard.deviceStats.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.deviceStats.map((stat: any) => (
                    <div key={stat.deviceType} className="flex items-center justify-between">
                      <span className="capitalize">{stat.deviceType || "Unknown"}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(stat.count / totalViews) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right">
                          {stat.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No device data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
              <CardDescription>Traffic sources</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.referrerStats && dashboard.referrerStats.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.referrerStats.slice(0, 5).map((stat: any) => (
                    <div key={stat.referrerPage} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[200px]">
                        {stat.referrerPage || "Direct"}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(stat.count / totalViews) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right">
                          {stat.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No referrer data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Funnel Step Component
function FunnelStep({
  label,
  count,
  percentage,
  color,
}: {
  label: string;
  count: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-8 bg-muted rounded-lg overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 flex items-center justify-end pr-3 text-white text-xs font-semibold`}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 10 && `${percentage.toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
}
