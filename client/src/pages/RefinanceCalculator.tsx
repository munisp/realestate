// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Calculator, DollarSign, TrendingDown, 
  Clock, CheckCircle2, AlertCircle, BarChart3 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function RefinanceCalculator() {
  // Current Mortgage
  const [currentBalance, setCurrentBalance] = useState("300000");
  const [currentRate, setCurrentRate] = useState("7.5");
  const [currentMonthlyPayment, setCurrentMonthlyPayment] = useState("2500");
  const [yearsRemaining, setYearsRemaining] = useState("25");
  
  // New Mortgage
  const [newRate, setNewRate] = useState("6.0");
  const [newTerm, setNewTerm] = useState("30");
  const [closingCosts, setClosingCosts] = useState("5000");
  
  const [analysis, setAnalysis] = useState<any>(null);

  const calculateMutation = trpc.refinance.calculate.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success("Refinance analysis complete!");
    },
    onError: () => {
      toast.error("Failed to calculate refinance");
    },
  });

  const handleCalculate = async () => {
    const balance = parseFloat(currentBalance);
    const currRate = parseFloat(currentRate);
    const payment = parseFloat(currentMonthlyPayment);
    const years = parseFloat(yearsRemaining);
    const refRate = parseFloat(newRate);
    const term = parseInt(newTerm);
    const costs = parseFloat(closingCosts);
    
    if (!balance || !currRate || !payment || !years || !refRate || !term) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await calculateMutation.mutateAsync({
        currentBalance: balance,
        currentRate: currRate,
        currentMonthlyPayment: payment,
        yearsRemaining: years,
        newRate: refRate,
        newTermYears: term,
        closingCosts: costs,
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
            <h1 className="text-3xl font-bold mb-2">Mortgage Refinance Calculator</h1>
            <p className="text-muted-foreground">
              Analyze whether refinancing your mortgage makes financial sense
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Your Mortgage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Current Mortgage</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="currentBalance">Remaining Balance</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="currentBalance"
                            type="number"
                            value={currentBalance}
                            onChange={(e) => setCurrentBalance(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="currentRate">Interest Rate (%)</Label>
                        <Input
                          id="currentRate"
                          type="number"
                          step="0.1"
                          value={currentRate}
                          onChange={(e) => setCurrentRate(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="currentMonthlyPayment">Monthly Payment</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="currentMonthlyPayment"
                            type="number"
                            value={currentMonthlyPayment}
                            onChange={(e) => setCurrentMonthlyPayment(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="yearsRemaining">Years Remaining</Label>
                        <Input
                          id="yearsRemaining"
                          type="number"
                          step="0.5"
                          value={yearsRemaining}
                          onChange={(e) => setYearsRemaining(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">New Mortgage</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="newRate">New Interest Rate (%)</Label>
                        <Input
                          id="newRate"
                          type="number"
                          step="0.1"
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="newTerm">New Loan Term (Years)</Label>
                        <Input
                          id="newTerm"
                          type="number"
                          value={newTerm}
                          onChange={(e) => setNewTerm(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="closingCosts">Closing Costs</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="closingCosts"
                            type="number"
                            value={closingCosts}
                            onChange={(e) => setClosingCosts(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Typically 2-5% of loan amount
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCalculate}
                    disabled={calculateMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {calculateMutation.isPending ? "Calculating..." : "Analyze Refinance"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {analysis && (
                <>
                  {/* Recommendation Card */}
                  <Card className={`border-2 ${analysis.recommendation === 'refinance' ? 'border-green-500' : 'border-orange-500'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {analysis.recommendation === 'refinance' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        )}
                        Recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <Badge 
                          className="text-lg px-4 py-2 mb-4" 
                          variant={analysis.recommendation === 'refinance' ? 'default' : 'secondary'}
                        >
                          {analysis.recommendation === 'refinance' 
                            ? '✓ Refinancing Makes Sense' 
                            : '⚠ Consider Carefully'}
                        </Badge>
                        <p className="text-muted-foreground">
                          {analysis.recommendationReason}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Metrics */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Monthly Savings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-600">
                          {formatCurrency(analysis.monthlySavings)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.monthlySavings > 0 ? 'Lower payment' : 'Higher payment'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Break-Even Point
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-blue-600">
                          {analysis.breakEvenMonths} months
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(analysis.breakEvenMonths / 12).toFixed(1)} years
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Lifetime Savings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-purple-600">
                          {formatCurrency(analysis.lifetimeSavings)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total interest saved
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Payment Comparison */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Current Mortgage */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-orange-600" />
                          Current Mortgage
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <p className="text-3xl font-bold text-orange-600">
                            {formatCurrency(analysis.current.monthlyPayment)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Monthly Payment</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Interest Rate</span>
                            <span className="font-semibold">{analysis.current.rate}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Remaining Balance</span>
                            <span className="font-semibold">{formatCurrency(analysis.current.balance)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Years Remaining</span>
                            <span className="font-semibold">{analysis.current.yearsRemaining} years</span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Interest Remaining</span>
                            <span className="font-semibold text-orange-600">
                              {formatCurrency(analysis.current.totalInterest)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Amount Paid</span>
                            <span className="font-semibold">
                              {formatCurrency(analysis.current.totalPaid)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* New Mortgage */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingDown className="w-5 h-5 text-green-600" />
                          New Mortgage
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-3xl font-bold text-green-600">
                            {formatCurrency(analysis.new.monthlyPayment)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Monthly Payment</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Interest Rate</span>
                            <span className="font-semibold">{analysis.new.rate}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Loan Amount</span>
                            <span className="font-semibold">{formatCurrency(analysis.new.balance)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Loan Term</span>
                            <span className="font-semibold">{analysis.new.termYears} years</span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Interest</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(analysis.new.totalInterest)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Amount Paid</span>
                            <span className="font-semibold">
                              {formatCurrency(analysis.new.totalPaid)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Closing Costs</span>
                            <span className="font-semibold text-orange-600">
                              +{formatCurrency(analysis.new.closingCosts)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Break-Even Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Break-Even Analysis
                      </CardTitle>
                      <CardDescription>
                        How long until refinancing pays for itself
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Closing Costs</span>
                          <span className="text-lg font-bold">{formatCurrency(analysis.new.closingCosts)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Monthly Savings</span>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(analysis.monthlySavings)}
                          </span>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Break-Even Point</span>
                          <span className="text-2xl font-bold text-primary">
                            {analysis.breakEvenMonths} months
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>What this means:</strong> You'll need to stay in your home for at least{' '}
                          <strong>{analysis.breakEvenMonths} months ({(analysis.breakEvenMonths / 12).toFixed(1)} years)</strong>{' '}
                          to recoup the closing costs through monthly savings.
                        </p>
                        
                        {analysis.breakEvenMonths <= 24 ? (
                          <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-green-600">Short Break-Even Period</p>
                              <p className="text-xs text-muted-foreground">
                                This is a relatively short time to break even, making refinancing attractive if you plan to stay.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-orange-600">Long Break-Even Period</p>
                              <p className="text-xs text-muted-foreground">
                                Consider whether you'll stay in your home long enough to benefit from refinancing.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Considerations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Important Considerations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold">When to Refinance:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                              <li>• Interest rates have dropped at least 0.5-1%</li>
                              <li>• You plan to stay in your home past the break-even point</li>
                              <li>• Your credit score has improved significantly</li>
                              <li>• You want to switch from ARM to fixed-rate mortgage</li>
                            </ul>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold">Watch Out For:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                              <li>• Extending your loan term may increase total interest paid</li>
                              <li>• Closing costs can be rolled into the loan (but increase total cost)</li>
                              <li>• Prepayment penalties on your current mortgage</li>
                              <li>• Changes in your home's value affecting loan-to-value ratio</li>
                            </ul>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <DollarSign className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold">Next Steps:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                              <li>• Shop around with multiple lenders for the best rate</li>
                              <li>• Check your credit score and report</li>
                              <li>• Get a current home appraisal</li>
                              <li>• Compare total costs, not just monthly payments</li>
                            </ul>
                          </div>
                        </div>
                      </div>
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
