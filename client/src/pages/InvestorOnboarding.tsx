import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Check, TrendingUp, DollarSign, MapPin, Target } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function InvestorOnboarding() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  // Form state
  const [minBudget, setMinBudget] = useState(100000);
  const [maxBudget, setMaxBudget] = useState(500000);
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [investmentHorizon, setInvestmentHorizon] = useState("medium");
  const [minROI, setMinROI] = useState(8);
  const [preferredNeighborhoods, setPreferredNeighborhoods] = useState<string[]>([]);

  const createProfileMutation = trpc.investorProfile.create.useMutation({
    onSuccess: () => {
      toast.success("Investor profile created successfully!");
      setLocation("/investment-dashboard");
    },
    onError: (error) => {
      toast.error(`Failed to create profile: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to continue");
      return;
    }

    createProfileMutation.mutate({
      minBudget,
      maxBudget,
      preferredCities,
      propertyTypes,
      riskTolerance,
      investmentHorizon,
      minROI,
      preferredNeighborhoods,
    });
  };

  const toggleCity = (city: string) => {
    setPreferredCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const togglePropertyType = (type: string) => {
    setPropertyTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleNeighborhood = (neighborhood: string) => {
    setPreferredNeighborhoods(prev =>
      prev.includes(neighborhood) ? prev.filter(n => n !== neighborhood) : [...prev, neighborhood]
    );
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Investor Onboarding</h1>
          <p className="text-muted-foreground">
            Let's customize your investment experience
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step 1: Budget & Investment Goals */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Budget & Investment Goals</CardTitle>
                  <CardDescription>Define your investment budget and return expectations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Budget Range</Label>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Minimum Budget</span>
                      <span className="font-semibold">${minBudget.toLocaleString()}</span>
                    </div>
                    <Slider
                      value={[minBudget]}
                      onValueChange={([value]) => setMinBudget(value)}
                      min={50000}
                      max={5000000}
                      step={10000}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Maximum Budget</span>
                      <span className="font-semibold">${maxBudget.toLocaleString()}</span>
                    </div>
                    <Slider
                      value={[maxBudget]}
                      onValueChange={([value]) => setMaxBudget(value)}
                      min={100000}
                      max={10000000}
                      step={10000}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Expected ROI (%)</Label>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Annual Return</span>
                  <span className="font-semibold">{minROI}%</span>
                </div>
                <Slider
                  value={[minROI]}
                  onValueChange={([value]) => setMinROI(value)}
                  min={5}
                  max={25}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <Label>Risk Tolerance</Label>
                <Select value={riskTolerance} onValueChange={setRiskTolerance}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative - Stable, low-risk investments</SelectItem>
                    <SelectItem value="moderate">Moderate - Balanced risk and return</SelectItem>
                    <SelectItem value="aggressive">Aggressive - High-risk, high-reward</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Investment Horizon</Label>
                <Select value={investmentHorizon} onValueChange={setInvestmentHorizon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short-term (1-3 years)</SelectItem>
                    <SelectItem value="medium">Medium-term (3-7 years)</SelectItem>
                    <SelectItem value="long">Long-term (7+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Location Preferences */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Location Preferences</CardTitle>
                  <CardDescription>Select cities and neighborhoods you're interested in</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Preferred Cities</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "New York", "Los Angeles", "Miami"].map((city) => (
                    <div
                      key={city}
                      onClick={() => toggleCity(city)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        preferredCities.includes(city)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{city}</span>
                        {preferredCities.includes(city) && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Preferred Neighborhoods (Lagos)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["Ikoyi", "Victoria Island", "Lekki Phase 1", "Banana Island", "Ikeja GRA", "Yaba", "Surulere", "Ajah"].map((neighborhood) => (
                    <div
                      key={neighborhood}
                      onClick={() => toggleNeighborhood(neighborhood)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        preferredNeighborhoods.includes(neighborhood)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{neighborhood}</span>
                        {preferredNeighborhoods.includes(neighborhood) && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Property Preferences */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Property Preferences</CardTitle>
                  <CardDescription>Select property types that match your investment strategy</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Property Types</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "single_family", label: "Single Family", desc: "Standalone homes" },
                    { value: "condo", label: "Condo", desc: "Apartment units" },
                    { value: "townhouse", label: "Townhouse", desc: "Multi-floor attached" },
                    { value: "multi_family", label: "Multi-Family", desc: "2-4 units" },
                    { value: "commercial", label: "Commercial", desc: "Business properties" },
                    { value: "land", label: "Land", desc: "Vacant lots" },
                  ].map((type) => (
                    <div
                      key={type.value}
                      onClick={() => togglePropertyType(type.value)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        propertyTypes.includes(type.value)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{type.label}</span>
                        {propertyTypes.includes(type.value) && <Check className="h-5 w-5 text-primary" />}
                      </div>
                      <span className="text-sm text-muted-foreground">{type.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Review Your Profile</CardTitle>
                  <CardDescription>Confirm your investment preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Budget & Goals</h3>
                  <div className="space-y-1 text-sm">
                    <p>Budget: ${minBudget.toLocaleString()} - ${maxBudget.toLocaleString()}</p>
                    <p>Minimum ROI: {minROI}%</p>
                    <p>Risk Tolerance: {riskTolerance.charAt(0).toUpperCase() + riskTolerance.slice(1)}</p>
                    <p>Investment Horizon: {investmentHorizon.charAt(0).toUpperCase() + investmentHorizon.slice(1)}-term</p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Location Preferences</h3>
                  <div className="space-y-1 text-sm">
                    <p>Cities: {preferredCities.length > 0 ? preferredCities.join(", ") : "None selected"}</p>
                    <p>Neighborhoods: {preferredNeighborhoods.length > 0 ? preferredNeighborhoods.join(", ") : "None selected"}</p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Property Types</h3>
                  <p className="text-sm">{propertyTypes.length > 0 ? propertyTypes.map(t => t.replace("_", " ")).join(", ") : "None selected"}</p>
                </div>
              </div>

              <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  What happens next?
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• Your investment dashboard will be customized with matching properties</li>
                  <li>• You'll receive alerts for new opportunities that match your criteria</li>
                  <li>• AI-powered recommendations will be tailored to your preferences</li>
                  <li>• Market trends will be filtered to your selected locations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(Math.min(totalSteps, step + 1))}
              disabled={
                (step === 1 && minBudget >= maxBudget) ||
                (step === 2 && preferredCities.length === 0) ||
                (step === 3 && propertyTypes.length === 0)
              }
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createProfileMutation.isPending}
            >
              {createProfileMutation.isPending ? "Creating Profile..." : "Complete Setup"}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/investment-dashboard")}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
