// @ts-nocheck
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Server,
  TrendingUp,
  XCircle,
  RefreshCw,
  Database,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/**
 * Monitoring Dashboard for Data Services
 * Displays health, performance, costs, and alerts for Earth Engine, World Bank, and PropertyPro services
 */

const COLORS = {
  earth_engine: "#10b981",
  worldbank: "#3b82f6",
  propertypro: "#f59e0b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

const SERVICE_NAMES = {
  earth_engine: "Earth Engine",
  worldbank: "World Bank",
  propertypro: "PropertyPro",
};

export default function MonitoringDashboard() {
  const [selectedService, setSelectedService] = useState<"earth_engine" | "worldbank" | "propertypro" | undefined>();
  const [timeRange, setTimeRange] = useState<24 | 168>(24); // 24 hours or 7 days

  // Fetch dashboard overview
  const { data: overview, refetch: refetchOverview, isLoading: overviewLoading } = trpc.monitoring.getDashboardOverview.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch performance metrics
  const { data: performanceMetrics } = trpc.monitoring.getPerformanceMetrics.useQuery(
    {
      serviceName: selectedService || "earth_engine",
      hours: timeRange,
    },
    {
      enabled: !!selectedService,
    }
  );

  // Fetch cache performance
  const { data: cachePerformance } = trpc.monitoring.getCachePerformance.useQuery({
    serviceName: selectedService,
    days: 7,
  });

  // Fetch cost projections
  const { data: costProjections } = trpc.monitoring.getCostProjections.useQuery(
    {
      serviceName: selectedService || "earth_engine",
    },
    {
      enabled: !!selectedService,
    }
  );

  // Fetch usage trends
  const { data: usageTrends } = trpc.monitoring.getUsageTrends.useQuery({
    days: 30,
  });

  const handleRefresh = () => {
    refetchOverview();
  };

  if (overviewLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load monitoring data. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalRequests24h = overview.stats24h.reduce((sum, s) => sum + (s.totalRequests || 0), 0);
  const totalCacheHits24h = overview.stats24h.reduce((sum, s) => sum + (s.cacheHits || 0), 0);
  const cacheHitRate = totalRequests24h > 0 ? Math.round((totalCacheHits24h / totalRequests24h) * 100) : 0;
  const avgResponseTime = overview.stats24h.reduce((sum, s) => sum + (s.avgResponseTimeMs || 0), 0) / overview.stats24h.length;

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Services Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Real-time health, performance, and cost tracking for external data sources
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Unresolved Alerts */}
      {overview.unresolvedAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Alerts ({overview.unresolvedAlerts.length})</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {overview.unresolvedAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="text-sm">
                  <span className="font-medium">{SERVICE_NAMES[alert.serviceName as keyof typeof SERVICE_NAMES]}:</span> {alert.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheHitRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCacheHits24h.toLocaleString()} hits / {totalRequests24h.toLocaleString()} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgResponseTime)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost (7d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${overview.costs.reduce((sum, c) => sum + Number(c.totalCost || 0), 0) / 100}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mock mode: $0</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health Status</CardTitle>
          <CardDescription>Current status of all data services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.health.map((service) => (
              <div key={service.serviceName} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    {service.status === "healthy" ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{SERVICE_NAMES[service.serviceName as keyof typeof SERVICE_NAMES]}</div>
                    <div className="text-sm text-muted-foreground">
                      Last checked: {new Date(service.lastCheckAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {service.mockMode === 1 && (
                    <Badge variant="secondary">Mock Mode</Badge>
                  )}
                  {service.responseTimeMs && (
                    <div className="text-sm text-muted-foreground">
                      {service.responseTimeMs}ms
                    </div>
                  )}
                  <Badge variant={service.status === "healthy" ? "default" : "destructive"}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Response times and request volumes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={timeRange === 24 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(24)}
                  >
                    24h
                  </Button>
                  <Button
                    variant={timeRange === 168 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(168)}
                  >
                    7d
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 mb-4">
                {overview.health.map((service) => (
                  <Button
                    key={service.serviceName}
                    variant={selectedService === service.serviceName ? "default" : "outline"}
                    onClick={() => setSelectedService(service.serviceName as any)}
                    className="justify-start"
                  >
                    <Server className="h-4 w-4 mr-2" />
                    {SERVICE_NAMES[service.serviceName as keyof typeof SERVICE_NAMES]}
                  </Button>
                ))}
              </div>

              {performanceMetrics && performanceMetrics.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgResponseTimeMs"
                      stroke="#8884d8"
                      name="Avg Response Time (ms)"
                    />
                    <Line
                      type="monotone"
                      dataKey="p95ResponseTimeMs"
                      stroke="#82ca9d"
                      name="P95 Response Time (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 24h Stats by Service */}
          <div className="grid gap-4 md:grid-cols-3">
            {overview.stats24h.map((stat) => (
              <Card key={stat.serviceName}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {SERVICE_NAMES[stat.serviceName as keyof typeof SERVICE_NAMES]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Requests:</span>
                    <span className="font-medium">{stat.totalRequests || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-medium">
                      {stat.totalRequests
                        ? Math.round(((stat.successfulRequests || 0) / stat.totalRequests) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Response:</span>
                    <span className="font-medium">{Math.round(stat.avgResponseTimeMs || 0)}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cache Hits:</span>
                    <span className="font-medium">
                      {stat.totalRequests
                        ? Math.round(((stat.cacheHits || 0) / stat.totalRequests) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Performance (Last 7 Days)</CardTitle>
              <CardDescription>Cache hit rates and efficiency metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {cachePerformance && cachePerformance.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cachePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cacheHitRate"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Cache Hit Rate (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {overview.health.map((service) => (
              <Card key={service.serviceName}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {SERVICE_NAMES[service.serviceName as keyof typeof SERVICE_NAMES]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-muted-foreground mt-1">Mock mode (no costs)</p>
                  {service.serviceName === "earth_engine" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Production: ~$0.001/request
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedService && costProjections && (
            <Card>
              <CardHeader>
                <CardTitle>Cost Projections - {SERVICE_NAMES[selectedService]}</CardTitle>
                <CardDescription>Based on last 30 days of usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Daily Average</div>
                    <div className="text-2xl font-bold">${costProjections.dailyAverage.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Monthly Projection</div>
                    <div className="text-2xl font-bold">${costProjections.monthlyProjection.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Yearly Projection</div>
                    <div className="text-2xl font-bold">${costProjections.yearlyProjection.toFixed(2)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage Trends Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends (Last 30 Days)</CardTitle>
              <CardDescription>Request volumes and success rates over time</CardDescription>
            </CardHeader>
            <CardContent>
              {usageTrends && usageTrends.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={usageTrends[0]?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar dataKey="totalRequests" fill="#8884d8" name="Total Requests" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
