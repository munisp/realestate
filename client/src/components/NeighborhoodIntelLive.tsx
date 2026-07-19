import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, MapPin, School, ShoppingBag, Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface NeighborhoodIntelLiveProps {
  neighborhood: string;
  city: string;
}

export function NeighborhoodIntelLive({ neighborhood, city }: NeighborhoodIntelLiveProps) {
  const { data, isLoading, error } = trpc.gnn.getNeighborhoodIntel.useQuery({
    neighborhood,
    city,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Neighborhood Intelligence</CardTitle>
          <CardDescription>Loading neighborhood data...</CardDescription>
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
          <CardTitle>Neighborhood Intelligence</CardTitle>
          <CardDescription>Unable to load neighborhood data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading neighborhood intelligence. Please try again later.</p>
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Neighborhood Intelligence</CardTitle>
            <CardDescription>{neighborhood}, {city}</CardDescription>
          </div>
          <Badge variant="default">
            {getScoreBadge(data.overallScore)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center py-4 border-b">
          <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
          <p className={`text-4xl font-bold ${getScoreColor(data.overallScore)}`}>
            {data.overallScore.toFixed(0)}/100
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Walkability</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${data.walkabilityScore}%` }}
                />
              </div>
              <p className="text-sm font-semibold w-10 text-right">
                {data.walkabilityScore.toFixed(0)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Transit</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${data.transitScore}%` }}
                />
              </div>
              <p className="text-sm font-semibold w-10 text-right">
                {data.transitScore.toFixed(0)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Amenities</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${data.amenitiesScore}%` }}
                />
              </div>
              <p className="text-sm font-semibold w-10 text-right">
                {data.amenitiesScore.toFixed(0)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Safety</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${data.safetyScore}%` }}
                />
              </div>
              <p className="text-sm font-semibold w-10 text-right">
                {data.safetyScore.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* School Rating */}
        <div className="flex items-center justify-between py-3 border-y">
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">School Rating</span>
          </div>
          <span className="text-lg font-bold">{data.schoolRating.toFixed(1)}/10</span>
        </div>

        {/* Nearby Amenities */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Nearby Amenities
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {data.nearbyAmenities.map((amenity, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  {amenity.type === "Restaurants" && <ShoppingBag className="h-4 w-4" />}
                  {amenity.type === "Schools" && <School className="h-4 w-4" />}
                  {amenity.type === "Healthcare" && <Heart className="h-4 w-4" />}
                  {amenity.type === "Shopping" && <ShoppingBag className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{amenity.count} {amenity.type}</p>
                  <p className="text-xs text-muted-foreground">
                    Avg {amenity.averageDistance.toFixed(1)}km away
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demographics */}
        <div>
          <h4 className="font-semibold mb-3">Demographics</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Median Income</p>
              <p className="text-sm font-semibold">
                {formatCurrency(data.demographics.medianIncome)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pop. Density</p>
              <p className="text-sm font-semibold">
                {data.demographics.populationDensity.toFixed(0)}/km²
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg Age</p>
              <p className="text-sm font-semibold">
                {data.demographics.averageAge.toFixed(0)} years
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
