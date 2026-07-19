import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Shield,
  MapPin,
  Database,
  RefreshCw,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Admin Dashboard for C of O Verification Monitoring
 * Displays registry health, verification statistics, and testing interface
 */
export default function CofOVerificationMonitoring() {
  const [testType, setTestType] = useState<
    "registry_connection" | "fraud_detection" | "geospatial" | "full_stack"
  >("full_stack");

  // Fetch verification statistics
  const statsQuery = trpc.cofOVerification.getVerificationStats.useQuery();

  // Fetch registry health status
  const healthQuery = trpc.cofOVerification.getRegistryHealth.useQuery();

  // Fetch verification history
  const historyQuery = trpc.cofOVerification.getVerificationHistory.useQuery({
    limit: 20,
    offset: 0,
  });

  // Test verification system mutation
  const testSystemMutation = trpc.cofOVerification.testVerificationSystem.useMutation({
    onSuccess: (data) => {
      if (data.overallStatus === "all_passed") {
        toast.success("All tests passed successfully!");
      } else {
        toast.warning("Some tests failed. Check details below.");
      }
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });

  const runTest = () => {
    testSystemMutation.mutate({ testType });
  };

  const refreshAll = () => {
    statsQuery.refetch();
    healthQuery.refetch();
    historyQuery.refetch();
    toast.success("Data refreshed");
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">C of O Verification Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Monitor government registry connections, fraud detection, and geospatial validation
          </p>
        </div>
        <Button onClick={refreshAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsQuery.data?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time verifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsQuery.data?.verified || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statsQuery.data?.total
                ? Math.round(
                    ((statsQuery.data.verified || 0) / statsQuery.data.total) * 100
                  )
                : 0}
              % success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsQuery.data?.rejected || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Failed verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsQuery.data?.avgScore || 0}
            </div>
            <Progress value={statsQuery.data?.avgScore || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Registry Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Government Registry Health Status
          </CardTitle>
          <CardDescription>
            Real-time connection status for all state land registries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {healthQuery.data &&
              Object.entries(healthQuery.data).map(([state, isHealthy]) => (
                <div
                  key={state}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{state}</p>
                    <p className="text-sm text-muted-foreground">
                      {isHealthy ? "Online" : "Offline"}
                    </p>
                  </div>
                  {isHealthy ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
              ))}
          </div>
          {healthQuery.isLoading && (
            <p className="text-center text-muted-foreground py-8">
              Checking registry health...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Testing Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            System Testing Interface
          </CardTitle>
          <CardDescription>
            Test individual components or run full stack verification test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="registry_connection">Registry Connection Only</option>
              <option value="fraud_detection">Fraud Detection Only</option>
              <option value="geospatial">Geospatial Validation Only</option>
              <option value="full_stack">Full Stack Test</option>
            </select>
            <Button
              onClick={runTest}
              disabled={testSystemMutation.isPending}
            >
              {testSystemMutation.isPending ? "Running..." : "Run Test"}
            </Button>
          </div>

          {testSystemMutation.data && (
            <Alert
              variant={
                testSystemMutation.data.overallStatus === "all_passed"
                  ? "default"
                  : "destructive"
              }
            >
              <AlertTitle>
                Test Results:{" "}
                {testSystemMutation.data.overallStatus === "all_passed"
                  ? "All Passed"
                  : "Some Failed"}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-4 space-y-2">
                  {testSystemMutation.data.tests.map((test: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-background rounded"
                    >
                      <span className="font-medium">{test.name}</span>
                      <Badge
                        variant={test.status === "passed" ? "default" : "destructive"}
                      >
                        {test.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Verification History & High Risk Items */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history">Recent Verifications</TabsTrigger>
          <TabsTrigger value="high-risk">High Risk Items</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Verification History</CardTitle>
              <CardDescription>
                Last 20 C of O verification requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        #{item.id}
                      </TableCell>
                      <TableCell>{item.requestType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "verified"
                              ? "default"
                              : item.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.verificationScore !== null ? (
                          <div className="flex items-center gap-2">
                            <span>{item.verificationScore}</span>
                            <Progress
                              value={item.verificationScore}
                              className="w-16"
                            />
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(item.requestedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {historyQuery.isLoading && (
                <p className="text-center text-muted-foreground py-8">
                  Loading history...
                </p>
              )}
              {historyQuery.data?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No verification history yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="high-risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                High Risk Verifications
              </CardTitle>
              <CardDescription>
                C of O verifications with scores below 50 requiring manual review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Issues Found</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsQuery.data?.highRisk.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        #{item.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {item.verificationScore || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.issuesFound ? (
                          <span className="text-sm text-muted-foreground">
                            {item.issuesFound.length} issues
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(item.requestedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {statsQuery.data?.highRisk.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No high-risk verifications found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
