import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Calendar, TrendingUp, DollarSign, Settings, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import PricingCalendar from "@/components/PricingCalendar";

export default function SmartPricingDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState(15000);
  const [weekendMultiplier, setWeekendMultiplier] = useState(1.2);
  const [enableDemandPricing, setEnableDemandPricing] = useState(true);
  const [demandMin, setDemandMin] = useState(0.8);
  const [demandMax, setDemandMax] = useState(1.5);
  const [lastMinuteDays, setLastMinuteDays] = useState(7);
  const [lastMinuteDiscount, setLastMinuteDiscount] = useState(0.15);
  const [weeklyDiscount, setWeeklyDiscount] = useState(0.10);
  const [monthlyDiscount, setMonthlyDiscount] = useState(0.20);
  const [strategy, setStrategy] = useState<"fixed" | "dynamic" | "market_based">("dynamic");
  const [highSeasonStart, setHighSeasonStart] = useState<string | null>(null);
  const [highSeasonEnd, setHighSeasonEnd] = useState<string | null>(null);
  const [highSeasonMultiplier, setHighSeasonMultiplier] = useState(1.5);
  const [lowSeasonStart, setLowSeasonStart] = useState<string | null>(null);
  const [lowSeasonEnd, setLowSeasonEnd] = useState<string | null>(null);
  const [lowSeasonMultiplier, setLowSeasonMultiplier] = useState(0.8);

  // Fetch user's properties
  const { data: properties, isLoading: propertiesLoading } = trpc.pricing.getMyProperties.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch pricing rule for selected property
  const { data: pricingRule, isLoading: ruleLoading } = trpc.pricing.getPricingRule.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  // Save pricing rule mutation
  const savePricingMutation = trpc.pricing.savePricingRule.useMutation({
    onSuccess: () => {
      toast.success("Pricing settings saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Load pricing rule data when fetched
  useEffect(() => {
    if (pricingRule) {
      setBasePrice(parseFloat(pricingRule.basePrice));
      setStrategy(pricingRule.strategy);
      setWeekendMultiplier(parseFloat(pricingRule.weekendMultiplier));
      setHighSeasonStart(pricingRule.highSeasonStart);
      setHighSeasonEnd(pricingRule.highSeasonEnd);
      setHighSeasonMultiplier(parseFloat(pricingRule.highSeasonMultiplier));
      setLowSeasonStart(pricingRule.lowSeasonStart);
      setLowSeasonEnd(pricingRule.lowSeasonEnd);
      setLowSeasonMultiplier(parseFloat(pricingRule.lowSeasonMultiplier));
      setEnableDemandPricing(pricingRule.enableDemandPricing);
      setDemandMin(parseFloat(pricingRule.demandMultiplierMin));
      setDemandMax(parseFloat(pricingRule.demandMultiplierMax));
      setLastMinuteDays(pricingRule.lastMinuteDays);
      setLastMinuteDiscount(parseFloat(pricingRule.lastMinuteDiscount));
      setWeeklyDiscount(parseFloat(pricingRule.weeklyDiscount));
      setMonthlyDiscount(parseFloat(pricingRule.monthlyDiscount));
    }
  }, [pricingRule]);

  // Auto-select first property
  useEffect(() => {
    if (properties && properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Mock data for demonstration
  const competitorPrices = [12000, 18000, 16000, 14500, 17000];
  const avgCompetitorPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
  const pricePosition = ((basePrice / avgCompetitorPrice - 1) * 100).toFixed(1);

  const handleSave = () => {
    if (!selectedPropertyId) {
      toast.error("Please select a property");
      return;
    }

    savePricingMutation.mutate({
      propertyId: selectedPropertyId,
      basePrice,
      strategy,
      weekendMultiplier,
      highSeasonStart,
      highSeasonEnd,
      highSeasonMultiplier,
      lowSeasonStart,
      lowSeasonEnd,
      lowSeasonMultiplier,
      enableDemandPricing,
      demandMultiplierMin: demandMin,
      demandMultiplierMax: demandMax,
      lastMinuteDays,
      lastMinuteDiscount,
      weeklyDiscount,
      monthlyDiscount,
    });
  };

  // Show login prompt if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Smart Pricing Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          Please log in to manage your property pricing
        </p>
        <Button asChild size="lg">
          <a href={getLoginUrl()}>Log In</a>
        </Button>
      </div>
    );
  }

  // Show loading state
  if (authLoading || propertiesLoading) {
    return (
      <div className="container mx-auto py-16 text-center">
        <p className="text-muted-foreground">Loading your properties...</p>
      </div>
    );
  }

  // Show empty state if no properties
  if (!properties || properties.length === 0) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Smart Pricing Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          You don't have any shortlet properties yet. Create a property to start managing pricing.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Smart Pricing Dashboard</h1>
          <p className="text-muted-foreground mb-4">
            Optimize your property pricing with AI-powered recommendations
          </p>
          {/* Property Selector */}
          <div className="flex items-center gap-3">
            <Label htmlFor="property-select" className="text-sm font-medium">
              Select Property:
            </Label>
            <Select
              value={selectedPropertyId?.toString()}
              onValueChange={(value) => setSelectedPropertyId(parseInt(value))}
            >
              <SelectTrigger id="property-select" className="w-[350px]">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.title || `${property.addressLine1}, ${property.city}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSave} size="lg" disabled={savePricingMutation.isPending}>
          <Settings className="h-4 w-4 mr-2" />
          {savePricingMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Market Position Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your base price is{" "}
          <strong className={parseFloat(pricePosition) > 0 ? "text-green-600" : "text-red-600"}>
            {pricePosition}%
          </strong>{" "}
          {parseFloat(pricePosition) > 0 ? "above" : "below"} the market average of ₦
          {avgCompetitorPrice.toLocaleString()}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            Base Pricing
          </TabsTrigger>
          <TabsTrigger value="seasonal">
            <Calendar className="h-4 w-4 mr-2" />
            Seasonal Rates
          </TabsTrigger>
          <TabsTrigger value="discounts">
            <TrendingUp className="h-4 w-4 mr-2" />
            Discounts
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Base Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Base Price */}
            <Card>
              <CardHeader>
                <CardTitle>Base Nightly Rate</CardTitle>
                <CardDescription>
                  Your standard price for weekday nights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price (₦)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    min={0}
                    step={1000}
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold mb-1">
                    ₦{basePrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">per night</div>
                </div>
              </CardContent>
            </Card>

            {/* Weekend Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Weekend Multiplier</CardTitle>
                <CardDescription>
                  Adjust pricing for Friday, Saturday, and Sunday
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Multiplier</Label>
                    <span className="text-sm font-medium">{weekendMultiplier.toFixed(2)}x</span>
                  </div>
                  <Slider
                    value={[weekendMultiplier]}
                    onValueChange={(value) => setWeekendMultiplier(value[0])}
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    className="py-4"
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold mb-1">
                    ₦{Math.round(basePrice * weekendMultiplier).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    weekend price (+{((weekendMultiplier - 1) * 100).toFixed(0)}%)
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demand-Based Pricing */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Demand-Based Pricing</CardTitle>
                  <CardDescription>
                    Automatically adjust prices based on occupancy rates
                  </CardDescription>
                </div>
                <Switch
                  checked={enableDemandPricing}
                  onCheckedChange={setEnableDemandPricing}
                />
              </div>
            </CardHeader>
            {enableDemandPricing && (
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Minimum Multiplier (Low Demand)</Label>
                      <span className="text-sm font-medium">{demandMin.toFixed(2)}x</span>
                    </div>
                    <Slider
                      value={[demandMin]}
                      onValueChange={(value) => setDemandMin(value[0])}
                      min={0.5}
                      max={1.0}
                      step={0.05}
                      className="py-4"
                    />
                    <p className="text-sm text-muted-foreground">
                      Price when occupancy is 0%: ₦{Math.round(basePrice * demandMin).toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Maximum Multiplier (High Demand)</Label>
                      <span className="text-sm font-medium">{demandMax.toFixed(2)}x</span>
                    </div>
                    <Slider
                      value={[demandMax]}
                      onValueChange={(value) => setDemandMax(value[0])}
                      min={1.0}
                      max={2.5}
                      step={0.1}
                      className="py-4"
                    />
                    <p className="text-sm text-muted-foreground">
                      Price when occupancy is 100%: ₦{Math.round(basePrice * demandMax).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-semibold mb-2">How it works</h4>
                  <p className="text-sm text-muted-foreground">
                    Your price automatically adjusts between ₦{Math.round(basePrice * demandMin).toLocaleString()} and ₦
                    {Math.round(basePrice * demandMax).toLocaleString()} based on your property's occupancy rate. Higher
                    occupancy = higher prices, lower occupancy = lower prices to attract bookings.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Seasonal Rates Tab */}
        <TabsContent value="seasonal" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* High Season */}
            <Card>
              <CardHeader>
                <CardTitle>High Season</CardTitle>
                <CardDescription>
                  Peak travel periods with higher demand
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="highSeasonStart">Start Date</Label>
                    <Input id="highSeasonStart" type="text" placeholder="12-15" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="highSeasonEnd">End Date</Label>
                    <Input id="highSeasonEnd" type="text" placeholder="01-15" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Price Multiplier</Label>
                    <span className="text-sm font-medium">1.50x</span>
                  </div>
                  <Slider defaultValue={[1.5]} min={1.0} max={2.5} step={0.1} className="py-4" />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold mb-1">
                    ₦{Math.round(basePrice * 1.5).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">per night during high season</div>
                </div>
              </CardContent>
            </Card>

            {/* Low Season */}
            <Card>
              <CardHeader>
                <CardTitle>Low Season</CardTitle>
                <CardDescription>
                  Off-peak periods with lower demand
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lowSeasonStart">Start Date</Label>
                    <Input id="lowSeasonStart" type="text" placeholder="06-01" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lowSeasonEnd">End Date</Label>
                    <Input id="lowSeasonEnd" type="text" placeholder="08-31" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Price Multiplier</Label>
                    <span className="text-sm font-medium">0.85x</span>
                  </div>
                  <Slider defaultValue={[0.85]} min={0.5} max={1.0} step={0.05} className="py-4" />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold mb-1">
                    ₦{Math.round(basePrice * 0.85).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">per night during low season</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Special Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Special Events</CardTitle>
                  <CardDescription>
                    Set custom pricing for holidays and local events
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Christmas & New Year", dates: "Dec 20 - Jan 5", multiplier: 2.0 },
                  { name: "Easter Weekend", dates: "Apr 15 - Apr 18", multiplier: 1.8 },
                  { name: "Lagos Carnival", dates: "May 25 - May 28", multiplier: 1.7 },
                ].map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{event.name}</div>
                      <div className="text-sm text-muted-foreground">{event.dates}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{event.multiplier}x multiplier</Badge>
                      <div className="text-right">
                        <div className="font-semibold">
                          ₦{Math.round(basePrice * event.multiplier).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">per night</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discounts Tab */}
        <TabsContent value="discounts" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Last-Minute Discount */}
            <Card>
              <CardHeader>
                <CardTitle>Last-Minute Discount</CardTitle>
                <CardDescription>
                  Fill empty dates with short-notice bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lastMinuteDays">Days Before Check-in</Label>
                  <Input
                    id="lastMinuteDays"
                    type="number"
                    value={lastMinuteDays}
                    onChange={(e) => setLastMinuteDays(Number(e.target.value))}
                    min={1}
                    max={14}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Discount</Label>
                    <span className="text-sm font-medium">{(lastMinuteDiscount * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[lastMinuteDiscount]}
                    onValueChange={(value) => setLastMinuteDiscount(value[0])}
                    min={0.05}
                    max={0.30}
                    step={0.05}
                    className="py-4"
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold mb-1">
                    ₦{Math.round(basePrice * (1 - lastMinuteDiscount)).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    for bookings within {lastMinuteDays} days
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Discount */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Discount</CardTitle>
                <CardDescription>
                  Encourage longer stays (7+ nights)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Discount</Label>
                    <span className="text-sm font-medium">{(weeklyDiscount * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[weeklyDiscount]}
                    onValueChange={(value) => setWeeklyDiscount(value[0])}
                    min={0.05}
                    max={0.25}
                    step={0.05}
                    className="py-4"
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold mb-1">
                    ₦{Math.round(basePrice * (1 - weeklyDiscount) * 7).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    total for 7 nights (save ₦{Math.round(basePrice * weeklyDiscount * 7).toLocaleString()})
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Discount */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Discount</CardTitle>
                <CardDescription>
                  Attract long-term guests (28+ nights)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Discount</Label>
                    <span className="text-sm font-medium">{(monthlyDiscount * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[monthlyDiscount]}
                    onValueChange={(value) => setMonthlyDiscount(value[0])}
                    min={0.10}
                    max={0.40}
                    step={0.05}
                    className="py-4"
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold mb-1">
                    ₦{Math.round(basePrice * (1 - monthlyDiscount) * 28).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    total for 28 nights (save ₦{Math.round(basePrice * monthlyDiscount * 28).toLocaleString()})
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {/* Pricing Calendar */}
          <PricingCalendar propertyId={1} basePrice={basePrice} />


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI-Powered Pricing Insights
              </CardTitle>
              <CardDescription>
                Based on market data and your property's performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recommendations */}
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950 rounded">
                  <h4 className="font-semibold mb-2">✓ Well-Positioned Pricing</h4>
                  <p className="text-sm text-muted-foreground">
                    Your base price is competitive at {pricePosition}% {parseFloat(pricePosition) > 0 ? "above" : "below"} market
                    average. This positions you well for your property type and location.
                  </p>
                </div>

                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded">
                  <h4 className="font-semibold mb-2">⚠ Weekend Opportunity</h4>
                  <p className="text-sm text-muted-foreground">
                    Your weekend multiplier ({weekendMultiplier}x) is below the market average of 1.35x. Consider
                    increasing to 1.35x to capture ₦{Math.round(basePrice * 0.15 * 12).toLocaleString()} more per month.
                  </p>
                </div>

                <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 rounded">
                  <h4 className="font-semibold mb-2">💡 Seasonal Strategy</h4>
                  <p className="text-sm text-muted-foreground">
                    December-January sees 45% higher demand in your area. Your high season multiplier (1.5x) is
                    conservative - consider increasing to 1.7x during peak weeks.
                  </p>
                </div>
              </div>

              {/* Competitor Analysis */}
              <div className="space-y-3">
                <h4 className="font-semibold">Competitor Pricing</h4>
                <div className="grid grid-cols-5 gap-2">
                  {competitorPrices.map((price, idx) => (
                    <div key={idx} className="p-3 border rounded text-center">
                      <div className="text-xs text-muted-foreground mb-1">Property {idx + 1}</div>
                      <div className="font-semibold">₦{price.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <div className="text-xs text-muted-foreground mb-1">Market Average</div>
                  <div className="text-lg font-bold">₦{avgCompetitorPrice.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
