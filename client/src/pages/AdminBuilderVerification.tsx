import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, CheckCircle, XCircle, Clock, FileText, ExternalLink } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";

export default function AdminBuilderVerification() {
  const { user, isAuthenticated, loading } = useAuth();
  const [selectedBuilder, setSelectedBuilder] = useState<number | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: builders, isLoading, refetch } = trpc.builders.getAll.useQuery();
  const updateStatusMutation = trpc.builders.updateVerificationStatus.useMutation();

  const handleReview = async () => {
    if (!selectedBuilder || !reviewAction) return;

    try {
      await updateStatusMutation.mutateAsync({
        builderId: selectedBuilder,
        status: reviewAction === "approve" ? "verified" : "rejected",
        notes: reviewNotes,
      });

      toast.success(`Builder ${reviewAction === "approve" ? "approved" : "rejected"} successfully`);
      setReviewDialog(false);
      setSelectedBuilder(null);
      setReviewAction(null);
      setReviewNotes("");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update builder status");
    }
  };

  const openReviewDialog = (builderId: number, action: "approve" | "reject") => {
    setSelectedBuilder(builderId);
    setReviewAction(action);
    setReviewDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const pendingBuilders = builders?.filter((b: any) => b.verificationStatus === "pending") || [];
  const verifiedBuilders = builders?.filter((b: any) => b.verificationStatus === "verified") || [];
  const rejectedBuilders = builders?.filter((b: any) => b.verificationStatus === "rejected") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const BuilderCard = ({ builder }: { builder: any }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {builder.companyName}
            </CardTitle>
            <CardDescription>{builder.email}</CardDescription>
          </div>
          {getStatusBadge(builder.verificationStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">CAC Number:</span>
            <p className="font-medium">{builder.cacNumber || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone:</span>
            <p className="font-medium">{builder.phone}</p>
          </div>
          <div>
            <span className="text-muted-foreground">City:</span>
            <p className="font-medium">{builder.city}</p>
          </div>
          <div>
            <span className="text-muted-foreground">State:</span>
            <p className="font-medium">{builder.state}</p>
          </div>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Company Bio:</span>
          <p className="text-sm mt-1">{builder.bio}</p>
        </div>

        {builder.verificationDocuments && (
          <div>
            <span className="text-sm font-medium">Documents:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(JSON.parse(builder.verificationDocuments)).map(([key, url]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={url as string} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-1" />
                    {key.replace(/_/g, " ")}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {builder.verificationStatus === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => openReviewDialog(builder.id, "approve")}
              className="flex-1"
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              onClick={() => openReviewDialog(builder.id, "reject")}
              variant="destructive"
              className="flex-1"
              disabled={updateStatusMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {builder.verificationNotes && (
          <div className="bg-muted p-3 rounded-lg">
            <span className="text-sm font-medium">Review Notes:</span>
            <p className="text-sm mt-1">{builder.verificationNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Builder Verification</h1>
          <p className="text-muted-foreground mt-2">
            Review and verify builder applications
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingBuilders.length})
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({verifiedBuilders.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedBuilders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : pendingBuilders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No pending applications
                </CardContent>
              </Card>
            ) : (
              pendingBuilders.map((builder: any) => (
                <BuilderCard key={builder.id} builder={builder} />
              ))
            )}
          </TabsContent>

          <TabsContent value="verified" className="space-y-4">
            {verifiedBuilders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No verified builders yet
                </CardContent>
              </Card>
            ) : (
              verifiedBuilders.map((builder: any) => (
                <BuilderCard key={builder.id} builder={builder} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedBuilders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No rejected applications
                </CardContent>
              </Card>
            ) : (
              rejectedBuilders.map((builder: any) => (
                <BuilderCard key={builder.id} builder={builder} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approve" ? "Approve" : "Reject"} Builder Application
              </DialogTitle>
              <DialogDescription>
                {reviewAction === "approve"
                  ? "This builder will be verified and can start listing projects."
                  : "This builder application will be rejected. Please provide a reason."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="notes">Review Notes {reviewAction === "reject" && "*"}</Label>
                <Textarea
                  id="notes"
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === "approve"
                      ? "Optional notes about the verification..."
                      : "Please explain why this application is being rejected..."
                  }
                  rows={4}
                  required={reviewAction === "reject"}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReview}
                disabled={updateStatusMutation.isPending || (reviewAction === "reject" && !reviewNotes)}
                variant={reviewAction === "approve" ? "default" : "destructive"}
              >
                {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {reviewAction === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
