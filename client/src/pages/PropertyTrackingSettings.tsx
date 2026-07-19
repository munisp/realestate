import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Save, TrendingUp, Bell, Clock, AlertCircle } from "lucide-react";

export default function PropertyTrackingSettings() {
  const params = useParams();
  const [, navigate] = useLocation();
  const propertyId = params.id ? parseInt(params.id) : 0;

  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [notifyOnPriceChange, setNotifyOnPriceChange] = useState(true);
  const [notifyOnNewCompetitor, setNotifyOnNewCompetitor] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [checkFrequency, setCheckFrequency] = useState<"hourly" | "daily" | "weekly">("daily");
  const [priceChangeThreshold, setPriceChangeThreshold] = useState(5);

  // Fetch existing preferences
  const { data: preferences, isLoading } = trpc.propertyTracking.getPreferences.useQuery({
    propertyId
  });

  // Fetch property analytics
  const { data: analytics } = trpc.propertyTracking.getPropertyAnalytics.useQuery({
    propertyId
  });

  // Update mutation
  const updateMutation = trpc.propertyTracking.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Tracking settings updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    }
  });

  // Load preferences when data arrives
  useEffect(() => {
    if (preferences) {
      setTrackingEnabled(preferences.trackingEnabled === 1);
      setNotifyOnPriceChange(preferences.notifyOnPriceChange === 1);
      setNotifyOnNewCompetitor(preferences.notifyOnNewCompetitor === 1);
      setNotifyOnStatusChange(preferences.notifyOnStatusChange === 1);
      setCheckFrequency(preferences.checkFrequency as "hourly" | "daily" | "weekly");
      setPriceChangeThreshold(preferences.priceChangeThreshold || 5);
    }
  }, [preferences]);

  const handleSave = () => {
    updateMutation.mutate({
      propertyId,
      trackingEnabled,
      notifyOnPriceChange,
      notifyOnNewCompetitor,
      notifyOnStatusChange,
      checkFrequency,
      priceChangeThreshold
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading tracking settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(`/property/${propertyId}`)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Property
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Competitor Tracking Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure how this property is monitored for competitor listings
          </p>
        </div>

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Competitors Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.competitorsFound}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Price Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.priceChanges}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Competitor Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.averageCompetitorPrice 
                    ? `₦${analytics.averageCompetitorPrice.toLocaleString()}`
                    : "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Checked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {analytics.lastChecked 
                    ? new Date(analytics.lastChecked).toLocaleDateString()
                    : "Never"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tracking Configuration</CardTitle>
            <CardDescription>
              Control when and how this property is monitored for competitor activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Enable Competitor Tracking
                </Label>
                <p className="text-sm text-muted-foreground">
                  Monitor this property for competitor listings and price changes
                </p>
              </div>
              <Switch
                checked={trackingEnabled}
                onCheckedChange={setTrackingEnabled}
              />
            </div>

            <Separator />

            {/* Notification Preferences */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <Label className="text-base font-semibold">Notification Preferences</Label>
              </div>

              <div className="space-y-3 ml-7">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-price" className="text-sm">
                    Notify on price changes
                  </Label>
                  <Switch
                    id="notify-price"
                    checked={notifyOnPriceChange}
                    onCheckedChange={setNotifyOnPriceChange}
                    disabled={!trackingEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-competitor" className="text-sm">
                    Notify on new competitors
                  </Label>
                  <Switch
                    id="notify-competitor"
                    checked={notifyOnNewCompetitor}
                    onCheckedChange={setNotifyOnNewCompetitor}
                    disabled={!trackingEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-status" className="text-sm">
                    Notify on status changes
                  </Label>
                  <Switch
                    id="notify-status"
                    checked={notifyOnStatusChange}
                    onCheckedChange={setNotifyOnStatusChange}
                    disabled={!trackingEnabled}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Check Frequency */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <Label className="text-base font-semibold">Check Frequency</Label>
              </div>

              <div className="ml-7">
                <Label htmlFor="frequency" className="text-sm">
                  How often to check for updates
                </Label>
                <Select
                  value={checkFrequency}
                  onValueChange={(value: any) => setCheckFrequency(value)}
                  disabled={!trackingEnabled}
                >
                  <SelectTrigger id="frequency" className="w-full mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Price Change Threshold */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <Label className="text-base font-semibold">Price Change Threshold</Label>
              </div>

              <div className="ml-7">
                <Label htmlFor="threshold" className="text-sm">
                  Minimum price change percentage to trigger notification
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={priceChangeThreshold}
                    onChange={(e) => setPriceChangeThreshold(parseInt(e.target.value) || 0)}
                    disabled={!trackingEnabled}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll be notified when competitor prices change by at least this percentage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/property/${propertyId}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
