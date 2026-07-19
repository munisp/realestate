import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DollarSign, FileText, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

export default function MyOffers() {
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNotes, setCounterNotes] = useState("");

  const { data: myOffers, isLoading: loadingMy, refetch: refetchMy } = trpc.offers.getMyOffers.useQuery();
  const { data: receivedOffers, isLoading: loadingReceived, refetch: refetchReceived } = trpc.offers.getReceivedOffers.useQuery();

  const updateStatus = trpc.offers.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Offer updated successfully");
      refetchMy();
      refetchReceived();
      setSelectedOffer(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update offer");
    },
  });

  const createCounteroffer = trpc.offers.createCounteroffer.useMutation({
    onSuccess: () => {
      toast.success("Counteroffer submitted successfully");
      refetchReceived();
      setSelectedOffer(null);
      setCounterAmount("");
      setCounterNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit counteroffer");
    },
  });

  const handleAccept = (offerId: number) => {
    updateStatus.mutate({ offerId, status: "accepted" });
  };

  const handleReject = (offerId: number) => {
    updateStatus.mutate({ offerId, status: "rejected" });
  };

  const handleWithdraw = (offerId: number) => {
    updateStatus.mutate({ offerId, status: "withdrawn" });
  };

  const handleCounteroffer = () => {
    if (!selectedOffer || !counterAmount) {
      toast.error("Please enter a counteroffer amount");
      return;
    }

    const amount = parseFloat(counterAmount.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    createCounteroffer.mutate({
      offerId: selectedOffer.id,
      counterAmount: Math.round(amount),
      notes: counterNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      accepted: "default",
      rejected: "destructive",
      countered: "outline",
      withdrawn: "destructive",
      expired: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const OfferCard = ({ offer, isMine }: { offer: any; isMine: boolean }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {formatCurrency(offer.offerAmount)}
            </CardTitle>
            <CardDescription>Property ID: {offer.propertyId}</CardDescription>
          </div>
          {getStatusBadge(offer.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Financing:</span>
            <span className="font-medium">{offer.financingType.toUpperCase()}</span>
          </div>
          {offer.earnestMoney && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earnest Money:</span>
              <span className="font-medium">{formatCurrency(offer.earnestMoney)}</span>
            </div>
          )}
          {offer.downPayment && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Down Payment:</span>
              <span className="font-medium">{formatCurrency(offer.downPayment)}</span>
            </div>
          )}
          {offer.proposedClosingDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closing Date:</span>
              <span className="font-medium">
                {format(new Date(offer.proposedClosingDate), "MMM d, yyyy")}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submitted:</span>
            <span className="font-medium">
              {format(new Date(offer.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {offer.additionalTerms && (
          <div className="text-sm">
            <p className="font-medium mb-1">Additional Terms:</p>
            <p className="text-muted-foreground">{offer.additionalTerms}</p>
          </div>
        )}

        {offer.expiresAt && offer.status === "pending" && (
          <div className="text-sm text-amber-600 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Expires: {format(new Date(offer.expiresAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}

        {/* Actions */}
        {offer.status === "pending" && (
          <div className="flex gap-2 pt-2">
            {isMine ? (
              <Button
                variant="destructive"
                onClick={() => handleWithdraw(offer.id)}
                disabled={updateStatus.isPending}
                className="w-full"
              >
                Withdraw Offer
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  onClick={() => handleAccept(offer.id)}
                  disabled={updateStatus.isPending}
                  className="flex-1"
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedOffer(offer);
                    setCounterAmount(offer.offerAmount.toString());
                  }}
                  className="flex-1"
                >
                  Counter
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(offer.id)}
                  disabled={updateStatus.isPending}
                  className="flex-1"
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Offers</h1>
        <p className="text-muted-foreground">
          Manage your property offers and counteroffers
        </p>
      </div>

      <Tabs defaultValue="submitted" className="space-y-6">
        <TabsList>
          <TabsTrigger value="submitted" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Submitted Offers
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Received Offers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submitted">
          {loadingMy ? (
            <div className="text-center py-12">Loading offers...</div>
          ) : !myOffers || myOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Offers Submitted</h3>
                <p className="text-muted-foreground">
                  You haven't submitted any offers yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} isMine={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received">
          {loadingReceived ? (
            <div className="text-center py-12">Loading offers...</div>
          ) : !receivedOffers || receivedOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Offers Received</h3>
                <p className="text-muted-foreground">
                  You haven't received any offers yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {receivedOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} isMine={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Counteroffer Dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Counteroffer</DialogTitle>
            <DialogDescription>
              Original offer: {selectedOffer && formatCurrency(selectedOffer.offerAmount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="counterAmount">Counteroffer Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="counterAmount"
                  type="text"
                  value={counterAmount ? parseFloat(counterAmount.replace(/,/g, "")).toLocaleString() : ""}
                  onChange={(e) => setCounterAmount(e.target.value.replace(/,/g, ""))}
                  className="pl-7"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterNotes">Notes (Optional)</Label>
              <Textarea
                id="counterNotes"
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                placeholder="Explain your counteroffer..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOffer(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCounteroffer}
              disabled={createCounteroffer.isPending}
            >
              {createCounteroffer.isPending ? "Submitting..." : "Submit Counteroffer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
