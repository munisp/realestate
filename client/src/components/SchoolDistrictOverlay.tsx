import { useEffect, useState } from 'react';
import {
  lagosSchools,
  School,
  getSchoolRatingColor,
  getSchoolRatingLabel,
} from '@/data/lagosSchools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, MapPin, Phone, Globe, Users, X } from 'lucide-react';

interface SchoolDistrictOverlayProps {
  map: google.maps.Map | null;
  onSchoolClick?: (school: School) => void;
}

export default function SchoolDistrictOverlay({
  map,
  onSchoolClick,
}: SchoolDistrictOverlayProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(
    new Set(['elementary', 'middle', 'high', 'all'])
  );
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    new Set(['public', 'private'])
  );
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);
  const [circles, setCircles] = useState<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear existing overlays
    markers.forEach((m) => m.setMap(null));
    polygons.forEach((p) => p.setMap(null));
    circles.forEach((c) => c.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const newPolygons: google.maps.Polygon[] = [];
    const newCircles: google.maps.Circle[] = [];

    // Filter schools based on visibility settings
    const filteredSchools = lagosSchools.filter(
      (school) =>
        visibleLevels.has(school.level) && visibleTypes.has(school.type)
    );

    filteredSchools.forEach((school) => {
      // Create marker for school location
      const marker = new google.maps.Marker({
        position: school.location,
        map,
        title: school.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: getSchoolRatingColor(school.rating),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedSchool(school);
        if (onSchoolClick) onSchoolClick(school);
      });

      newMarkers.push(marker);

      // Draw catchment zone
      if (school.catchmentZone) {
        // Polygon boundary
        const polygon = new google.maps.Polygon({
          paths: school.catchmentZone,
          strokeColor: getSchoolRatingColor(school.rating),
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: getSchoolRatingColor(school.rating),
          fillOpacity: 0.15,
          map,
        });

        polygon.addListener('click', () => {
          setSelectedSchool(school);
          if (onSchoolClick) onSchoolClick(school);
        });

        newPolygons.push(polygon);
      } else if (school.catchmentRadius) {
        // Circular boundary
        const circle = new google.maps.Circle({
          center: school.location,
          radius: school.catchmentRadius,
          strokeColor: getSchoolRatingColor(school.rating),
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: getSchoolRatingColor(school.rating),
          fillOpacity: 0.1,
          map,
        });

        circle.addListener('click', () => {
          setSelectedSchool(school);
          if (onSchoolClick) onSchoolClick(school);
        });

        newCircles.push(circle);
      }
    });

    setMarkers(newMarkers);
    setPolygons(newPolygons);
    setCircles(newCircles);

    return () => {
      newMarkers.forEach((m) => m.setMap(null));
      newPolygons.forEach((p) => p.setMap(null));
      newCircles.forEach((c) => c.setMap(null));
    };
  }, [map, visibleLevels, visibleTypes]);

  const toggleLevel = (level: string) => {
    const newLevels = new Set(visibleLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setVisibleLevels(newLevels);
  };

  const toggleType = (type: string) => {
    const newTypes = new Set(visibleTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setVisibleTypes(newTypes);
  };

  return (
    <>
      {/* Filter Controls */}
      <Card className="absolute top-4 right-4 w-64 shadow-lg z-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            School Districts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-2">School Level</p>
            <div className="space-y-1">
              {['elementary', 'middle', 'high', 'all'].map((level) => (
                <label
                  key={level}
                  className="flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={visibleLevels.has(level)}
                    onCheckedChange={() => toggleLevel(level)}
                  />
                  <span className="capitalize">{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2">School Type</p>
            <div className="space-y-1">
              {['public', 'private'].map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={visibleTypes.has(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {markers.length} schools shown
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Selected School Details */}
      {selectedSchool && (
        <Card className="absolute bottom-4 left-4 w-96 shadow-lg z-10">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base">{selectedSchool.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: getSchoolRatingColor(selectedSchool.rating),
                      color: 'white',
                    }}
                  >
                    {selectedSchool.rating}/10 - {getSchoolRatingLabel(selectedSchool.rating)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedSchool.type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedSchool.level}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSchool(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-xs">{selectedSchool.address}</p>
            </div>

            {selectedSchool.tuitionRange && (
              <div className="bg-muted/50 p-2 rounded">
                <p className="text-xs font-medium">Tuition Range</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSchool.tuitionRange}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {selectedSchool.enrollment && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Enrollment
                  </p>
                  <p className="text-xs font-medium">
                    {selectedSchool.enrollment.toLocaleString()}
                  </p>
                </div>
              )}
              {selectedSchool.studentTeacherRatio && (
                <div>
                  <p className="text-xs text-muted-foreground">Student:Teacher</p>
                  <p className="text-xs font-medium">
                    {selectedSchool.studentTeacherRatio}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium mb-1">Curriculum</p>
              <div className="flex flex-wrap gap-1">
                {selectedSchool.curriculum.map((curr) => (
                  <Badge key={curr} variant="secondary" className="text-xs">
                    {curr}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {selectedSchool.website && (
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a
                    href={selectedSchool.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    Website
                  </a>
                </Button>
              )}
              {selectedSchool.phone && (
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href={`tel:${selectedSchool.phone}`}>
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </a>
                </Button>
              )}
            </div>

            <Button
              className="w-full"
              size="sm"
              onClick={() => {
                // Navigate to property search filtered by this school's catchment
                window.location.href = `/search?near=${selectedSchool.location.lat},${selectedSchool.location.lng}&radius=2000`;
              }}
            >
              Find Homes Near This School
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
