import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Ruler,
  Navigation,
  Download,
  Printer,
  Share2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface GeospatialReportData {
  cofONumber: string;
  state: string;
  validationScore: number;
  isValid: boolean;
  claimedCoordinates?: { latitude: number; longitude: number };
  registryCoordinates?: { latitude: number; longitude: number };
  claimedBoundaries?: Array<{ latitude: number; longitude: number }>;
  registryBoundaries?: Array<{ latitude: number; longitude: number }>;
  claimedLandSize?: number;
  registryLandSize?: number;
  calculatedLandSize?: number;
  coordinateDistance?: number;
  boundaryOverlapPercentage?: number;
  issues: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    message: string;
  }>;
  recommendations: string[];
  verifiedAt: string;
}

export default function GeospatialVerificationReport() {
  const params = useParams();
  const [, navigate] = useLocation();
  const [reportData, setReportData] = useState<GeospatialReportData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);

  // In a real implementation, this would fetch from the server
  // For now, we'll parse from URL params or local storage
  useEffect(() => {
    const stored = localStorage.getItem("geospatialReport");
    if (stored) {
      setReportData(JSON.parse(stored));
    }
  }, []);

  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!map || !mapReady || !reportData) return;

    // Clear existing overlays
    markers.forEach((m) => m.setMap(null));
    polygons.forEach((p) => p.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const newPolygons: google.maps.Polygon[] = [];
    const bounds = new google.maps.LatLngBounds();

    // Add claimed coordinates marker
    if (reportData.claimedCoordinates) {
      const claimedMarker = new google.maps.Marker({
        position: reportData.claimedCoordinates,
        map,
        title: "Claimed Location",
        label: "C",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      newMarkers.push(claimedMarker);
      bounds.extend(reportData.claimedCoordinates);

      // Add info window
      const claimedInfo = new google.maps.InfoWindow({
        content: `<div style="padding: 8px;">
          <strong>Claimed Location</strong><br/>
          Lat: ${reportData.claimedCoordinates.latitude.toFixed(6)}<br/>
          Lng: ${reportData.claimedCoordinates.longitude.toFixed(6)}
        </div>`,
      });
      claimedMarker.addListener("click", () => {
        claimedInfo.open(map, claimedMarker);
      });
    }

    // Add registry coordinates marker
    if (reportData.registryCoordinates) {
      const registryMarker = new google.maps.Marker({
        position: reportData.registryCoordinates,
        map,
        title: "Registry Location",
        label: "R",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#10B981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      newMarkers.push(registryMarker);
      bounds.extend(reportData.registryCoordinates);

      const registryInfo = new google.maps.InfoWindow({
        content: `<div style="padding: 8px;">
          <strong>Registry Location</strong><br/>
          Lat: ${reportData.registryCoordinates.latitude.toFixed(6)}<br/>
          Lng: ${reportData.registryCoordinates.longitude.toFixed(6)}
        </div>`,
      });
      registryMarker.addListener("click", () => {
        registryInfo.open(map, registryMarker);
      });
    }

    // Draw distance line if both coordinates exist
    if (reportData.claimedCoordinates && reportData.registryCoordinates) {
      const distanceLine = new google.maps.Polyline({
        path: [reportData.claimedCoordinates, reportData.registryCoordinates],
        geodesic: true,
        strokeColor: "#EF4444",
        strokeOpacity: 0.7,
        strokeWeight: 2,
        map,
      });
    }

    // Add claimed boundaries polygon
    if (reportData.claimedBoundaries && reportData.claimedBoundaries.length > 0) {
      const claimedPolygon = new google.maps.Polygon({
        paths: reportData.claimedBoundaries,
        strokeColor: "#3B82F6",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#3B82F6",
        fillOpacity: 0.2,
        map,
      });
      newPolygons.push(claimedPolygon);

      reportData.claimedBoundaries.forEach((coord) => bounds.extend(coord));

      // Add info window for claimed boundary
      const claimedBoundaryInfo = new google.maps.InfoWindow({
        content: `<div style="padding: 8px;">
          <strong>Claimed Boundary</strong><br/>
          Area: ${reportData.claimedLandSize?.toFixed(2) || "N/A"} sq meters
        </div>`,
      });
      google.maps.event.addListener(claimedPolygon, "click", (e: any) => {
        claimedBoundaryInfo.setPosition(e.latLng);
        claimedBoundaryInfo.open(map);
      });
    }

    // Add registry boundaries polygon
    if (reportData.registryBoundaries && reportData.registryBoundaries.length > 0) {
      const registryPolygon = new google.maps.Polygon({
        paths: reportData.registryBoundaries,
        strokeColor: "#10B981",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#10B981",
        fillOpacity: 0.2,
        map,
      });
      newPolygons.push(registryPolygon);

      reportData.registryBoundaries.forEach((coord) => bounds.extend(coord));

      const registryBoundaryInfo = new google.maps.InfoWindow({
        content: `<div style="padding: 8px;">
          <strong>Registry Boundary</strong><br/>
          Area: ${reportData.registryLandSize?.toFixed(2) || "N/A"} sq meters
        </div>`,
      });
      google.maps.event.addListener(registryPolygon, "click", (e: any) => {
        registryBoundaryInfo.setPosition(e.latLng);
        registryBoundaryInfo.open(map);
      });
    }

    setMarkers(newMarkers);
    setPolygons(newPolygons);

    // Fit map to bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  }, [map, mapReady, reportData]);

  const handleDownloadReport = () => {
    if (!reportData) return;
    
    const reportContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geospatial-report-${reportData.cofONumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully");
  };

  const handlePrintReport = () => {
    window.print();
    toast.success("Opening print dialog...");
  };

  const handleShareReport = async () => {
    if (!reportData) return;

    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Report link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  if (!reportData) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-muted-foreground">Loading geospatial report...</p>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="container mx-auto py-8 print:py-4">
      {/* Header */}
      <div className="mb-6 print:mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/verification-history")}
          className="mb-4 print:hidden"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 print:text-2xl">Geospatial Verification Report</h1>
            <p className="text-muted-foreground">
              Certificate: {reportData.cofONumber} • State: {reportData.state}
            </p>
            <p className="text-sm text-muted-foreground">
              Generated: {new Date(reportData.verifiedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintReport}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareReport}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <Card className="mb-6 print:mb-4">
        <CardHeader>
          <CardTitle>Validation Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(reportData.validationScore)}`}>
                {reportData.validationScore}
              </div>
              <p className="text-sm text-muted-foreground mt-2">out of 100</p>
            </div>
            <div className="flex-1">
              <Badge variant={getScoreBadgeVariant(reportData.validationScore)} className="mb-2">
                {reportData.isValid ? "Valid" : "Invalid"}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {reportData.validationScore >= 80 &&
                  "Geospatial data matches registry records with high confidence."}
                {reportData.validationScore >= 60 &&
                  reportData.validationScore < 80 &&
                  "Some discrepancies detected. Manual review recommended."}
                {reportData.validationScore < 60 &&
                  "Significant discrepancies detected. Further investigation required."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="map" className="print:hidden">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Geospatial Map</CardTitle>
              <CardDescription>
                Visualize claimed vs. registry coordinates and boundaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] rounded-lg overflow-hidden border">
                <MapView
                  onMapReady={handleMapReady}
                  defaultCenter={
                    reportData.claimedCoordinates || { latitude: 6.5244, longitude: 3.3792 }
                  }
                  defaultZoom={15}
                />
              </div>

              {/* Legend */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3">Map Legend</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm">Claimed Location (C)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm">Registry Location (R)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1 bg-blue-500 opacity-50"></div>
                    <span className="text-sm">Claimed Boundary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1 bg-green-500 opacity-50"></div>
                    <span className="text-sm">Registry Boundary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1 bg-red-500"></div>
                    <span className="text-sm">Distance Line</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coordinates Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Coordinates Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportData.claimedCoordinates && (
                  <div>
                    <p className="text-sm font-medium mb-1">Claimed Coordinates</p>
                    <p className="text-sm text-muted-foreground">
                      Lat: {reportData.claimedCoordinates.latitude.toFixed(6)}, Lng:{" "}
                      {reportData.claimedCoordinates.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                {reportData.registryCoordinates && (
                  <div>
                    <p className="text-sm font-medium mb-1">Registry Coordinates</p>
                    <p className="text-sm text-muted-foreground">
                      Lat: {reportData.registryCoordinates.latitude.toFixed(6)}, Lng:{" "}
                      {reportData.registryCoordinates.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                {reportData.coordinateDistance !== undefined && (
                  <div>
                    <p className="text-sm font-medium mb-1">Distance</p>
                    <p className="text-sm text-muted-foreground">
                      {reportData.coordinateDistance.toFixed(2)} meters
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Land Size Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Land Size Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportData.claimedLandSize && (
                  <div>
                    <p className="text-sm font-medium mb-1">Claimed Size</p>
                    <p className="text-sm text-muted-foreground">
                      {reportData.claimedLandSize.toFixed(2)} sq meters
                    </p>
                  </div>
                )}
                {reportData.registryLandSize && (
                  <div>
                    <p className="text-sm font-medium mb-1">Registry Size</p>
                    <p className="text-sm text-muted-foreground">
                      {reportData.registryLandSize.toFixed(2)} sq meters
                    </p>
                  </div>
                )}
                {reportData.calculatedLandSize && (
                  <div>
                    <p className="text-sm font-medium mb-1">Calculated Size (from boundaries)</p>
                    <p className="text-sm text-muted-foreground">
                      {reportData.calculatedLandSize.toFixed(2)} sq meters
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Boundary Overlap */}
            {reportData.boundaryOverlapPercentage !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5" />
                    Boundary Overlap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {reportData.boundaryOverlapPercentage.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Overlap between claimed and registry boundaries
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detected Issues</CardTitle>
              <CardDescription>
                {reportData.issues.length} issue(s) found during validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.issues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No issues detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportData.issues.map((issue, index) => (
                    <Alert
                      key={index}
                      variant={issue.severity === "high" ? "destructive" : "default"}
                    >
                      {issue.severity === "high" && <XCircle className="h-4 w-4" />}
                      {issue.severity === "medium" && <AlertTriangle className="h-4 w-4" />}
                      {issue.severity === "low" && <AlertTriangle className="h-4 w-4" />}
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {issue.type}
                            </Badge>
                            <p>{issue.message}</p>
                          </div>
                          <Badge
                            variant={
                              issue.severity === "high"
                                ? "destructive"
                                : issue.severity === "medium"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {issue.severity}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {reportData.recommendations.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {reportData.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print-only sections */}
      <div className="hidden print:block mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Coordinates Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.claimedCoordinates && (
              <p>
                <strong>Claimed:</strong> Lat {reportData.claimedCoordinates.latitude.toFixed(6)},
                Lng {reportData.claimedCoordinates.longitude.toFixed(6)}
              </p>
            )}
            {reportData.registryCoordinates && (
              <p>
                <strong>Registry:</strong> Lat {reportData.registryCoordinates.latitude.toFixed(6)},
                Lng {reportData.registryCoordinates.longitude.toFixed(6)}
              </p>
            )}
            {reportData.coordinateDistance !== undefined && (
              <p>
                <strong>Distance:</strong> {reportData.coordinateDistance.toFixed(2)} meters
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.issues.length === 0 ? (
              <p>No issues detected</p>
            ) : (
              <ul className="list-disc pl-5 space-y-2">
                {reportData.issues.map((issue, index) => (
                  <li key={index}>
                    [{issue.severity.toUpperCase()}] {issue.type}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
