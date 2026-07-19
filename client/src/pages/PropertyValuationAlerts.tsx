import { useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowLeft,
  Loader2,
  LineChart,
  History,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PropertyValuationAlerts() {
  const { id } = useParams();
  const propertyId = parseInt(id || "0");
  const { user, loading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState<"30d" | "90d" | "1y" | "all">("90d");

  // Fetch property details
  const { data: property, isLoading: propertyLoading } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: !!propertyId }
  );

  // Fetch valuation history for this property
  const { data: valuationHistory, isLoading: historyLoading } = trpc.properties.getValuationHistory.useQuery(
    { propertyId },
    { enabled: !!propertyId }
  );

  // Fetch alert history for this property
  const { data: alertData, isLoading: alertsLoading } = trpc.valuationAlerts.getAlertHistory.useQuery(
    {
      startDate: getStartDate(dateRange),
      endDate: new Date(),
    },
    { enabled: !!user }
  );

  // Filter alerts for this property
  const propertyAlerts = alertData?.alerts?.filter(
    (alert: any) => alert.propertyId === propertyId
  ) || [];

  // Fetch current monitoring status
  const { data: monitoring } = trpc.valuationAlerts.getUserMonitoring.useQuery(
    undefined,
    { enabled: !!user }
  );

  const currentMonitoring = monitoring?.find(
    (m: any) => m.propertyId === propertyId && m.isActive
  );

  if (authLoading || propertyLoading || historyLoading || alertsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!property) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Property Not Found</CardTitle>
            <CardDescription>The requested property could not be found</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Prepare chart data
  const chartData = prepareValuationChart(valuationHistory || []);

  // Calculate statistics
  const stats = calculateStats(valuationHistory || []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/property/${propertyId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Property
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Valuation Alerts</h1>
              <p className="text-muted-foreground mt-1">
                {property.address}, {property.city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentMonitoring ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Monitoring Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Not Monitored
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Valuation</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: "NGN",
                  minimumFractionDigits: 0,
                }).format(stats.currentValuation)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                As of {new Date(stats.lastUpdated).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Change</CardTitle>
              {stats.totalChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stats.totalChange >= 0 ? "+" : ""}
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: "NGN",
                  minimumFractionDigits: 0,
                }).format(stats.totalChange)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalChangePercent >= 0 ? "+" : ""}
                {stats.totalChangePercent.toFixed(2)}% since first valuation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alerts Sent</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{propertyAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In the last {dateRange === "30d" ? "30 days" : dateRange === "90d" ? "90 days" : dateRange === "1y" ? "year" : "all time"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valuations</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalValuations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total valuation records
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">
              <LineChart className="h-4 w-4 mr-2" />
              Valuation Trend
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alert History
            </TabsTrigger>
          </TabsList>

          {/* Valuation Chart Tab */}
          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle>Valuation History</CardTitle>
                <CardDescription>
                  Historical valuation changes for this property
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              return `Valuation: ${new Intl.NumberFormat("en-NG", {
                                style: "currency",
                                currency: "NGN",
                                minimumFractionDigits: 0,
                              }).format(context.parsed.y)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: false,
                          ticks: {
                            callback: (value) => {
                              return new Intl.NumberFormat("en-NG", {
                                style: "currency",
                                currency: "NGN",
                                minimumFractionDigits: 0,
                                notation: "compact",
                              }).format(value as number);
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert History Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Alert History ({propertyAlerts.length})</CardTitle>
                <CardDescription>
                  All valuation change alerts sent for this property
                </CardDescription>
              </CardHeader>
              <CardContent>
                {propertyAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {propertyAlerts.map((alert: any) => (
                      <PropertyAlertItem key={alert.id} alert={alert} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
                    <p className="text-muted-foreground mb-4">
                      No valuation alerts have been sent for this property
                    </p>
                    {!currentMonitoring && (
                      <Link href="/settings/alerts">
                        <Button>
                          <Bell className="h-4 w-4 mr-2" />
                          Set Up Monitoring
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Valuation History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Valuation History</CardTitle>
            <CardDescription>
              Complete record of all valuations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Valuation</th>
                    <th className="text-right p-3 font-medium">Change</th>
                    <th className="text-right p-3 font-medium">Change %</th>
                    <th className="text-left p-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {(valuationHistory || []).map((record: any, index: number) => {
                    const previousRecord = valuationHistory?.[index + 1];
                    const change = previousRecord
                      ? record.estimatedValue - previousRecord.estimatedValue
                      : 0;
                    const changePercent = previousRecord
                      ? ((change / previousRecord.estimatedValue) * 100)
                      : 0;

                    return (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          {new Date(record.valuationDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: "NGN",
                            minimumFractionDigits: 0,
                          }).format(record.estimatedValue)}
                        </td>
                        <td className={`p-3 text-right ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {previousRecord ? (
                            <>
                              {change >= 0 ? "+" : ""}
                              {new Intl.NumberFormat("en-NG", {
                                style: "currency",
                                currency: "NGN",
                                minimumFractionDigits: 0,
                              }).format(change)}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className={`p-3 text-right ${changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {previousRecord ? (
                            <>
                              {changePercent >= 0 ? "+" : ""}
                              {changePercent.toFixed(2)}%
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">
                            {record.valuationMethod || "Automated"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Property Alert Item Component
function PropertyAlertItem({ alert }: { alert: any }) {
  const isIncrease = alert.changeType === "increase";

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-4 flex-1">
        <div className={`p-2 rounded-full ${isIncrease ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
          {isIncrease ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{alert.alertTitle}</span>
            <Badge variant={alert.deliveryStatus === "delivered" ? "default" : "secondary"}>
              {alert.deliveryStatus}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {alert.alertMessage}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(alert.sentAt).toLocaleString()}
            </span>
            {alert.opened && (
              <Badge variant="outline" className="text-xs">
                Opened
              </Badge>
            )}
            {alert.clicked && (
              <Badge variant="outline" className="text-xs">
                Clicked
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getStartDate(range: "30d" | "90d" | "1y" | "all"): Date {
  const now = new Date();
  switch (range) {
    case "30d":
      return new Date(now.setDate(now.getDate() - 30));
    case "90d":
      return new Date(now.setDate(now.getDate() - 90));
    case "1y":
      return new Date(now.setFullYear(now.getFullYear() - 1));
    case "all":
      return new Date(2020, 0, 1);
  }
}

function prepareValuationChart(history: any[]) {
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.valuationDate).getTime() - new Date(b.valuationDate).getTime()
  );

  return {
    labels: sortedHistory.map((record) =>
      new Date(record.valuationDate).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Valuation',
        data: sortedHistory.map((record) => record.estimatedValue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };
}

function calculateStats(history: any[]) {
  if (history.length === 0) {
    return {
      currentValuation: 0,
      totalChange: 0,
      totalChangePercent: 0,
      totalValuations: 0,
      lastUpdated: new Date(),
    };
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.valuationDate).getTime() - new Date(a.valuationDate).getTime()
  );

  const current = sortedHistory[0];
  const first = sortedHistory[sortedHistory.length - 1];
  const totalChange = current.estimatedValue - first.estimatedValue;
  const totalChangePercent = (totalChange / first.estimatedValue) * 100;

  return {
    currentValuation: current.estimatedValue,
    totalChange,
    totalChangePercent,
    totalValuations: history.length,
    lastUpdated: current.valuationDate,
  };
}
