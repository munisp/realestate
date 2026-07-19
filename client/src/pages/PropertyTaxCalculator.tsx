// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Calculator, DollarSign, Home, Shield, 
  TrendingUp, PieChart, FileText 
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PropertyTaxCalculator() {
  const [propertyPrice, setPropertyPrice] = useState("500000");
  const [location, setLocation] = useState("lagos");
  const [downPaymentPercent, setDownPaymentPercent] = useState([20]);
  const [interestRate, setInterestRate] = useState("6.5");
  const [loanTerm, setLoanTerm] = useState("30");
  const [hoaFees, setHoaFees] = useState("0");
  
  const [calculations, setCalculations] = useState<any>(null);

  const calculateMutation = trpc.propertyTax.calculate.useMutation({
    onSuccess: (data) => {
      setCalculations(data);
    },
    onError: () => {
      toast.error("Failed to calculate taxes");
    },
  });

  useEffect(() => {
    handleCalculate();
  }, [propertyPrice, location, downPaymentPercent, interestRate, loanTerm, hoaFees]);

  const handleCalculate = async () => {
    const price = parseFloat(propertyPrice);
    if (!price || price <= 0) return;

    try {
      await calculateMutation.mutateAsync({
        propertyPrice: price,
        location,
        downPaymentPercent: downPaymentPercent[0],
        interestRate: parseFloat(interestRate),
        loanTermYears: parseInt(loanTerm),
        hoaFees: parseFloat(hoaFees),
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

  const downPaymentAmount = parseFloat(propertyPrice) * (downPaymentPercent[0] / 100);
  const loanAmount = parseFloat(propertyPrice) - downPaymentAmount;

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
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Property Tax Calculator</h1>
            <p className="text-muted-foreground">
              Estimate your annual property taxes, insurance, HOA fees, and total monthly PITI payment
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="propertyPrice">Property Purchase Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="propertyPrice"
                        type="number"
                        value={propertyPrice}
                        onChange={(e) => setPropertyPrice(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <Label>Down Payment</Label>
                      <span className="text-sm font-semibold">{downPaymentPercent[0]}%</span>
                    </div>
                    <Slider
                      value={downPaymentPercent}
                      onValueChange={setDownPaymentPercent}
                      min={0}
                      max={50}
                      step={1}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(downPaymentAmount)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="loanTerm">Loan Term (Years)</Label>
                    <Select value={loanTerm} onValueChange={setLoanTerm}>
                      <SelectTrigger id="loanTerm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 years</SelectItem>
                        <SelectItem value="20">20 years</SelectItem>
                        <SelectItem value="30">30 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="hoaFees">Monthly HOA Fees</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="hoaFees"
                        type="number"
                        value={hoaFees}
                        onChange={(e) => setHoaFees(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {calculations && (
                <>
                  {/* Total Monthly Payment */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-primary" />
                        Total Monthly Payment (PITI + HOA)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-5xl font-bold text-primary mb-2">
                          {formatCurrency(calculations.totalMonthlyPayment)}
                        </p>
                        <p className="text-muted-foreground">
                          Principal, Interest, Taxes, Insurance, and HOA
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* PITI Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="w-5 h-5" />
                        Monthly Payment Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">Principal & Interest</span>
                          </div>
                          <span className="text-lg font-bold">{formatCurrency(calculations.principalAndInterest)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium">Property Taxes</span>
                          </div>
                          <span className="text-lg font-bold">{formatCurrency(calculations.monthlyPropertyTax)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="font-medium">Homeowners Insurance</span>
                          </div>
                          <span className="text-lg font-bold">{formatCurrency(calculations.monthlyInsurance)}</span>
                        </div>

                        {parseFloat(hoaFees) > 0 && (
                          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <span className="font-medium">HOA Fees</span>
                            </div>
                            <span className="text-lg font-bold">{formatCurrency(parseFloat(hoaFees))}</span>
                          </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between text-lg">
                          <span className="font-bold">Total Monthly</span>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(calculations.totalMonthlyPayment)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Annual Costs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Annual Costs Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Property Taxes</p>
                          <p className="text-2xl font-bold">{formatCurrency(calculations.annualPropertyTax)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {calculations.taxRate}% of property value
                          </p>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Homeowners Insurance</p>
                          <p className="text-2xl font-bold">{formatCurrency(calculations.annualInsurance)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on property value and location
                          </p>
                        </div>

                        {parseFloat(hoaFees) > 0 && (
                          <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">HOA Fees</p>
                            <p className="text-2xl font-bold">{formatCurrency(parseFloat(hoaFees) * 12)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(parseFloat(hoaFees))} per month
                            </p>
                          </div>
                        )}

                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Total Annual Costs</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(calculations.totalAnnualCosts)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Excluding principal & interest
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Loan Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Loan Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Purchase Price</span>
                          <span className="font-semibold">{formatCurrency(parseFloat(propertyPrice))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Down Payment ({downPaymentPercent[0]}%)</span>
                          <span className="font-semibold">{formatCurrency(downPaymentAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Loan Amount</span>
                          <span className="font-semibold">{formatCurrency(loanAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Interest Rate</span>
                          <span className="font-semibold">{interestRate}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Loan Term</span>
                          <span className="font-semibold">{loanTerm} years</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Total Interest Paid</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(calculations.totalInterest)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Total Amount Paid</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(calculations.totalAmountPaid)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tips */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Money-Saving Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Increase your down payment to reduce monthly payments and avoid PMI</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Shop around for homeowners insurance to get the best rate</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Consider a shorter loan term to save on total interest paid</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Check if you qualify for property tax exemptions or reductions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>Make extra principal payments to reduce interest and pay off loan faster</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
