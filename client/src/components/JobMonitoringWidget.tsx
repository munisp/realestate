import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, XCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface JobMonitoringWidgetProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  showCompleted?: boolean;
}

export function JobMonitoringWidget({
  autoRefresh = true,
  refreshInterval = 5000,
  showCompleted = false,
}: JobMonitoringWidgetProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("running");

  const { data: runningJobs, refetch: refetchRunning } = trpc.jobMonitoring.getRunningJobs.useQuery(
    undefined,
    {
      refetchInterval: autoRefresh ? refreshInterval : false,
      enabled: selectedStatus === "running",
    }
  );

  const { data: allJobs, refetch: refetchAll } = trpc.jobMonitoring.getJobs.useQuery(
    { limit: 20 },
    {
      refetchInterval: autoRefresh ? refreshInterval : false,
      enabled: selectedStatus === "all",
    }
  );

  const { data: stats } = trpc.jobMonitoring.getJobStats.useQuery({ days: 7 });

  const cancelJobMutation = trpc.jobMonitoring.cancelJob.useMutation({
    onSuccess: () => {
      toast.success("Job cancelled successfully");
      refetchRunning();
      refetchAll();
    },
    onError: (error) => {
      toast.error(`Failed to cancel job: ${error.message}`);
    },
  });

  const retryJobMutation = trpc.jobMonitoring.retryJob.useMutation({
    onSuccess: () => {
      toast.success("Job queued for retry");
      refetchAll();
    },
    onError: (error) => {
      toast.error(`Failed to retry job: ${error.message}`);
    },
  });

  const jobs = selectedStatus === "running" ? runningJobs : allJobs;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <X className="h-4 w-4 text-gray-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary",
      failed: "destructive",
      cancelled: "outline",
      pending: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const formatDuration = (start: Date | null, end: Date | null) => {
    if (!start) return "N/A";
    const endTime = end || new Date();
    const duration = endTime.getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getJobTypeLabel = (jobType: string) => {
    const labels: Record<string, string> = {
      price_check: "Price Check",
      competitor_scan: "Competitor Scan",
      market_summary: "Market Summary",
    };
    return labels[jobType] || jobType;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Job Monitoring</CardTitle>
            <CardDescription>Real-time tracking of competitor analysis jobs</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedStatus === "running" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus("running")}
            >
              Running
            </Button>
            <Button
              variant={selectedStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus("all")}
            >
              All Jobs
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total (7d)</span>
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <span className="text-2xl font-bold text-green-600">{stats.successRate}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Running</span>
              <span className="text-2xl font-bold text-blue-600">{stats.running}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Avg Time</span>
              <span className="text-2xl font-bold">
                {Math.round(stats.averageExecutionTime / 1000)}s
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!jobs || jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {selectedStatus === "running" ? "No jobs currently running" : "No jobs found"}
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getJobTypeLabel(job.jobType)}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Job ID: {job.id}
                      {job.propertyId && ` • Property: ${job.propertyId}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Duration: {formatDuration(job.startedAt, job.completedAt)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {job.status === "running" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelJobMutation.mutate({ jobId: job.id })}
                        disabled={cancelJobMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                    {job.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryJobMutation.mutate({ jobId: job.id })}
                        disabled={retryJobMutation.isPending}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>

                {job.status === "running" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {job.processedItems} / {job.totalItems} items ({job.progress}%)
                      </span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>
                )}

                {job.errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                    <strong>Error:</strong> {job.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
