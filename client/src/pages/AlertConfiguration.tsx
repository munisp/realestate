import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Settings, Trash2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

export default function AlertConfiguration() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: configurations, isPending: isLoading } = trpc.alertManagement.getConfigurations.useQuery();
  const { data: stats } = trpc.alertManagement.getStatistics.useQuery({ days: 7 });

  const createMutation = trpc.alertManagement.createConfiguration.useMutation({
    onSuccess: () => {
      toast.success("Alert configuration created");
      utils.alertManagement.getConfigurations.invalidate();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create alert: ${error.message}`);
    },
  });

  const updateMutation = trpc.alertManagement.updateConfiguration.useMutation({
    onSuccess: () => {
      toast.success("Alert configuration updated");
      utils.alertManagement.getConfigurations.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update alert: ${error.message}`);
    },
  });

  const deleteMutation = trpc.alertManagement.deleteConfiguration.useMutation({
    onSuccess: () => {
      toast.success("Alert configuration deleted");
      utils.alertManagement.getConfigurations.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete alert: ${error.message}`);
    },
  });

  const evaluateMutation = trpc.alertManagement.evaluateNow.useMutation({
    onSuccess: (data) => {
      toast.success(`Evaluated all alerts. ${data.alertsTriggered} alerts triggered.`);
      utils.alertManagement.getHistory.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to evaluate alerts: ${error.message}`);
    },
  });

  const handleToggleEnabled = (id: number, enabled: boolean) => {
    updateMutation.mutate({ id, enabled: !enabled });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this alert configuration?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "default";
      case "info":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Alert Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure automated alerts for monitoring metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => evaluateMutation.mutate()}
            disabled={evaluateMutation.isPending}
          >
            <Settings className="h-4 w-4 mr-2" />
            Evaluate Now
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <CreateAlertDialog
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </Dialog>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Alerts (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.bySeverity.critical || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.bySeverity.warning || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgResolutionTimeMinutes)} min</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert Configurations */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading configurations...
            </CardContent>
          </Card>
        ) : configurations && configurations.length > 0 ? (
          configurations.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(config.severity)}
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      {config.description && (
                        <CardDescription className="mt-1">{config.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(config.severity)}>{config.severity}</Badge>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={() => handleToggleEnabled(config.id, config.enabled)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Service</div>
                    <div className="font-medium">{config.serviceName || "All"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Metric</div>
                    <div className="font-medium">{config.metricName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Threshold</div>
                    <div className="font-medium">
                      {config.comparisonOperator} {config.thresholdValue}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Notifications</div>
                    <div className="flex gap-1">
                      {config.emailEnabled && <Badge variant="outline">Email</Badge>}
                      {config.smsEnabled && <Badge variant="outline">SMS</Badge>}
                      {config.webhookEnabled && <Badge variant="outline">Webhook</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Alert Configurations</h3>
              <p className="text-muted-foreground mb-4">
                Create your first alert configuration to start monitoring
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CreateAlertDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    alertType: "response_time" as const,
    serviceName: "",
    metricName: "response_time",
    thresholdValue: 1000,
    comparisonOperator: "gt" as const,
    evaluationWindow: 300,
    severity: "warning" as const,
    emailEnabled: true,
    smsEnabled: false,
    webhookEnabled: false,
    emailRecipients: "",
    cooldownPeriod: 1800,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      emailRecipients: formData.emailRecipients
        ? formData.emailRecipients.split(",").map((e) => e.trim())
        : [],
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Alert Configuration</DialogTitle>
        <DialogDescription>
          Configure a new alert to monitor service metrics
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Alert Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alertType">Alert Type *</Label>
              <Select
                value={formData.alertType}
                onValueChange={(value: any) => setFormData({ ...formData, alertType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_health">Service Health</SelectItem>
                  <SelectItem value="response_time">Response Time</SelectItem>
                  <SelectItem value="error_rate">Error Rate</SelectItem>
                  <SelectItem value="cache_hit_rate">Cache Hit Rate</SelectItem>
                  <SelectItem value="cost_threshold">Cost Threshold</SelectItem>
                  <SelectItem value="api_quota">API Quota</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name</Label>
              <Select
                value={formData.serviceName}
                onValueChange={(value) => setFormData({ ...formData, serviceName: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Services</SelectItem>
                  <SelectItem value="earth-engine">Earth Engine</SelectItem>
                  <SelectItem value="world-bank">World Bank</SelectItem>
                  <SelectItem value="propertypro">PropertyPro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="thresholdValue">Threshold Value *</Label>
              <Input
                id="thresholdValue"
                type="number"
                value={formData.thresholdValue}
                onChange={(e) =>
                  setFormData({ ...formData, thresholdValue: parseFloat(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comparisonOperator">Operator *</Label>
              <Select
                value={formData.comparisonOperator}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, comparisonOperator: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                  <SelectItem value="gte">Greater or Equal (≥)</SelectItem>
                  <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                  <SelectItem value="lte">Less or Equal (≤)</SelectItem>
                  <SelectItem value="eq">Equal (=)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label>Notification Channels</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailEnabled" className="font-normal">
                Email Notifications
              </Label>
              <Switch
                id="emailEnabled"
                checked={formData.emailEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, emailEnabled: checked })}
              />
            </div>
            {formData.emailEnabled && (
              <div className="space-y-2">
                <Label htmlFor="emailRecipients">Email Recipients (comma-separated)</Label>
                <Input
                  id="emailRecipients"
                  placeholder="admin@example.com, ops@example.com"
                  value={formData.emailRecipients}
                  onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="evaluationWindow">Evaluation Window (seconds)</Label>
              <Input
                id="evaluationWindow"
                type="number"
                value={formData.evaluationWindow}
                onChange={(e) =>
                  setFormData({ ...formData, evaluationWindow: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldownPeriod">Cooldown Period (seconds)</Label>
              <Input
                id="cooldownPeriod"
                type="number"
                value={formData.cooldownPeriod}
                onChange={(e) =>
                  setFormData({ ...formData, cooldownPeriod: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Alert"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
