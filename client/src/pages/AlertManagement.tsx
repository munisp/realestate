import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Settings, Trash2, Plus, Edit, Clock, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";

export default function AlertManagement() {
  const { user, loading: authLoading } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch user's monitoring list
  const { data: monitoring, isLoading, refetch } = trpc.valuationAlerts.getUserMonitoring.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch user's alert preferences
  const { data: preferences } = trpc.valuationAlerts.getUserPreferences.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch user's favorites for adding new monitoring
  const { data: favorites } = trpc.favorites.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const utils = trpc.useUtils();

  // Mutations
  const createMonitoringMutation = trpc.valuationAlerts.createMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Property monitoring added successfully");
      setShowAddDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add monitoring: ${error.message}`);
    },
  });

  const updateMonitoringMutation = trpc.valuationAlerts.updateMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Monitoring updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update monitoring: ${error.message}`);
    },
  });

  const deleteMonitoringMutation = trpc.valuationAlerts.deleteMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Monitoring removed successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove monitoring: ${error.message}`);
    },
  });

  const bulkEnableMutation = trpc.valuationAlerts.bulkUpdateMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Monitoring enabled for selected properties");
      setSelectedIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to enable monitoring: ${error.message}`);
    },
  });

  const bulkDisableMutation = trpc.valuationAlerts.bulkUpdateMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Monitoring disabled for selected properties");
      setSelectedIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to disable monitoring: ${error.message}`);
    },
  });

  const bulkDeleteMutation = trpc.valuationAlerts.bulkDeleteMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Selected monitoring removed successfully");
      setSelectedIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove monitoring: ${error.message}`);
    },
  });

  const updatePreferencesMutation = trpc.valuationAlerts.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Preferences updated successfully");
      setShowPreferencesDialog(false);
      utils.valuationAlerts.getUserPreferences.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to manage your valuation alerts</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  const handleToggleMonitoring = (id: number, isActive: boolean) => {
    updateMonitoringMutation.mutate({
      id,
      isActive: isActive ? 1 : 0,
    });
  };

  const handleDeleteMonitoring = (id: number) => {
    if (confirm("Are you sure you want to remove this property from monitoring?")) {
      deleteMonitoringMutation.mutate({ id });
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === monitoring?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(monitoring?.map((m: any) => m.id) || []);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkEnable = () => {
    bulkEnableMutation.mutate({
      ids: selectedIds,
      isActive: 1,
    });
  };

  const handleBulkDisable = () => {
    bulkDisableMutation.mutate({
      ids: selectedIds,
      isActive: 0,
    });
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to remove ${selectedIds.length} properties from monitoring?`)) {
      bulkDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Valuation Alerts</h1>
            <p className="text-muted-foreground mt-1">
              Get notified when property valuations change significantly
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowPreferencesDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Alert Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Monitors</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoring?.filter((m: any) => m.isActive).length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Properties being monitored
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alert Threshold</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoring && monitoring.length > 0
                  ? `±${monitoring[0].alertThreshold}%`
                  : "±5%"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Default change threshold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {preferences?.alertFrequency || "Instant"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Alert frequency
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    {selectedIds.length} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedIds.length === monitoring?.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkEnable}
                    disabled={bulkEnableMutation.isPending}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Enable
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDisable}
                    disabled={bulkDisableMutation.isPending}
                  >
                    <BellOff className="h-4 w-4 mr-2" />
                    Disable
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monitoring List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Monitored Properties</CardTitle>
                <CardDescription>
                  Properties you're tracking for valuation changes
                </CardDescription>
              </div>
              {monitoring && monitoring.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedIds.length === monitoring.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {monitoring && monitoring.length > 0 ? (
              <div className="space-y-3">
                {monitoring.map((monitor: any) => (
                  <div
                    key={monitor.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Checkbox for bulk selection */}
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(monitor.id)}
                        onChange={() => handleToggleSelect(monitor.id)}
                        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                      />
                      <div className={`p-2 rounded-full ${monitor.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        {monitor.isActive ? (
                          <Bell className="h-5 w-5" />
                        ) : (
                          <BellOff className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Link href={`/property/${monitor.propertyId}`}>
                          <span className="font-semibold hover:underline cursor-pointer">
                            Property #{monitor.propertyId}
                          </span>
                        </Link>
                        <div className="text-sm text-muted-foreground mt-1">
                          Alert on{" "}
                          {monitor.alertType === "both" ? (
                            "any change"
                          ) : monitor.alertType === "increase" ? (
                            <>
                              <TrendingUp className="h-3 w-3 inline" /> increases
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 inline" /> decreases
                            </>
                          )}{" "}
                          ≥ {monitor.alertThreshold}%
                          {monitor.lastCheckedAt && (
                            <> • Last checked {new Date(monitor.lastCheckedAt).toLocaleDateString()}</>
                          )}
                        </div>
                        {monitor.lastValuation && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last valuation: ₦{(monitor.lastValuation / 1000000).toFixed(1)}M
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!monitor.isActive}
                        onCheckedChange={(checked) => handleToggleMonitoring(monitor.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMonitoring(monitor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No properties monitored yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add properties to your monitoring list to receive valuation change alerts
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Property
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Monitoring Dialog */}
        <AddMonitoringDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          favorites={favorites || []}
          onSubmit={(data) => createMonitoringMutation.mutate(data)}
          isLoading={createMonitoringMutation.isPending}
        />

        {/* Preferences Dialog */}
        <PreferencesDialog
          open={showPreferencesDialog}
          onOpenChange={setShowPreferencesDialog}
          preferences={preferences}
          onSubmit={(data) => updatePreferencesMutation.mutate(data)}
          isLoading={updatePreferencesMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

// Add Monitoring Dialog Component
function AddMonitoringDialog({
  open,
  onOpenChange,
  favorites,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorites: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [propertyId, setPropertyId] = useState<string>("");
  const [alertThreshold, setAlertThreshold] = useState("5.00");
  const [alertType, setAlertType] = useState<"both" | "increase" | "decrease">("both");
  const [alertFrequency, setAlertFrequency] = useState<"instant" | "daily" | "weekly">("instant");

  const handleSubmit = () => {
    if (!propertyId) {
      toast.error("Please select a property");
      return;
    }

    onSubmit({
      propertyId: parseInt(propertyId),
      alertThreshold,
      alertType,
      alertFrequency,
      isActive: 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Property Monitoring</DialogTitle>
          <DialogDescription>
            Get notified when this property's valuation changes significantly
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property from your favorites" />
              </SelectTrigger>
              <SelectContent>
                {favorites.map((fav: any) => (
                  <SelectItem key={fav.propertyId} value={fav.propertyId.toString()}>
                    Property #{fav.propertyId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Alert Threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              step="0.01"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              placeholder="5.00"
            />
            <p className="text-xs text-muted-foreground">
              Receive alerts when valuation changes by this percentage or more
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Alert Type</Label>
            <Select value={alertType} onValueChange={(value: any) => setAlertType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both increases and decreases</SelectItem>
                <SelectItem value="increase">Only increases</SelectItem>
                <SelectItem value="decrease">Only decreases</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Alert Frequency</Label>
            <Select value={alertFrequency} onValueChange={(value: any) => setAlertFrequency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant (as they happen)</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Monitoring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Preferences Dialog Component
function PreferencesDialog({
  open,
  onOpenChange,
  preferences,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [emailAlerts, setEmailAlerts] = useState(preferences?.emailAlertsEnabled || true);
  const [pushAlerts, setPushAlerts] = useState(preferences?.pushAlertsEnabled || true);
  const [inAppAlerts, setInAppAlerts] = useState(preferences?.inAppAlertsEnabled || true);
  const [maxAlertsPerDay, setMaxAlertsPerDay] = useState(preferences?.maxAlertsPerDay || 10);
  const [quietHoursStart, setQuietHoursStart] = useState(preferences?.quietHoursStart || 22);
  const [quietHoursEnd, setQuietHoursEnd] = useState(preferences?.quietHoursEnd || 8);

  const handleSubmit = () => {
    onSubmit({
      emailAlertsEnabled: emailAlerts ? 1 : 0,
      pushAlertsEnabled: pushAlerts ? 1 : 0,
      inAppAlertsEnabled: inAppAlerts ? 1 : 0,
      maxAlertsPerDay,
      quietHoursStart,
      quietHoursEnd,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Alert Preferences</DialogTitle>
          <DialogDescription>
            Configure how and when you receive valuation alerts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Alerts</Label>
                <p className="text-xs text-muted-foreground">Receive alerts via email</p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
              </div>
              <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>In-App Notifications</Label>
                <p className="text-xs text-muted-foreground">Show alerts in the app</p>
              </div>
              <Switch checked={inAppAlerts} onCheckedChange={setInAppAlerts} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAlerts">Max Alerts Per Day</Label>
            <Input
              id="maxAlerts"
              type="number"
              value={maxAlertsPerDay}
              onChange={(e) => setMaxAlertsPerDay(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Quiet Hours</Label>
            <div className="flex items-center gap-2">
              <Select value={quietHoursStart.toString()} onValueChange={(v) => setQuietHoursStart(parseInt(v))}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>to</span>
              <Select value={quietHoursEnd.toString()} onValueChange={(v) => setQuietHoursEnd(parseInt(v))}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              No alerts will be sent during these hours
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
