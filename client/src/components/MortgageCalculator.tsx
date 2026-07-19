import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator, TrendingUp, Home, Percent } from "lucide-react";

interface MortgageCalculatorProps {
  propertyPrice: number;
}

export function MortgageCalculator({ propertyPrice }: MortgageCalculatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.2);
  const [insuranceAnnual, setInsuranceAnnual] = useState(1200);
  const [showAmortization, setShowAmortization] = useState(false);

  const downPayment = (propertyPrice * downPaymentPercent) / 100;
  const loanAmount = propertyPrice - downPayment;
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;

  // Calculate monthly mortgage payment (principal + interest)
  const monthlyPayment =
    loanAmount *
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  // Calculate monthly property tax
  const monthlyPropertyTax = (propertyPrice * (propertyTaxRate / 100)) / 12;

  // Calculate monthly insurance
  const monthlyInsurance = insuranceAnnual / 12;

  // Total monthly payment
  const totalMonthlyPayment = monthlyPayment + monthlyPropertyTax + monthlyInsurance;

  // Total cost over loan term
  const totalPaid = monthlyPayment * numberOfPayments + downPayment;
  const totalInterest = totalPaid - propertyPrice;

  // Generate amortization schedule (first 12 months)
  const generateAmortizationSchedule = () => {
    const schedule = [];
    let balance = loanAmount;

    for (let month = 1; month <= Math.min(12, numberOfPayments); month++) {
      const interestPayment = balance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;

      schedule.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
      });
    }

    return schedule;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Mortgage Calculator
        </CardTitle>
        <CardDescription>
          Estimate your monthly mortgage payment and total costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property Price */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Property Price
          </Label>
          <div className="text-2xl font-bold text-primary">
            ₦{propertyPrice.toLocaleString()}
          </div>
        </div>

        {/* Down Payment */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Down Payment: {downPaymentPercent}%</Label>
            <span className="text-sm font-semibold">
              ₦{downPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <Slider
            value={[downPaymentPercent]}
            onValueChange={([value]) => setDownPaymentPercent(value)}
            min={5}
            max={50}
            step={5}
          />
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Interest Rate
            </Label>
            <span className="text-sm font-semibold">{interestRate}%</span>
          </div>
          <Slider
            value={[interestRate]}
            onValueChange={([value]) => setInterestRate(value)}
            min={3}
            max={15}
            step={0.25}
          />
        </div>

        {/* Loan Term */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Loan Term</Label>
            <span className="text-sm font-semibold">{loanTermYears} years</span>
          </div>
          <Slider
            value={[loanTermYears]}
            onValueChange={([value]) => setLoanTermYears(value)}
            min={10}
            max={30}
            step={5}
          />
        </div>

        {/* Property Tax Rate */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Property Tax Rate (Annual)</Label>
            <span className="text-sm font-semibold">{propertyTaxRate}%</span>
          </div>
          <Slider
            value={[propertyTaxRate]}
            onValueChange={([value]) => setPropertyTaxRate(value)}
            min={0.5}
            max={3}
            step={0.1}
          />
        </div>

        {/* Insurance */}
        <div className="space-y-2">
          <Label>Annual Insurance</Label>
          <Input
            type="number"
            value={insuranceAnnual}
            onChange={(e) => setInsuranceAnnual(parseFloat(e.target.value) || 0)}
            placeholder="Annual insurance cost"
          />
        </div>

        {/* Results */}
        <div className="border-t pt-6 space-y-4">
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">
              Estimated Monthly Payment
            </div>
            <div className="text-3xl font-bold text-primary">
              ₦{totalMonthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Principal & Interest</div>
              <div className="font-semibold">
                ₦{monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Property Tax</div>
              <div className="font-semibold">
                ₦{monthlyPropertyTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Insurance</div>
              <div className="font-semibold">
                ₦{monthlyInsurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Loan Amount</div>
              <div className="font-semibold">
                ₦{loanAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Interest Paid</span>
              <span className="font-semibold text-destructive">
                ₦{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="font-semibold">
                ₦{totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Amortization Schedule */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAmortization(!showAmortization)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {showAmortization ? "Hide" : "Show"} Amortization Schedule
          </Button>

          {showAmortization && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generateAmortizationSchedule().map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right">
                        ₦{row.payment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        ₦{row.principal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        ₦{row.interest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        ₦{row.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 bg-muted text-sm text-muted-foreground text-center">
                Showing first 12 months of {loanTermYears}-year loan
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
