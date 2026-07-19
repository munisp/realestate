import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreateAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSubscription?: any;
  onSuccess: () => void;
}

export function CreateAlertDialog({
  open,
  onOpenChange,
  editingSubscription,
  onSuccess,
}: CreateAlertDialogProps) {
  const [alertType, setAlertType] = useState<string>("undervalued");
  const [cities, setCities] = useState<string>("");
  const [neighborhoods, setNeighborhoods] = useState<string>("");
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minBedrooms, setMinBedrooms] = useState<string>("");
  const [maxBedrooms, setMaxBedrooms] = useState<string>("");
  const [minInvestmentScore, setMinInvestmentScore] = useState<number>(70);
  const [minUndervaluedPercent, setMinUndervaluedPercent] = useState<number>(10);
  const [minTrendStrength, setMinTrendStrength] = useState<number>(0.5);
  const [minGrowthPotential, setMinGrowthPotential] = useState<number>(70);
  const [notificationChannels, setNotificationChannels] = useState<string[]>(["email"]);
  const [frequency, setFrequency] = useState<string>("instant");

  // Load editing data
  useEffect(() => {
    if (editingSubscription) {
      setAlertType(editingSubscription.alertType);
      setCities(editingSubscription.cities?.join(", ") || "");
      setNeighborhoods(editingSubscription.neighborhoods?.join(", ") || "");
      setPropertyTypes(editingSubscription.propertyTypes || []);
      setMinPrice(editingSubscription.minPrice?.toString() || "");
      setMaxPrice(editingSubscription.maxPrice?.toString() || "");
      setMinBedrooms(editingSubscription.minBedrooms?.toString() || "");
      setMaxBedrooms(editingSubscription.maxBedrooms?.toString() || "");
      setMinInvestmentScore(editingSubscription.minInvestmentScore || 70);
      setMinUndervaluedPercent(editingSubscription.minUndervaluedPercent || 10);
      setMinTrendStrength(editingSubscription.minTrendStrength || 0.5);
      setMinGrowthPotential(editingSubscription.minGrowthPotential || 70);
      setNotificationChannels(editingSubscription.notificationChannels || ["email"]);
      setFrequency(editingSubscription.frequency || "instant");
    }
  }, [editingSubscription]);

  const createMutation = trpc.gnnAlerts.createSubscription.useMutation({
    onSuccess: () => {
      toast.success("Alert subscription created successfully");
      onSuccess();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create alert: ${error.message}`);
    },
  });

  const updateMutation = trpc.gnnAlerts.updateSubscription.useMutation({
    onSuccess: () => {
      toast.success("Alert subscription updated successfully");
      onSuccess();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update alert: ${error.message}`);
    },
  });

  const resetForm = () => {
    setAlertType("undervalued");
    setCities("");
    setNeighborhoods("");
    setPropertyTypes([]);
    setMinPrice("");
    setMaxPrice("");
    setMinBedrooms("");
    setMaxBedrooms("");
    setMinInvestmentScore(70);
    setMinUndervaluedPercent(10);
    setMinTrendStrength(0.5);
    setMinGrowthPotential(70);
    setNotificationChannels(["email"]);
    setFrequency("instant");
  };

  const handleSubmit = () => {
    const data: any = {
      alertType,
      notificationChannels,
      frequency,
    };

    if (cities) data.cities = cities.split(",").map(c => c.trim());
    if (neighborhoods) data.neighborhoods = neighborhoods.split(",").map(n => n.trim());
    if (propertyTypes.length > 0) data.propertyTypes = propertyTypes;
    if (minPrice) data.minPrice = parseInt(minPrice);
    if (maxPrice) data.maxPrice = parseInt(maxPrice);
    if (minBedrooms) data.minBedrooms = parseInt(minBedrooms);
    if (maxBedrooms) data.maxBedrooms = parseInt(maxBedrooms);

    // Add GNN-specific thresholds based on alert type
    if (alertType === "undervalued") {
      data.minUndervaluedPercent = minUndervaluedPercent;
    } else if (alertType === "investment_opportunity") {
      data.minInvestmentScore = minInvestmentScore;
    } else if (alertType === "market_trend") {
      data.minTrendStrength = minTrendStrength;
    } else if (alertType === "price_momentum") {
      data.minGrowthPotential = minGrowthPotential;
    }

    if (editingSubscription) {
      updateMutation.mutate({ subscriptionId: editingSubscription.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const togglePropertyType = (type: string) => {
    setPropertyTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleNotificationChannel = (channel: string) => {
    setNotificationChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSubscription ? "Edit Alert Subscription" : "Create GNN Alert"}
          </DialogTitle>
          <DialogDescription>
            Configure your AI-powered property alert preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alert Type */}
          <div className="space-y-2">
            <Label>Alert Type</Label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="undervalued">🎯 Undervalued Properties</SelectItem>
                <SelectItem value="investment_opportunity">💎 Investment Opportunities</SelectItem>
                <SelectItem value="market_trend">📈 Market Trends</SelectItem>
                <SelectItem value="price_momentum">🚀 Price Momentum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Geographic Filters */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Geographic Filters</h3>
            <div className="space-y-2">
              <Label>Cities (comma-separated)</Label>
              <Input
                placeholder="e.g., Lagos, Abuja, Port Harcourt"
                value={cities}
                onChange={(e) => setCities(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Neighborhoods (comma-separated)</Label>
              <Input
                placeholder="e.g., Lekki Phase 1, Victoria Island, Ikoyi"
                value={neighborhoods}
                onChange={(e) => setNeighborhoods(e.target.value)}
              />
            </div>
          </div>

          {/* Property Filters */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Property Filters</h3>
            <div className="space-y-2">
              <Label>Property Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {["single_family", "condo", "townhouse", "multi_family", "land", "commercial"].map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      checked={propertyTypes.includes(type)}
                      onCheckedChange={() => togglePropertyType(type)}
                    />
                    <label className="text-sm capitalize">{type.replace("_", " ")}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Price (₦)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 50000000"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Price (₦)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 200000000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Bedrooms</Label>
                <Input
                  type="number"
                  placeholder="e.g., 3"
                  value={minBedrooms}
                  onChange={(e) => setMinBedrooms(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Bedrooms</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={maxBedrooms}
                  onChange={(e) => setMaxBedrooms(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* GNN Thresholds */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">AI Intelligence Thresholds</h3>
            
            {alertType === "undervalued" && (
              <div className="space-y-2">
                <Label>Minimum Undervalued Percentage: {minUndervaluedPercent}%</Label>
                <Slider
                  value={[minUndervaluedPercent]}
                  onValueChange={(v) => setMinUndervaluedPercent(v[0])}
                  min={5}
                  max={50}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Only notify when property is at least {minUndervaluedPercent}% below market value
                </p>
              </div>
            )}

            {alertType === "investment_opportunity" && (
              <div className="space-y-2">
                <Label>Minimum Investment Score: {minInvestmentScore}/100</Label>
                <Slider
                  value={[minInvestmentScore]}
                  onValueChange={(v) => setMinInvestmentScore(v[0])}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Only notify for properties with investment score ≥ {minInvestmentScore}
                </p>
              </div>
            )}

            {alertType === "market_trend" && (
              <div className="space-y-2">
                <Label>Minimum Trend Strength: {minTrendStrength.toFixed(1)}</Label>
                <Slider
                  value={[minTrendStrength * 100]}
                  onValueChange={(v) => setMinTrendStrength(v[0] / 100)}
                  min={0}
                  max={100}
                  step={10}
                />
                <p className="text-xs text-muted-foreground">
                  Only notify for strong market trends (strength ≥ {minTrendStrength.toFixed(1)})
                </p>
              </div>
            )}

            {alertType === "price_momentum" && (
              <div className="space-y-2">
                <Label>Minimum Growth Potential: {minGrowthPotential}/100</Label>
                <Slider
                  value={[minGrowthPotential]}
                  onValueChange={(v) => setMinGrowthPotential(v[0])}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Only notify for high growth potential areas (≥ {minGrowthPotential})
                </p>
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Notification Preferences</h3>
            <div className="space-y-2">
              <Label>Notification Channels</Label>
              <div className="flex gap-4">
                {["email", "push", "sms"].map(channel => (
                  <div key={channel} className="flex items-center space-x-2">
                    <Checkbox
                      checked={notificationChannels.includes(channel)}
                      onCheckedChange={() => toggleNotificationChannel(channel)}
                    />
                    <label className="text-sm capitalize">{channel}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">⚡ Instant (as they happen)</SelectItem>
                  <SelectItem value="daily">📅 Daily Digest</SelectItem>
                  <SelectItem value="weekly">📆 Weekly Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending || notificationChannels.length === 0}
          >
            {editingSubscription ? "Update Alert" : "Create Alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
