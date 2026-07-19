// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Calculator, DollarSign, Home, 
  TrendingUp, AlertCircle, CheckCircle2 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function AffordabilityCalculator() {
  const [annualIncome, setAnnualIncome] = useState("80000");
  const [monthlyDebts, setMonthlyDebts] = useState("500");
  const [downPayment, setDownPayment] = useState("50000");
  const [interestRate, setInterestRate] = useState("6.5");
  const [loanTerm, setLoanTerm] = useState("30");
  const [propertyTaxRate, setPropertyTaxRate] = useState("1.2");
  const [insuranceRate, setInsuranceRate] = useState("0.5");
  
  const [affordability, setAffordability] = useState<any>(null);

  const calculateMutation = trpc.affordability.calculate.useMutation({
    onSuccess: (data) => {
      setAffordability(data);
      toast.success("Affordability calculated!");
    },
    onError: () => {
      toast.error("Failed to calculate affordability");
    },
  });

  const handleCalculate = async () => {
    const income = parseFloat(annualIncome);
    const debts = parseFloat(monthlyDebts);
    const down = parseFloat(downPayment);
    const rate = parseFloat(interestRate);
    const term = parseInt(loanTerm);
    
    if (!income || income <= 0) {
      toast.error("Please enter a valid annual income");
      return;
    }

    try {
      await calculateMutation.mutateAsync({
        annualIncome: income,
        monthlyDebts: debts,
        downPayment: down,
        interestRate: rate,
        loanTermYears: term,
        propertyTaxRate: parseFloat(propertyTaxRate),
        insuranceRate: parseFloat(insuranceRate),
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
            <h1 className="text-3xl font-bold mb-2">Home Affordability Calculator</h1>
            <p className="text-muted-foreground">
              Determine how much home you can afford based on your income, debts, and down payment
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Your Finances
                  </CardTitle>
                  <CardDescription>
                    Enter your financial information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="annualIncome">Annual Gross Income</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="annualIncome"
                        type="number"
                        value={annualIncome}
                        onChange={(e) => setAnnualIncome(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Monthly: {formatCurrency(parseFloat(annualIncome) / 12)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="monthlyDebts">Monthly Debt Payments</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="monthlyDebts"
                        type="number"
                        value={monthlyDebts}
                        onChange={(e) => setMonthlyDebts(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Car loans, credit cards, student loans, etc.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="downPayment">Down Payment</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="downPayment"
                        type="number"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Separator />

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
                    <Input
                      id="loanTerm"
                      type="number"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="propertyTaxRate">Property Tax Rate (%)</Label>
                    <Input
                      id="propertyTaxRate"
                      type="number"
                      step="0.1"
                      value={propertyTaxRate}
                      onChange={(e) => setPropertyTaxRate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="insuranceRate">Insurance Rate (%)</Label>
                    <Input
                      id="insuranceRate"
                      type="number"
                      step="0.1"
                      value={insuranceRate}
                      onChange={(e) => setInsuranceRate(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleCalculate}
                    disabled={calculateMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {calculateMutation.isPending ? "Calculating..." : "Calculate Affordability"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {affordability && (
                <>
                  {/* Maximum Home Price */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-primary" />
                        Maximum Home Price
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-5xl font-bold text-primary mb-2">
                          {formatCurrency(affordability.maxHomePrice)}
                        </p>
                        <p className="text-muted-foreground">
                          Based on 28/36 debt-to-income ratio guidelines
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Budget Scenarios */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Comfortable Budget */}
                    <Card className="border-green-200 dark:border-green-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          Comfortable Budget
                        </CardTitle>
                        <CardDescription>
                          Conservative estimate with financial cushion
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-3xl font-bold text-green-600">
                            {formatCurrency(affordability.comfortable.homePrice)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Home Price</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Monthly Payment</span>
                            <span className="font-semibold">{formatCurrency(affordability.comfortable.monthlyPayment)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">DTI Ratio</span>
                            <Badge variant="outline" className="text-green-600">
                              {affordability.comfortable.dtiRatio}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Income Left</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(affordability.comfortable.monthlyIncomeLeft)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          ✓ Recommended for most buyers
                          <br />
                          ✓ Leaves room for savings and emergencies
                        </p>
                      </CardContent>
                    </Card>

                    {/* Maximum Budget */}
                    <Card className="border-orange-200 dark:border-orange-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          Maximum Budget
                        </CardTitle>
                        <CardDescription>
                          Upper limit based on lender guidelines
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <p className="text-3xl font-bold text-orange-600">
                            {formatCurrency(affordability.maximum.homePrice)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Home Price</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Monthly Payment</span>
                            <span className="font-semibold">{formatCurrency(affordability.maximum.monthlyPayment)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">DTI Ratio</span>
                            <Badge variant="outline" className="text-orange-600">
                              {affordability.maximum.dtiRatio}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Income Left</span>
                            <span className="font-semibold text-orange-600">
                              {formatCurrency(affordability.maximum.monthlyIncomeLeft)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          ⚠ Tight budget with less flexibility
                          <br />
                          ⚠ Consider unexpected expenses carefully
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Payment Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Estimated Monthly Payment
                      </CardTitle>
                      <CardDescription>
                        For your comfortable budget of {formatCurrency(affordability.comfortable.homePrice)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <span className="font-medium">Principal & Interest</span>
                          <span className="text-lg font-bold">{formatCurrency(affordability.breakdown.principalAndInterest)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <span className="font-medium">Property Taxes</span>
                          <span className="text-lg font-bold">{formatCurrency(affordability.breakdown.propertyTax)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <span className="font-medium">Homeowners Insurance</span>
                          <span className="text-lg font-bold">{formatCurrency(affordability.breakdown.insurance)}</span>
                        </div>

                        {affordability.breakdown.pmi > 0 && (
                          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                            <span className="font-medium">PMI (if down payment &lt; 20%)</span>
                            <span className="text-lg font-bold">{formatCurrency(affordability.breakdown.pmi)}</span>
                          </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between text-lg">
                          <span className="font-bold">Total Monthly Payment</span>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(affordability.comfortable.monthlyPayment)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* DTI Ratio Explanation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Debt-to-Income Ratio (DTI)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Front-End Ratio (28%)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Housing costs should not exceed 28% of gross monthly income
                          </p>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">Your Housing Costs</span>
                            <Badge variant={affordability.ratios.frontEnd <= 28 ? "default" : "destructive"}>
                              {affordability.ratios.frontEnd}%
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Back-End Ratio (36%)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Total debt should not exceed 36% of gross monthly income
                          </p>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">Your Total Debt</span>
                            <Badge variant={affordability.ratios.backEnd <= 36 ? "default" : "destructive"}>
                              {affordability.ratios.backEnd}%
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <h4 className="font-semibold mb-2">What This Means</h4>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Lenders typically use the 28/36 rule to determine loan approval</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Lower DTI ratios improve your chances of approval and better rates</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Consider paying down debts before applying for a mortgage</span>
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tips */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tips to Increase Affordability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Increase your down payment to reduce monthly payments and avoid PMI</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Pay off high-interest debts to lower your DTI ratio</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Improve your credit score to qualify for better interest rates</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Consider a longer loan term to reduce monthly payments (but pay more interest)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Shop around for lower property tax and insurance rates</span>
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
