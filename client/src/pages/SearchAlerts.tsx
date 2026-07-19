import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Building2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function SearchAlerts() {
  const { isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [frequency, setFrequency] = useState<"instant" | "daily" | "weekly">("daily");

  const { data: alerts, refetch } = trpc.searchAlerts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createAlertMutation = trpc.searchAlerts.create.useMutation();
  const updateAlertMutation = trpc.searchAlerts.update.useMutation();
  const deleteAlertMutation = trpc.searchAlerts.delete.useMutation();

  const handleCreateAlert = async () => {
    if (!alertName.trim()) {
      toast.error("Please enter an alert name");
      return;
    }

    try {
      await createAlertMutation.mutateAsync({
        alertName,
        searchCriteria: {
          city: city || undefined,
          state: state || undefined,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
        },
        frequency,
      });

      toast.success("Search alert created!");
      setIsDialogOpen(false);
      setAlertName("");
      setCity("");
      setState("");
      setMinPrice("");
      setMaxPrice("");
      refetch();
    } catch (error) {
      toast.error("Failed to create alert");
    }
  };

  const handleToggleAlert = async (id: number, currentActive: number) => {
    try {
      await updateAlertMutation.mutateAsync({
        id,
        isActive: currentActive === 1 ? 0 : 1,
      });
      refetch();
      toast.success(currentActive === 1 ? "Alert disabled" : "Alert enabled");
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await deleteAlertMutation.mutateAsync({ id });
      refetch();
      toast.success("Alert deleted");
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to manage search alerts</CardDescription>
          </CardHeader>
          <CardContent>
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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Search Alerts</h1>
            <p className="text-muted-foreground">
              Get notified when properties matching your criteria become available
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Search Alert</DialogTitle>
                <DialogDescription>
                  Set up criteria and get notified about matching properties
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="alertName">Alert Name</Label>
                  <Input
                    id="alertName"
                    placeholder="e.g., Downtown Condos"
                    value={alertName}
                    onChange={(e) => setAlertName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Any city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="Any state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minPrice">Min Price</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      placeholder="No minimum"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPrice">Max Price</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      placeholder="No maximum"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Notification Frequency</Label>
                  <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlert} disabled={createAlertMutation.isPending}>
                  {createAlertMutation.isPending ? "Creating..." : "Create Alert"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!alerts || alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No search alerts yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {alerts.map(alert => {
              const criteria = JSON.parse(alert.searchCriteria);
              
              return (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {alert.isActive === 1 ? (
                            <Bell className="h-5 w-5 text-primary" />
                          ) : (
                            <BellOff className="h-5 w-5 text-muted-foreground" />
                          )}
                          {alert.alertName}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)} notifications
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.isActive === 1}
                          onCheckedChange={() => handleToggleAlert(alert.id, alert.isActive || 0)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {criteria.city && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">City:</span>
                          <span className="font-medium">{criteria.city}</span>
                        </div>
                      )}
                      {criteria.state && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">State:</span>
                          <span className="font-medium">{criteria.state}</span>
                        </div>
                      )}
                      {(criteria.minPrice || criteria.maxPrice) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price Range:</span>
                          <span className="font-medium">
                            ${criteria.minPrice?.toLocaleString() || '0'} - ${criteria.maxPrice?.toLocaleString() || '∞'}
                          </span>
                        </div>
                      )}
                      {alert.lastTriggered && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Last triggered:</span>
                          <span className="text-xs">{new Date(alert.lastTriggered).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
