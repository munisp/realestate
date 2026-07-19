import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Home, MapPin, Calendar, Sparkles } from "lucide-react";

export default function SellerPricingAssistant() {
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    yearBuilt: "",
  });

  const handleAnalyze = () => {
    setShowResults(true);
  };

  const recommendedPrice = 875000;
  const priceRange = { min: 850000, max: 900000 };
  const confidence = 92;
  const expectedDays = 28;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background py-12">
      <div className="container max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Pricing Assistant</h1>
          <p className="text-muted-foreground">Get data-driven pricing recommendations for your property</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>Enter your property information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input
                  placeholder="123 Main St, San Francisco, CA"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <Input
                    type="number"
                    placeholder="3"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <Input
                    type="number"
                    placeholder="2"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Square Feet</Label>
                  <Input
                    type="number"
                    placeholder="2000"
                    value={formData.sqft}
                    onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year Built</Label>
                  <Input
                    type="number"
                    placeholder="2010"
                    value={formData.yearBuilt}
                    onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleAnalyze}>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Pricing
              </Button>
            </CardContent>
          </Card>

          {showResults && (
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  Recommended Price
                </CardTitle>
                <CardDescription>Based on AI analysis of market data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold mb-2">${recommendedPrice.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Range: ${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-green-600">
                      {confidence}% Confidence
                    </Badge>
                    <Badge variant="secondary">
                      <Calendar className="w-3 h-3 mr-1" />
                      {expectedDays} days on market
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span className="text-sm">Price per sq ft</span>
                    <span className="font-semibold">${(recommendedPrice / parseInt(formData.sqft || "1")).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span className="text-sm">Market trend</span>
                    <Badge variant="secondary" className="text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +5.2% YoY
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {showResults && (
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparable Sales</CardTitle>
                <CardDescription>Recently sold properties in your area</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { address: "125 Main St", price: 865000, beds: 3, baths: 2, sqft: 1950, days: 22 },
                    { address: "130 Main St", price: 890000, beds: 3, baths: 2.5, sqft: 2100, days: 31 },
                    { address: "118 Main St", price: 850000, beds: 3, baths: 2, sqft: 1900, days: 25 },
                  ].map((comp, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <Home className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">{comp.address}</div>
                          <div className="text-sm text-muted-foreground">
                            {comp.beds} bed • {comp.baths} bath • {comp.sqft} sqft
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${comp.price.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Sold in {comp.days} days</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing Strategy</CardTitle>
                <CardDescription>Recommendations to maximize your sale</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Optimal Strategy
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      List at ${recommendedPrice.toLocaleString()} to attract serious buyers while leaving room for negotiation.
                      This price point is competitive with recent sales and aligns with current market conditions.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="font-semibold mb-1">Aggressive</div>
                      <div className="text-2xl font-bold mb-2">${priceRange.max.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">May take 45+ days to sell</p>
                    </div>
                    <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                      <div className="font-semibold mb-1 text-primary">Recommended</div>
                      <div className="text-2xl font-bold mb-2">${recommendedPrice.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Expected {expectedDays} days to sell</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-semibold mb-1">Quick Sale</div>
                      <div className="text-2xl font-bold mb-2">${priceRange.min.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">May sell within 14 days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
