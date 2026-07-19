import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Mail, 
  MousePointerClick, 
  Eye, 
  AlertCircle,
  Download,
  Calendar
} from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EmailAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("30");
  const [chartInterval, setChartInterval] = useState<"day" | "week" | "month">("day");

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(timeRange));

  // Fetch analytics data
  const { data: metrics, isLoading: metricsLoading } = trpc.emailAnalytics.getCampaignMetrics.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: campaignPerformance, isLoading: performanceLoading } = trpc.emailAnalytics.getCampaignPerformance.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = trpc.emailAnalytics.getTimeSeriesData.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    interval: chartInterval,
  });

  const { data: emailTypeBreakdown, isLoading: typeLoading } = trpc.emailAnalytics.getEmailTypeBreakdown.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: deviceBreakdown, isLoading: deviceLoading } = trpc.emailAnalytics.getDeviceBreakdown.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: topCampaigns } = trpc.emailAnalytics.getTopPerformingCampaigns.useQuery({
    limit: 5,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: worstCampaigns } = trpc.emailAnalytics.getWorstPerformingCampaigns.useQuery({
    limit: 5,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Prepare chart data
  const timeSeriesChartData = {
    labels: timeSeriesData?.map(d => d.date) || [],
    datasets: [
      {
        label: "Sent",
        data: timeSeriesData?.map(d => d.sent) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
      },
      {
        label: "Delivered",
        data: timeSeriesData?.map(d => d.delivered) || [],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
      },
      {
        label: "Opened",
        data: timeSeriesData?.map(d => d.opened) || [],
        borderColor: "rgb(168, 85, 247)",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        fill: true,
      },
      {
        label: "Clicked",
        data: timeSeriesData?.map(d => d.clicked) || [],
        borderColor: "rgb(251, 146, 60)",
        backgroundColor: "rgba(251, 146, 60, 0.1)",
        fill: true,
      },
    ],
  };

  const emailTypeChartData = {
    labels: emailTypeBreakdown?.map(d => d.emailType) || [],
    datasets: [
      {
        label: "Count",
        data: emailTypeBreakdown?.map(d => d.count) || [],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(251, 146, 60, 0.8)",
          "rgba(236, 72, 153, 0.8)",
        ],
      },
    ],
  };

  const deviceChartData = {
    labels: deviceBreakdown?.map(d => d.device) || [],
    datasets: [
      {
        data: deviceBreakdown?.map(d => d.count) || [],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(251, 146, 60, 0.8)",
        ],
      },
    ],
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log("Exporting analytics data...");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Email Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track campaign performance and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalSent.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.delivered.toLocaleString() || 0} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.deliveryRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.failed || 0} failed, {metrics?.bounced || 0} bounced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.openRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.opened.toLocaleString() || 0} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.clickRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.clicked.toLocaleString() || 0} clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Performance Over Time</CardTitle>
                  <CardDescription>Track sends, deliveries, opens, and clicks</CardDescription>
                </div>
                <Select value={chartInterval} onValueChange={(v) => setChartInterval(v as any)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {timeSeriesLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">Loading chart...</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <Line
                    data={timeSeriesChartData}
                    options={{
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
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Types Distribution</CardTitle>
                <CardDescription>Breakdown by email category</CardDescription>
              </CardHeader>
              <CardContent>
                {typeLoading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <Bar
                      data={emailTypeChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Click-to-Open Rate</CardTitle>
                <CardDescription>Engagement quality metric</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[250px]">
                  <div className="text-6xl font-bold text-primary">
                    {metrics?.clickToOpenRate.toFixed(1) || 0}%
                  </div>
                  <p className="text-muted-foreground mt-2">
                    of opened emails resulted in a click
                  </p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Industry average: 10-15%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Campaigns</CardTitle>
                <CardDescription>Highest open and click rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCampaigns?.map((campaign, index) => (
                    <div key={campaign.templateId} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">#{index + 1}</span>
                          <div>
                            <p className="font-medium">{campaign.templateName}</p>
                            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Sent: <span className="font-medium text-foreground">{campaign.totalSent}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Open: <span className="font-medium text-green-600">{campaign.openRate.toFixed(1)}%</span>
                          </span>
                          <span className="text-muted-foreground">
                            Click: <span className="font-medium text-blue-600">{campaign.clickRate.toFixed(1)}%</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!topCampaigns || topCampaigns.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No campaigns found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Needs Improvement</CardTitle>
                <CardDescription>Campaigns with low engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {worstCampaigns?.map((campaign, index) => (
                    <div key={campaign.templateId} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="font-medium">{campaign.templateName}</p>
                            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Sent: <span className="font-medium text-foreground">{campaign.totalSent}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Open: <span className="font-medium text-orange-600">{campaign.openRate.toFixed(1)}%</span>
                          </span>
                          <span className="text-muted-foreground">
                            Click: <span className="font-medium text-red-600">{campaign.clickRate.toFixed(1)}%</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!worstCampaigns || worstCampaigns.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No campaigns found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Complete campaign performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Campaign</th>
                      <th className="text-right py-3 px-2">Sent</th>
                      <th className="text-right py-3 px-2">Delivered</th>
                      <th className="text-right py-3 px-2">Opened</th>
                      <th className="text-right py-3 px-2">Clicked</th>
                      <th className="text-right py-3 px-2">Open Rate</th>
                      <th className="text-right py-3 px-2">Click Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignPerformance?.map((campaign) => (
                      <tr key={campaign.templateId} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{campaign.templateName}</p>
                            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-2">{campaign.totalSent.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">{campaign.delivered.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">{campaign.opened.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">{campaign.clicked.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">
                          <span className={campaign.openRate >= 20 ? "text-green-600 font-medium" : ""}>
                            {campaign.openRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-2">
                          <span className={campaign.clickRate >= 3 ? "text-blue-600 font-medium" : ""}>
                            {campaign.clickRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!campaignPerformance || campaignPerformance.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No campaigns found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement by Email Type</CardTitle>
              <CardDescription>Open and click rates by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailTypeBreakdown?.map((type) => (
                  <div key={type.emailType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{type.emailType}</span>
                      <span className="text-sm text-muted-foreground">{type.count} sent</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Open Rate</span>
                          <span className="text-sm font-medium">{type.openRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.min(type.openRate, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Click Rate</span>
                          <span className="text-sm font-medium">{type.clickRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(type.clickRate * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>Email opens by device type</CardDescription>
              </CardHeader>
              <CardContent>
                {deviceLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <Doughnut
                      data={deviceChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom" as const,
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>Detailed statistics by device</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deviceBreakdown?.map((device) => (
                    <div key={device.device} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{device.device}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${device.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-2xl font-bold">{device.percentage}%</p>
                        <p className="text-sm text-muted-foreground">{device.count.toLocaleString()} opens</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
