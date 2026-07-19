import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Download, X, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function BulkVerification() {
  const { user, loading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState("");
  const [department, setDepartment] = useState("");
  const [requestReference, setRequestReference] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.bulkVerification.uploadCSV.useMutation({
    onSuccess: (data) => {
      toast.success("Bulk verification job created successfully!");
      setSelectedFile(null);
      setClientName("");
      setDepartment("");
      setRequestReference("");
      setNotificationEmail("");
      setNotificationPhone("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Refresh jobs list
      jobsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const jobsQuery = trpc.bulkVerification.listJobs.useQuery({
    limit: 20,
    offset: 0,
  });

  const statsQuery = trpc.bulkVerification.getStatistics.useQuery();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(",")[1]; // Remove data:text/csv;base64, prefix

        await uploadMutation.mutateAsync({
          fileName: selectedFile.name,
          fileBase64: base64Data,
          metadata: {
            clientName: clientName || undefined,
            department: department || undefined,
            requestReference: requestReference || undefined,
            notificationEmail: notificationEmail || undefined,
            notificationPhone: notificationPhone || undefined,
          },
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      processing: "secondary",
      failed: "destructive",
      pending: "outline",
      cancelled: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (authLoading) {
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
            <CardDescription>Please log in to access bulk verification</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bulk C of O Verification</h1>
        <p className="text-muted-foreground mt-2">
          Upload a CSV file to verify multiple Certificate of Occupancy records in batch
        </p>
      </div>

      {/* Statistics */}
      {statsQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Jobs</CardDescription>
              <CardTitle className="text-3xl">{statsQuery.data.totalJobs}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Items Processed</CardDescription>
              <CardTitle className="text-3xl">{statsQuery.data.totalItemsProcessed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
              <CardTitle className="text-3xl">{statsQuery.data.successRate}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Recent Jobs (30d)</CardDescription>
              <CardTitle className="text-3xl">{statsQuery.data.recentJobs}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Your CSV must include columns: <code className="text-xs bg-muted px-1 py-0.5 rounded">cofONumber</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">state</code>. Optional columns:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">lga</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">propertyAddress</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">ownerName</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">itemId</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <div className="flex gap-2">
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Metadata Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name (Optional)</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., ABC Corporation"
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Legal Department"
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestReference">Request Reference (Optional)</Label>
              <Input
                id="requestReference"
                value={requestReference}
                onChange={(e) => setRequestReference(e.target.value)}
                placeholder="e.g., REQ-2024-001"
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notificationEmail">Notification Email (Optional)</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="e.g., alerts@example.com"
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notificationPhone">Notification Phone (Optional)</Label>
              <Input
                id="notificationPhone"
                type="tel"
                value={notificationPhone}
                onChange={(e) => setNotificationPhone(e.target.value)}
                placeholder="e.g., +234 800 000 0000"
                disabled={uploading}
              />
            </div>
          </div>

          <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload and Start Verification
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Track the status of your bulk verification jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : jobsQuery.data?.jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bulk verification jobs yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobsQuery.data?.jobs.map((job) => (
                <Link key={job.id} href={`/bulk-verification/${job.jobId}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <h3 className="font-semibold">{job.fileName}</h3>
                            {getStatusBadge(job.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Job ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{job.jobId}</code>
                            </p>
                            {job.metadata?.clientName && <p>Client: {job.metadata.clientName}</p>}
                            {job.metadata?.requestReference && (
                              <p>Reference: {job.metadata.requestReference}</p>
                            )}
                            <p>
                              Progress: {job.processedItems} / {job.totalItems} items (
                              {parseFloat(job.progress || "0").toFixed(1)}%)
                            </p>
                            <p>
                              Success: {job.successfulItems} | Failed: {job.failedItems}
                            </p>
                            <p>Created: {new Date(job.createdAt).toLocaleString()}</p>
                          </div>
                          {job.status === "processing" && (
                            <Progress value={parseFloat(job.progress || "0")} className="mt-2" />
                          )}
                        </div>
                        {job.status === "completed" && job.resultsFileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={job.resultsFileUrl} download>
                              <Download className="h-4 w-4 mr-2" />
                              Download Results
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
