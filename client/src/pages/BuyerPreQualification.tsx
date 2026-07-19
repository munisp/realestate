import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function BuyerPreQualification() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    budget: "",
    downPayment: "",
    creditScore: "",
    employment: "",
    monthlyDebt: "",
  });

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const maxPrice = parseInt(formData.budget);
    setLocation(`/search?maxPrice=${maxPrice}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background py-12">
      <div className="container max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Get Pre-Qualified</h1>
          <p className="text-muted-foreground">Answer a few questions to see properties you can afford</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Step {step} of {totalSteps}</CardTitle>
              <Badge variant="secondary">{Math.round(progress)}% Complete</Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">What's your budget?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    How much are you looking to spend on a home?
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Budget</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 500000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Down Payment</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    How much can you put down?
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Down Payment Amount</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100000"
                    value={formData.downPayment}
                    onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                  />
                  {formData.budget && formData.downPayment && (
                    <p className="text-sm text-muted-foreground">
                      That's {((parseInt(formData.downPayment) / parseInt(formData.budget)) * 100).toFixed(1)}% down
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Credit Score</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    What's your approximate credit score?
                  </p>
                </div>
                <RadioGroup value={formData.creditScore} onValueChange={(v) => setFormData({ ...formData, creditScore: v })}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="excellent" id="excellent" />
                    <Label htmlFor="excellent" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Excellent (740+)</div>
                      <div className="text-sm text-muted-foreground">Best rates available</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="good" id="good" />
                    <Label htmlFor="good" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Good (670-739)</div>
                      <div className="text-sm text-muted-foreground">Competitive rates</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="fair" id="fair" />
                    <Label htmlFor="fair" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Fair (580-669)</div>
                      <div className="text-sm text-muted-foreground">Higher rates</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Employment Status</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    What's your current employment situation?
                  </p>
                </div>
                <RadioGroup value={formData.employment} onValueChange={(v) => setFormData({ ...formData, employment: v })}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="fulltime" id="fulltime" />
                    <Label htmlFor="fulltime" className="flex-1 cursor-pointer">Full-Time Employment</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="selfemployed" id="selfemployed" />
                    <Label htmlFor="selfemployed" className="flex-1 cursor-pointer">Self-Employed</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="parttime" id="parttime" />
                    <Label htmlFor="parttime" className="flex-1 cursor-pointer">Part-Time</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Monthly Debt</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Total monthly debt payments (car, credit cards, student loans)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Debt Payments</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1500"
                    value={formData.monthlyDebt}
                    onChange={(e) => setFormData({ ...formData, monthlyDebt: e.target.value })}
                  />
                </div>
                <Card className="bg-green-50 dark:bg-green-950">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-1">You're pre-qualified!</h4>
                        <p className="text-sm text-muted-foreground">
                          Based on your responses, you can afford properties up to ${parseInt(formData.budget || "0").toLocaleString()}.
                          Click "View Properties" to see homes in your range.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} disabled={step === 1}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext}>
                {step === totalSteps ? (
                  <>
                    <Home className="w-4 h-4 mr-2" />
                    View Properties
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
