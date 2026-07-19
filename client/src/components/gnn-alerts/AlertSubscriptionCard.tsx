import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, MapPin, Home, DollarSign, Bed, TrendingUp } from "lucide-react";

interface AlertSubscriptionCardProps {
  subscription: any;
  onToggle: (id: number, isActive: boolean) => void;
  onEdit: (subscription: any) => void;
  onDelete: (id: number) => void;
  alertTypeIcon: any;
  alertTypeLabel: string;
}

export function AlertSubscriptionCard({
  subscription,
  onToggle,
  onEdit,
  onDelete,
  alertTypeIcon: Icon,
  alertTypeLabel,
}: AlertSubscriptionCardProps) {
  const isActive = subscription.isActive === 1;

  return (
    <Card className={!isActive ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{alertTypeLabel}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {subscription.frequency} notifications
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={() => onToggle(subscription.id, isActive)}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters Summary */}
        <div className="space-y-2 text-sm">
          {subscription.cities && subscription.cities.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {subscription.cities.join(", ")}
              </span>
            </div>
          )}

          {subscription.neighborhoods && subscription.neighborhoods.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {subscription.neighborhoods.join(", ")}
              </span>
            </div>
          )}

          {subscription.propertyTypes && subscription.propertyTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {subscription.propertyTypes.join(", ")}
              </span>
            </div>
          )}

          {(subscription.minPrice || subscription.maxPrice) && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {subscription.minPrice ? `₦${(subscription.minPrice / 1000000).toFixed(1)}M` : "Any"} - {subscription.maxPrice ? `₦${(subscription.maxPrice / 1000000).toFixed(1)}M` : "Any"}
              </span>
            </div>
          )}

          {(subscription.minBedrooms || subscription.maxBedrooms) && (
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {subscription.minBedrooms || "Any"} - {subscription.maxBedrooms || "Any"} beds
              </span>
            </div>
          )}
        </div>

        {/* GNN Thresholds */}
        <div className="space-y-1">
          {subscription.minInvestmentScore && (
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Investment Score ≥ {subscription.minInvestmentScore}
            </Badge>
          )}
          {subscription.minUndervaluedPercent && (
            <Badge variant="secondary" className="text-xs ml-1">
              Undervalued ≥ {subscription.minUndervaluedPercent}%
            </Badge>
          )}
          {subscription.minTrendStrength && (
            <Badge variant="secondary" className="text-xs ml-1">
              Trend ≥ {subscription.minTrendStrength}
            </Badge>
          )}
          {subscription.minGrowthPotential && (
            <Badge variant="secondary" className="text-xs ml-1">
              Growth ≥ {subscription.minGrowthPotential}
            </Badge>
          )}
        </div>

        {/* Notification Channels */}
        <div className="flex flex-wrap gap-1">
          {subscription.notificationChannels.map((channel: string) => (
            <Badge key={channel} variant="outline" className="text-xs">
              {channel}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(subscription)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(subscription.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>

        {/* Last Notified */}
        {subscription.lastNotifiedAt && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last notified: {new Date(subscription.lastNotifiedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
