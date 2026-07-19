import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  Building2,
  Shield,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface VerificationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  approvalRate: number;
  avgProcessingTime: number;
  totalCost: number;
}

interface VerificationRecord {
  id: number;
  userId: number;
  userName: string;
  type: string; // "KYC" | "KYB"
  tier: string;
  status: string;
  riskLevel: string;
  createdAt: string;
  completedAt?: string;
  provider: string;
  cost: number;
}

interface FraudAlert {
  id: number;
  userId: number;
  userName: string;
  alertType: string;
  severity: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

export default function VerificationDashboard() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("week");
  
  // Fetch verification stats
  const { data: stats, isLoading: statsLoading } = trpc.verification.getStats.useQuery({
    timeRange,
  });
  
  // Fetch recent verifications
  const { data: recentVerifications, isLoading: verificationsLoading } = 
    trpc.verification.getRecent.useQuery({ limit: 20 });
  
  // Fetch fraud alerts
  const { data: fraudAlerts, isLoading: alertsLoading } = 
    trpc.verification.getFraudAlerts.useQuery({ resolved: false });
  
  // Fetch pending reviews
  const { data: pendingReviews, isLoading: pendingLoading } = 
    trpc.verification.getPendingReviews.useQuery();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      LOW: "default",
      MEDIUM: "secondary",
      HIGH: "destructive",
      CRITICAL: "destructive",
    };
    
    return (
      <Badge variant={variants[riskLevel] || "outline"}>
        {riskLevel}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "default",
      medium: "secondary",
      high: "destructive",
      critical: "destructive",
    };
    
    return (
      <Badge variant={variants[severity] || "outline"}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading verification dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Verification Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor KYC/KYB verifications, fraud alerts, and compliance metrics
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={timeRange === "today" ? "default" : "outline"}
            onClick={() => setTimeRange("today")}
          >
            Today
          </Button>
          <Button
            variant={timeRange === "week" ? "default" : "outline"}
            onClick={() => setTimeRange("week")}
          >
            This Week
          </Button>
          <Button
            variant={timeRange === "month" ? "default" : "outline"}
            onClick={() => setTimeRange("month")}
          >
            This Month
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {timeRange === "today" ? "Today" : timeRange === "week" ? "This week" : "This month"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.approvalRate?.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.approved || 0} approved / {stats?.total || 0} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg. {stats?.avgProcessingTime || 0} min processing time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{stats?.totalCost?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                API verification costs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fraud Alerts */}
        {fraudAlerts && fraudAlerts.length > 0 && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-900">Active Fraud Alerts</CardTitle>
              </div>
              <CardDescription className="text-red-700">
                {fraudAlerts.length} unresolved fraud alert{fraudAlerts.length > 1 ? "s" : ""} requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fraudAlerts.slice(0, 5).map((alert: FraudAlert) => (
                  <div key={alert.id} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-red-200">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{alert.userName}</span>
                        {getSeverityBadge(alert.severity)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive">
                          Review
                        </Button>
                        <Button size="sm" variant="outline">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recent">Recent Verifications</TabsTrigger>
            <TabsTrigger value="pending">Pending Reviews ({stats?.pending || 0})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Recent Verifications */}
          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Verifications</CardTitle>
                <CardDescription>Latest KYC/KYB verification requests</CardDescription>
              </CardHeader>
              <CardContent>
                {verificationsLoading ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading verifications...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentVerifications?.map((record: VerificationRecord) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.userName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {record.type === "KYB" ? (
                                <Building2 className="h-4 w-4" />
                              ) : (
                                <Users className="h-4 w-4" />
                              )}
                              {record.type}
                            </div>
                          </TableCell>
                          <TableCell>{record.tier}</TableCell>
                          <TableCell>{getRiskBadge(record.riskLevel)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              <span className="capitalize">{record.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{record.provider}</TableCell>
                          <TableCell>₦{record.cost}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Reviews */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Manual Reviews</CardTitle>
                <CardDescription>Verifications requiring manual review</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading pending reviews...</p>
                  </div>
                ) : pendingReviews && pendingReviews.length > 0 ? (
                  <div className="space-y-4">
                    {pendingReviews.map((record: VerificationRecord) => (
                      <div key={record.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{record.userName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {record.type} - {record.tier} Tier
                            </p>
                          </div>
                          {getRiskBadge(record.riskLevel)}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button size="sm" variant="outline">
                            Request More Info
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p className="text-muted-foreground">No pending reviews</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rejected */}
          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Rejected Verifications</CardTitle>
                <CardDescription>Verifications that failed compliance checks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Rejected verifications will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Verification by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">KYC Individual</span>
                        <span className="text-sm font-semibold">65%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: "65%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">KYB Business</span>
                        <span className="text-sm font-semibold">25%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: "25%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Diaspora</span>
                        <span className="text-sm font-semibold">10%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: "10%" }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Low Risk</span>
                        <span className="text-sm font-semibold">70%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-green-600" style={{ width: "70%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Medium Risk</span>
                        <span className="text-sm font-semibold">20%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-600" style={{ width: "20%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">High Risk</span>
                        <span className="text-sm font-semibold">8%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-red-600" style={{ width: "8%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Critical Risk</span>
                        <span className="text-sm font-semibold">2%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-red-900" style={{ width: "2%" }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>API Provider Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Total Requests</TableHead>
                        <TableHead>Success Rate</TableHead>
                        <TableHead>Avg. Response Time</TableHead>
                        <TableHead>Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Dojah</TableCell>
                        <TableCell>1,234</TableCell>
                        <TableCell>98.5%</TableCell>
                        <TableCell>2.3s</TableCell>
                        <TableCell>₦740,400</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Mono</TableCell>
                        <TableCell>856</TableCell>
                        <TableCell>99.1%</TableCell>
                        <TableCell>1.8s</TableCell>
                        <TableCell>₦214,000</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Onfido</TableCell>
                        <TableCell>342</TableCell>
                        <TableCell>97.2%</TableCell>
                        <TableCell>5.1s</TableCell>
                        <TableCell>$1,710</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
