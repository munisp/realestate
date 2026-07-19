import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, Plus, Settings, TrendingUp, Target, Zap, BarChart3, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { CreateAlertDialog } from "@/components/gnn-alerts/CreateAlertDialog";
import { AlertTriggersList } from "@/components/gnn-alerts/AlertTriggersList";
import { AlertSubscriptionCard } from "@/components/gnn-alerts/AlertSubscriptionCard";

/**
 * GNN Alerts Page
 * Manage GNN-powered property alerts and view triggered notifications
 */
export default function GnnAlerts() {
  const { user, loading: authLoading } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);

  // Fetch data
  const { data: subscriptions, isLoading: subscriptionsLoading, refetch: refetchSubscriptions } = 
    trpc.gnnAlerts.getMySubscriptions.useQuery(undefined, {
      enabled: !!user,
    });

  const { data: triggers, isLoading: triggersLoading, refetch: refetchTriggers } = 
    trpc.gnnAlerts.getMyAlertTriggers.useQuery({ limit: 50 }, {
      enabled: !!user,
    });

  const { data: stats } = trpc.gnnAlerts.getAlertStats.useQuery(undefined, {
    enabled: !!user,
  });

  // Mutations
  const toggleMutation = trpc.gnnAlerts.toggleSubscription.useMutation({
    onSuccess: () => {
      toast.success("Alert subscription updated");
      refetchSubscriptions();
    },
    onError: (error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });

  const deleteMutation = trpc.gnnAlerts.deleteSubscription.useMutation({
    onSuccess: () => {
      toast.success("Alert subscription deleted");
      refetchSubscriptions();
    },
    onError: (error) => {
      toast.error(`Failed to delete subscription: ${error.message}`);
    },
  });

  const handleToggleSubscription = (subscriptionId: number, isActive: boolean) => {
    toggleMutation.mutate({ subscriptionId, isActive: !isActive });
  };

  const handleDeleteSubscription = (subscriptionId: number) => {
    if (confirm("Are you sure you want to delete this alert subscription?")) {
      deleteMutation.mutate({ subscriptionId });
    }
  };

  const handleEditSubscription = (subscription: any) => {
    setEditingSubscription(subscription);
    setCreateDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to manage your GNN alerts</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const alertTypeIcons: Record<string, any> = {
    undervalued: Target,
    market_trend: TrendingUp,
    investment_opportunity: Zap,
    price_momentum: BarChart3,
  };

  const alertTypeLabels: Record<string, string> = {
    undervalued: "Undervalued Properties",
    market_trend: "Market Trends",
    investment_opportunity: "Investment Opportunities",
    price_momentum: "Price Momentum",
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GNN Alerts</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered property alerts using Graph Neural Networks
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create Alert
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitoring for opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unviewed Alerts</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unviewedAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                New opportunities waiting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time notifications
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <Settings className="mr-2 h-4 w-4" />
            My Subscriptions
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="mr-2 h-4 w-4" />
            Alert History
            {stats && stats.unviewedAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.unviewedAlerts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          {subscriptionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading subscriptions...</p>
              </div>
            </div>
          ) : subscriptions && subscriptions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subscriptions.map((subscription) => (
                <AlertSubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onToggle={handleToggleSubscription}
                  onEdit={handleEditSubscription}
                  onDelete={handleDeleteSubscription}
                  alertTypeIcon={alertTypeIcons[subscription.alertType]}
                  alertTypeLabel={alertTypeLabels[subscription.alertType]}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Alert Subscriptions</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first GNN alert to start receiving intelligent property notifications
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Alert
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts History Tab */}
        <TabsContent value="alerts">
          {triggersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading alerts...</p>
              </div>
            </div>
          ) : (
            <AlertTriggersList
              triggers={triggers || []}
              onRefresh={refetchTriggers}
              alertTypeIcons={alertTypeIcons}
              alertTypeLabels={alertTypeLabels}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Alert Dialog */}
      <CreateAlertDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingSubscription(null);
          }
        }}
        editingSubscription={editingSubscription}
        onSuccess={() => {
          refetchSubscriptions();
          setCreateDialogOpen(false);
          setEditingSubscription(null);
        }}
      />
    </div>
  );
}
