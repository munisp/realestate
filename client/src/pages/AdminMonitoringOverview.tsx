import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, AlertTriangle, Database, BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { AdminMonitoringNav, MonitoringOverviewCard } from '@/components/AdminMonitoringNav';

/**
 * Admin Monitoring Overview Page
 * 
 * Central dashboard for monitoring infrastructure, alerts, and data quality
 */

export default function AdminMonitoringOverview() {
  const { user, loading: authLoading } = useAuth();

  // Fetch monitoring data
  const { data: alertStats, isLoading: loadingAlerts } = trpc.monitoring.getAlertStats.useQuery();
  const { data: jobStatuses, isLoading: loadingJobs } = trpc.monitoring.getJobStatuses.useQuery();
  const { data: dataQualityOverview, isLoading: loadingQuality } = trpc.monitoring.getDataQualityOverview.useQuery();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Monitoring & Alerts</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor platform health, configure alerts, and track data quality
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monitoring Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminMonitoringNav />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Alert Statistics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alert Status</CardTitle>
                  <CardDescription>Active alerts and recent triggers</CardDescription>
                </div>
                <Link href="/admin/monitoring/alerts">
                  <Button variant="outline" size="sm">
                    Configure Alerts
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAlerts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold">{alertStats?.activeAlerts || 0}</div>
                      <div className="text-sm text-muted-foreground">Active Alerts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{alertStats?.triggeredToday || 0}</div>
                      <div className="text-sm text-muted-foreground">Triggered Today</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold">{alertStats?.criticalAlerts || 0}</div>
                      <div className="text-sm text-muted-foreground">Critical Alerts</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Jobs Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scheduled Jobs</CardTitle>
                  <CardDescription>Background job status and execution</CardDescription>
                </div>
                <Link href="/admin/monitoring/jobs">
                  <Button variant="outline" size="sm">
                    View All Jobs
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {jobStatuses?.map((job: any) => (
                    <div key={job.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{job.name}</div>
                          <div className="text-sm text-muted-foreground">{job.schedule}</div>
                        </div>
                      </div>
                      <Badge variant={job.status === 'running' ? 'default' : job.status === 'error' ? 'destructive' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                  {(!jobStatuses || jobStatuses.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No scheduled jobs configured
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Quality Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Data Quality</CardTitle>
                  <CardDescription>Valuation accuracy and data freshness</CardDescription>
                </div>
                <Link href="/admin/monitoring/data-quality">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingQuality ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <Database className="h-8 w-8 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{dataQualityOverview?.averageAccuracy || 0}%</div>
                      <div className="text-sm text-muted-foreground">Average Accuracy</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg border">
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">{dataQualityOverview?.totalValuations || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Valuations</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common monitoring tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/admin/monitoring/alerts">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Create New Alert
                  </Button>
                </Link>
                <Link href="/admin/monitoring/service-health">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Check Service Health
                  </Button>
                </Link>
                <Link href="/admin/monitoring/performance">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Performance Metrics
                  </Button>
                </Link>
                <Link href="/admin/monitoring/data-quality">
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Review Data Quality
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
