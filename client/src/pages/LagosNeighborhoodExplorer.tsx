// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { MapView } from '@/components/Map';
import { NeighborhoodOverlay, LagosNeighborhoodProperties, formatPriceMillions, getPriceColor } from '@/components/NeighborhoodOverlay';
import { StreetViewPanorama } from '@/components/StreetViewPanorama';
import { POIMarkers, POICategoryFilter, POIDetailCard, POI } from '@/components/POIMarkers';
import { IsochroneLayer, IsochroneControl } from '@/components/IsochroneLayer';
import { PropertyHeatmapLayer, HeatmapControl } from '@/components/PropertyHeatmapLayer';
import SchoolDistrictOverlay from '@/components/SchoolDistrictOverlay';
import WalkabilityOverlay from '@/components/WalkabilityOverlay';
import Buildings3DToggle from '@/components/Buildings3DToggle';
import NeighborhoodComparison from '@/components/NeighborhoodComparison';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Home,
  DollarSign,
  Users,
  School,
  TrendingUp,
  Clock,
  Navigation,
  Layers,
  X,
  Eye,
} from 'lucide-react';

/**
 * Lagos Neighborhood Explorer
 * 
 * Zillow-style neighborhood visualization for Lagos, Nigeria
 * Features:
 * - Color-coded neighborhood boundaries
 * - Hover tooltips with quick stats
 * - Detailed neighborhood sidebar
 * - Price heatmap overlay
 * - Neighborhood comparison
 */
