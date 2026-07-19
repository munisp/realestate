import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Calculator, DollarSign, Home, 
  TrendingUp, TrendingDown, BarChart3 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
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

export default function RentVsBuy() {
  const [homePrice, setHomePrice] = useState("500000");
  const [downPayment, setDownPayment] = useState("100000");
  const [interestRate, setInterestRate] = useState("6.5");
  const [monthlyRent, setMonthlyRent] = useState("2500");
  const [rentIncrease, setRentIncrease] = useState("3");
  const [homeAppreciation, setHomeAppreciation] = useState("3");
  const [yearsToAnalyze, setYearsToAnalyze] = useState("5");
  
  const [comparison, setComparison] = useState<any>(null);

  const calculateMutation = trpc.rentVsBuy.calculate.useMutation({
    onSuccess: (data) => {
      setComparison(data);
      toast.success("Comparison calculated!");
    },
    onError: () => {
      toast.error("Failed to calculate comparison");
    },
  });

  const handleCalculate = async () => {
    const price = parseFloat(homePrice);
    const down = parseFloat(downPayment);
    const rate = parseFloat(interestRate);
    const rent = parseFloat(monthlyRent);
    const years = parseInt(yearsToAnalyze);
    
    if (!price || !down || !rate || !rent || !years) {
      toast.error("Please fill in all fields");
      return;
    }

    if (down > price) {
      toast.error("Down payment cannot exceed home price");
      return;
    }

    try {
      await calculateMutation.mutateAsync({
        homePrice: price,
        downPayment: down,
        interestRate: rate,
        monthlyRent: rent,
        rentIncreaseRate: parseFloat(rentIncrease),
        homeAppreciationRate: parseFloat(homeAppreciation),
        yearsToAnalyze: years,
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
            <h1 className="text-3xl font-bold mb-2">Rent vs Buy Calculator</h1>
            <p className="text-muted-foreground">
              Compare the total costs of renting versus buying over time to make an informed decision
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Your Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="homePrice">Home Purchase Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="homePrice"
                        type="number"
                        value={homePrice}
                        onChange={(e) => setHomePrice(e.target.value)}
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
                      {((parseFloat(downPayment) / parseFloat(homePrice)) * 100).toFixed(1)}% of home price
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="interestRate">Mortgage Interest Rate (%)</Label>
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
                    <Label htmlFor="rentIncrease">Annual Rent Increase (%)</Label>
                    <Input
                      id="rentIncrease"
                      type="number"
                      step="0.1"
                      value={rentIncrease}
                      onChange={(e) => setRentIncrease(e.target.value)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="homeAppreciation">Home Appreciation Rate (%)</Label>
                    <Input
                      id="homeAppreciation"
                      type="number"
                      step="0.1"
                      value={homeAppreciation}
                      onChange={(e) => setHomeAppreciation(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="yearsToAnalyze">Years to Analyze</Label>
                    <Input
                      id="yearsToAnalyze"
                      type="number"
                      min="1"
                      max="30"
                      value={yearsToAnalyze}
                      onChange={(e) => setYearsToAnalyze(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleCalculate}
                    disabled={calculateMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {calculateMutation.isPending ? "Calculating..." : "Calculate Comparison"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {comparison && (
                <>
                  {/* Winner Card */}
                  <Card className={`border-2 ${comparison.recommendation === 'buy' ? 'border-green-500' : 'border-blue-500'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {comparison.recommendation === 'buy' ? (
                          <Home className="w-5 h-5 text-green-600" />
                        ) : (
                          <Building2 className="w-5 h-5 text-blue-600" />
                        )}
                        Recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <Badge className="text-lg px-4 py-2 mb-4" variant={comparison.recommendation === 'buy' ? 'default' : 'secondary'}>
                          {comparison.recommendation === 'buy' ? '🏡 Buying is Better' : '🏢 Renting is Better'}
                        </Badge>
                        <p className="text-muted-foreground">
                          {comparison.recommendation === 'buy' 
                            ? `You'll save ${formatCurrency(comparison.savings)} over ${yearsToAnalyze} years by buying`
                            : `You'll save ${formatCurrency(comparison.savings)} over ${yearsToAnalyze} years by renting`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cost Comparison */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Buying Costs */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Home className="w-5 h-5 text-green-600" />
                          Buying Costs
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-center mb-4">
                          <p className="text-3xl font-bold text-green-600">
                            {formatCurrency(comparison.buying.totalCost)}
                          </p>
                          <p className="text-sm text-muted-foreground">Total cost over {yearsToAnalyze} years</p>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Down Payment</span>
                            <span className="font-semibold">{formatCurrency(comparison.buying.downPayment)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Mortgage Payments</span>
                            <span className="font-semibold">{formatCurrency(comparison.buying.mortgagePayments)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Property Taxes</span>
                            <span className="font-semibold">{formatCurrency(comparison.buying.propertyTaxes)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Insurance</span>
                            <span className="font-semibold">{formatCurrency(comparison.buying.insurance)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Maintenance</span>
                            <span className="font-semibold">{formatCurrency(comparison.buying.maintenance)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Closing Costs</span>
                            <span className="font-semibold">{formatCurrency(comparison.buying.closingCosts)}</span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between text-sm text-green-600">
                            <span className="font-semibold">Home Equity Gained</span>
                            <span className="font-bold">-{formatCurrency(comparison.buying.equityGained)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-green-600">
                            <span className="font-semibold">Tax Deductions</span>
                            <span className="font-bold">-{formatCurrency(comparison.buying.taxDeductions)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Renting Costs */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          Renting Costs
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-center mb-4">
                          <p className="text-3xl font-bold text-blue-600">
                            {formatCurrency(comparison.renting.totalCost)}
                          </p>
                          <p className="text-sm text-muted-foreground">Total cost over {yearsToAnalyze} years</p>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Rent Paid</span>
                            <span className="font-semibold">{formatCurrency(comparison.renting.totalRent)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Renter's Insurance</span>
                            <span className="font-semibold">{formatCurrency(comparison.renting.insurance)}</span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between text-sm text-blue-600">
                            <span className="font-semibold">Investment Returns</span>
                            <span className="font-bold">-{formatCurrency(comparison.renting.investmentReturns)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Assuming down payment invested at {comparison.renting.investmentRate}% return
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost Over Time Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Cumulative Cost Over Time
                      </CardTitle>
                      <CardDescription>
                        Compare how costs accumulate year by year
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={comparison.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                          <YAxis 
                            label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value: any) => formatCurrency(value)}
                            labelFormatter={(label) => `Year ${label}`}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="buying" stroke="#16a34a" strokeWidth={2} name="Buying" />
                          <Line type="monotone" dataKey="renting" stroke="#2563eb" strokeWidth={2} name="Renting" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Key Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {comparison.insights.map((insight: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
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
