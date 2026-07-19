// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  BarChart3,
  Activity,
  Target,
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PricingAnalytics() {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Fetch user's properties
  const { data: properties } = trpc.property.getUserProperties.useQuery();

  // Mock analytics data (replace with real tRPC query)
  const analyticsData = {
    totalRevenue: 45680,
    revenueChange: 12.5,
    avgOccupancy: 78,
    occupancyChange: 5.2,
    avgDailyRate: 185,
    rateChange: -3.1,
    revenuePerProperty: 15227,
    effectivenessScore: 85,
    
    // Revenue trend data
    revenueTrend: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: [
        {
          label: "Actual Revenue",
          data: [10200, 11500, 12800, 11180],
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Projected Revenue",
          data: [9800, 10500, 11200, 11900],
          borderColor: "rgb(156, 163, 175)",
          backgroundColor: "rgba(156, 163, 175, 0.1)",
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        },
      ],
    },

    // Occupancy trend data
    occupancyTrend: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: [
        {
          label: "Occupancy Rate (%)",
          data: [72, 75, 82, 78],
          backgroundColor: "rgba(34, 197, 94, 0.8)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 1,
        },
      ],
    },

    // Pricing effectiveness by property
    propertyPerformance: [
      { name: "Lekki Apartment", revenue: 18500, occupancy: 85, effectiveness: 92 },
      { name: "Victoria Island Condo", revenue: 22100, occupancy: 78, effectiveness: 88 },
      { name: "Ikoyi Penthouse", revenue: 15200, occupancy: 65, effectiveness: 75 },
    ],

    // Price optimization opportunities
    opportunities: [
      {
        property: "Lekki Apartment",
        recommendation: "Increase weekend rates by 15%",
        potentialRevenue: 2400,
        confidence: 85,
      },
      {
        property: "Victoria Island Condo",
        recommendation: "Add length-of-stay discount for 7+ nights",
        potentialRevenue: 1800,
        confidence: 78,
      },
      {
        property: "Ikoyi Penthouse",
        recommendation: "Reduce weekday rates by 10% to improve occupancy",
        potentialRevenue: 3200,
        confidence: 92,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Analytics</h1>
          <p className="text-muted-foreground">
            Track revenue optimization and pricing effectiveness
          </p>
        </div>

        <div className="flex gap-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{analyticsData.totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{analyticsData.revenueChange}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.avgOccupancy}%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{analyticsData.occupancyChange}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{analyticsData.avgDailyRate}</div>
            <div className="flex items-center text-xs text-red-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              {analyticsData.rateChange}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Effectiveness Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.effectivenessScore}/100</div>
            <p className="text-xs text-muted-foreground">Pricing optimization</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy Trends</TabsTrigger>
          <TabsTrigger value="performance">Property Performance</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Actual vs projected revenue over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <Line data={analyticsData.revenueTrend} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Rate Trend</CardTitle>
              <CardDescription>
                Weekly occupancy rates across all properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <Bar data={analyticsData.occupancyTrend} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Performance</CardTitle>
              <CardDescription>
                Revenue, occupancy, and effectiveness by property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.propertyPerformance.map((property, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{property.name}</h4>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Revenue: ₦{property.revenue.toLocaleString()}</span>
                        <span>Occupancy: {property.occupancy}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          property.effectiveness >= 85
                            ? "default"
                            : property.effectiveness >= 70
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {property.effectiveness}% Effective
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Optimization Opportunities</CardTitle>
              <CardDescription>
                AI-powered recommendations to increase revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.opportunities.map((opportunity, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{opportunity.property}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {opportunity.recommendation}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          +₦{opportunity.potentialRevenue.toLocaleString()} potential
                        </Badge>
                        <Badge variant="secondary">
                          {opportunity.confidence}% confidence
                        </Badge>
                      </div>
                    </div>
                    <Activity className="h-5 w-5 text-blue-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
