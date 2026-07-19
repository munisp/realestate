import { useState } from "react";
import { JobMonitoringWidget } from "@/components/JobMonitoringWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Play, RefreshCw } from "lucide-react";

export default function JobMonitoring() {
  const [selectedJobType, setSelectedJobType] = useState<"price_check" | "competitor_scan" | "market_summary">("price_check");
  const [priority, setPriority] = useState<number>(5);

  const utils = trpc.useUtils();

  const triggerJobMutation = trpc.jobMonitoring.triggerJob.useMutation({
    onSuccess: (data) => {
      toast.success(`Job #${data.jobId} created and queued successfully`);
      utils.jobMonitoring.getRunningJobs.invalidate();
      utils.jobMonitoring.getJobs.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create job: ${error.message}`);
    },
  });

  const { data: pendingJobs, refetch: refetchPending } = trpc.jobMonitoring.getPendingJobs.useQuery({ limit: 10 });

  const handleTriggerJob = () => {
    triggerJobMutation.mutate({
      jobType: selectedJobType,
      priority,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Monitoring Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage competitor tracking jobs in real-time
        </p>
      </div>

      {/* Manual Job Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Job Trigger</CardTitle>
          <CardDescription>Start a new competitor tracking job manually</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Job Type</label>
              <Select
                value={selectedJobType}
                onValueChange={(value: any) => setSelectedJobType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_check">Price Check</SelectItem>
                  <SelectItem value="competitor_scan">Competitor Scan</SelectItem>
                  <SelectItem value="market_summary">Market Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Priority (1-10)</label>
              <Select
                value={priority.toString()}
                onValueChange={(value) => setPriority(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                    <SelectItem key={p} value={p.toString()}>
                      {p} {p >= 8 ? "(High)" : p <= 3 ? "(Low)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleTriggerJob}
              disabled={triggerJobMutation.isPending}
              className="flex items-center gap-2"
            >
              {triggerJobMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Trigger Job
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Jobs Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Queue</CardTitle>
              <CardDescription>Pending jobs waiting to be processed</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchPending()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!pendingJobs || pendingJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending jobs in queue
            </div>
          ) : (
            <div className="space-y-2">
              {pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {job.jobType.replace(/_/g, " ")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Queue ID: {job.id} • Priority: {job.priority} • Attempts: {job.attempts}/
                      {job.maxAttempts}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Scheduled: {new Date(job.scheduledFor).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Job Monitoring */}
      <JobMonitoringWidget autoRefresh={true} refreshInterval={5000} />
    </div>
  );
}
