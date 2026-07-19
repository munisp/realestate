/**
 * Email Delivery Dashboard
 * 
 * Comprehensive dashboard for monitoring email delivery statistics,
 * failed deliveries, and retry patterns
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Download,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
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
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function EmailDeliveryDashboard() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Fetch retry statistics
  const { data: retryStats, isLoading: retryLoading, refetch: refetchRetry } = 
    trpc.emailConfig.getRetryStats.useQuery();

  // Fetch delivery statistics
  const { data: deliveryStats, isLoading: deliveryLoading, refetch: refetchDelivery } = 
    trpc.emailConfig.getDeliveryStats.useQuery({});

  const isLoading = retryLoading || deliveryLoading;

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!retryStats || !deliveryStats) return null;

    return {
      totalSent: retryStats.sent || 0,
      totalFailed: retryStats.failed || 0,
      totalRetrying: retryStats.retrying || 0,
      totalPending: retryStats.pending || 0,
      deliveryRate: deliveryStats.deliveryRate || 0,
      openRate: deliveryStats.openRate || 0,
      clickRate: deliveryStats.clickRate || 0,
      bounceRate: deliveryStats.bounceRate || 0,
    };
  }, [retryStats, deliveryStats]);

  // Prepare chart data
  const statusChartData = {
    labels: ['Sent', 'Failed', 'Retrying', 'Pending'],
    datasets: [
      {
        label: 'Email Status',
        data: [
          metrics?.totalSent || 0,
          metrics?.totalFailed || 0,
          metrics?.totalRetrying || 0,
          metrics?.totalPending || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(251, 191, 36)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const performanceChartData = {
    labels: ['Delivery Rate', 'Open Rate', 'Click Rate', 'Bounce Rate'],
    datasets: [
      {
        label: 'Performance Metrics (%)',
        data: [
          metrics?.deliveryRate || 0,
          metrics?.openRate || 0,
          metrics?.clickRate || 0,
          metrics?.bounceRate || 0,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const handleRefresh = async () => {
    await Promise.all([refetchRetry(), refetchDelivery()]);
    toast.success('Dashboard refreshed');
  };

  const handleExport = () => {
    toast.success('Exporting delivery report...');
    // Export logic would go here
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Delivery Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor email delivery performance and troubleshoot issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.deliveryRate.toFixed(1)}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalFailed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.bounceRate.toFixed(1)}% bounce rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retrying</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalRetrying.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Currently in retry queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.clickRate.toFixed(1)}% click rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Status Distribution</CardTitle>
            <CardDescription>Breakdown of email delivery statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <Doughnut
                data={statusChartData}
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

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Delivery, open, click, and bounce rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar
                data={performanceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: (value) => `${value}%`,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Failed Deliveries</CardTitle>
          <CardDescription>
            Emails that failed after all retry attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {retryStats?.failedDeliveries && retryStats.failedDeliveries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Recipient</th>
                    <th className="text-left p-3 font-medium">Subject</th>
                    <th className="text-left p-3 font-medium">Attempts</th>
                    <th className="text-left p-3 font-medium">Last Attempt</th>
                    <th className="text-left p-3 font-medium">Error</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {retryStats.failedDeliveries.map((delivery, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-3">{delivery.recipient}</td>
                      <td className="p-3">{delivery.subject}</td>
                      <td className="p-3">
                        <Badge variant="destructive">{delivery.attempts}</Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(delivery.lastAttemptAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm">
                        <span className="text-red-600">{delivery.errorMessage}</span>
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline">
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Retry
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="mx-auto h-12 w-12 mb-4 text-green-600" />
              <p>No failed deliveries - all emails sent successfully!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
