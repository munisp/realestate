/**
 * Neighborhood Intelligence Component
 * Production-ready UI for displaying comprehensive neighborhood data
 */

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  School,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Bus,
  Bike,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Home,
  Users,
} from 'lucide-react';

interface NeighborhoodIntelligenceProps {
  lat: number;
  lng: number;
  address: string;
}

export default function NeighborhoodIntelligence({
  lat,
  lng,
  address,
}: NeighborhoodIntelligenceProps) {
  const { data, isLoading, error } = trpc.neighborhoodIntelligence.getNeighborhoodIntelligence.useQuery({
    lat,
    lng,
    address,
  });

  if (isLoading) {
    return <NeighborhoodIntelligenceSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
            <p>Failed to load neighborhood data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-500';
      case 'B':
        return 'bg-blue-500';
      case 'C':
        return 'bg-yellow-500';
      case 'D':
        return 'bg-orange-500';
      case 'F':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Neighborhood Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Neighborhood Score</CardTitle>
              <CardDescription>{address}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{data.neighborhoodScore}</div>
              <Badge className={getGradeColor(data.neighborhoodGrade)}>
                Grade {data.neighborhoodGrade}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={data.neighborhoodScore} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Based on schools, safety, walkability, and local amenities
          </p>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="schools" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schools">
            <School className="h-4 w-4 mr-2" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="safety">
            <Shield className="h-4 w-4 mr-2" />
            Safety
          </TabsTrigger>
          <TabsTrigger value="walkability">
            <MapPin className="h-4 w-4 mr-2" />
            Walkability
          </TabsTrigger>
          <TabsTrigger value="market">
            <DollarSign className="h-4 w-4 mr-2" />
            Market
          </TabsTrigger>
        </TabsList>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>School Ratings</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{data.schools.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/10</span>
                </div>
              </div>
              <CardDescription>{data.schools.total} schools nearby</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.schools.nearby.slice(0, 5).map((school: any) => (
                  <div key={school.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium">{school.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {school.level} • {school.distance.toFixed(1)} miles away
                      </div>
                      {school.studentTeacherRatio && (
                        <div className="text-sm text-muted-foreground">
                          Student-Teacher Ratio: {school.studentTeacherRatio}:1
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getGradeColor(school.grade)}>
                        {school.rating}/10
                      </Badge>
                      {school.testScores && (
                        <span className="text-xs text-muted-foreground">
                          Test: {school.testScores}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety Tab */}
        <TabsContent value="safety" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Safety Score</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{data.safety.safetyScore}</span>
                  <Badge className={getGradeColor(data.safety.safetyGrade)}>
                    Grade {data.safety.safetyGrade}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {data.safety.totalIncidents} incidents in the last 90 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Crime Trend */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(data.safety.trend)}
                    <span className="font-medium">Crime Trend</span>
                  </div>
                  <span className="text-sm text-muted-foreground capitalize">
                    {data.safety.trend}
                  </span>
                </div>

                {/* Incidents by Type */}
                <div>
                  <h4 className="font-medium mb-3">Incidents by Type</h4>
                  <div className="space-y-2">
                    {Object.entries(data.safety.incidentsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-sm font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Incidents */}
                {data.safety.recentIncidents.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Recent Incidents</h4>
                    <div className="space-y-2">
                      {data.safety.recentIncidents.map((incident: any, index: number) => (
                        <div key={index} className="text-sm p-2 bg-muted rounded">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">{incident.type}</span>
                            <Badge variant={incident.severity === 'high' ? 'destructive' : 'secondary'}>
                              {incident.severity}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(incident.date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Walkability Tab */}
        <TabsContent value="walkability" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Walk Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Walk Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{data.walkability.walkScore}</div>
                <p className="text-sm text-muted-foreground mb-3">
                  {data.walkability.walkDescription}
                </p>
                <Progress value={data.walkability.walkScore} className="h-2" />
              </CardContent>
            </Card>

            {/* Transit Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Transit Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{data.walkability.transitScore}</div>
                <p className="text-sm text-muted-foreground mb-3">
                  {data.walkability.transitDescription}
                </p>
                <Progress value={data.walkability.transitScore} className="h-2" />
              </CardContent>
            </Card>

            {/* Bike Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bike className="h-5 w-5" />
                  Bike Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{data.walkability.bikeScore}</div>
                <p className="text-sm text-muted-foreground mb-3">
                  {data.walkability.bikeDescription}
                </p>
                <Progress value={data.walkability.bikeScore} className="h-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Overall Walkability Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold mb-2">
                    Grade {data.walkability.overallGrade}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on pedestrian infrastructure, public transit, and bike lanes
                  </p>
                </div>
                <Badge className={`${getGradeColor(data.walkability.overallGrade)} text-2xl px-6 py-3`}>
                  {data.walkability.overallGrade}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Tab */}
        <TabsContent value="market" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.marketStats.propertyCount}</div>
                <p className="text-sm text-muted-foreground">Active listings in neighborhood</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Average Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${(data.marketStats.averagePrice / 1000).toFixed(0)}K
                </div>
                <p className="text-sm text-muted-foreground">
                  Median: ${(data.marketStats.medianPrice / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price per Sq Ft</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${data.marketStats.pricePerSqft.toFixed(0)}
                </div>
                <p className="text-sm text-muted-foreground">Average in neighborhood</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.demographics ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Population</span>
                      <span className="text-sm font-medium">{data.demographics.population?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Median Income</span>
                      <span className="text-sm font-medium">${data.demographics.medianIncome?.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No demographic data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NeighborhoodIntelligenceSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-20 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
