// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Edit, Mail, MessageSquare, Plus, Smartphone, Trash2, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PropertyAlerts() {
  const { user, isAuthenticated, loading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);

  // Form state
  const [alertType, setAlertType] = useState<'price_drop' | 'new_listing' | 'similar_property'>('new_listing');
  const [frequency, setFrequency] = useState<'instant' | 'daily' | 'weekly'>('daily');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);

  const { data: alerts, refetch } = trpc.alerts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createAlertMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success('Alert created successfully!');
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create alert: ${error.message}`);
    },
  });

  const updateAlertMutation = trpc.alerts.update.useMutation({
    onSuccess: () => {
      toast.success('Alert updated successfully!');
      setEditingAlert(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update alert: ${error.message}`);
    },
  });

  const deleteAlertMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      toast.success('Alert deleted successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete alert: ${error.message}`);
    },
  });

  const resetForm = () => {
    setAlertType('new_listing');
    setFrequency('daily');
    setEmailEnabled(true);
    setSmsEnabled(false);
    setPushEnabled(true);
    setMinPrice('');
    setMaxPrice('');
    setPropertyTypes([]);
  };

  const handleCreateAlert = () => {
    createAlertMutation.mutate({
      type: alertType,
      criteria: {
        priceRange: minPrice && maxPrice ? {
          min: parseInt(minPrice),
          max: parseInt(maxPrice),
        } : undefined,
        propertyType: propertyTypes.length > 0 ? propertyTypes : undefined,
      },
      frequency,
      channels: {
        email: emailEnabled,
        sms: smsEnabled,
        push: pushEnabled,
      },
    });
  };

  const handleToggleAlert = (alertId: string, active: boolean) => {
    updateAlertMutation.mutate({ id: alertId, active });
  };

  const handleDeleteAlert = (alertId: string) => {
    if (confirm('Are you sure you want to delete this alert?')) {
      deleteAlertMutation.mutate({ id: alertId });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading (alerts as any)...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl">Property Alerts</CardTitle>
            <CardDescription>
              Sign in to create custom alerts for price drops, new listings, and similar properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <a href={getLoginUrl()}>Sign In to Continue</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAlerts = (alerts as any)?.filter((a: any) => a.active) || [];
  const inactiveAlerts = (alerts as any)?.filter((a: any) => !a.active) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Property Alerts</h1>
              <p className="text-muted-foreground mt-1">
                Get notified about price drops, new listings, and similar properties
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Alert</DialogTitle>
                  <DialogDescription>
                    Set up a custom alert to get notified about properties that match your criteria
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Alert Type */}
                  <div className="space-y-2">
                    <Label>Alert Type</Label>
                    <Select value={alertType} onValueChange={(v: any) => setAlertType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price_drop">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            Price Drop Alert
                          </div>
                        </SelectItem>
                        <SelectItem value="new_listing">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            New Listing Alert
                          </div>
                        </SelectItem>
                        <SelectItem value="similar_property">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Similar Property Alert
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minPrice">Min Price (₦)</Label>
                      <Input
                        id="minPrice"
                        type="number"
                        placeholder="e.g., 50000000"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxPrice">Max Price (₦)</Label>
                      <Input
                        id="maxPrice"
                        type="number"
                        placeholder="e.g., 100000000"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Notification Frequency */}
                  <div className="space-y-2">
                    <Label>Notification Frequency</Label>
                    <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instant (as they happen)</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notification Channels */}
                  <div className="space-y-4">
                    <Label>Notification Channels</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                          </div>
                        </div>
                        <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">SMS</p>
                            <p className="text-sm text-muted-foreground">Text message notifications</p>
                          </div>
                        </div>
                        <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">Browser notifications</p>
                          </div>
                        </div>
                        <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAlert} disabled={createAlertMutation.isPending}>
                    {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently monitoring
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeAlerts.reduce((sum: any, a: any) => sum + (a.matchCount || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Properties matched
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">
                New matches
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({inactiveAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BellOff className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Create your first alert to start getting notified about properties
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Alert
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {alert.type === 'price_drop' && <TrendingDown className="w-5 h-5" />}
                          {alert.type === 'new_listing' && <Bell className="w-5 h-5" />}
                          {alert.type === 'similar_property' && <MessageSquare className="w-5 h-5" />}
                          {alert.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)} notifications •{' '}
                          {alert.matchCount || 0} matches
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAlert(alert.id, false)}
                        >
                          <BellOff className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Criteria */}
                      {alert.criteria.priceRange && (
                        <div className="text-sm">
                          <span className="font-medium">Price Range:</span>{' '}
                          ₦{alert.criteria.priceRange.min.toLocaleString()} - ₦
                          {alert.criteria.priceRange.max.toLocaleString()}
                        </div>
                      )}

                      {/* Channels */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {alert.channels.email && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            <Mail className="w-3 h-3" />
                            Email
                          </span>
                        )}
                        {alert.channels.sms && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            <Smartphone className="w-3 h-3" />
                            SMS
                          </span>
                        )}
                        {alert.channels.push && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            <Bell className="w-3 h-3" />
                            Push
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            {inactiveAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No inactive alerts</p>
                </CardContent>
              </Card>
            ) : (
              inactiveAlerts.map((alert) => (
                <Card key={alert.id} className="opacity-60">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {alert.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardTitle>
                        <CardDescription>Paused</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAlert(alert.id, true)}
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
