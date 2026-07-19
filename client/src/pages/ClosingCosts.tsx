import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Calculator, DollarSign, FileText, 
  Download, TrendingUp, AlertCircle 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function ClosingCosts() {
  const [purchasePrice, setPurchasePrice] = useState("500000");
  const [loanAmount, setLoanAmount] = useState("400000");
  const [location, setLocation] = useState("lagos");
  const [propertyType, setPropertyType] = useState("residential");
  
  const [estimates, setEstimates] = useState<any>(null);

  const calculateMutation = trpc.closingCosts.calculate.useMutation({
    onSuccess: (data) => {
      setEstimates(data);
      toast.success("Closing costs calculated!");
    },
    onError: () => {
      toast.error("Failed to calculate closing costs");
    },
  });

  const handleCalculate = async () => {
    const price = parseFloat(purchasePrice);
    const loan = parseFloat(loanAmount);
    
    if (!price || price <= 0 || !loan || loan <= 0) {
      toast.error("Please enter valid amounts");
      return;
    }

    if (loan > price) {
      toast.error("Loan amount cannot exceed purchase price");
      return;
    }

    try {
      await calculateMutation.mutateAsync({
        purchasePrice: price,
        loanAmount: loan,
        location,
        propertyType,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const downPayment = parseFloat(purchasePrice) - parseFloat(loanAmount);
  const downPaymentPercent = (downPayment / parseFloat(purchasePrice)) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Closing Cost Estimator</h1>
            <p className="text-muted-foreground">
              Get an itemized breakdown of your buyer closing costs (typically 2-5% of purchase price)
            </p>
          </div>

          {/* Input Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Property Information
              </CardTitle>
              <CardDescription>
                Enter your property details to calculate estimated closing costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="purchasePrice"
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="loanAmount">Loan Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="loanAmount"
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Down payment: {formatCurrency(downPayment)} ({downPaymentPercent.toFixed(1)}%)
                  </p>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger id="location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lagos">Lagos, Nigeria</SelectItem>
                      <SelectItem value="abuja">Abuja, Nigeria</SelectItem>
                      <SelectItem value="port-harcourt">Port Harcourt, Nigeria</SelectItem>
                      <SelectItem value="san-francisco">San Francisco, USA</SelectItem>
                      <SelectItem value="new-york">New York, USA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger id="propertyType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={calculateMutation.isPending}
                className="w-full mt-6"
                size="lg"
              >
                {calculateMutation.isPending ? "Calculating..." : "Calculate Closing Costs"}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {estimates && (
            <div className="space-y-6">
              {/* Total Closing Costs */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Estimated Total Closing Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-primary mb-2">
                      {formatCurrency(estimates.totalClosingCosts)}
                    </p>
                    <div className="flex items-center justify-center gap-4 text-muted-foreground">
                      <span>{estimates.percentOfPurchase}% of purchase price</span>
                      <Badge variant="outline">{estimates.estimateRange}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itemized Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Itemized Breakdown
                  </CardTitle>
                  <CardDescription>
                    Detailed list of all closing costs you can expect to pay
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Loan-Related Fees */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Loan-Related Fees
                      </h3>
                      <div className="space-y-2 pl-4">
                        {estimates.breakdown.loanFees.map((fee: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b">
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-muted-foreground">{fee.description}</p>
                            </div>
                            <span className="font-semibold">{formatCurrency(fee.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Title & Escrow Fees */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Title & Escrow Fees
                      </h3>
                      <div className="space-y-2 pl-4">
                        {estimates.breakdown.titleFees.map((fee: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b">
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-muted-foreground">{fee.description}</p>
                            </div>
                            <span className="font-semibold">{formatCurrency(fee.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Government Fees */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Government Fees & Taxes
                      </h3>
                      <div className="space-y-2 pl-4">
                        {estimates.breakdown.governmentFees.map((fee: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b">
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-muted-foreground">{fee.description}</p>
                            </div>
                            <span className="font-semibold">{formatCurrency(fee.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prepaid Costs */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Prepaid Costs
                      </h3>
                      <div className="space-y-2 pl-4">
                        {estimates.breakdown.prepaidCosts.map((fee: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b">
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-muted-foreground">{fee.description}</p>
                            </div>
                            <span className="font-semibold">{formatCurrency(fee.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Other Fees */}
                    {estimates.breakdown.otherFees && estimates.breakdown.otherFees.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          Other Fees
                        </h3>
                        <div className="space-y-2 pl-4">
                          {estimates.breakdown.otherFees.map((fee: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b">
                              <div>
                                <p className="font-medium">{fee.name}</p>
                                <p className="text-xs text-muted-foreground">{fee.description}</p>
                              </div>
                              <span className="font-semibold">{formatCurrency(fee.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Total */}
                    <div className="flex items-center justify-between text-lg pt-2">
                      <span className="font-bold">Total Closing Costs</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(estimates.totalClosingCosts)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cash to Close */}
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Total Cash Needed at Closing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Down Payment</span>
                      <span className="font-semibold">{formatCurrency(downPayment)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Closing Costs</span>
                      <span className="font-semibold">{formatCurrency(estimates.totalClosingCosts)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-xl">
                      <span className="font-bold">Total Cash Needed</span>
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(downPayment + estimates.totalClosingCosts)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Important Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    Important Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">⚠</span>
                      <span>These are estimates only. Actual costs may vary based on your specific situation and lender.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">⚠</span>
                      <span>Some fees may be negotiable with your lender or seller.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">⚠</span>
                      <span>You'll receive a Loan Estimate within 3 days of applying for a mortgage with exact figures.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">⚠</span>
                      <span>Closing costs typically range from 2% to 5% of the purchase price.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">⚠</span>
                      <span>Some lenders offer "no closing cost" loans where fees are rolled into your interest rate.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Download Button */}
              <Button className="w-full" size="lg" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF Estimate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
