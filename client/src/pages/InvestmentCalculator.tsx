import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  Download,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function InvestmentCalculator() {
  // Property Details
  const [purchasePrice, setPurchasePrice] = useState(100000000);
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(15);
  const [loanTerm, setLoanTerm] = useState(20);

  // Rental Income
  const [monthlyRent, setMonthlyRent] = useState(500000);
  const [vacancyRate, setVacancyRate] = useState(5);
  const [annualRentIncrease, setAnnualRentIncrease] = useState(3);

  // Operating Expenses
  const [propertyTax, setPropertyTax] = useState(200000);
  const [insurance, setInsurance] = useState(150000);
  const [maintenance, setMaintenance] = useState(300000);
  const [hoaFees, setHoaFees] = useState(0);
  const [utilities, setUtilities] = useState(100000);
  const [propertyManagement, setPropertyManagement] = useState(10);

  // Appreciation
  const [annualAppreciation, setAnnualAppreciation] = useState(5);

  // Calculations
  const downPaymentAmount = (purchasePrice * downPayment) / 100;
  const loanAmount = purchasePrice - downPaymentAmount;
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;
  const monthlyMortgage =
    (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  const effectiveMonthlyRent = monthlyRent * (1 - vacancyRate / 100);
  const annualGrossRent = effectiveMonthlyRent * 12;
  const propertyManagementFee = (annualGrossRent * propertyManagement) / 100;
  const annualOperatingExpenses =
    propertyTax + insurance + maintenance + hoaFees + utilities + propertyManagementFee;
  const netOperatingIncome = annualGrossRent - annualOperatingExpenses;
  const annualMortgage = monthlyMortgage * 12;
  const annualCashFlow = netOperatingIncome - annualMortgage;
  const monthlyCashFlow = annualCashFlow / 12;

  // ROI Metrics
  const capRate = (netOperatingIncome / purchasePrice) * 100;
  const cashOnCashReturn = (annualCashFlow / downPaymentAmount) * 100;
  const totalInvestment = downPaymentAmount + 2000000; // Assuming 2M closing costs
  const roi = (annualCashFlow / totalInvestment) * 100;

  // 5-Year Projection
  const projectedValue5Years = purchasePrice * Math.pow(1 + annualAppreciation / 100, 5);
  const totalAppreciation = projectedValue5Years - purchasePrice;
  const totalCashFlow5Years = annualCashFlow * 5;
  const totalReturn5Years = totalAppreciation + totalCashFlow5Years;
  const totalROI5Years = (totalReturn5Years / totalInvestment) * 100;

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Calculator className="h-8 w-8 text-primary" />
                Investment Calculator
              </h1>
              <p className="text-muted-foreground">
                Analyze property investment potential and ROI
              </p>
            </div>
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Purchase Price (₦)</Label>
                  <Input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Down Payment (%)</Label>
                  <Input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    ₦{downPaymentAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Loan Term (years)</Label>
                  <Input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rental Income</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Monthly Rent (₦)</Label>
                  <Input
                    type="number"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Vacancy Rate (%)</Label>
                  <Input
                    type="number"
                    value={vacancyRate}
                    onChange={(e) => setVacancyRate(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Annual Rent Increase (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={annualRentIncrease}
                    onChange={(e) => setAnnualRentIncrease(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Operating Expenses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Property Tax (Annual, ₦)</Label>
                  <Input
                    type="number"
                    value={propertyTax}
                    onChange={(e) => setPropertyTax(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Insurance (Annual, ₦)</Label>
                  <Input
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Maintenance (Annual, ₦)</Label>
                  <Input
                    type="number"
                    value={maintenance}
                    onChange={(e) => setMaintenance(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>HOA Fees (Annual, ₦)</Label>
                  <Input
                    type="number"
                    value={hoaFees}
                    onChange={(e) => setHoaFees(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Utilities (Annual, ₦)</Label>
                  <Input
                    type="number"
                    value={utilities}
                    onChange={(e) => setUtilities(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Property Management (%)</Label>
                  <Input
                    type="number"
                    value={propertyManagement}
                    onChange={(e) => setPropertyManagement(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appreciation</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Annual Appreciation (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={annualAppreciation}
                    onChange={(e) => setAnnualAppreciation(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Monthly Cash Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    ₦{monthlyCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <Badge
                    variant={monthlyCashFlow > 0 ? 'default' : 'destructive'}
                    className="mt-2"
                  >
                    {monthlyCashFlow > 0 ? 'Positive' : 'Negative'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Cap Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{capRate.toFixed(2)}%</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {capRate > 8 ? 'Excellent' : capRate > 5 ? 'Good' : 'Fair'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Cash-on-Cash Return
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{cashOnCashReturn.toFixed(2)}%</p>
                  <p className="text-sm text-muted-foreground mt-2">Annual return on investment</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cash Flow Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="monthly">
                  <TabsList className="mb-4">
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="annual">Annual</TabsTrigger>
                  </TabsList>

                  <TabsContent value="monthly" className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Rental Income</span>
                      <span className="font-semibold">
                        ₦{effectiveMonthlyRent.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Mortgage Payment</span>
                      <span className="font-semibold text-destructive">
                        -₦{monthlyMortgage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Operating Expenses</span>
                      <span className="font-semibold text-destructive">
                        -₦
                        {(annualOperatingExpenses / 12).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t-2 font-bold text-lg">
                      <span>Net Cash Flow</span>
                      <span className={monthlyCashFlow > 0 ? 'text-primary' : 'text-destructive'}>
                        ₦
                        {monthlyCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </TabsContent>

                  <TabsContent value="annual" className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Gross Rental Income</span>
                      <span className="font-semibold">₦{annualGrossRent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Operating Expenses</span>
                      <span className="font-semibold text-destructive">
                        -₦{annualOperatingExpenses.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Net Operating Income</span>
                      <span className="font-semibold">₦{netOperatingIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span>Mortgage Payments</span>
                      <span className="font-semibold text-destructive">
                        -₦{annualMortgage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t-2 font-bold text-lg">
                      <span>Annual Cash Flow</span>
                      <span className={annualCashFlow > 0 ? 'text-primary' : 'text-destructive'}>
                        ₦
                        {annualCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* 5-Year Projection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  5-Year Investment Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Property Value</p>
                      <p className="text-2xl font-bold">
                        ₦{(projectedValue5Years / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-sm text-muted-foreground">
                        +₦{(totalAppreciation / 1000000).toFixed(1)}M appreciation
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Cash Flow</p>
                      <p className="text-2xl font-bold">
                        ₦{(totalCashFlow5Years / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-sm text-muted-foreground">Over 5 years</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold">Total Return</span>
                      <span className="text-2xl font-bold text-primary">
                        ₦{(totalReturn5Years / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total ROI</span>
                      <Badge variant="default" className="text-lg">
                        {totalROI5Years.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operating Expenses Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Operating Expenses Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Property Tax', value: propertyTax },
                    { name: 'Insurance', value: insurance },
                    { name: 'Maintenance', value: maintenance },
                    { name: 'HOA Fees', value: hoaFees },
                    { name: 'Utilities', value: utilities },
                    { name: 'Property Management', value: propertyManagementFee },
                  ].map((expense) => (
                    <div key={expense.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{expense.name}</span>
                        <span className="text-sm font-semibold">
                          ₦{expense.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(expense.value / annualOperatingExpenses) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
