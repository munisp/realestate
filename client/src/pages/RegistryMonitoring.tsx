import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Activity,
  TrendingUp,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function RegistryMonitoring() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (isAuthenticated && user?.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  // Query hooks
  const { data: cacheStats, refetch: refetchCache } =
    trpc.governmentRegistry.getCacheStats.useQuery();

  const { data: healthStatus, refetch: refetchHealth } =
    trpc.governmentRegistry.healthCheckAll.useQuery();

  const { data: verificationStats, refetch: refetchStats } =
    trpc.governmentRegistry.getAllVerificationStats.useQuery();

  const { data: recentHistory, refetch: refetchHistory } =
    trpc.governmentRegistry.getAllVerificationHistory.useQuery({ limit: 20 });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchCache();
      refetchHealth();
      refetchStats();
      refetchHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetchCache, refetchHealth, refetchStats, refetchHistory]);

  const handleRefreshAll = () => {
    refetchCache();
    refetchHealth();
    refetchStats();
    refetchHistory();
    toast.success("Dashboard refreshed");
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="w-8 h-8" />
                Registry Monitoring
              </h1>
              <p className="text-muted-foreground mt-1">
                Government registry API health and performance metrics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className="w-4 h-4 mr-2" />
                {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefreshAll}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Verifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Verifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {verificationStats?.data?.totalVerifications || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time verifications
              </p>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {verificationStats?.data?.totalVerifications
                  ? Math.round(
                      (verificationStats.data.successfulVerifications /
                        verificationStats.data.totalVerifications) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {verificationStats?.data?.successfulVerifications || 0} successful
              </p>
            </CardContent>
          </Card>

          {/* Cache Hit Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cache Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {cacheStats?.data?.hitRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {cacheStats?.data?.hits || 0} hits / {cacheStats?.data?.misses || 0} misses
              </p>
            </CardContent>
          </Card>

          {/* Avg Response Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {verificationStats?.data?.averageResponseTime || 0}
                <span className="text-lg text-muted-foreground ml-1">ms</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average API response
              </p>
            </CardContent>
          </Card>
        </div>

        {/* API Health Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              API Health Status
            </CardTitle>
            <CardDescription>
              Real-time health status of government registry APIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthStatus?.data &&
                Object.entries(healthStatus.data).map(([state, isHealthy]) => (
                  <div
                    key={state}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {isHealthy ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{state} Registry</p>
                        <p className="text-sm text-muted-foreground">
                          {isHealthy ? "Operational" : "Down"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        isHealthy
                          ? "bg-green-500"
                          : "bg-red-500"
                      }
                    >
                      {isHealthy ? "Online" : "Offline"}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Cache Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Cache Statistics
            </CardTitle>
            <CardDescription>
              In-memory cache performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cache Size</p>
                <p className="text-2xl font-bold">
                  {cacheStats?.data?.size || 0} entries
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Hits</p>
                <p className="text-2xl font-bold text-green-600">
                  {cacheStats?.data?.hits || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Misses</p>
                <p className="text-2xl font-bold text-orange-600">
                  {cacheStats?.data?.misses || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Verification History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Verifications
            </CardTitle>
            <CardDescription>
              Last 20 verification requests across all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentHistory?.data && recentHistory.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>C of O Number</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Cached</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHistory.data.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">
                        {new Date(record.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.cofONumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.state || "Multi"}</Badge>
                      </TableCell>
                      <TableCell>
                        {record.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>{record.verificationScore}%</TableCell>
                      <TableCell>{record.responseTime}ms</TableCell>
                      <TableCell>
                        {record.cached ? (
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No verification history available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
