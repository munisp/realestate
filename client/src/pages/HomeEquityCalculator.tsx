import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { APP_TITLE } from "@/const";
import { 
  Building2, Calculator, DollarSign, TrendingUp, 
  Home, Percent, Info, CheckCircle2 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function HomeEquityCalculator() {
  const [originalPrice, setOriginalPrice] = useState("300000");
  const [downPayment, setDownPayment] = useState("60000");
  const [purchaseDate, setPurchaseDate] = useState("2020-01-01");
  const [monthlyPayment, setMonthlyPayment] = useState("1500");
  const [currentValue, setCurrentValue] = useState("350000");
  const [interestRate, setInterestRate] = useState("6.5");

  const [calculated, setCalculated] = useState(false);

  const handleCalculate = () => {
    setCalculated(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate values
  const price = parseFloat(originalPrice);
  const down = parseFloat(downPayment);
  const value = parseFloat(currentValue);
  const payment = parseFloat(monthlyPayment);
  const rate = parseFloat(interestRate);

  const originalLoan = price - down;
  const purchaseYear = new Date(purchaseDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsOwned = currentYear - purchaseYear;
  const monthsOwned = yearsOwned * 12;

  // Simplified calculation - in reality would need amortization schedule
  const monthlyRate = rate / 100 / 12;
  const totalPayments = payment * monthsOwned;
  const interestPaid = totalPayments * 0.7; // Rough estimate
  const principalPaid = totalPayments - interestPaid;
  const remainingBalance = Math.max(0, originalLoan - principalPaid);

  const currentEquity = value - remainingBalance;
  const equityPercentage = (currentEquity / value) * 100;
  const equityGained = currentEquity - down;
  const appreciation = value - price;

  // Borrowing capacity (typically 80% LTV minus remaining balance)
  const maxLoanAmount = value * 0.8;
  const availableEquity = Math.max(0, maxLoanAmount - remainingBalance);
  const helocLimit = availableEquity;
  const homeEquityLoanLimit = availableEquity;

  // Chart data
  const chartData = [];
  for (let year = 0; year <= yearsOwned; year++) {
    const yearlyPrincipal = (principalPaid / yearsOwned) * year;
    const yearlyValue = price + (appreciation / yearsOwned) * year;
    const yearlyBalance = originalLoan - yearlyPrincipal;
    const yearlyEquity = yearlyValue - yearlyBalance;

    chartData.push({
      year: purchaseYear + year,
      equity: Math.round(yearlyEquity),
      balance: Math.round(yearlyBalance),
      value: Math.round(yearlyValue),
    });
  }

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
            <h1 className="text-3xl font-bold mb-2">Home Equity Calculator</h1>
            <p className="text-muted-foreground">
              Calculate your current home equity and borrowing capacity
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="originalPrice">Original Purchase Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="originalPrice"
                        type="number"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
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
                      {((down / price) * 100).toFixed(1)}% down payment
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Owned for {yearsOwned} years
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="monthlyPayment">Monthly Mortgage Payment</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="monthlyPayment"
                        type="number"
                        value={monthlyPayment}
                        onChange={(e) => setMonthlyPayment(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Principal & interest only
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

                  <Separator />

                  <div>
                    <Label htmlFor="currentValue">Current Market Value</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="currentValue"
                        type="number"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {appreciation >= 0 ? '+' : ''}{formatCurrency(appreciation)} from purchase
                    </p>
                  </div>

                  <Button
                    onClick={handleCalculate}
                    className="w-full"
                    size="lg"
                  >
                    Calculate Equity
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {calculated && (
                <>
                  {/* Current Equity */}
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-primary" />
                        Current Home Equity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <p className="text-5xl font-bold text-primary mb-2">
                          {formatCurrency(currentEquity)}
                        </p>
                        <p className="text-muted-foreground">
                          {equityPercentage.toFixed(1)}% of home value
                        </p>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span>Equity Built</span>
                          <Progress value={equityPercentage} className="w-1/2" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Equity Gained</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(equityGained)}
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Appreciation</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(appreciation)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Equity Breakdown */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Current Home Value
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-blue-600">
                          {formatCurrency(value)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Remaining Balance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-orange-600">
                          {formatCurrency(remainingBalance)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {((remainingBalance / value) * 100).toFixed(1)}% LTV
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Principal Paid
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-600">
                          {formatCurrency(principalPaid)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Over {yearsOwned} years
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Equity Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Equity Growth Over Time
                      </CardTitle>
                      <CardDescription>
                        Visualization of your equity building over the years
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis 
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ color: '#000' }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            name="Home Value"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="equity" 
                            stroke="#10b981" 
                            name="Your Equity"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#f59e0b" 
                            name="Loan Balance"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Borrowing Capacity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        Borrowing Capacity
                      </CardTitle>
                      <CardDescription>
                        How much you can borrow against your home equity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Available Equity</span>
                          <Badge variant="secondary">Up to 80% LTV</Badge>
                        </div>
                        <p className="text-4xl font-bold text-purple-600">
                          {formatCurrency(availableEquity)}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <Percent className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">HELOC</h4>
                              <p className="text-xs text-muted-foreground">Home Equity Line of Credit</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-blue-600 mb-2">
                            {formatCurrency(helocLimit)}
                          </p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span>Revolving credit line</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span>Variable interest rate</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span>Draw period + repayment</span>
                            </li>
                          </ul>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                              <Home className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">Home Equity Loan</h4>
                              <p className="text-xs text-muted-foreground">Fixed-Rate Loan</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-green-600 mb-2">
                            {formatCurrency(homeEquityLoanLimit)}
                          </p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span>Lump sum payment</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span>Fixed interest rate</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span>Predictable payments</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-semibold mb-1">Important Notes</p>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• Most lenders allow borrowing up to 80% of home value minus remaining mortgage</li>
                              <li>• Your actual borrowing capacity depends on credit score, income, and debt-to-income ratio</li>
                              <li>• Both options use your home as collateral - failure to repay could result in foreclosure</li>
                              <li>• Interest may be tax-deductible if used for home improvements (consult tax advisor)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Common Uses */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Common Uses for Home Equity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-green-600">Good Uses</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span><strong>Home Improvements:</strong> Increase property value</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span><strong>Debt Consolidation:</strong> Pay off high-interest debt</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span><strong>Education:</strong> Invest in your future</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                              <span><strong>Emergency Fund:</strong> HELOC as safety net</span>
                            </li>
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-red-600">Avoid Using For</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 mt-0.5">✗</span>
                              <span><strong>Vacations:</strong> Depreciating expense</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 mt-0.5">✗</span>
                              <span><strong>Daily Expenses:</strong> Living beyond means</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 mt-0.5">✗</span>
                              <span><strong>Risky Investments:</strong> Could lose your home</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-red-600 mt-0.5">✗</span>
                              <span><strong>Luxury Items:</strong> Cars, boats, jewelry</span>
                            </li>
                          </ul>
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
