import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Footprints, 
  Bus, 
  MapPin, 
  TrendingUp, 
  Network,
  Coffee,
  ShoppingBag,
  GraduationCap,
  Hospital
} from "lucide-react";

interface NeighborhoodIntelData {
  neighborhoodId: string;
  neighborhoodName: string;
  walkabilityScore: number;
  transitScore: number;
  amenityDensity: number;
  networkCentrality: number;
  growthPotential: number;
  investmentScore: number;
  streetNetworkMetrics?: {
    totalLength: number;
    intersectionDensity: number;
    connectivity: number;
  };
  transitAccessibility?: {
    stopsWithin500m: number;
    routesAvailable: number;
    avgWaitTime: number;
  };
  nearbyAmenities?: {
    restaurants: number;
    shops: number;
    schools: number;
    hospitals: number;
  };
}

interface EnhancedNeighborhoodIntelProps {
  data: NeighborhoodIntelData;
}

export function EnhancedNeighborhoodIntel({ data }: EnhancedNeighborhoodIntelProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Limited';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          {data.neighborhoodName} Intelligence
        </CardTitle>
        <CardDescription>
          GNN-powered neighborhood analysis with spatial network metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Scores */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Walkability */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Walkability</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(data.walkabilityScore)}`}>
                  {data.walkabilityScore.toFixed(0)}
                </span>
              </div>
              <Progress value={data.walkabilityScore} className="h-2" />
              <p className="text-xs text-muted-foreground">{getScoreLabel(data.walkabilityScore)}</p>
            </div>

            {/* Transit Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Transit</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(data.transitScore)}`}>
                  {data.transitScore.toFixed(0)}
                </span>
              </div>
              <Progress value={data.transitScore} className="h-2" />
              <p className="text-xs text-muted-foreground">{getScoreLabel(data.transitScore)}</p>
            </div>

            {/* Growth Potential */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Growth</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(data.growthPotential)}`}>
                  {data.growthPotential.toFixed(0)}
                </span>
              </div>
              <Progress value={data.growthPotential} className="h-2" />
              <p className="text-xs text-muted-foreground">{getScoreLabel(data.growthPotential)}</p>
            </div>

            {/* Investment Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Investment</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(data.investmentScore)}`}>
                  {data.investmentScore.toFixed(0)}
                </span>
              </div>
              <Progress value={data.investmentScore} className="h-2" />
              <p className="text-xs text-muted-foreground">{getScoreLabel(data.investmentScore)}</p>
            </div>

            {/* Amenity Density */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Amenities</span>
                </div>
                <span className="text-sm font-bold">
                  {data.amenityDensity.toFixed(1)}/km²
                </span>
              </div>
              <Progress value={Math.min(data.amenityDensity * 2, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {data.amenityDensity > 30 ? 'High' : data.amenityDensity > 15 ? 'Medium' : 'Low'} density
              </p>
            </div>

            {/* Network Centrality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Centrality</span>
                </div>
                <span className="text-sm font-bold">
                  {(data.networkCentrality * 100).toFixed(0)}
                </span>
              </div>
              <Progress value={data.networkCentrality * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">Network position</p>
            </div>
          </div>

          {/* Street Network Metrics */}
          {data.streetNetworkMetrics && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Footprints className="h-4 w-4" />
                Street Network Analysis
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Length</p>
                  <p className="font-semibold">{(data.streetNetworkMetrics.totalLength / 1000).toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Intersections</p>
                  <p className="font-semibold">{data.streetNetworkMetrics.intersectionDensity.toFixed(1)}/km²</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Connectivity</p>
                  <p className="font-semibold">{(data.streetNetworkMetrics.connectivity * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Transit Accessibility */}
          {data.transitAccessibility && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Bus className="h-4 w-4" />
                Public Transit Access
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nearby Stops</p>
                  <p className="font-semibold">{data.transitAccessibility.stopsWithin500m} stops</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Routes</p>
                  <p className="font-semibold">{data.transitAccessibility.routesAvailable} routes</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Wait</p>
                  <p className="font-semibold">{data.transitAccessibility.avgWaitTime} min</p>
                </div>
              </div>
            </div>
          )}

          {/* Nearby Amenities */}
          {data.nearbyAmenities && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Nearby Amenities (within 1km)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{data.nearbyAmenities.restaurants}</p>
                    <p className="text-muted-foreground">Restaurants</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{data.nearbyAmenities.shops}</p>
                    <p className="text-muted-foreground">Shops</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{data.nearbyAmenities.schools}</p>
                    <p className="text-muted-foreground">Schools</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Hospital className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{data.nearbyAmenities.hospitals}</p>
                    <p className="text-muted-foreground">Hospitals</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Investment Insight */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-medium mb-2">Investment Insight</h4>
            <p className="text-sm text-muted-foreground">
              {data.investmentScore >= 75 && (
                <>
                  This neighborhood shows <strong>strong investment potential</strong> with excellent walkability,
                  transit access, and growth indicators. The high network centrality suggests strategic location value.
                </>
              )}
              {data.investmentScore >= 50 && data.investmentScore < 75 && (
                <>
                  This neighborhood shows <strong>moderate investment potential</strong> with good accessibility
                  and decent growth prospects. Consider long-term appreciation potential.
                </>
              )}
              {data.investmentScore < 50 && (
                <>
                  This neighborhood shows <strong>developing investment potential</strong>. Lower scores may indicate
                  opportunities for value appreciation as infrastructure improves.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
