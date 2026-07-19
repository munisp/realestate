import { useMemo } from 'react';
import {
  lagosSchools,
  School,
  getSchoolRatingColor,
  getSchoolRatingLabel,
} from '@/data/lagosSchools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, MapPin, Clock, Phone, Globe, ExternalLink } from 'lucide-react';

interface NearbySchoolsProps {
  propertyLocation: {
    lat: number;
    lng: number;
  };
  maxSchools?: number;
  maxDistance?: number; // in meters
}

interface SchoolWithDistance extends School {
  distance: number; // meters
  walkTime: number; // minutes
}

export default function NearbySchools({
  propertyLocation,
  maxSchools = 3,
  maxDistance = 5000,
}: NearbySchoolsProps) {
  const nearbySchools = useMemo(() => {
    // Calculate distance for each school using Haversine formula
    const schoolsWithDistance: SchoolWithDistance[] = lagosSchools.map((school) => {
      const R = 6371000; // Earth's radius in meters
      const dLat = ((propertyLocation.lat - school.location.lat) * Math.PI) / 180;
      const dLng = ((propertyLocation.lng - school.location.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((school.location.lat * Math.PI) / 180) *
          Math.cos((propertyLocation.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // Estimate walk time (assuming 80m/min walking speed)
      const walkTime = Math.round(distance / 80);

      return {
        ...school,
        distance,
        walkTime,
      };
    });

    // Filter by max distance and sort by distance
    return schoolsWithDistance
      .filter((school) => school.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxSchools);
  }, [propertyLocation, maxSchools, maxDistance]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (nearbySchools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Schools Nearby
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No schools found within {maxDistance / 1000}km of this property.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Schools Nearby
          <Badge variant="secondary" className="ml-auto">
            {nearbySchools.length} {nearbySchools.length === 1 ? 'School' : 'Schools'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nearbySchools.map((school, index) => (
          <div
            key={school.id}
            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">{school.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: getSchoolRatingColor(school.rating),
                      color: 'white',
                    }}
                  >
                    {school.rating}/10 - {getSchoolRatingLabel(school.rating)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {school.type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {school.level}
                  </Badge>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-bold text-primary">
                  #{index + 1}
                </div>
                <div className="text-xs text-muted-foreground">Closest</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatDistance(school.distance)}</span>
                <span className="text-muted-foreground">away</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{school.walkTime} min</span>
                <span className="text-muted-foreground">walk</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
              {school.address}
            </p>

            {school.tuitionRange && (
              <div className="bg-muted/50 p-2 rounded mb-3">
                <p className="text-xs font-medium">Tuition Range</p>
                <p className="text-xs text-muted-foreground">{school.tuitionRange}</p>
              </div>
            )}

            <div className="mb-3">
              <p className="text-xs font-medium mb-1">Curriculum</p>
              <div className="flex flex-wrap gap-1">
                {school.curriculum.map((curr) => (
                  <Badge key={curr} variant="secondary" className="text-xs">
                    {curr}
                  </Badge>
                ))}
              </div>
            </div>

            {(school.enrollment || school.studentTeacherRatio) && (
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                {school.enrollment && (
                  <div>
                    <p className="text-muted-foreground">Enrollment</p>
                    <p className="font-medium">{school.enrollment.toLocaleString()}</p>
                  </div>
                )}
                {school.studentTeacherRatio && (
                  <div>
                    <p className="text-muted-foreground">Student:Teacher</p>
                    <p className="font-medium">{school.studentTeacherRatio}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {school.website && (
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    Website
                  </a>
                </Button>
              )}
              {school.phone && (
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href={`tel:${school.phone}`}>
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1"
              >
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${propertyLocation.lat},${propertyLocation.lng}&destination=${school.location.lat},${school.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Directions
                </a>
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full"
          asChild
        >
          <a href="/neighborhoods">
            <GraduationCap className="h-4 w-4 mr-2" />
            View All Schools on Map
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
