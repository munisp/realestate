import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  MousePointerClick, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Loader2,
  Filter,
  BarChart3,
  LineChart
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";
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
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type AlertStatus = "sent" | "delivered" | "opened" | "clicked" | "failed";
type DateRange = "7d" | "30d" | "90d" | "all";

export default function AlertHistory() {
  const { user, loading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Fetch alert history
  const { data: alerts, isLoading } = trpc.valuationAlerts.getAlertHistory.useQuery(
    {
      startDate,
      endDate,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { enabled: !!user }
  );

  // Fetch alert stats
  const { data: stats } = trpc.valuationAlerts.getAlertStats.useQuery(
    { startDate, endDate },
    { enabled: !!user }
  );

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your alert history</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  // Filter alerts by search query
  const filteredAlerts = alerts?.filter((alert: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      alert.propertyId?.toString().includes(query) ||
      alert.alertTitle?.toLowerCase().includes(query) ||
      alert.alertMessage?.toLowerCase().includes(query)
    );
  }) || [];

  // Prepare chart data
  const chartData = prepareChartData(alerts || [], dateRange);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alert History</h1>
            <p className="text-muted-foreground mt-1">
              View all valuation alerts sent to you
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/settings/alerts">
              <Button variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Manage Alerts
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSent || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Sent in selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Opened</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOpened || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalSent > 0 
                  ? `${((stats.totalOpened / stats.totalSent) * 100).toFixed(1)}% open rate`
                  : "No data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clicked</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClicked || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalSent > 0 
                  ? `${((stats.totalClicked / stats.totalSent) * 100).toFixed(1)}% click rate`
                  : "No data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFailed || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalSent > 0 
                  ? `${((stats.totalFailed / stats.totalSent) * 100).toFixed(1)}% failure rate`
                  : "No failures"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by property ID or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Charts and History */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">
              <Bell className="h-4 w-4 mr-2" />
              Alert History
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance Analytics
            </TabsTrigger>
          </TabsList>

          {/* Alert History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Alert History ({filteredAlerts.length})</CardTitle>
                <CardDescription>
                  All valuation change alerts sent to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {filteredAlerts.map((alert: any) => (
                      <AlertHistoryItem key={alert.id} alert={alert} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "You haven't received any valuation alerts yet"}
                    </p>
                    <Link href="/settings/alerts">
                      <Button>
                        <Bell className="h-4 w-4 mr-2" />
                        Set Up Alerts
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Alert Volume Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Alert Volume Trend
                  </CardTitle>
                  <CardDescription>
                    Number of alerts sent over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Line
                      data={chartData.volumeData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Rate Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Engagement Rate Trend
                  </CardTitle>
                  <CardDescription>
                    Open and click rates over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Line
                      data={chartData.engagementData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              callback: (value) => `${value}%`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Alert Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Status Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of alert delivery statuses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Doughnut
                      data={chartData.statusData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Alert Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Alert Type Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown by valuation change type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Bar
                      data={chartData.typeData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Alert History Item Component
function AlertHistoryItem({ alert }: { alert: any }) {
  const isIncrease = alert.changeType === "increase";
  const statusIcon = getStatusIcon(alert.deliveryStatus);
  const statusColor = getStatusColor(alert.deliveryStatus);

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-4 flex-1">
        {/* Change Direction Icon */}
        <div className={`p-2 rounded-full ${isIncrease ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
          {isIncrease ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
        </div>

        {/* Alert Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/property/${alert.propertyId}`}>
              <span className="font-semibold hover:underline cursor-pointer">
                Property #{alert.propertyId}
              </span>
            </Link>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {alert.deliveryStatus}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {alert.alertMessage || "Valuation changed significantly"}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(alert.sentAt).toLocaleString()}
            </span>
            {alert.openedAt && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Opened {new Date(alert.openedAt).toLocaleString()}
              </span>
            )}
            {alert.clickedAt && (
              <span className="flex items-center gap-1">
                <MousePointerClick className="h-3 w-3" />
                Clicked {new Date(alert.clickedAt).toLocaleString()}
              </span>
            )}
          </div>

          {alert.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              <strong>Error:</strong> {alert.error}
            </div>
          )}
        </div>
      </div>

      {/* Status Icon */}
      <div className="ml-4">
        {statusIcon}
      </div>
    </div>
  );
}

// Helper functions
function getStatusIcon(status: string) {
  switch (status) {
    case "delivered":
    case "opened":
    case "clicked":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "sent":
      return <Clock className="h-5 w-5 text-blue-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-400" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "delivered":
      return "bg-blue-100 text-blue-700";
    case "opened":
      return "bg-green-100 text-green-700";
    case "clicked":
      return "bg-purple-100 text-purple-700";
    case "failed":
      return "bg-red-100 text-red-700";
    case "sent":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

// Prepare chart data from alerts
function prepareChartData(alerts: any[], dateRange: DateRange) {
  // Group alerts by date
  const alertsByDate = new Map<string, any[]>();
  alerts.forEach(alert => {
    const date = new Date(alert.sentAt).toLocaleDateString();
    if (!alertsByDate.has(date)) {
      alertsByDate.set(date, []);
    }
    alertsByDate.get(date)!.push(alert);
  });

  // Sort dates
  const sortedDates = Array.from(alertsByDate.keys()).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Volume data
  const volumeData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'Alerts Sent',
        data: sortedDates.map(date => alertsByDate.get(date)!.length),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Engagement data
  const engagementData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'Open Rate',
        data: sortedDates.map(date => {
          const dayAlerts = alertsByDate.get(date)!;
          const opened = dayAlerts.filter(a => a.openedAt).length;
          return dayAlerts.length > 0 ? (opened / dayAlerts.length) * 100 : 0;
        }),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Click Rate',
        data: sortedDates.map(date => {
          const dayAlerts = alertsByDate.get(date)!;
          const clicked = dayAlerts.filter(a => a.clickedAt).length;
          return dayAlerts.length > 0 ? (clicked / dayAlerts.length) * 100 : 0;
        }),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Status distribution
  const statusCounts = alerts.reduce((acc: any, alert) => {
    acc[alert.deliveryStatus] = (acc[alert.deliveryStatus] || 0) + 1;
    return acc;
  }, {});

  const statusData = {
    labels: ['Sent', 'Delivered', 'Opened', 'Clicked', 'Failed'],
    datasets: [
      {
        data: [
          statusCounts['sent'] || 0,
          statusCounts['delivered'] || 0,
          statusCounts['opened'] || 0,
          statusCounts['clicked'] || 0,
          statusCounts['failed'] || 0,
        ],
        backgroundColor: [
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(234, 179, 8)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(168, 85, 247)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Type distribution
  const typeCounts = alerts.reduce((acc: any, alert) => {
    acc[alert.changeType] = (acc[alert.changeType] || 0) + 1;
    return acc;
  }, {});

  const typeData = {
    labels: ['Increase', 'Decrease', 'Both'],
    datasets: [
      {
        label: 'Alert Count',
        data: [
          typeCounts['increase'] || 0,
          typeCounts['decrease'] || 0,
          typeCounts['both'] || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return {
    volumeData,
    engagementData,
    statusData,
    typeData,
  };
}
