import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, AlertTriangle, TrendingDown, TrendingUp,
  MapPin, Clock, Info
} from "lucide-react";

interface NeighborhoodCrimeSafetyProps {
  propertyId: number;
  latitude: number;
  longitude: number;
}

export default function NeighborhoodCrimeSafety({ propertyId, latitude, longitude }: NeighborhoodCrimeSafetyProps) {
  const [timeRange, setTimeRange] = useState("30days");

  // Mock data - in production, this would come from crime data APIs
  const safetyScore = 72; // Out of 100
  const cityAverage = 65;

  const crimeStats = {
    total: 24,
    change: -12, // -12% from previous period
    byType: [
      { type: "Theft", count: 12, severity: "medium", color: "text-orange-600" },
      { type: "Vandalism", count: 6, severity: "low", color: "text-yellow-600" },
      { type: "Assault", count: 4, severity: "high", color: "text-red-600" },
      { type: "Burglary", count: 2, severity: "high", color: "text-red-600" },
    ],
    bySeverity: [
      { severity: "High", count: 6, percentage: 25 },
      { severity: "Medium", count: 12, percentage: 50 },
      { severity: "Low", count: 6, percentage: 25 },
    ],
  };

  const recentIncidents = [
    {
      id: 1,
      type: "Theft",
      description: "Vehicle break-in",
      date: "2024-01-18",
      time: "2:30 AM",
      distance: "0.3 miles",
      severity: "medium",
    },
    {
      id: 2,
      type: "Vandalism",
      description: "Graffiti on public property",
      date: "2024-01-15",
      time: "11:00 PM",
      distance: "0.5 miles",
      severity: "low",
    },
    {
      id: 3,
      type: "Assault",
      description: "Altercation",
      date: "2024-01-12",
      time: "9:45 PM",
      distance: "0.7 miles",
      severity: "high",
    },
  ];

  const policeResponse = {
    averageTime: "8 minutes",
    nearestStation: "Central Police Station",
    stationDistance: "1.2 miles",
  };

  const getSafetyBadge = (score: number) => {
    if (score >= 80) return { label: "Very Safe", variant: "default" as const, color: "text-green-600" };
    if (score >= 60) return { label: "Safe", variant: "secondary" as const, color: "text-blue-600" };
    if (score >= 40) return { label: "Moderate", variant: "secondary" as const, color: "text-yellow-600" };
    return { label: "Needs Attention", variant: "destructive" as const, color: "text-red-600" };
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", color: string }> = {
      high: { variant: "destructive", color: "bg-red-100 dark:bg-red-950" },
      medium: { variant: "secondary", color: "bg-orange-100 dark:bg-orange-950" },
      low: { variant: "secondary", color: "bg-yellow-100 dark:bg-yellow-950" },
    };
    const config = variants[severity] || variants.medium;
    return <Badge variant={config.variant}>{severity}</Badge>;
  };

  const safetyBadge = getSafetyBadge(safetyScore);

  return (
    <div className="space-y-6">
      {/* Safety Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Neighborhood Safety Score
              </CardTitle>
              <CardDescription>Based on crime data within 1-mile radius</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl font-bold text-primary">{safetyScore}</div>
                <div>
                  <Badge variant={safetyBadge.variant} className="mb-2">
                    {safetyBadge.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">Out of 100</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">This Neighborhood</span>
                  <span className="font-semibold">{safetyScore}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${safetyScore}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">City Average</span>
                  <span className="font-semibold">{cityAverage}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-muted-foreground/50 rounded-full transition-all"
                    style={{ width: `${cityAverage}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {crimeStats.change < 0 ? (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-2xl font-bold ${crimeStats.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(crimeStats.change)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {crimeStats.change < 0 ? 'Decrease' : 'Increase'} in incidents vs previous period
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-2xl font-bold mb-1">{crimeStats.total}</p>
                <p className="text-sm text-muted-foreground">Total incidents in {timeRange === "30days" ? "30 days" : timeRange === "90days" ? "90 days" : "1 year"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Recent Incidents</TabsTrigger>
          <TabsTrigger value="police">Police Response</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Crime by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Crime by Type</CardTitle>
              <CardDescription>Breakdown of incidents by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {crimeStats.byType.map((crime, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{crime.type}</span>
                        {getSeverityBadge(crime.severity)}
                      </div>
                      <span className="font-semibold">{crime.count} incidents</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          crime.severity === 'high' ? 'bg-red-600' :
                          crime.severity === 'medium' ? 'bg-orange-600' :
                          'bg-yellow-600'
                        }`}
                        style={{ width: `${(crime.count / crimeStats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Crime by Severity */}
          <Card>
            <CardHeader>
              <CardTitle>Crime by Severity</CardTitle>
              <CardDescription>Distribution of incident severity levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {crimeStats.bySeverity.map((item, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <div className={`text-3xl font-bold mb-2 ${
                      item.severity === 'High' ? 'text-red-600' :
                      item.severity === 'Medium' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>
                      {item.count}
                    </div>
                    <p className="text-sm font-medium mb-1">{item.severity} Severity</p>
                    <p className="text-xs text-muted-foreground">{item.percentage}% of total</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Heat Map */}
          <Card>
            <CardHeader>
              <CardTitle>Crime Heat Map</CardTitle>
              <CardDescription>Visual representation of crime density in the area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                {/* Mock heat map visualization */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div className="absolute top-4 right-4 bg-background/90 p-3 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span>High Activity</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-orange-600 rounded"></div>
                    <span>Medium Activity</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                    <span>Low Activity</span>
                  </div>
                </div>
                <p className="text-muted-foreground">Interactive map showing crime density</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          {recentIncidents.map((incident) => (
            <Card key={incident.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`w-5 h-5 ${
                        incident.severity === 'high' ? 'text-red-600' :
                        incident.severity === 'medium' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`} />
                      <h3 className="font-semibold">{incident.type}</h3>
                      {getSeverityBadge(incident.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{incident.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {incident.date} at {incident.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {incident.distance} away
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Police Response Tab */}
        <TabsContent value="police" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Police Response Time</CardTitle>
              <CardDescription>Average emergency response time in this area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-6">
                <div className="text-5xl font-bold text-primary mb-2">
                  {policeResponse.averageTime}
                </div>
                <p className="text-muted-foreground">Average response time</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nearest Police Station</CardTitle>
              <CardDescription>Closest law enforcement facility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold mb-1">{policeResponse.nearestStation}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {policeResponse.stationDistance} from property
                  </p>
                </div>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Map showing route to police station</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Safety Tips</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Install security cameras and alarm systems</li>
                    <li>• Keep outdoor areas well-lit at night</li>
                    <li>• Get to know your neighbors and join neighborhood watch</li>
                    <li>• Report suspicious activity to local police</li>
                    <li>• Secure doors and windows when away</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
