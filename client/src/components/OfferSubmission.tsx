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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DollarSign, FileText, Calendar } from "lucide-react";

interface OfferSubmissionProps {
  propertyId: number;
  sellerId: number;
  listingPrice: number;
  propertyAddress: string;
  onSubmitted?: () => void;
}

export function OfferSubmission({
  propertyId,
  sellerId,
  listingPrice,
  propertyAddress,
  onSubmitted,
}: OfferSubmissionProps) {
  const [offerAmount, setOfferAmount] = useState(listingPrice.toString());
  const [earnestMoney, setEarnestMoney] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [financingType, setFinancingType] = useState<string>("conventional");
  const [closingDate, setClosingDate] = useState("");
  const [inspectionPeriod, setInspectionPeriod] = useState("10");
  const [inspectionContingency, setInspectionContingency] = useState(true);
  const [appraisalContingency, setAppraisalContingency] = useState(true);
  const [financingContingency, setFinancingContingency] = useState(true);
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [notes, setNotes] = useState("");

  const createOffer = trpc.offers.create.useMutation({
    onSuccess: () => {
      toast.success("Offer submitted successfully!");
      onSubmitted?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit offer");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    createOffer.mutate({
      propertyId,
      sellerId,
      offerAmount: Math.round(amount),
      earnestMoney: earnestMoney ? Math.round(parseFloat(earnestMoney)) : undefined,
      downPayment: downPayment ? Math.round(parseFloat(downPayment)) : undefined,
      financingType: financingType as any,
      proposedClosingDate: closingDate || undefined,
      inspectionPeriod: parseInt(inspectionPeriod),
      inspectionContingency,
      appraisalContingency,
      financingContingency,
      additionalTerms: additionalTerms || undefined,
      notes: notes || undefined,
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/,/g, ""));
    return isNaN(num) ? "" : num.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Submit an Offer
        </CardTitle>
        <CardDescription>{propertyAddress}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Offer Amount */}
          <div className="space-y-2">
            <Label htmlFor="offerAmount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Offer Amount *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="offerAmount"
                type="text"
                value={formatCurrency(offerAmount)}
                onChange={(e) => setOfferAmount(e.target.value.replace(/,/g, ""))}
                className="pl-7"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Listing Price: ${listingPrice.toLocaleString()}
            </p>
          </div>

          {/* Earnest Money */}
          <div className="space-y-2">
            <Label htmlFor="earnestMoney">Earnest Money Deposit</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="earnestMoney"
                type="text"
                value={formatCurrency(earnestMoney)}
                onChange={(e) => setEarnestMoney(e.target.value.replace(/,/g, ""))}
                className="pl-7"
                placeholder="0"
              />
            </div>
          </div>

          {/* Down Payment */}
          <div className="space-y-2">
            <Label htmlFor="downPayment">Down Payment</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="downPayment"
                type="text"
                value={formatCurrency(downPayment)}
                onChange={(e) => setDownPayment(e.target.value.replace(/,/g, ""))}
                className="pl-7"
                placeholder="0"
              />
            </div>
          </div>

          {/* Financing Type */}
          <div className="space-y-2">
            <Label htmlFor="financingType">Financing Type *</Label>
            <Select value={financingType} onValueChange={setFinancingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="conventional">Conventional</SelectItem>
                <SelectItem value="fha">FHA</SelectItem>
                <SelectItem value="va">VA</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Proposed Closing Date */}
          <div className="space-y-2">
            <Label htmlFor="closingDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Proposed Closing Date
            </Label>
            <Input
              id="closingDate"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Inspection Period */}
          <div className="space-y-2">
            <Label htmlFor="inspectionPeriod">Inspection Period (days)</Label>
            <Input
              id="inspectionPeriod"
              type="number"
              value={inspectionPeriod}
              onChange={(e) => setInspectionPeriod(e.target.value)}
              min="0"
              max="30"
            />
          </div>

          {/* Contingencies */}
          <div className="space-y-3">
            <Label>Contingencies</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inspectionContingency"
                  checked={inspectionContingency}
                  onCheckedChange={(checked) =>
                    setInspectionContingency(checked as boolean)
                  }
                />
                <Label htmlFor="inspectionContingency" className="cursor-pointer">
                  Inspection Contingency
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="appraisalContingency"
                  checked={appraisalContingency}
                  onCheckedChange={(checked) =>
                    setAppraisalContingency(checked as boolean)
                  }
                />
                <Label htmlFor="appraisalContingency" className="cursor-pointer">
                  Appraisal Contingency
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="financingContingency"
                  checked={financingContingency}
                  onCheckedChange={(checked) =>
                    setFinancingContingency(checked as boolean)
                  }
                />
                <Label htmlFor="financingContingency" className="cursor-pointer">
                  Financing Contingency
                </Label>
              </div>
            </div>
          </div>

          {/* Additional Terms */}
          <div className="space-y-2">
            <Label htmlFor="additionalTerms">Additional Terms</Label>
            <Textarea
              id="additionalTerms"
              value={additionalTerms}
              onChange={(e) => setAdditionalTerms(e.target.value)}
              placeholder="Any additional terms or conditions..."
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Private Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (not visible to seller)..."
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={createOffer.isPending}
            className="w-full"
          >
            {createOffer.isPending ? "Submitting..." : "Submit Offer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
