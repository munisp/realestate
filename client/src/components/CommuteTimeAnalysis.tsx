import { useMemo } from 'react';
import {
  calculateCommuteAnalysis,
  lagosBusinessDistricts,
  formatCommuteTime,
  getTrafficLevelColor,
  getTrafficLevelLabel,
  CommuteAnalysis,
} from '@/services/commuteAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  MapPin,
  TrendingUp,
  Navigation,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface CommuteTimeAnalysisProps {
  propertyLocation: {
    lat: number;
    lng: number;
  };
}

export default function CommuteTimeAnalysis({
  propertyLocation,
}: CommuteTimeAnalysisProps) {
  const analysis: CommuteAnalysis = useMemo(() => {
    return calculateCommuteAnalysis(propertyLocation);
  }, [propertyLocation]);

  const isPeakHour = () => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    if (day === 0 || day === 6) return false;
    return (hour >= 7 && hour < 10) || (hour >= 16 && hour < 20);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Commute Time Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Estimated commute times to major business districts
            </p>
          </div>
          <Badge variant={isPeakHour() ? 'destructive' : 'secondary'}>
            {isPeakHour() ? 'Peak Hours' : 'Off-Peak'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Best Commute
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCommuteTime(analysis.bestDistrict.durationCurrent)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              to {analysis.bestDistrict.districtName}
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Average Commute
            </div>
            <div className="text-2xl font-bold">
              {formatCommuteTime(analysis.averageCommute)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              across all districts
            </div>
          </div>
        </div>

        {/* Commute Details */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Commute Times by District</h4>
          {analysis.commutes.map((commute) => {
            const district = lagosBusinessDistricts.find(
              (d) => d.id === commute.districtId
            );
            if (!district) return null;

            const timeSavings = commute.durationPeak - commute.durationOffPeak;

            return (
              <div
                key={commute.districtId}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{district.icon}</span>
                      <h5 className="font-semibold">{district.name}</h5>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: getTrafficLevelColor(commute.trafficLevel),
                          color: getTrafficLevelColor(commute.trafficLevel),
                        }}
                      >
                        {getTrafficLevelLabel(commute.trafficLevel)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {district.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Current Time
                    </p>
                    <p className="text-lg font-bold">
                      {formatCommuteTime(commute.durationCurrent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Off-Peak
                    </p>
                    <p className="text-sm font-medium text-green-600">
                      {formatCommuteTime(commute.durationOffPeak)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Peak Hours
                    </p>
                    <p className="text-sm font-medium text-red-600">
                      {formatCommuteTime(commute.durationPeak)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Distance: {(commute.distance / 1000).toFixed(1)} km
                    </span>
                    <span className="text-muted-foreground">
                      Via {commute.route}
                    </span>
                  </div>

                  {timeSavings > 0 && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="text-amber-900 dark:text-amber-200">
                        Save <strong>{timeSavings} minutes</strong> by traveling
                        during off-peak hours
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  asChild
                >
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${propertyLocation.lat},${propertyLocation.lng}&destination=${district.location.lat},${district.location.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Route on Google Maps
                  </a>
                </Button>
              </div>
            );
          })}
        </div>

        {/* Traffic Pattern Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h5 className="font-medium text-sm mb-2">Lagos Traffic Patterns</h5>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>Peak Hours (Weekdays):</strong> 7:00 AM - 10:00 AM and 4:00
              PM - 8:00 PM
            </p>
            <p>
              <strong>Best Travel Times:</strong> Before 7:00 AM, 10:00 AM - 4:00
              PM, or after 8:00 PM
            </p>
            <p>
              <strong>Weekends:</strong> Generally lighter traffic throughout the
              day
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          * Commute times are estimates based on typical Lagos traffic patterns.
          Actual times may vary depending on road conditions, weather, and special
          events.
        </p>
      </CardContent>
    </Card>
  );
}
