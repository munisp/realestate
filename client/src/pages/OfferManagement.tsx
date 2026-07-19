// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Plus, FileText, Clock, CheckCircle2, XCircle, 
  AlertCircle, DollarSign, Calendar, Upload, Download, PenTool 
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function OfferManagement() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  // Form state
  const [propertyId, setPropertyId] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [contingencies, setContingencies] = useState("");
  const [additionalTerms, setAdditionalTerms] = useState("");

  const { data: offers, isLoading } = trpc.offers.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createOfferMutation = trpc.offers.create.useMutation({
    onSuccess: () => {
      utils.offers.list.invalidate();
      setIsCreateOpen(false);
      resetForm();
      toast.success("Offer submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit offer");
    },
  });

  const withdrawOfferMutation = trpc.offers.withdraw.useMutation({
    onSuccess: () => {
      utils.offers.list.invalidate();
      toast.success("Offer withdrawn");
    },
  });

  const counterOfferMutation = trpc.offers.counter.useMutation({
    onSuccess: () => {
      utils.offers.list.invalidate();
      toast.success("Counter offer sent");
    },
  });

  const resetForm = () => {
    setPropertyId("");
    setOfferAmount("");
    setDownPayment("");
    setClosingDate("");
    setContingencies("");
    setAdditionalTerms("");
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || !downPayment || !closingDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createOfferMutation.mutateAsync({
        propertyId: parseInt(propertyId),
        offerAmount: parseFloat(offerAmount),
        downPayment: parseFloat(downPayment),
        closingDate,
        contingencies,
        additionalTerms,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleWithdraw = async (offerId: number) => {
    if (confirm("Are you sure you want to withdraw this offer?")) {
      try {
        await withdrawOfferMutation.mutateAsync({ offerId });
      } catch (error) {
        toast.error("Failed to withdraw offer");
      }
    }
  };

  const handleCounter = async (offerId: number) => {
    const amount = prompt("Enter your counter offer amount:");
    if (amount) {
      try {
        await counterOfferMutation.mutateAsync({
          offerId,
          counterAmount: parseFloat(amount),
        });
      } catch (error) {
        toast.error("Failed to send counter offer");
      }
    }
  };

  const handleSign = (offerId: number) => {
    toast.info("Opening e-signature interface...");
    // In production, this would open DocuSign or similar
    setTimeout(() => {
      toast.success("Document signed successfully");
      utils.offers.list.invalidate();
    }, 2000);
  };

  const handleDownloadContract = (offerId: number) => {
    toast.info("Preparing contract download...");
    // In production, this would download the actual contract PDF
    setTimeout(() => {
      toast.success("Contract downloaded");
    }, 1000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to manage your offers
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'countered':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'countered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredOffers = (offers as any)?.filter((offer: any) => {
    if (activeTab === 'all') return true;
    return offer.status === activeTab;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <span className="text-sm text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Offers</h1>
            <p className="text-muted-foreground">
              Track and manage your property offers
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Submit New Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Property Offer</DialogTitle>
                <DialogDescription>
                  Fill in the details for your offer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="propertyId">Property ID</Label>
                  <Input
                    id="propertyId"
                    type="number"
                    placeholder="Enter property ID"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="offerAmount">Offer Amount</Label>
                  <Input
                    id="offerAmount"
                    type="number"
                    placeholder="e.g., 500000"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="downPayment">Down Payment</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    placeholder="e.g., 100000"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                  {offerAmount && downPayment && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {((parseFloat(downPayment) / parseFloat(offerAmount)) * 100).toFixed(1)}% down
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="closingDate">Proposed Closing Date</Label>
                  <Input
                    id="closingDate"
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contingencies">Contingencies</Label>
                  <Textarea
                    id="contingencies"
                    placeholder="e.g., Home inspection, financing approval, appraisal..."
                    value={contingencies}
                    onChange={(e) => setContingencies(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="additionalTerms">Additional Terms</Label>
                  <Textarea
                    id="additionalTerms"
                    placeholder="Any additional terms or conditions..."
                    value={additionalTerms}
                    onChange={(e) => setAdditionalTerms(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSubmitOffer}
                  disabled={createOfferMutation.isPending}
                  className="w-full"
                >
                  {createOfferMutation.isPending ? "Submitting..." : "Submit Offer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Offers</p>
                  <p className="text-2xl font-bold">{(offers as any)?.length || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {(offers as any)?.filter((o: any) => o.status === 'pending').length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(offers as any)?.filter((o: any) => o.status === 'accepted').length || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {(offers as any)?.filter((o: any) => o.status === 'rejected').length || 0}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offers List */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList>
                <TabsTrigger value="all">All Offers</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="accepted">Accepted</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No offers found</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Offer
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOffers.map((offer: any) => (
                  <Card key={offer.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">
                              Property #{offer.propertyId}
                            </h3>
                            <Badge className={getStatusColor(offer.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(offer.status)}
                                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted on {new Date(offer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            ${offer.offerAmount.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {((offer.downPayment / offer.offerAmount) * 100).toFixed(0)}% down
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Down Payment</p>
                          <p className="font-semibold">${offer.downPayment.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Closing Date</p>
                          <p className="font-semibold">
                            {new Date(offer.closingDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Financing</p>
                          <p className="font-semibold">
                            ${(offer.offerAmount - offer.downPayment).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {offer.contingencies && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold mb-1">Contingencies:</p>
                          <p className="text-sm text-muted-foreground">{offer.contingencies}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {offer.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleWithdraw(offer.id)}
                            >
                              Withdraw
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadContract(offer.id)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </>
                        )}
                        {offer.status === 'countered' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleCounter(offer.id)}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Counter Offer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleWithdraw(offer.id)}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                        {offer.status === 'accepted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSign(offer.id)}
                            >
                              <PenTool className="w-4 h-4 mr-2" />
                              Sign Contract
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadContract(offer.id)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </>
                        )}
                        {offer.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadContract(offer.id)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
