import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Truck, Package, Zap, DollarSign, 
  Calculator, CheckCircle2, Home 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function MovingCalculator() {
  const [currentAddress, setCurrentAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [homeSize, setHomeSize] = useState("");
  const [homeSizeType, setHomeSizeType] = useState<"sqft" | "bedrooms">("bedrooms");
  const [movingDate, setMovingDate] = useState("");
  const [packingService, setPackingService] = useState(false);
  const [storageNeeded, setStorageNeeded] = useState(false);
  const [estimates, setEstimates] = useState<any>(null);

  const calculateMutation = trpc.moving.calculateCosts.useMutation({
    onSuccess: (data) => {
      setEstimates(data);
      toast.success("Estimates calculated!");
    },
    onError: () => {
      toast.error("Failed to calculate estimates");
    },
  });

  const handleCalculate = async () => {
    if (!currentAddress || !destinationAddress || !homeSize || !movingDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await calculateMutation.mutateAsync({
        currentAddress,
        destinationAddress,
        homeSize: parseInt(homeSize),
        homeSizeType,
        movingDate,
        packingService,
        storageNeeded,
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Moving Cost Calculator</h1>
            <p className="text-muted-foreground">
              Get instant estimates from multiple moving companies and plan your relocation budget
            </p>
          </div>

          {/* Input Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Calculate Your Moving Costs
              </CardTitle>
              <CardDescription>
                Enter your details to receive personalized estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Addresses */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentAddress">Current Address *</Label>
                    <Input
                      id="currentAddress"
                      placeholder="123 Main St, City, State ZIP"
                      value={currentAddress}
                      onChange={(e) => setCurrentAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="destinationAddress">Destination Address *</Label>
                    <Input
                      id="destinationAddress"
                      placeholder="456 Oak Ave, City, State ZIP"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Home Size */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeSizeType">Measure By</Label>
                    <Select value={homeSizeType} onValueChange={(v: any) => setHomeSizeType(v)}>
                      <SelectTrigger id="homeSizeType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bedrooms">Bedrooms</SelectItem>
                        <SelectItem value="sqft">Square Feet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="homeSize">
                      {homeSizeType === "bedrooms" ? "Number of Bedrooms *" : "Square Footage *"}
                    </Label>
                    <Input
                      id="homeSize"
                      type="number"
                      placeholder={homeSizeType === "bedrooms" ? "e.g., 3" : "e.g., 2000"}
                      value={homeSize}
                      onChange={(e) => setHomeSize(e.target.value)}
                    />
                  </div>
                </div>

                {/* Moving Date */}
                <div>
                  <Label htmlFor="movingDate">Moving Date *</Label>
                  <Input
                    id="movingDate"
                    type="date"
                    value={movingDate}
                    onChange={(e) => setMovingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Additional Services */}
                <div className="space-y-3">
                  <Label>Additional Services</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="packingService"
                      checked={packingService}
                      onChange={(e) => setPackingService(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="packingService" className="cursor-pointer">
                      Professional Packing Service
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="storageNeeded"
                      checked={storageNeeded}
                      onChange={(e) => setStorageNeeded(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="storageNeeded" className="cursor-pointer">
                      Temporary Storage Needed
                    </Label>
                  </div>
                </div>

                <Button
                  onClick={handleCalculate}
                  disabled={calculateMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {calculateMutation.isPending ? "Calculating..." : "Calculate Moving Costs"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estimates Results */}
          {estimates && (
            <div className="space-y-6">
              {/* Total Budget Card */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Total Estimated Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-primary mb-2">
                      {formatCurrency(estimates.totalCost)}
                    </p>
                    <p className="text-muted-foreground">
                      Distance: {estimates.distance} miles • {estimates.estimatedDuration}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Moving Company Estimates */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Moving Company Estimates</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {estimates.companies.map((company: any, index: number) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{company.name}</h3>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400">★</span>
                              <span className="font-semibold">{company.rating}</span>
                              <span className="text-sm text-muted-foreground">
                                ({company.reviews} reviews)
                              </span>
                            </div>
                          </div>
                          <Truck className="w-8 h-8 text-primary" />
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Base Rate</span>
                            <span className="font-semibold">{formatCurrency(company.baseRate)}</span>
                          </div>
                          {packingService && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Packing Service</span>
                              <span className="font-semibold">{formatCurrency(company.packingCost)}</span>
                            </div>
                          )}
                          {storageNeeded && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Storage (30 days)</span>
                              <span className="font-semibold">{formatCurrency(company.storageCost)}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Total</span>
                            <span className="text-xl font-bold text-primary">
                              {formatCurrency(company.totalCost)}
                            </span>
                          </div>
                        </div>

                        <Button className="w-full" variant="outline">
                          Get Quote
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Additional Costs */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Costs to Consider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Utility Setup Fees</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Connection fees for electricity, gas, water, internet
                        </p>
                        <p className="font-bold">{formatCurrency(estimates.utilityCosts)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Packing Materials</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Boxes, tape, bubble wrap, labels
                        </p>
                        <p className="font-bold">{formatCurrency(estimates.packingMaterials)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <Home className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Cleaning Services</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Deep cleaning of old and new home
                        </p>
                        <p className="font-bold">{formatCurrency(estimates.cleaningCosts)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Insurance & Deposits</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Moving insurance, security deposits
                        </p>
                        <p className="font-bold">{formatCurrency(estimates.insuranceCosts)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Budget Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Moving Company (Average)</span>
                      <span className="font-semibold">
                        {formatCurrency(estimates.companies.reduce((acc: number, c: any) => acc + c.totalCost, 0) / estimates.companies.length)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Utility Setup Fees</span>
                      <span className="font-semibold">{formatCurrency(estimates.utilityCosts)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Packing Materials</span>
                      <span className="font-semibold">{formatCurrency(estimates.packingMaterials)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cleaning Services</span>
                      <span className="font-semibold">{formatCurrency(estimates.cleaningCosts)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Insurance & Deposits</span>
                      <span className="font-semibold">{formatCurrency(estimates.insuranceCosts)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-bold">Total Estimated Budget</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(estimates.totalCost)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
