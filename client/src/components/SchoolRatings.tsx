import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { School, MapPin, Users, TrendingUp, Award, ExternalLink } from "lucide-react";

interface SchoolRatingsProps {
  propertyId: number;
  latitude: number;
  longitude: number;
}

export default function SchoolRatings({ propertyId, latitude, longitude }: SchoolRatingsProps) {
  const { data: schools, isLoading } = trpc.schools.getNearby.useQuery({
    latitude,
    longitude,
    radius: 2, // 2 miles
  });

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-green-600 bg-green-100 dark:bg-green-900";
    if (rating >= 6) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900";
    return "text-red-600 bg-red-100 dark:bg-red-900";
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 9) return "Excellent";
    if (rating >= 7) return "Above Average";
    if (rating >= 5) return "Average";
    return "Below Average";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!schools || schools.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <School className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Schools Found</h3>
          <p className="text-muted-foreground">
            No schools found within 2 miles of this property
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group schools by type
  const elementarySchools = schools.filter((s: any) => s.type === 'elementary');
  const middleSchools = schools.filter((s: any) => s.type === 'middle');
  const highSchools = schools.filter((s: any) => s.type === 'high');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Elementary</p>
                <p className="text-2xl font-bold">{elementarySchools.length}</p>
              </div>
              <School className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Middle</p>
                <p className="text-2xl font-bold">{middleSchools.length}</p>
              </div>
              <School className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High School</p>
                <p className="text-2xl font-bold">{highSchools.length}</p>
              </div>
              <School className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Elementary Schools */}
      {elementarySchools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Elementary Schools</h3>
          <div className="space-y-3">
            {elementarySchools.map((school: any) => (
              <Card key={school.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{school.name}</h4>
                        {school.isPublic ? (
                          <Badge variant="outline">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{school.distance.toFixed(1)} miles away</span>
                      </div>
                    </div>
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getRatingColor(school.rating)}`}>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{school.rating}</p>
                        <p className="text-xs">/10</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Enrollment</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <p className="text-sm font-semibold">{school.enrollment}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Student/Teacher</p>
                      <p className="text-sm font-semibold">{school.studentTeacherRatio}:1</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Test Scores</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <p className="text-sm font-semibold">{school.testScorePercentile}%</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <Badge variant="outline" className="text-xs">
                        {getRatingLabel(school.rating)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{school.address}</p>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visit
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Middle Schools */}
      {middleSchools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Middle Schools</h3>
          <div className="space-y-3">
            {middleSchools.map((school: any) => (
              <Card key={school.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{school.name}</h4>
                        {school.isPublic ? (
                          <Badge variant="outline">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{school.distance.toFixed(1)} miles away</span>
                      </div>
                    </div>
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getRatingColor(school.rating)}`}>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{school.rating}</p>
                        <p className="text-xs">/10</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Enrollment</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <p className="text-sm font-semibold">{school.enrollment}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Student/Teacher</p>
                      <p className="text-sm font-semibold">{school.studentTeacherRatio}:1</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Test Scores</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <p className="text-sm font-semibold">{school.testScorePercentile}%</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <Badge variant="outline" className="text-xs">
                        {getRatingLabel(school.rating)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{school.address}</p>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visit
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* High Schools */}
      {highSchools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">High Schools</h3>
          <div className="space-y-3">
            {highSchools.map((school: any) => (
              <Card key={school.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{school.name}</h4>
                        {school.isPublic ? (
                          <Badge variant="outline">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{school.distance.toFixed(1)} miles away</span>
                      </div>
                    </div>
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getRatingColor(school.rating)}`}>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{school.rating}</p>
                        <p className="text-xs">/10</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Enrollment</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <p className="text-sm font-semibold">{school.enrollment}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Student/Teacher</p>
                      <p className="text-sm font-semibold">{school.studentTeacherRatio}:1</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Test Scores</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <p className="text-sm font-semibold">{school.testScorePercentile}%</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <Badge variant="outline" className="text-xs">
                        {getRatingLabel(school.rating)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{school.address}</p>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visit
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
