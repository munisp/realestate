import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BulkVerificationDetail() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { user, loading: authLoading } = useAuth();

  const jobQuery = trpc.bulkVerification.getJobStatus.useQuery(
    { jobId },
    {
      enabled: !!jobId,
      refetchInterval: (data) => {
        // Auto-refresh every 5 seconds if job is processing
        if (data?.job.status === "processing" || data?.job.status === "pending") {
          return 5000;
        }
        return false;
      },
    }
  );

  const cancelMutation = trpc.bulkVerification.cancelJob.useMutation({
    onSuccess: () => {
      toast.success("Job cancelled successfully");
      jobQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to cancel job: ${error.message}`);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      processing: "secondary",
      failed: "destructive",
      pending: "outline",
      cancelled: "outline",
      skipped: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this job?")) {
      cancelMutation.mutate({ jobId });
    }
  };

  if (authLoading || jobQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view job details</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!jobQuery.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Job Not Found</CardTitle>
            <CardDescription>The requested job could not be found</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/bulk-verification">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Jobs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { job, items, summary } = jobQuery.data;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/bulk-verification">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{job.fileName}</h1>
            <p className="text-muted-foreground mt-1">
              Job ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{job.jobId}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => jobQuery.refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {(job.status === "processing" || job.status === "pending") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Job
            </Button>
          )}
          {job.status === "completed" && job.resultsFileUrl && (
            <Button variant="default" size="sm" asChild>
              <a href={job.resultsFileUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(job.status)}
              <div>
                <CardTitle>Job Status</CardTitle>
                <CardDescription>Current processing status</CardDescription>
              </div>
            </div>
            {getStatusBadge(job.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          {(job.status === "processing" || job.status === "pending") && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{summary.progress.toFixed(1)}%</span>
              </div>
              <Progress value={summary.progress} />
              <p className="text-sm text-muted-foreground">
                {summary.processed} of {summary.total} items processed
              </p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processed</p>
              <p className="text-2xl font-bold">{summary.processed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{summary.successful}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
            </div>
          </div>

          {/* Metadata */}
          {job.metadata && (
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-semibold text-sm">Job Metadata</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {job.metadata.clientName && (
                  <div>
                    <span className="text-muted-foreground">Client:</span>{" "}
                    <span className="font-medium">{job.metadata.clientName}</span>
                  </div>
                )}
                {job.metadata.department && (
                  <div>
                    <span className="text-muted-foreground">Department:</span>{" "}
                    <span className="font-medium">{job.metadata.department}</span>
                  </div>
                )}
                {job.metadata.requestReference && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>{" "}
                    <span className="font-medium">{job.metadata.requestReference}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timing */}
          <div className="border-t pt-4 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="font-medium">{new Date(job.createdAt).toLocaleString()}</span>
            </div>
            {job.startedAt && (
              <div>
                <span className="text-muted-foreground">Started:</span>{" "}
                <span className="font-medium">{new Date(job.startedAt).toLocaleString()}</span>
              </div>
            )}
            {job.completedAt && (
              <div>
                <span className="text-muted-foreground">Completed:</span>{" "}
                <span className="font-medium">{new Date(job.completedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Items</CardTitle>
          <CardDescription>Detailed status of each C of O verification</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>C of O Number</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.rowNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{item.cofONumber}</TableCell>
                      <TableCell>{item.state}</TableCell>
                      <TableCell>{item.ownerName || "-"}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.verificationScore !== null ? (
                          <span
                            className={
                              item.verificationScore >= 70
                                ? "text-green-600 font-medium"
                                : item.verificationScore >= 40
                                ? "text-yellow-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {item.verificationScore}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.isVerified !== null ? (
                          item.isVerified ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
