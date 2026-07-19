import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Train, MapPin, Clock, TrendingUp } from "lucide-react";

interface TransitStop {
  id: string;
  name: string;
  type: 'bus' | 'train' | 'metro';
  distance: number;
  routes: string[];
}

interface CommuteZone {
  duration: number; // minutes
  coverage: number; // percentage of city accessible
  destinations: string[];
}

interface TransitAccessibilityData {
  propertyLocation: { lat: number; lng: number };
  transitScore: number;
  nearbyStops: TransitStop[];
  commuteZones: CommuteZone[];
  peakHourFrequency: number; // minutes between services
  offPeakFrequency: number;
  accessibility24h: boolean;
}

interface TransitAccessibilityProps {
  data: TransitAccessibilityData;
}

export function TransitAccessibility({ data }: TransitAccessibilityProps) {
  const getTransitIcon = (type: string) => {
    switch (type) {
      case 'train':
      case 'metro':
        return <Train className="h-4 w-4" />;
      default:
        return <Bus className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Transit';
    if (score >= 60) return 'Good Transit';
    if (score >= 40) return 'Some Transit';
    return 'Limited Transit';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Transit Accessibility
            </CardTitle>
            <CardDescription>
              GTFS-powered public transportation analysis
            </CardDescription>
          </div>
          <Badge className={getScoreColor(data.transitScore)}>
            {getScoreLabel(data.transitScore)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Transit Score Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Transit Score</p>
              <p className="text-2xl font-bold">{data.transitScore}/100</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Nearby Stops</p>
              <p className="text-2xl font-bold">{data.nearbyStops.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Peak Frequency</p>
              <p className="text-2xl font-bold">{data.peakHourFrequency}min</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">24/7 Service</p>
              <p className="text-2xl font-bold">{data.accessibility24h ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Nearby Transit Stops */}
          <div>
            <h4 className="font-medium mb-3">Nearby Transit Stops</h4>
            <div className="space-y-2">
              {data.nearbyStops.slice(0, 5).map((stop) => (
                <div key={stop.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getTransitIcon(stop.type)}</div>
                    <div>
                      <p className="font-medium">{stop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stop.routes.length} route{stop.routes.length > 1 ? 's' : ''}: {stop.routes.slice(0, 3).join(', ')}
                        {stop.routes.length > 3 && ` +${stop.routes.length - 3} more`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{stop.distance}m</p>
                    <p className="text-xs text-muted-foreground">{Math.ceil(stop.distance / 80)} min walk</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Minute Commute Zones */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Commute Time Analysis
            </h4>
            <div className="space-y-3">
              {data.commuteZones.map((zone, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{zone.duration}-Minute Commute</span>
                    <Badge variant="outline">{zone.coverage}% Coverage</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Accessible destinations: {zone.destinations.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Service Frequency */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">Service Frequency</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Peak Hours (7-9 AM, 5-7 PM)</p>
                <p className="text-lg font-semibold">Every {data.peakHourFrequency} minutes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Off-Peak Hours</p>
                <p className="text-lg font-semibold">Every {data.offPeakFrequency} minutes</p>
              </div>
            </div>
          </div>

          {/* Transit Insights */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Transit Value Impact
            </h4>
            <p className="text-sm text-muted-foreground">
              {data.transitScore >= 70 && (
                <>
                  Excellent transit access can increase property values by <strong>10-20%</strong> and reduce
                  transportation costs significantly. This location offers strong connectivity to major destinations.
                </>
              )}
              {data.transitScore >= 40 && data.transitScore < 70 && (
                <>
                  Good transit access provides convenient commuting options and can positively impact property values.
                  Consider proximity to stops and service frequency for daily needs.
                </>
              )}
              {data.transitScore < 40 && (
                <>
                  Limited transit access means residents will likely rely on personal vehicles. This may affect
                  property appeal for buyers prioritizing public transportation.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
