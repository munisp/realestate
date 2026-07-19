import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, CheckCircle, Clock, AlertCircle, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function EscrowManagement() {
  const { user, loading: authLoading } = useAuth();
  const [selectedEscrow, setSelectedEscrow] = useState<any>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeType, setDisputeType] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");

  const { data: buyerEscrows, isLoading: loadingBuyerEscrows, refetch: refetchBuyerEscrows } = 
    trpc.escrow.getBuyerEscrows.useQuery(undefined, {
      enabled: !!user,
    });

  const { data: sellerEscrows, isLoading: loadingSellerEscrows, refetch: refetchSellerEscrows } = 
    trpc.escrow.getSellerEscrows.useQuery(undefined, {
      enabled: !!user,
    });

  const { data: milestones, isLoading: loadingMilestones } = trpc.escrow.getMilestones.useQuery(
    { escrowAccountId: selectedEscrow?.escrow?.id || 0 },
    { enabled: !!selectedEscrow?.escrow?.id }
  );

  const { data: transactions, isLoading: loadingTransactions } = trpc.escrow.getTransactions.useQuery(
    { escrowAccountId: selectedEscrow?.escrow?.id || 0 },
    { enabled: !!selectedEscrow?.escrow?.id }
  );

  const { data: disputes, isLoading: loadingDisputes } = trpc.escrow.getDisputes.useQuery(
    { escrowAccountId: selectedEscrow?.escrow?.id || 0 },
    { enabled: !!selectedEscrow?.escrow?.id }
  );

  const updateMilestoneMutation = trpc.escrow.updateMilestone.useMutation({
    onSuccess: () => {
      toast.success("Milestone updated successfully");
      refetchBuyerEscrows();
      refetchSellerEscrows();
    },
    onError: (error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });

  const createDisputeMutation = trpc.escrow.createDispute.useMutation({
    onSuccess: () => {
      toast.success("Dispute created successfully");
      setDisputeDialogOpen(false);
      setDisputeType("");
      setDisputeDescription("");
      refetchBuyerEscrows();
      refetchSellerEscrows();
    },
    onError: (error) => {
      toast.error(`Failed to create dispute: ${error.message}`);
    },
  });

  const handleApproveMilestone = (milestoneId: number, isBuyer: boolean) => {
    updateMilestoneMutation.mutate({
      milestoneId,
      status: "approved",
      approvedByBuyer: isBuyer,
      approvedBySeller: !isBuyer,
    });
  };

  const handleCreateDispute = () => {
    if (!disputeType || !disputeDescription) {
      toast.error("Please fill in all fields");
      return;
    }

    createDisputeMutation.mutate({
      escrowAccountId: selectedEscrow.escrow.id,
      disputeType: disputeType as any,
      description: disputeDescription,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      created: { variant: "secondary", icon: Clock },
      funded: { variant: "outline", icon: DollarSign },
      partial_release: { variant: "outline", icon: CheckCircle },
      completed: { variant: "default", icon: CheckCircle },
      disputed: { variant: "destructive", icon: AlertCircle },
      refunded: { variant: "secondary", icon: DollarSign },
      cancelled: { variant: "destructive", icon: AlertCircle },
    };
    
    const config = variants[status] || variants.created;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getMilestoneStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      in_progress: "outline",
      completed: "outline",
      approved: "default",
      released: "default",
      disputed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace(/_/g, " ")}</Badge>;
  };

  const calculateProgress = (escrow: any) => {
    if (!escrow) return 0;
    const totalAmount = escrow.totalAmount || 0;
    const releasedAmount = escrow.releasedAmount || 0;
    return totalAmount > 0 ? (releasedAmount / totalAmount) * 100 : 0;
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
            <CardDescription>Please log in to access escrow management</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Escrow Management</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your escrow accounts, milestones, and fund releases
        </p>
      </div>

      <Tabs defaultValue="buyer" className="space-y-6">
        <TabsList>
          <TabsTrigger value="buyer">As Buyer ({buyerEscrows?.length || 0})</TabsTrigger>
          <TabsTrigger value="seller">As Seller ({sellerEscrows?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="buyer" className="space-y-4">
          {loadingBuyerEscrows ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : buyerEscrows && buyerEscrows.length > 0 ? (
            buyerEscrows.map((item: any) => (
              <Card key={item.escrow.id} className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedEscrow(item)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {item.property?.title || `Property #${item.property?.id}`}
                        {getStatusBadge(item.escrow.status)}
                      </CardTitle>
                      <CardDescription>
                        Transaction #{item.escrow.transactionId}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${(item.escrow.totalAmount / 100).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Funds Released</span>
                        <span className="font-medium">
                          ${(item.escrow.releasedAmount / 100).toLocaleString()} / ${(item.escrow.totalAmount / 100).toLocaleString()}
                        </span>
                      </div>
                      <Progress value={calculateProgress(item.escrow)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Held</div>
                        <div className="font-medium">${(item.escrow.heldAmount / 100).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Released</div>
                        <div className="font-medium text-green-600">${(item.escrow.releasedAmount / 100).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Refunded</div>
                        <div className="font-medium text-orange-600">${(item.escrow.refundedAmount / 100).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEscrow(item);
                      }}>
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEscrow(item);
                        setDisputeDialogOpen(true);
                      }}>
                        <AlertCircle className="h-4 w-4 mr-1" />
                        File Dispute
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No escrow accounts as buyer</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="seller" className="space-y-4">
          {loadingSellerEscrows ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sellerEscrows && sellerEscrows.length > 0 ? (
            sellerEscrows.map((item: any) => (
              <Card key={item.escrow.id} className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedEscrow(item)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {item.property?.title || `Property #${item.property?.id}`}
                        {getStatusBadge(item.escrow.status)}
                      </CardTitle>
                      <CardDescription>
                        Transaction #{item.escrow.transactionId}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${(item.escrow.totalAmount / 100).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Funds Released</span>
                        <span className="font-medium">
                          ${(item.escrow.releasedAmount / 100).toLocaleString()} / ${(item.escrow.totalAmount / 100).toLocaleString()}
                        </span>
                      </div>
                      <Progress value={calculateProgress(item.escrow)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Held</div>
                        <div className="font-medium">${(item.escrow.heldAmount / 100).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Released</div>
                        <div className="font-medium text-green-600">${(item.escrow.releasedAmount / 100).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Refunded</div>
                        <div className="font-medium text-orange-600">${(item.escrow.refundedAmount / 100).toLocaleString()}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEscrow(item);
                    }}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No escrow accounts as seller</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {selectedEscrow && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Escrow Details</CardTitle>
            <CardDescription>Milestones, transactions, and disputes</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="milestones">
              <TabsList>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="disputes">Disputes</TabsTrigger>
              </TabsList>

              <TabsContent value="milestones" className="space-y-4 mt-4">
                {loadingMilestones ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : milestones && milestones.length > 0 ? (
                  milestones.map((milestone: any) => (
                    <Card key={milestone.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{milestone.name}</h4>
                              {getMilestoneStatusBadge(milestone.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium">${(milestone.amount / 100).toLocaleString()}</span>
                              {milestone.percentage && <span>({milestone.percentage}%)</span>}
                              {milestone.dueDate && (
                                <span className="text-muted-foreground">
                                  Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {milestone.status === "completed" && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveMilestone(milestone.id, selectedEscrow.escrow.buyerId === user.id)}
                              disabled={updateMilestoneMutation.isPending}
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No milestones defined</p>
                )}
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4 mt-4">
                {loadingTransactions ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  transactions.map((txn: any) => (
                    <Card key={txn.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium capitalize">{txn.type.replace(/_/g, " ")}</div>
                            <div className="text-sm text-muted-foreground">{txn.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(txn.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">${(txn.amount / 100).toLocaleString()}</div>
                            <Badge variant={txn.status === "completed" ? "default" : "secondary"}>
                              {txn.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No transactions yet</p>
                )}
              </TabsContent>

              <TabsContent value="disputes" className="space-y-4 mt-4">
                {loadingDisputes ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : disputes && disputes.length > 0 ? (
                  disputes.map((dispute: any) => (
                    <Card key={dispute.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold capitalize">
                                {dispute.disputeType.replace(/_/g, " ")}
                              </h4>
                              <Badge variant={dispute.status === "resolved" ? "default" : "destructive"}>
                                {dispute.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{dispute.description}</p>
                            <div className="text-xs text-muted-foreground">
                              Filed: {new Date(dispute.createdAt).toLocaleDateString()}
                            </div>
                            {dispute.resolution && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <strong>Resolution:</strong> {dispute.resolution}
                              </div>
                            )}
                          </div>
                          {dispute.requestedAmount && (
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Requested</div>
                              <div className="font-medium">${(dispute.requestedAmount / 100).toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No disputes filed</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Dispute</DialogTitle>
            <DialogDescription>
              Describe the issue with this escrow transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dispute Type</Label>
              <Select value={disputeType} onValueChange={setDisputeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dispute type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone_not_completed">Milestone Not Completed</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="timeline_delay">Timeline Delay</SelectItem>
                  <SelectItem value="contract_breach">Contract Breach</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the issue in detail..."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDispute}
              disabled={createDisputeMutation.isPending}
            >
              {createDisputeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Filing...
                </>
              ) : (
                "File Dispute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
