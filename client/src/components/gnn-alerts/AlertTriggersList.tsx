import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, X, ExternalLink, Heart, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "wouter";

interface AlertTriggersListProps {
  triggers: any[];
  onRefresh: () => void;
  alertTypeIcons: Record<string, any>;
  alertTypeLabels: Record<string, string>;
}

export function AlertTriggersList({
  triggers,
  onRefresh,
  alertTypeIcons,
  alertTypeLabels,
}: AlertTriggersListProps) {
  const [, navigate] = useRouter();

  const markViewedMutation = trpc.gnnAlerts.markAlertViewed.useMutation({
    onSuccess: () => {
      onRefresh();
    },
  });

  const markDismissedMutation = trpc.gnnAlerts.markAlertDismissed.useMutation({
    onSuccess: () => {
      toast.success("Alert dismissed");
      onRefresh();
    },
  });

  const trackActionMutation = trpc.gnnAlerts.trackAlertAction.useMutation();

  const handleViewProperty = (triggerId: number, propertyId: number) => {
    if (!markViewedMutation.isPending) {
      markViewedMutation.mutate({ triggerId });
    }
    trackActionMutation.mutate({ triggerId, action: 'viewed_property' });
    navigate(`/properties/${propertyId}`);
  };

  const handleDismiss = (triggerId: number) => {
    markDismissedMutation.mutate({ triggerId });
  };

  if (triggers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Eye className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Alerts Yet</h3>
          <p className="text-muted-foreground text-center">
            When the GNN detects opportunities matching your criteria, they'll appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {triggers.map((trigger) => {
        const Icon = alertTypeIcons[trigger.alertType];
        const isViewed = trigger.userViewed === 1;
        const isDismissed = trigger.userDismissed === 1;

        if (isDismissed) return null;

        return (
          <Card key={trigger.id} className={!isViewed ? "border-primary" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${!isViewed ? "bg-primary/10" : "bg-muted"}`}>
                  <Icon className={`h-5 w-5 ${!isViewed ? "text-primary" : "text-muted-foreground"}`} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{trigger.title}</h4>
                        {!isViewed && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {trigger.message}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(trigger.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-wrap gap-2">
                    {trigger.investmentScore && (
                      <Badge variant="secondary" className="text-xs">
                        Investment Score: {trigger.investmentScore}/100
                      </Badge>
                    )}
                    {trigger.undervaluedPercent && (
                      <Badge variant="secondary" className="text-xs">
                        {trigger.undervaluedPercent.toFixed(1)}% Undervalued
                      </Badge>
                    )}
                    {trigger.trendStrength && (
                      <Badge variant="secondary" className="text-xs">
                        Trend: {(trigger.trendStrength * 100).toFixed(0)}%
                      </Badge>
                    )}
                    {trigger.growthPotential && (
                      <Badge variant="secondary" className="text-xs">
                        Growth: {trigger.growthPotential}/100
                      </Badge>
                    )}
                    {trigger.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {(trigger.confidence * 100).toFixed(0)}% Confidence
                      </Badge>
                    )}
                  </div>

                  {/* Reasoning */}
                  {trigger.reasoning && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <strong>Why this alert:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {Object.entries(trigger.reasoning).slice(0, 3).map(([key, value]: [string, any]) => (
                          <li key={key}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}: {typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleViewProperty(trigger.id, trigger.propertyId)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Property
                    </Button>
                    {!isViewed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markViewedMutation.mutate({ triggerId: trigger.id })}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Mark as Read
                      </Button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground">
                    {new Date(trigger.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
