// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Users, Home, DollarSign, Shield, Activity, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "wouter";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState("30d");
  const [exportingMetric, setExportingMetric] = useState<string | null>(null);

  const { data: dashboardMetrics, isLoading } = trpc.analytics.getDashboardMetrics.useQuery();

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access analytics</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleExport = async (metricType: string) => {
    setExportingMetric(metricType);
    try {
      let result;
      switch (metricType) {
        case 'dashboard':
          result = await trpc.analytics.exportDashboardCSV.query();
          break;
        case 'moderation':
          result = await trpc.analytics.exportModerationCSV.query();
          break;
        case 'property':
          result = await trpc.analytics.exportPropertyCSV.query();
          break;
        case 'user':
          result = await trpc.analytics.exportUserCSV.query();
          break;
        case 'transaction':
          result = await trpc.analytics.exportTransactionCSV.query();
          break;
        case 'escrow':
          result = await trpc.analytics.exportEscrowCSV.query();
          break;
        default:
          throw new Error('Unknown metric type');
      }

      // Create blob and download
      const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', result.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${result.filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExportingMetric(null);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Platform metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('dashboard')}
            disabled={exportingMetric === 'dashboard'}
          >
            {exportingMetric === 'dashboard' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export All
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
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

      {/* Analytics Charts */}
      <AnalyticsCharts timeRange={timeRange} />

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.user.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{dashboardMetrics?.user.newUsersToday} today
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.property.activeProperties.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardMetrics?.property.pendingApprovals} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardMetrics?.transaction.totalVolume || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardMetrics?.transaction.completedTransactions} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Escrows</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.escrow.activeEscrows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(dashboardMetrics?.escrow.totalFundsHeld || 0)} held
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="health">Platform Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Today</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.user.newUsersToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">This Week</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.user.newUsersThisWeek}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">This Month</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.user.newUsersThisMonth}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Property Metrics</CardTitle>
                <CardDescription>Listing statistics and approvals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Properties</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.property.totalProperties}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Listings</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.property.activeProperties}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Approved Today</span>
                    <span className="text-2xl font-bold text-green-600">{dashboardMetrics?.property.approvedToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escrow Overview</CardTitle>
                <CardDescription>Fund management and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Escrows</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.escrow.totalEscrows}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Funds Held</span>
                    <span className="text-2xl font-bold">{formatCurrency(dashboardMetrics?.escrow.totalFundsHeld || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Funds Released</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(dashboardMetrics?.escrow.totalFundsReleased || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disputed</span>
                    <span className="text-2xl font-bold text-red-600">{dashboardMetrics?.escrow.disputedEscrows}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
                <CardDescription>Transaction volume and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Transactions</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.transaction.totalTransactions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Volume</span>
                    <span className="text-2xl font-bold">{formatCurrency(dashboardMetrics?.transaction.totalVolume || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Value</span>
                    <span className="text-2xl font-bold">{formatCurrency(dashboardMetrics?.transaction.averageTransactionValue || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardMetrics?.moderation.totalReports}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  All time reports received
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{dashboardMetrics?.moderation.pendingReports}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Awaiting moderation action
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboardMetrics?.moderation.averageResponseTimeHours}h</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Time to first response
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reports by Type</CardTitle>
              <CardDescription>Breakdown of report categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Property Reports</span>
                  <span className="text-xl font-bold">{dashboardMetrics?.moderation.reportsByType.property}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">User Reports</span>
                  <span className="text-xl font-bold">{dashboardMetrics?.moderation.reportsByType.user}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Review Reports</span>
                  <span className="text-xl font-bold">{dashboardMetrics?.moderation.reportsByType.review}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reports by Status</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="text-xl font-bold text-orange-600">{dashboardMetrics?.moderation.reportsByStatus.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Under Review</span>
                  <span className="text-xl font-bold text-blue-600">{dashboardMetrics?.moderation.reportsByStatus.reviewing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resolved</span>
                  <span className="text-xl font-bold text-green-600">{dashboardMetrics?.moderation.reportsByStatus.resolved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dismissed</span>
                  <span className="text-xl font-bold text-gray-600">{dashboardMetrics?.moderation.reportsByStatus.dismissed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Status</CardTitle>
                <CardDescription>Current transaction distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.transaction.totalTransactions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active</span>
                    <span className="text-2xl font-bold text-blue-600">{dashboardMetrics?.transaction.activeTransactions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completed</span>
                    <span className="text-2xl font-bold text-green-600">{dashboardMetrics?.transaction.completedTransactions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Metrics</CardTitle>
                <CardDescription>Transaction value statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Volume</span>
                    <span className="text-2xl font-bold">{formatCurrency(dashboardMetrics?.transaction.totalVolume || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Value</span>
                    <span className="text-2xl font-bold">{formatCurrency(dashboardMetrics?.transaction.averageTransactionValue || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Statistics</CardTitle>
                <CardDescription>Platform user metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Users</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.user.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Today</span>
                    <span className="text-2xl font-bold text-green-600">{dashboardMetrics?.user.activeUsersToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Today</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.user.newUsersToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">This Week</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.user.newUsersThisWeek}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">This Month</span>
                    <span className="text-2xl font-bold">{dashboardMetrics?.user.newUsersThisMonth}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardMetrics?.health.dailyActiveUsers}</div>
                <p className="text-xs text-muted-foreground">Users active in last 24h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Listings</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardMetrics?.health.newListingsToday}</div>
                <p className="text-xs text-muted-foreground">Properties listed today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(dashboardMetrics?.health.errorRate || 0)}</div>
                <p className="text-xs text-muted-foreground">Platform error percentage</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Activity</CardTitle>
              <CardDescription>User engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Searches Performed</span>
                  <span className="text-xl font-bold">{dashboardMetrics?.health.searchesPerformed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Messages Exchanged</span>
                  <span className="text-xl font-bold">{dashboardMetrics?.health.messagesExchanged.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg Response Time</span>
                  <span className="text-xl font-bold">{dashboardMetrics?.health.averageResponseTime}ms</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