export default function LagosNeighborhoodExplorer() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [colorMode, setColorMode] = useState<'price' | 'tier' | 'zone'>('price');
  const [hoveredNeighborhood, setHoveredNeighborhood] = useState<LagosNeighborhoodProperties | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<LagosNeighborhoodProperties | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [comparisonNeighborhoods, setComparisonNeighborhoods] = useState<LagosNeighborhoodProperties[]>([]);
  const [showStreetView, setShowStreetView] = useState(false);
  const lagosCenter = { lat: 6.5244, lng: 3.3792 };
  const [streetViewPosition, setStreetViewPosition] = useState<google.maps.LatLngLiteral>(lagosCenter);
  const [selectedPOICategories, setSelectedPOICategories] = useState<string[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isochroneConfig, setIsochroneConfig] = useState<IsochroneConfig | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [schoolDistrictsEnabled, setSchoolDistrictsEnabled] = useState(false);
  const [walkabilityEnabled, setWalkabilityEnabled] = useState(false);

  // Lagos center coordinates

  const handleNeighborhoodClick = (properties: LagosNeighborhoodProperties) => {
    setSelectedNeighborhood(properties);
    
    // Zoom to neighborhood
    if (mapRef.current) {
      // Calculate approximate center from properties
      // In a real implementation, you'd get this from the GeoJSON
      mapRef.current.setZoom(13);
    }
  };

  const handleNeighborhoodHover = (properties: LagosNeighborhoodProperties | null) => {
    setHoveredNeighborhood(properties);
  };

  const addToComparison = (neighborhood: LagosNeighborhoodProperties) => {
    if (comparisonNeighborhoods.length >= 3) {
      return; // Max 3 neighborhoods
    }
    if (!comparisonNeighborhoods.find(n => n.id === neighborhood.id)) {
      setComparisonNeighborhoods([...comparisonNeighborhoods, neighborhood]);
    }
  };

  const removeFromComparison = (id: string) => {
    setComparisonNeighborhoods(comparisonNeighborhoods.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <h1 className="text-3xl font-bold mb-2">Explore Lagos Neighborhoods</h1>
          <p className="text-muted-foreground">
            Discover the best neighborhoods in Lagos with detailed insights, price trends, and amenities
          </p>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Map Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Color By:</span>
                    <Select value={colorMode} onValueChange={(value: any) => setColorMode(value)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price Range</SelectItem>
                        <SelectItem value="tier">Tier (Luxury/Mid/Emerging)</SelectItem>
                        <SelectItem value="zone">Zone (Island/Mainland)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant={showLabels ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLabels(!showLabels)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {showLabels ? "Hide" : "Show"} Labels
                  </Button>
                </div>

                {/* POI Category Filter */}
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Points of Interest:</p>
                  <POICategoryFilter
                    selectedCategories={selectedPOICategories}
                    onChange={setSelectedPOICategories}
                  />
                </div>
              </CardContent>
            </Card>

            {/* POI Detail Card */}
            {selectedPOI && (
              <POIDetailCard
                poi={selectedPOI}
                onClose={() => setSelectedPOI(null)}
              />
            )}

            {/* Map */}
            <Card>
              <CardContent className="p-0">
                <div className="h-[600px] rounded-lg overflow-hidden relative">
                  <MapView
                    initialCenter={lagosCenter}
                    initialZoom={11}
                    onMapReady={(map) => {
                      mapRef.current = map;
                    }}
                  />
                  <NeighborhoodOverlay
                    map={mapRef.current}
                    colorMode={colorMode}
                    showLabels={showLabels}
                    onNeighborhoodClick={handleNeighborhoodClick}
                    onNeighborhoodHover={handleNeighborhoodHover}
                  />
                  <POIMarkers
                    map={mapRef.current}
                    selectedCategories={selectedPOICategories}
                    onPOIClick={setSelectedPOI}
                  />
                  <IsochroneLayer
                    map={mapRef.current}
                    config={isochroneConfig}
                  />
                  <PropertyHeatmapLayer
                    map={mapRef.current}
                    enabled={heatmapEnabled}
                  />
                  {schoolDistrictsEnabled && (
                    <SchoolDistrictOverlay map={mapRef.current} />
                  )}
                  {walkabilityEnabled && selectedNeighborhood && (
                    <WalkabilityOverlay
                      map={mapRef.current}
                      neighborhoodId={selectedNeighborhood.id}
                    />
                  )}

                  {/* Hover Tooltip */}
                  {hoveredNeighborhood && (
                    <div className="absolute top-4 left-4 bg-card border rounded-lg shadow-lg p-4 max-w-xs z-10">
                      <h3 className="font-bold text-lg mb-2">{hoveredNeighborhood.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Median Price:</span>
                          <span className="font-medium">{formatPriceMillions(hoveredNeighborhood.medianPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Properties:</span>
                          <span className="font-medium">{hoveredNeighborhood.propertyCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zone:</span>
                          <Badge variant="outline" className="capitalize">{hoveredNeighborhood.zone}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Click for details</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {selectedNeighborhood ? (
              <>
                {/* Selected Neighborhood Details */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedNeighborhood.name}</CardTitle>
                        <CardDescription>{selectedNeighborhood.description}</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedNeighborhood(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="amenities">Amenities</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4 mt-4">
                        {/* Price */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium">Median Price</span>
                          </div>
                          <span className="text-lg font-bold" style={{ color: getPriceColor(selectedNeighborhood.medianPrice) }}>
                            {formatPriceMillions(selectedNeighborhood.medianPrice)}
                          </span>
                        </div>

                        {/* Price per sqm */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium">Price/sqm</span>
                          </div>
                          <span className="text-lg font-bold">
                            ₦{selectedNeighborhood.pricePerSqm.toLocaleString()}
                          </span>
                        </div>

                        {/* Properties */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Home className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium">Properties</span>
                          </div>
                          <span className="text-lg font-bold">
                            {selectedNeighborhood.propertyCount.toLocaleString()}
                          </span>
                        </div>

                        {/* Population */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium">Population</span>
                          </div>
                          <span className="text-lg font-bold">
                            {selectedNeighborhood.population.toLocaleString()}
                          </span>
                        </div>

                        {/* Commute Times */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs">To Victoria Island</span>
                            </div>
                            <span className="text-sm font-medium">{selectedNeighborhood.avgCommuteToVI} min</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs">To Ikeja</span>
                            </div>
                            <span className="text-sm font-medium">{selectedNeighborhood.avgCommuteToIkeja} min</span>
                          </div>
                        </div>

                        {/* Walk Score */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-cyan-600" />
                            <span className="text-sm font-medium">Walk Score</span>
                          </div>
                          <span className="text-lg font-bold">{selectedNeighborhood.walkScore}/100</span>
                        </div>

                        {/* Street View Button */}
                        <Button
                          className="w-full"
                          variant="default"
                          onClick={() => {
                            // Calculate approximate center of neighborhood
                            // In production, use actual GeoJSON centroid
                            setStreetViewPosition({ lat: 6.4300, lng: 3.4200 }); // Example: VI coordinates
                            setShowStreetView(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Explore Street View
                        </Button>

                        {/* Add to Comparison */}
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => addToComparison(selectedNeighborhood)}
                          disabled={comparisonNeighborhoods.length >= 3 || comparisonNeighborhoods.some(n => n.id === selectedNeighborhood.id)}
                        >
                          Add to Comparison
                        </Button>
                      </TabsContent>

                      <TabsContent value="amenities" className="space-y-4 mt-4">
                        {/* Amenities */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Amenities
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedNeighborhood.amenities.map((amenity, i) => (
                              <Badge key={i} variant="secondary">{amenity}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Schools */}
                        {selectedNeighborhood.schools.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <School className="w-4 h-4" />
                              Top Schools
                            </h4>
                            <div className="space-y-2">
                              {selectedNeighborhood.schools.map((school, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                                  <span className="text-sm">{school.name}</span>
                                  <Badge variant="outline">⭐ {school.rating}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tier Badge */}
                        <div>
                          <h4 className="font-medium mb-2">Classification</h4>
                          <div className="flex gap-2">
                            <Badge className="capitalize">{selectedNeighborhood.tier}</Badge>
                            <Badge variant="outline" className="capitalize">{selectedNeighborhood.zone}</Badge>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Neighborhood</CardTitle>
                  <CardDescription>
                    Click on any neighborhood on the map to view detailed information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Hover over neighborhoods to see quick stats</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Isochrone Control */}
            <IsochroneControl onConfigChange={setIsochroneConfig} />

            {/* Heatmap Control */}
            <HeatmapControl
              enabled={heatmapEnabled}
              onToggle={setHeatmapEnabled}
            />

            {/* School Districts Control */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <School className="w-4 h-4" />
                  School Districts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant={schoolDistrictsEnabled ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setSchoolDistrictsEnabled(!schoolDistrictsEnabled)}
                >
                  {schoolDistrictsEnabled ? "Hide" : "Show"} School Boundaries
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  View top schools and their catchment zones across Lagos
                </p>
              </CardContent>
            </Card>

            {/* Walkability Control */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Walkability Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant={walkabilityEnabled ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setWalkabilityEnabled(!walkabilityEnabled)}
                  disabled={!selectedNeighborhood}
                >
                  {walkabilityEnabled ? "Hide" : "Show"} Walkability
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedNeighborhood
                    ? "View walkability score and nearby amenities"
                    : "Select a neighborhood first"}
                </p>
              </CardContent>
            </Card>

            {/* 3D Buildings Control */}
            <Buildings3DToggle map={mapRef.current} />

            {/* Comparison */}
            {comparisonNeighborhoods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comparison ({comparisonNeighborhoods.length}/3)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparisonNeighborhoods.map((neighborhood) => (
                    <div key={neighborhood.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium text-sm">{neighborhood.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPriceMillions(neighborhood.medianPrice)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromComparison(neighborhood.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {comparisonNeighborhoods.length >= 2 && (
                    <Button
                      className="w-full mt-2"
                      variant="default"
                      onClick={() => {
                        // Scroll to comparison section
                        document.getElementById('comparison-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Compare Neighborhoods
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Neighborhood Comparison Section */}
      {comparisonNeighborhoods.length >= 2 && (
        <div id="comparison-section" className="container py-6">
          <NeighborhoodComparison
            neighborhoods={comparisonNeighborhoods.map((n) => ({ properties: n }))}
            initialNeighborhoods={comparisonNeighborhoods.map((n) => n.id)}
            maxComparisons={3}
          />
        </div>
      )}

      {/* Street View Modal */}
      {showStreetView && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[80vh]">
            <StreetViewPanorama
              position={streetViewPosition}
              onClose={() => setShowStreetView(false)}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
