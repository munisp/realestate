import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Train, Bus, Clock, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TransitAccessibilityLiveProps {
  propertyId: number;
}

export function TransitAccessibilityLive({ propertyId }: TransitAccessibilityLiveProps) {
  const { data, isLoading, error } = trpc.gnn.getTransitAccessibility.useQuery({
    propertyId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transit Accessibility</CardTitle>
          <CardDescription>Loading transit data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transit Accessibility</CardTitle>
          <CardDescription>Unable to load transit data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading transit accessibility. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Fair";
  };

  const getTransitIcon = (type: string) => {
    if (type.toLowerCase().includes("metro") || type.toLowerCase().includes("rail")) {
      return <Train className="h-4 w-4" />;
    }
    return <Bus className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transit Accessibility</CardTitle>
            <CardDescription>Public transportation analysis</CardDescription>
          </div>
          <Badge variant="default">
            {getScoreBadge(data.transitScore)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transit Score */}
        <div className="text-center py-4 border-b">
          <p className="text-sm text-muted-foreground mb-2">Transit Score</p>
          <p className={`text-4xl font-bold ${getScoreColor(data.transitScore)}`}>
            {data.transitScore.toFixed(0)}/100
          </p>
        </div>

        {/* Nearest Stations */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Nearest Stations
          </h4>
          <div className="space-y-3">
            {data.nearestStations.map((station, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {getTransitIcon(station.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-medium">{station.name}</p>
                      <p className="text-xs text-muted-foreground">{station.type}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {station.distance.toFixed(1)}km
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {station.walkTime} min walk
                    </span>
                    <span>
                      {station.lines.join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Peak Hour Frequency</p>
            <p className="text-lg font-semibold">Every {data.peakHourFrequency} min</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Off-Peak Frequency</p>
            <p className="text-lg font-semibold">Every {data.offPeakFrequency} min</p>
          </div>
        </div>

        {/* Commute Estimates */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Commute Estimates
          </h4>
          <div className="space-y-2">
            {data.commuteEstimates.map((commute, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{commute.destination}</p>
                  <p className="text-xs text-muted-foreground">
                    {commute.transfers === 0 ? "Direct" : `${commute.transfers} transfer${commute.transfers > 1 ? 's' : ''}`}
                  </p>
                </div>
                <Badge variant="secondary">
                  {commute.duration} min
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
