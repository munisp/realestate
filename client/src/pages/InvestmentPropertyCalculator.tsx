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
  Building2, Calculator, DollarSign, TrendingUp, 
  Home, Percent, AlertCircle, CheckCircle2 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function InvestmentPropertyCalculator() {
  // Purchase Details
  const [purchasePrice, setPurchasePrice] = useState("300000");
  const [downPayment, setDownPayment] = useState("60000");
  const [interestRate, setInterestRate] = useState("6.5");
  const [loanTerm, setLoanTerm] = useState("30");
  const [closingCosts, setClosingCosts] = useState("9000");
  
  // Income
  const [monthlyRent, setMonthlyRent] = useState("2500");
  const [otherIncome, setOtherIncome] = useState("0");
  
  // Expenses
  const [propertyTax, setPropertyTax] = useState("3000");
  const [insurance, setInsurance] = useState("1200");
  const [hoaFees, setHoaFees] = useState("0");
  const [maintenance, setMaintenance] = useState("3000");
  const [propertyManagement, setPropertyManagement] = useState("10");
  const [vacancyRate, setVacancyRate] = useState("5");
  
  const [analysis, setAnalysis] = useState<any>(null);

  const calculateMutation = trpc.investmentProperty.calculate.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success("Investment analysis complete!");
    },
    onError: () => {
      toast.error("Failed to calculate investment");
    },
  });

  const handleCalculate = async () => {
    const price = parseFloat(purchasePrice);
    const down = parseFloat(downPayment);
    const rate = parseFloat(interestRate);
    const term = parseInt(loanTerm);
    
    if (!price || !down || !rate || !term) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await calculateMutation.mutateAsync({
        purchasePrice: price,
        downPayment: down,
        interestRate: rate,
        loanTermYears: term,
        closingCosts: parseFloat(closingCosts),
        monthlyRent: parseFloat(monthlyRent),
        otherMonthlyIncome: parseFloat(otherIncome),
        annualPropertyTax: parseFloat(propertyTax),
        annualInsurance: parseFloat(insurance),
        monthlyHoaFees: parseFloat(hoaFees),
        annualMaintenance: parseFloat(maintenance),
        propertyManagementPercent: parseFloat(propertyManagement),
        vacancyRatePercent: parseFloat(vacancyRate),
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
            <h1 className="text-3xl font-bold mb-2">Investment Property Calculator</h1>
            <p className="text-muted-foreground">
              Analyze rental property ROI, cash flow, and key investment metrics
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
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Purchase Details</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="purchasePrice">Purchase Price</Label>
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {((parseFloat(downPayment) / parseFloat(purchasePrice)) * 100).toFixed(1)}% of purchase price
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
                        <Input
                          id="loanTerm"
                          type="number"
                          value={loanTerm}
                          onChange={(e) => setLoanTerm(e.target.value)}
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
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">Monthly Income</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="monthlyRent">Monthly Rent</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="monthlyRent"
                            type="number"
                            value={monthlyRent}
                            onChange={(e) => setMonthlyRent(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="otherIncome">Other Income (optional)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="otherIncome"
                            type="number"
                            value={otherIncome}
                            onChange={(e) => setOtherIncome(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Parking, laundry, storage, etc.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">Annual Expenses</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="propertyTax">Property Tax</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="propertyTax"
                            type="number"
                            value={propertyTax}
                            onChange={(e) => setPropertyTax(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="insurance">Insurance</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="insurance"
                            type="number"
                            value={insurance}
                            onChange={(e) => setInsurance(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="maintenance">Maintenance & Repairs</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="maintenance"
                            type="number"
                            value={maintenance}
                            onChange={(e) => setMaintenance(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Typically 1% of property value
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="hoaFees">HOA Fees (monthly)</Label>
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

                      <div>
                        <Label htmlFor="propertyManagement">Property Management (%)</Label>
                        <Input
                          id="propertyManagement"
                          type="number"
                          step="0.5"
                          value={propertyManagement}
                          onChange={(e) => setPropertyManagement(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          % of monthly rent
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="vacancyRate">Vacancy Rate (%)</Label>
                        <Input
                          id="vacancyRate"
                          type="number"
                          step="0.5"
                          value={vacancyRate}
                          onChange={(e) => setVacancyRate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Expected vacancy per year
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
                    {calculateMutation.isPending ? "Calculating..." : "Analyze Investment"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {analysis && (
                <>
                  {/* Investment Grade */}
                  <Card className={`border-2 ${
                    analysis.grade === 'excellent' ? 'border-green-500' :
                    analysis.grade === 'good' ? 'border-blue-500' :
                    analysis.grade === 'fair' ? 'border-yellow-500' :
                    'border-red-500'
                  }`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {analysis.grade === 'excellent' || analysis.grade === 'good' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        )}
                        Investment Grade
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <Badge 
                          className="text-lg px-4 py-2 mb-4" 
                          variant={analysis.grade === 'excellent' || analysis.grade === 'good' ? 'default' : 'secondary'}
                        >
                          {analysis.grade === 'excellent' && '⭐ Excellent Investment'}
                          {analysis.grade === 'good' && '✓ Good Investment'}
                          {analysis.grade === 'fair' && '⚠ Fair Investment'}
                          {analysis.grade === 'poor' && '✗ Poor Investment'}
                        </Badge>
                        <p className="text-muted-foreground">
                          {analysis.gradeReason}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Metrics */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Monthly Cash Flow
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={`text-3xl font-bold ${analysis.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(analysis.monthlyCashFlow)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.monthlyCashFlow >= 0 ? 'Positive' : 'Negative'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Cap Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-blue-600">
                          {analysis.capRate}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.capRate >= 8 ? 'Excellent' : analysis.capRate >= 6 ? 'Good' : 'Fair'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Cash-on-Cash Return
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-purple-600">
                          {analysis.cashOnCashReturn}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Annual return
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Break-Even Occupancy
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-orange-600">
                          {analysis.breakEvenOccupancy}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Minimum occupancy
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Income & Expenses */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Monthly Income */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          Monthly Income
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-3xl font-bold text-green-600">
                            {formatCurrency(analysis.income.grossMonthlyIncome)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Gross Monthly Income</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Monthly Rent</span>
                            <span className="font-semibold">{formatCurrency(analysis.income.monthlyRent)}</span>
                          </div>
                          {analysis.income.otherIncome > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Other Income</span>
                              <span className="font-semibold">{formatCurrency(analysis.income.otherIncome)}</span>
                            </div>
                          )}
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Vacancy Loss ({analysis.income.vacancyRate}%)</span>
                            <span className="font-semibold text-red-600">
                              -{formatCurrency(analysis.income.vacancyLoss)}
                            </span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between">
                            <span className="font-bold">Net Monthly Income</span>
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(analysis.income.netMonthlyIncome)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Monthly Expenses */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-red-600" />
                          Monthly Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                          <p className="text-3xl font-bold text-red-600">
                            {formatCurrency(analysis.expenses.totalMonthlyExpenses)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Total Monthly Expenses</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Mortgage Payment</span>
                            <span className="font-semibold">{formatCurrency(analysis.expenses.mortgagePayment)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Property Tax</span>
                            <span className="font-semibold">{formatCurrency(analysis.expenses.propertyTax)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Insurance</span>
                            <span className="font-semibold">{formatCurrency(analysis.expenses.insurance)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Maintenance</span>
                            <span className="font-semibold">{formatCurrency(analysis.expenses.maintenance)}</span>
                          </div>
                          {analysis.expenses.hoaFees > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">HOA Fees</span>
                              <span className="font-semibold">{formatCurrency(analysis.expenses.hoaFees)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Property Management</span>
                            <span className="font-semibold">{formatCurrency(analysis.expenses.propertyManagement)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Investment Metrics Explained */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Percent className="w-5 h-5" />
                        Understanding the Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Cap Rate (Capitalization Rate)</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Measures the property's potential return based on income. Formula: (Net Operating Income / Purchase Price) × 100
                        </p>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Your Cap Rate</span>
                            <Badge>{analysis.capRate}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {analysis.capRate >= 8 ? '✓ Excellent - Strong investment' :
                             analysis.capRate >= 6 ? '✓ Good - Solid investment' :
                             analysis.capRate >= 4 ? '⚠ Fair - Consider carefully' :
                             '✗ Poor - May not be profitable'}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">Cash-on-Cash Return</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Annual return on your actual cash invested. Formula: (Annual Cash Flow / Total Cash Invested) × 100
                        </p>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Your CoC Return</span>
                            <Badge>{analysis.cashOnCashReturn}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total cash invested: {formatCurrency(analysis.totalCashInvested)}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-2">Break-Even Occupancy</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Minimum occupancy rate needed to cover all expenses
                        </p>
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Your Break-Even</span>
                            <Badge>{analysis.breakEvenOccupancy}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {analysis.breakEvenOccupancy <= 70 ? '✓ Low risk - Easy to maintain' :
                             analysis.breakEvenOccupancy <= 85 ? '⚠ Moderate risk' :
                             '✗ High risk - Tight margins'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Investment Tips */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Investment Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Aim for cap rates above 6% for good cash flow properties</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Target cash-on-cash returns of 8-12% for strong investments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Keep break-even occupancy below 85% to minimize risk</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Budget 1% of property value annually for maintenance</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Factor in property appreciation for long-term wealth building</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Consider tax benefits: depreciation, mortgage interest deductions</span>
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
