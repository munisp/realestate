import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, Download } from "lucide-react";
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
  Filler
} from "chart.js";

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
  Legend,
  Filler
);

export default function CompetitorAnalytics() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  // Fetch analytics data
  const { data: jobHistory, isLoading: jobsLoading } = trpc.competitorTracking.getJobHistory.useQuery({
    days: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90
  });

  const { data: emailMetrics, isLoading: metricsLoading } = trpc.competitorTracking.getEmailMetrics.useQuery({
    days: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90
  });

  const { data: emailPerformance, isLoading: performanceLoading } = trpc.competitorTracking.getEmailPerformance.useQuery({
    days: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90
  });

  // Calculate summary stats
  const totalJobs = jobHistory?.length || 0;
  const successfulJobs = jobHistory?.filter(j => j.status === "completed").length || 0;
  const failedJobs = jobHistory?.filter(j => j.status === "failed").length || 0;
  const successRate = totalJobs > 0 ? ((successfulJobs / totalJobs) * 100).toFixed(1) : "0";

  const totalEmails = emailMetrics?.totalSent || 0;
  const deliveryRate = emailMetrics?.deliveryRate || 0;
  const openRate = emailMetrics?.openRate || 0;
  const clickRate = emailMetrics?.clickRate || 0;

  // Prepare chart data for email delivery trends
  const deliveryTrendData = {
    labels: emailPerformance?.dailyStats.map(d => new Date(d.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: "Emails Sent",
        data: emailPerformance?.dailyStats.map(d => d.sent) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4
      },
      {
        label: "Delivered",
        data: emailPerformance?.dailyStats.map(d => d.delivered) || [],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Prepare chart data for engagement rates
  const engagementData = {
    labels: emailPerformance?.dailyStats.map(d => new Date(d.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: "Open Rate (%)",
        data: emailPerformance?.dailyStats.map(d => d.openRate) || [],
        borderColor: "rgb(168, 85, 247)",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        fill: true,
        tension: 0.4
      },
      {
        label: "Click Rate (%)",
        data: emailPerformance?.dailyStats.map(d => d.clickRate) || [],
        borderColor: "rgb(251, 146, 60)",
        backgroundColor: "rgba(251, 146, 60, 0.1)",
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Prepare chart data for email types
  const emailTypeData = {
    labels: emailPerformance?.byTemplate.map(t => t.templateName) || [],
    datasets: [{
      label: "Emails Sent",
      data: emailPerformance?.byTemplate.map(t => t.sent) || [],
      backgroundColor: [
        "rgba(59, 130, 246, 0.8)",
        "rgba(34, 197, 94, 0.8)",
        "rgba(251, 146, 60, 0.8)",
        "rgba(168, 85, 247, 0.8)"
      ]
    }]
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Competitor Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor job execution and email delivery performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              {successRate}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmails}</div>
            <p className="text-xs text-muted-foreground">
              {deliveryRate.toFixed(1)}% delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Email engagement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              User actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Job History</TabsTrigger>
          <TabsTrigger value="emails">Email Performance</TabsTrigger>
          <TabsTrigger value="charts">Visualizations</TabsTrigger>
        </TabsList>

        {/* Job History Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Execution History</CardTitle>
              <CardDescription>
                Recent competitor tracking job runs and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="text-center py-8">Loading job history...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Emails Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobHistory && jobHistory.length > 0 ? (
                      jobHistory.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.jobType}</TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>{new Date(job.startedAt).toLocaleString()}</TableCell>
                          <TableCell>{job.duration ? `${job.duration}s` : "-"}</TableCell>
                          <TableCell>{job.propertiesProcessed || 0}</TableCell>
                          <TableCell>{job.emailsSent || 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No job history available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Performance Tab */}
        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Performance by Template</CardTitle>
              <CardDescription>
                Breakdown of email delivery and engagement by template type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="text-center py-8">Loading email performance...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Clicked</TableHead>
                      <TableHead>Open Rate</TableHead>
                      <TableHead>Click Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailPerformance?.byTemplate && emailPerformance.byTemplate.length > 0 ? (
                      emailPerformance.byTemplate.map((template) => (
                        <TableRow key={template.templateName}>
                          <TableCell className="font-medium">{template.templateName}</TableCell>
                          <TableCell>{template.sent}</TableCell>
                          <TableCell>{template.delivered}</TableCell>
                          <TableCell>{template.opened}</TableCell>
                          <TableCell>{template.clicked}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{template.openRate.toFixed(1)}%</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{template.clickRate.toFixed(1)}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No email performance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Delivery Trends</CardTitle>
                <CardDescription>Daily email sending and delivery volume</CardDescription>
              </CardHeader>
              <CardContent>
                <Line data={deliveryTrendData} options={{ responsive: true, maintainAspectRatio: true }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Rates</CardTitle>
                <CardDescription>Open and click rates over time</CardDescription>
              </CardHeader>
              <CardContent>
                <Line data={engagementData} options={{ responsive: true, maintainAspectRatio: true }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emails by Template Type</CardTitle>
                <CardDescription>Distribution of email templates sent</CardDescription>
              </CardHeader>
              <CardContent>
                <Bar data={emailTypeData} options={{ responsive: true, maintainAspectRatio: true }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Success Rate</CardTitle>
                <CardDescription>Completed vs failed jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <Doughnut
                  data={{
                    labels: ["Completed", "Failed"],
                    datasets: [{
                      data: [successfulJobs, failedJobs],
                      backgroundColor: ["rgba(34, 197, 94, 0.8)", "rgba(239, 68, 68, 0.8)"]
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: true }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
