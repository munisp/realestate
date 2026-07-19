// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2, ArrowRight, ArrowLeft, FileText, DollarSign, Briefcase, Home } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function MortgagePreApproval() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [loanAmount, setLoanAmount] = useState("");
  const [propertyPrice, setPropertyPrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employmentYears, setEmploymentYears] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [monthlyDebts, setMonthlyDebts] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const submitApplicationMutation = trpc.mortgage.submitPreApproval.useMutation({
    onSuccess: (data) => {
      toast.success("Pre-approval application submitted successfully!");
      setCurrentStep(5); // Move to success step
    },
    onError: () => {
      toast.error("Failed to submit application");
    },
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!loanAmount || !propertyPrice || !downPayment) {
        toast.error("Please fill in all required fields");
        return;
      }
    } else if (currentStep === 2) {
      if (!annualIncome || !employmentStatus || !employmentYears) {
        toast.error("Please fill in all required fields");
        return;
      }
    } else if (currentStep === 3) {
      if (!creditScore || !monthlyDebts) {
        toast.error("Please fill in all required fields");
        return;
      }
    } else if (currentStep === 4) {
      if (!firstName || !lastName || !email || !phone) {
        toast.error("Please fill in all required fields");
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await submitApplicationMutation.mutateAsync({
        loanAmount: parseFloat(loanAmount),
        propertyPrice: parseFloat(propertyPrice),
        downPayment: parseFloat(downPayment),
        annualIncome: parseFloat(annualIncome),
        employmentStatus,
        employmentYears: parseInt(employmentYears),
        creditScore: parseInt(creditScore),
        monthlyDebts: parseFloat(monthlyDebts),
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to apply for mortgage pre-approval
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (currentStep === 5) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-8 w-8 text-primary" />
              <span>{APP_TITLE}</span>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Application Submitted!</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Your mortgage pre-approval application has been received and is being reviewed.
              </p>
            </div>

            <Card className="text-left mb-8">
              <CardHeader>
                <CardTitle>What Happens Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Document Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      Our lending partners will review your application and may request additional documents.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Credit Check</h3>
                    <p className="text-sm text-muted-foreground">
                      A soft credit inquiry will be performed (won't affect your credit score).
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Pre-Approval Letter</h3>
                    <p className="text-sm text-muted-foreground">
                      You'll receive your pre-approval letter within 24-48 hours via email.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/properties">Browse Properties</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">Mortgage Pre-Approval</h1>
              <Badge variant="secondary">
                Step {currentStep} of {totalSteps}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Loan Details</span>
              <span>Employment</span>
              <span>Financial</span>
              <span>Personal Info</span>
            </div>
          </div>

          {/* Step 1: Loan Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Loan Details
                </CardTitle>
                <CardDescription>
                  Tell us about the property and loan amount you're seeking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="propertyPrice">Property Purchase Price</Label>
                  <Input
                    id="propertyPrice"
                    type="number"
                    placeholder="e.g., 500000"
                    value={propertyPrice}
                    onChange={(e) => setPropertyPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="downPayment">Down Payment Amount</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    placeholder="e.g., 100000"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                  {propertyPrice && downPayment && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {((parseFloat(downPayment) / parseFloat(propertyPrice)) * 100).toFixed(1)}% down payment
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="loanAmount">Loan Amount Requested</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    placeholder="e.g., 400000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                  {propertyPrice && downPayment && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Calculated: ${(parseFloat(propertyPrice) - parseFloat(downPayment)).toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Employment Information */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Employment Information
                </CardTitle>
                <CardDescription>
                  Provide details about your current employment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="annualIncome">Annual Gross Income</Label>
                  <Input
                    id="annualIncome"
                    type="number"
                    placeholder="e.g., 80000"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="employmentStatus">Employment Status</Label>
                  <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                    <SelectTrigger id="employmentStatus">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-Time Employee</SelectItem>
                      <SelectItem value="part_time">Part-Time Employee</SelectItem>
                      <SelectItem value="self_employed">Self-Employed</SelectItem>
                      <SelectItem value="contractor">Independent Contractor</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employmentYears">Years at Current Job</Label>
                  <Input
                    id="employmentYears"
                    type="number"
                    placeholder="e.g., 5"
                    value={employmentYears}
                    onChange={(e) => setEmploymentYears(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Financial Information */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Information
                </CardTitle>
                <CardDescription>
                  Help us understand your financial situation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="creditScore">Credit Score (Estimated)</Label>
                  <Select value={creditScore} onValueChange={setCreditScore}>
                    <SelectTrigger id="creditScore">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="750">Excellent (750+)</SelectItem>
                      <SelectItem value="700">Good (700-749)</SelectItem>
                      <SelectItem value="650">Fair (650-699)</SelectItem>
                      <SelectItem value="600">Poor (600-649)</SelectItem>
                      <SelectItem value="550">Very Poor (Below 600)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monthlyDebts">Total Monthly Debt Payments</Label>
                  <Input
                    id="monthlyDebts"
                    type="number"
                    placeholder="e.g., 1500"
                    value={monthlyDebts}
                    onChange={(e) => setMonthlyDebts(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Include car loans, student loans, credit cards, etc.
                  </p>
                </div>
                {annualIncome && monthlyDebts && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium mb-1">Debt-to-Income Ratio</p>
                    <p className="text-2xl font-bold text-primary">
                      {((parseFloat(monthlyDebts) / (parseFloat(annualIncome) / 12)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lenders prefer DTI below 43%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Personal Information */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Confirm your contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Current Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="San Francisco"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="CA"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="94102"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={submitApplicationMutation.isPending}
            >
              {currentStep === totalSteps ? (
                submitApplicationMutation.isPending ? (
                  "Submitting..."
                ) : (
                  "Submit Application"
                )
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
