/**
 * GNN Alert Management
 * --------------------
 * Manage predictive alerts for market trends, undervalued properties,
 * and neighborhood growth using GNN spatial intelligence.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  TrendingUp,
  DollarSign,
  MapPin,
  Zap,
  Target,
  Mail,
  Smartphone,
  Check,
  X,
  Plus,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

type AlertType = 'market_trend' | 'undervalued_property' | 'neighborhood_growth' | 'price_momentum' | 'investment_opportunity';

interface AlertSubscription {
  id: number;
  alertType: AlertType;
  filters: any;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  confidenceThreshold: number;
  minInvestmentScore: number;
  enabled: boolean;
  lastTriggered?: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAlertIcon(type: AlertType) {
  switch (type) {
    case 'market_trend':
      return <TrendingUp className="h-5 w-5" />;
    case 'undervalued_property':
      return <DollarSign className="h-5 w-5" />;
    case 'neighborhood_growth':
      return <MapPin className="h-5 w-5" />;
    case 'price_momentum':
      return <Zap className="h-5 w-5" />;
    case 'investment_opportunity':
      return <Target className="h-5 w-5" />;
  }
}

function getAlertTitle(type: AlertType): string {
  switch (type) {
    case 'market_trend':
      return 'Market Trend Alerts';
    case 'undervalued_property':
      return 'Undervalued Properties';
    case 'neighborhood_growth':
      return 'Neighborhood Growth';
    case 'price_momentum':
      return 'Price Momentum';
    case 'investment_opportunity':
      return 'Investment Opportunities';
  }
}

function getAlertDescription(type: AlertType): string {
  switch (type) {
    case 'market_trend':
      return 'Get notified when GNN detects significant market trends in your areas of interest';
    case 'undervalued_property':
      return 'Discover properties that are priced below their predicted market value';
    case 'neighborhood_growth':
      return 'Track emerging neighborhoods with high growth potential';
    case 'price_momentum':
      return 'Monitor rapid price changes and momentum shifts';
    case 'investment_opportunity':
      return 'Receive alerts for high-scoring investment opportunities based on spatial analysis';
  }
}

// ============================================================================
// Component
// ============================================================================

export default function GNNAlertManagement() {
  const [selectedType, setSelectedType] = useState<AlertType>('market_trend');
  const [confidenceThreshold, setConfidenceThreshold] = useState([80]);
  const [investmentScore, setInvestmentScore] = useState([70]);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  // Fetch real subscriptions from backend
  const { data: subscriptions = [], refetch: refetchSubscriptions } = trpc.gnn.getAlertSubscriptions.useQuery();
  const { data: triggers = [] } = trpc.gnn.getAlertTriggers.useQuery({ limit: 20 });
  
  const createAlertMutation = trpc.gnn.createAlertSubscription.useMutation({
    onSuccess: () => {
      refetchSubscriptions();
      toast.success(`Created ${getAlertTitle(selectedType)} alert`);
    },
    onError: () => {
      toast.error('Failed to create alert');
    }
  });
  
  const toggleAlertMutation = trpc.gnn.toggleAlertSubscription.useMutation({
    onSuccess: () => {
      refetchSubscriptions();
    }
  });
  
  const deleteAlertMutation = trpc.gnn.deleteAlertSubscription.useMutation({
    onSuccess: () => {
      refetchSubscriptions();
      toast.success('Alert deleted');
    }
  });

  // Mock data for demonstration (fallback)
  const mockSubscriptions: AlertSubscription[] = subscriptions.length > 0 ? subscriptions.map(sub => ({
    id: sub.id,
    alertType: sub.alertType as AlertType,
    filters: sub.filters ? JSON.parse(sub.filters) : {},
    emailEnabled: sub.emailEnabled === 1,
    smsEnabled: sub.smsEnabled === 1,
    pushEnabled: sub.pushEnabled === 1,
    confidenceThreshold: sub.confidenceThreshold || 80,
    minInvestmentScore: sub.minInvestmentScore || 70,
    enabled: sub.enabled === 1,
    lastTriggered: sub.lastTriggered || undefined,
  })) : [
    {
      id: 1,
      alertType: 'market_trend',
      filters: { cities: ['Lagos', 'Abuja'] },
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      confidenceThreshold: 80,
      minInvestmentScore: 70,
      enabled: true,
      lastTriggered: new Date('2025-11-20'),
    },
    {
      id: 2,
      alertType: 'undervalued_property',
      filters: { priceRange: { min: 50000000, max: 150000000 } },
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      confidenceThreshold: 85,
      minInvestmentScore: 75,
      enabled: true,
    },
  ];

  const mockTriggers = triggers.length > 0 ? triggers.map(trigger => ({
    id: trigger.id,
    alertType: trigger.alertType,
    alertData: trigger.alertData ? JSON.parse(trigger.alertData) : {},
    confidence: trigger.confidence || 0,
    triggeredAt: trigger.triggeredAt,
    viewed: trigger.viewed === 1,
  })) : [
    {
      id: 1,
      alertType: 'market_trend',
      alertData: {
        trend: 'upward',
        properties: [1, 2, 3],
        avgIncrease: 12.5,
      },
      confidence: 88,
      triggeredAt: new Date('2025-11-20T10:30:00'),
      viewed: true,
    },
    {
      id: 2,
      alertType: 'undervalued_property',
      alertData: {
        propertyId: 42,
        predictedValue: 95000000,
        currentPrice: 75000000,
        discount: 21,
      },
      confidence: 92,
      triggeredAt: new Date('2025-11-19T15:45:00'),
      viewed: false,
    },
  ];

  const handleCreateAlert = () => {
    createAlertMutation.mutate({
      alertType: selectedType,
      emailEnabled,
      smsEnabled,
      pushEnabled,
      confidenceThreshold: confidenceThreshold[0],
      minInvestmentScore: investmentScore[0],
    });
  };

  const handleToggleAlert = (id: number, enabled: boolean) => {
    toggleAlertMutation.mutate({ subscriptionId: id, enabled });
    toast.success(enabled ? 'Alert enabled' : 'Alert disabled');
  };

  const handleDeleteAlert = (id: number) => {
    deleteAlertMutation.mutate({ subscriptionId: id });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            GNN Predictive Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered notifications for market trends and investment opportunities
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Alert
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">My Alerts</TabsTrigger>
          <TabsTrigger value="triggered">Recent Triggers</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        {/* My Alerts Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          {mockSubscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(subscription.alertType)}
                    <div>
                      <CardTitle className="text-base">
                        {getAlertTitle(subscription.alertType)}
                      </CardTitle>
                      <CardDescription>
                        {getAlertDescription(subscription.alertType)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={subscription.enabled}
                      onCheckedChange={(checked) => handleToggleAlert(subscription.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAlert(subscription.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Notification Channels */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email</span>
                    {subscription.emailEnabled ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">SMS</span>
                    {subscription.smsEnabled ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Push</span>
                    {subscription.pushEnabled ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Thresholds */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence Threshold</p>
                    <p className="text-lg font-semibold">{subscription.confidenceThreshold}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Min Investment Score</p>
                    <p className="text-lg font-semibold">{subscription.minInvestmentScore}%</p>
                  </div>
                </div>

                {/* Last Triggered */}
                {subscription.lastTriggered && (
                  <div className="text-sm text-muted-foreground">
                    Last triggered:{' '}
                    {subscription.lastTriggered.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {mockSubscriptions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No alerts configured yet</p>
                <Button className="mt-4">Create Your First Alert</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recent Triggers Tab */}
        <TabsContent value="triggered" className="space-y-4">
          {mockTriggers.map((trigger) => (
            <Card key={trigger.id} className={!trigger.viewed ? 'border-blue-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(trigger.alertType as AlertType)}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {getAlertTitle(trigger.alertType as AlertType)}
                        {!trigger.viewed && <Badge variant="default">New</Badge>}
                      </CardTitle>
                      <CardDescription>
                        {trigger.triggeredAt.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{trigger.confidence}% confidence</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {trigger.alertType === 'market_trend' && (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Trend:</strong> {trigger.alertData.trend}
                    </p>
                    <p className="text-sm">
                      <strong>Properties affected:</strong> {trigger.alertData.properties.length}
                    </p>
                    <p className="text-sm">
                      <strong>Average increase:</strong> +{trigger.alertData.avgIncrease}%
                    </p>
                  </div>
                )}
                {trigger.alertType === 'undervalued_property' && (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Property ID:</strong> {trigger.alertData.propertyId}
                    </p>
                    <p className="text-sm">
                      <strong>Current Price:</strong> ₦
                      {trigger.alertData.currentPrice.toLocaleString()}
                    </p>
                    <p className="text-sm">
                      <strong>Predicted Value:</strong> ₦
                      {trigger.alertData.predictedValue.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 font-semibold">
                      {trigger.alertData.discount}% below market value
                    </p>
                  </div>
                )}
                <Button className="mt-4" size="sm">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Create New Alert Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Alert</CardTitle>
              <CardDescription>
                Configure a new GNN-powered alert for market intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alert Type */}
              <div className="space-y-2">
                <Label>Alert Type</Label>
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AlertType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market_trend">Market Trend Alerts</SelectItem>
                    <SelectItem value="undervalued_property">Undervalued Properties</SelectItem>
                    <SelectItem value="neighborhood_growth">Neighborhood Growth</SelectItem>
                    <SelectItem value="price_momentum">Price Momentum</SelectItem>
                    <SelectItem value="investment_opportunity">
                      Investment Opportunities
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{getAlertDescription(selectedType)}</p>
              </div>

              {/* Notification Channels */}
              <div className="space-y-3">
                <Label>Notification Channels</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">Email Notifications</span>
                    </div>
                    <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm">SMS Notifications</span>
                    </div>
                    <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span className="text-sm">Push Notifications</span>
                    </div>
                    <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                  </div>
                </div>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-2">
                <Label>Confidence Threshold: {confidenceThreshold[0]}%</Label>
                <Slider
                  value={confidenceThreshold}
                  onValueChange={setConfidenceThreshold}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-sm text-muted-foreground">
                  Only trigger alerts with at least this confidence level
                </p>
              </div>

              {/* Investment Score */}
              <div className="space-y-2">
                <Label>Minimum Investment Score: {investmentScore[0]}%</Label>
                <Slider
                  value={investmentScore}
                  onValueChange={setInvestmentScore}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-sm text-muted-foreground">
                  Filter opportunities by minimum investment potential score
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleCreateAlert} className="flex-1">
                  Create Alert
                </Button>
                <Button variant="outline">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
