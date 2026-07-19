// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Bell, BellOff, Plus, Trash2, Mail, Clock } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Alerts() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [alertName, setAlertName] = useState("");
  const [frequency, setFrequency] = useState<"instant" | "daily" | "weekly">("daily");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const { data: alerts, isLoading } = trpc.searchAlerts.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createAlert = trpc.searchAlerts.create.useMutation({
    onSuccess: () => {
      utils.searchAlerts.list.invalidate();
      setIsCreateOpen(false);
      resetForm();
      toast.success("Alert created successfully");
    },
    onError: () => {
      toast.error("Failed to create alert");
    },
  });

  const toggleAlert = trpc.searchAlerts.toggle.useMutation({
    onSuccess: () => {
      utils.searchAlerts.list.invalidate();
      toast.success("Alert updated");
    },
    onError: () => {
      toast.error("Failed to update alert");
    },
  });

  const deleteAlert = trpc.searchAlerts.delete.useMutation({
    onSuccess: () => {
      utils.searchAlerts.list.invalidate();
      toast.success("Alert deleted");
    },
    onError: () => {
      toast.error("Failed to delete alert");
    },
  });

  const resetForm = () => {
    setAlertName("");
    setFrequency("daily");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
  };

  const handleCreateAlert = () => {
    if (!alertName.trim()) {
      toast.error("Please enter an alert name");
      return;
    }

    const searchCriteria: any = {};
    if (city) searchCriteria.city = city;
    if (minPrice) searchCriteria.minPrice = parseInt(minPrice);
    if (maxPrice) searchCriteria.maxPrice = parseInt(maxPrice);

    createAlert.mutate({
      alertName,
      frequency,
      searchCriteria: JSON.stringify(searchCriteria),
    });
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
              Please sign in to manage your property alerts
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-8 w-8 text-primary" />
              <span>{APP_TITLE}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              Property Alerts
            </h1>
            <p className="text-muted-foreground">
              Get notified when new properties match your criteria
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Property Alert</DialogTitle>
                <DialogDescription>
                  Set up an alert to get notified when properties matching your criteria become available
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="alertName">Alert Name</Label>
                  <Input
                    id="alertName"
                    placeholder="e.g., 3BR Houses in Lagos"
                    value={alertName}
                    onChange={(e) => setAlertName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Notification Frequency</Label>
                  <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant (as they're listed)</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Lagos"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minPrice">Min Price (₦)</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      placeholder="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPrice">Max Price (₦)</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      placeholder="100000000"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlert} disabled={createAlert.isLoading}>
                  {createAlert.isLoading ? "Creating..." : "Create Alert"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BellOff className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Alerts Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Create your first alert to get notified about new properties
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {alerts.length} {alerts.length === 1 ? "alert" : "alerts"} configured
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.map((alert) => {
                const criteria = JSON.parse(alert.searchCriteria || "{}");
                const isActive = alert.isActive === 1;

                return (
                  <Card key={alert.id} className={!isActive ? "opacity-60" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {isActive ? (
                              <Bell className="h-4 w-4 text-primary" />
                            ) : (
                              <BellOff className="h-4 w-4 text-muted-foreground" />
                            )}
                            {alert.alertName}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3" />
                            {alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)} notifications
                          </CardDescription>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => toggleAlert.mutate({ id: alert.id, isActive: !isActive })}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Search Criteria */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Search Criteria:</h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {criteria.city && (
                            <div>• City: {criteria.city}</div>
                          )}
                          {criteria.minPrice && (
                            <div>• Min Price: ₦{criteria.minPrice.toLocaleString()}</div>
                          )}
                          {criteria.maxPrice && (
                            <div>• Max Price: ₦{criteria.maxPrice.toLocaleString()}</div>
                          )}
                          {criteria.bedrooms && (
                            <div>• Bedrooms: {criteria.bedrooms}+</div>
                          )}
                          {Object.keys(criteria).length === 0 && (
                            <div className="text-muted-foreground italic">No specific criteria</div>
                          )}
                        </div>
                      </div>

                      {/* Last Triggered */}
                      {alert.lastTriggered && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Last sent: {new Date(alert.lastTriggered).toLocaleDateString()}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this alert?")) {
                              deleteAlert.mutate({ id: alert.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>

                      {/* Created Date */}
                      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                        Created {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How Alerts Work</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <p>• <strong>Instant:</strong> Get notified immediately when a matching property is listed</p>
            <p>• <strong>Daily:</strong> Receive a daily digest of all new matching properties</p>
            <p>• <strong>Weekly:</strong> Get a weekly summary every Monday morning</p>
            <p className="mt-4 text-sm">
              Notifications are sent to your email: <strong>{user?.email || "Not set"}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
