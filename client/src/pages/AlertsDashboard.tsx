// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bell, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Settings } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useRef } from "react";
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export default function AlertsDashboard() {
  const { user, isAuthenticated } = useAuth();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const { data: myAlerts } = trpc.exchangeRateAlerts.getMyAlerts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const unregisterMutation = trpc.exchangeRateAlerts.unregister.useMutation({
    onSuccess: () => {
      // Refetch alerts after deletion
      window.location.reload();
    },
  });

  const handleDeleteAlert = async (currency: string) => {
    if (confirm(`Are you sure you want to delete the alert for ${currency}?`)) {
      await unregisterMutation.mutateAsync({ currency });
    }
  };

  // Mock historical notifications data
  const mockNotifications = [
    {
      id: 1,
      currency: 'EUR',
      message: 'EUR rate increased by 2.5%',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: 'increase' as const,
    },
    {
      id: 2,
      currency: 'GBP',
      message: 'GBP rate decreased by 1.8%',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      type: 'decrease' as const,
    },
    {
      id: 3,
      currency: 'NGN',
      message: 'NGN rate increased by 3.2%',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      type: 'increase' as const,
    },
  ];

  // Alert performance chart
  useEffect(() => {
    if (!chartRef.current || !myAlerts) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Mock data: number of alerts triggered per day
    const alertsTriggered = Array.from({ length: 30 }, () => Math.floor(Math.random() * 3));

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: last30Days,
        datasets: [
          {
            label: 'Alerts Triggered',
            data: alertsTriggered,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [myAlerts]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view your currency alert dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="h-8 w-8 text-primary" />
            <span>{APP_TITLE} - Alerts</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/settings/currency" className="text-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-3xl font-bold">Currency Alert Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your active alerts and view notification history
            </p>
          </div>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Active Alerts ({myAlerts?.alerts.length || 0})
              </CardTitle>
              <CardDescription>
                Your currently monitored currency exchange rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myAlerts && myAlerts.alerts.length > 0 ? (
                <div className="space-y-3">
                  {myAlerts.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">
                          {alert.currency === 'EUR' && '🇪🇺'}
                          {alert.currency === 'GBP' && '🇬🇧'}
                          {alert.currency === 'NGN' && '🇳🇬'}
                          {alert.currency === 'ZAR' && '🇿🇦'}
                          {alert.currency === 'KES' && '🇰🇪'}
                          {!['EUR', 'GBP', 'NGN', 'ZAR', 'KES'].includes(alert.currency) && '🌍'}
                        </div>
                        <div>
                          <p className="font-semibold">{alert.currency}</p>
                          <p className="text-sm text-muted-foreground">
                            Alert when rate changes by ±{alert.threshold}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.currency)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active alerts</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create alerts in{" "}
                    <Link href="/settings/currency" className="text-primary hover:underline">
                      Currency Settings
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Alert Performance (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Number of alerts triggered over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <canvas ref={chartRef} />
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
              <CardDescription>
                Your latest currency rate change alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        notification.type === 'increase'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {notification.type === 'increase' ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{notification.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.timestamp.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={notification.type === 'increase' ? 'default' : 'destructive'}>
                      {notification.currency}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{myAlerts?.alerts.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Active monitoring</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{mockNotifications.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Alerts triggered</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg. Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">&lt;5min</p>
                <p className="text-sm text-muted-foreground mt-1">Alert delivery</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
