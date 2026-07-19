import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Users, FileText, CheckCircle, XCircle, Eye, Shield } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { ActivityFeed } from "@/components/ActivityFeed";
import { BulkActionToolbar } from "@/components/BulkActionToolbar";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPropertyApprovals, setSelectedPropertyApprovals] = useState<Set<number>>(new Set());
  const [selectedPropertyReports, setSelectedPropertyReports] = useState<Set<number>>(new Set());

  const { data: propertyReports, isLoading: loadingPropertyReports, refetch: refetchPropertyReports } = 
    trpc.admin.getPendingPropertyReports.useQuery();
  
  const { data: userReports, isLoading: loadingUserReports, refetch: refetchUserReports } = 
    trpc.admin.getPendingUserReports.useQuery();
  
  const { data: reviewReports, isLoading: loadingReviewReports, refetch: refetchReviewReports } = 
    trpc.admin.getPendingReviewReports.useQuery();
  
  const { data: propertyApprovals, isLoading: loadingApprovals, refetch: refetchApprovals } = 
    trpc.admin.getPendingPropertyApprovals.useQuery();

  const updatePropertyReportMutation = trpc.admin.updatePropertyReport.useMutation({
    onSuccess: () => {
      toast.success("Property report updated successfully");
      setReviewDialogOpen(false);
      setSelectedReport(null);
      setReviewNotes("");
      refetchPropertyReports();
    },
    onError: (error) => {
      toast.error(`Failed to update report: ${error.message}`);
    },
  });

  const updateUserReportMutation = trpc.admin.updateUserReport.useMutation({
    onSuccess: () => {
      toast.success("User report updated successfully");
      setReviewDialogOpen(false);
      setSelectedReport(null);
      setReviewNotes("");
      refetchUserReports();
    },
    onError: (error) => {
      toast.error(`Failed to update report: ${error.message}`);
    },
  });

  const updatePropertyApprovalMutation = trpc.admin.updatePropertyApproval.useMutation({
    onSuccess: () => {
      toast.success("Property approval updated successfully");
      setReviewDialogOpen(false);
      setSelectedReport(null);
      setReviewNotes("");
      refetchApprovals();
    },
    onError: (error) => {
      toast.error(`Failed to update approval: ${error.message}`);
    },
  });

  const handleReviewSubmit = () => {
    if (!selectedReport || !selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    if (selectedReport.type === "property_report") {
      updatePropertyReportMutation.mutate({
        reportId: selectedReport.id,
        status: selectedStatus as any,
        reviewNotes,
        action: selectedAction as any,
      });
    } else if (selectedReport.type === "user_report") {
      updateUserReportMutation.mutate({
        reportId: selectedReport.id,
        status: selectedStatus as any,
        reviewNotes,
        action: selectedAction as any,
      });
    } else if (selectedReport.type === "property_approval") {
      updatePropertyApprovalMutation.mutate({
        approvalId: selectedReport.id,
        status: selectedStatus as any,
        reviewNotes,
        rejectionReason: selectedStatus === "rejected" ? reviewNotes : undefined,
      });
    }
  };

  const openReviewDialog = (report: any, type: string) => {
    setSelectedReport({ ...report, type });
    setReviewDialogOpen(true);
    setReviewNotes("");
    setSelectedAction("");
    setSelectedStatus("");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the admin dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // TODO: Add proper admin role check
  // if (user.role !== 'admin') { ... }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Manage reports, approvals, and platform moderation</p>
      </div>

      {/* Activity Feed */}
      <div className="mb-6">
        <ActivityFeed />
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Property Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{propertyReports?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">User Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userReports?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Review Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewReports?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Property Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{propertyApprovals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="property-reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="property-reports">Property Reports</TabsTrigger>
          <TabsTrigger value="user-reports">User Reports</TabsTrigger>
          <TabsTrigger value="review-reports">Review Reports</TabsTrigger>
          <TabsTrigger value="property-approvals">Property Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="property-reports" className="space-y-4">
          {loadingPropertyReports ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : propertyReports && propertyReports.length > 0 ? (
            propertyReports.map((item: any) => (
              <Card key={item.report.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <h3 className="font-semibold">
                          {item.report.reason.replace(/_/g, " ").toUpperCase()}
                        </h3>
                        <Badge variant="outline">{item.report.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.report.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Property:</span>{" "}
                          <Link href={`/property/${item.property?.id}`} className="text-primary hover:underline">
                            {item.property?.title || `Property #${item.property?.id}`}
                          </Link>
                        </div>
                        <div>
                          <span className="font-medium">Reported by:</span> {item.reporter?.name || "Unknown"}
                        </div>
                        <div>
                          <span className="font-medium">Reported:</span>{" "}
                          {new Date(item.report.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => openReviewDialog(item.report, "property_report")}
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No pending property reports</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="user-reports" className="space-y-4">
          {loadingUserReports ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : userReports && userReports.length > 0 ? (
            userReports.map((item: any) => (
              <Card key={item.report.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold">
                          {item.report.reason.replace(/_/g, " ").toUpperCase()}
                        </h3>
                        <Badge variant="outline">{item.report.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.report.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Reported User:</span> {item.reportedUser?.name || "Unknown"}
                        </div>
                        <div>
                          <span className="font-medium">Reported:</span>{" "}
                          {new Date(item.report.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => openReviewDialog(item.report, "user_report")}
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No pending user reports</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="review-reports" className="space-y-4">
          {loadingReviewReports ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reviewReports && reviewReports.length > 0 ? (
            reviewReports.map((report: any) => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-orange-500" />
                        <h3 className="font-semibold">
                          {report.reason.replace(/_/g, " ").toUpperCase()}
                        </h3>
                        <Badge variant="outline">{report.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                      <div className="text-sm">
                        <span className="font-medium">Reported:</span>{" "}
                        {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No pending review reports</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="property-approvals" className="space-y-4">
          {loadingApprovals ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : propertyApprovals && propertyApprovals.length > 0 ? (
            <>
              <BulkActionToolbar
                selectedCount={selectedPropertyApprovals.size}
                onApprove={() => {
                  toast.success(`Approved ${selectedPropertyApprovals.size} properties`);
                  setSelectedPropertyApprovals(new Set());
                  refetchApprovals();
                }}
                onReject={() => {
                  toast.success(`Rejected ${selectedPropertyApprovals.size} properties`);
                  setSelectedPropertyApprovals(new Set());
                  refetchApprovals();
                }}
                onClear={() => setSelectedPropertyApprovals(new Set())}
              />
              {propertyApprovals.map((item: any) => (
                <Card key={item.approval.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedPropertyApprovals.has(item.approval.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedPropertyApprovals);
                          if (checked) {
                            newSelected.add(item.approval.id);
                          } else {
                            newSelected.delete(item.approval.id);
                          }
                          setSelectedPropertyApprovals(newSelected);
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold">
                          {item.property?.title || `Property #${item.property?.id}`}
                        </h3>
                        <Badge variant="outline">{item.approval.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {item.property?.description?.substring(0, 150)}...
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Price:</span> ${item.property?.price?.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span>{" "}
                            {new Date(item.approval.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openReviewDialog(item.approval, "property_approval")}
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>
                </CardContent>
              </Card>
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No pending property approvals</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review {selectedReport?.type?.replace(/_/g, " ")}</DialogTitle>
            <DialogDescription>
              Review and take action on this report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {selectedReport?.type === "property_approval" ? (
                    <>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="needs_changes">Needs Changes</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="reviewing">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedReport?.type !== "property_approval" && (
              <div>
                <Label>Action</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedReport?.type === "property_report" ? (
                      <>
                        <SelectItem value="none">No Action</SelectItem>
                        <SelectItem value="warning_sent">Send Warning</SelectItem>
                        <SelectItem value="listing_removed">Remove Listing</SelectItem>
                        <SelectItem value="user_banned">Ban User</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="none">No Action</SelectItem>
                        <SelectItem value="warning_sent">Send Warning</SelectItem>
                        <SelectItem value="account_suspended">Suspend Account</SelectItem>
                        <SelectItem value="account_banned">Ban Account</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Review Notes</Label>
              <Textarea
                placeholder="Add your review notes..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={
                updatePropertyReportMutation.isPending ||
                updateUserReportMutation.isPending ||
                updatePropertyApprovalMutation.isPending
              }
            >
              {updatePropertyReportMutation.isPending ||
              updateUserReportMutation.isPending ||
              updatePropertyApprovalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
