import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import EnhancedMap from "@/components/EnhancedMap";
import { FavoriteButton } from "@/components/FavoriteButton";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Bed, Bath, Ruler, X, Pencil, Layers } from "lucide-react";
import { useState, useCallback } from "react";
import { Link } from "wouter";

export default function MapSearch() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [markerClusterer, setMarkerClusterer] = useState<any>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [bounds, setBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapStyle, setMapStyle] = useState<'default' | 'silver' | 'night' | 'retro' | 'aubergine'>('default');
  const [enable3D, setEnable3D] = useState(true);

  // Filters
  const [priceRange, setPriceRange] = useState([0, 100000000]);
  const [bedrooms, setBedrooms] = useState<string>("all");
  const [propertyType, setPropertyType] = useState<string>("all");

  const { data: properties } = trpc.properties.list.useQuery({
    limit: 500,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    bedrooms: bedrooms === "all" ? undefined : parseInt(bedrooms),
    propertyType: propertyType === "all" ? undefined : propertyType,
  });

  const handleMapReady = useCallback((services: {
    map: google.maps.Map;
    places: google.maps.places.PlacesService;
    geocoder: google.maps.Geocoder;
    directions: google.maps.DirectionsService;
    drawing: typeof google.maps.drawing;
  }) => {
    setMap(services.map);

    // Initialize Drawing Manager
    const drawingMgr = new services.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#3b82f6',
        clickable: false,
        editable: true,
        zIndex: 1,
      },
    });
    drawingMgr.setMap(services.map);
    setDrawingManager(drawingMgr);

    // Listen for polygon complete
    google.maps.event.addListener(drawingMgr, 'polygoncomplete', (polygon: google.maps.Polygon) => {
      const path = polygon.getPath();
      const bounds = new google.maps.LatLngBounds();
      path.forEach((latLng) => bounds.extend(latLng));
      setBounds(bounds);
      setIsDrawing(false);
      drawingMgr.setDrawingMode(null);

      // Filter properties within polygon
      filterPropertiesInPolygon(polygon);
    });

    // Initialize Marker Clusterer
    if (window.markerClusterer) {
      const clusterer = new window.markerClusterer.MarkerClusterer({
        map: services.map,
        markers: [],
      });
      setMarkerClusterer(clusterer);
    }
  }, []);

  const filterPropertiesInPolygon = (polygon: google.maps.Polygon) => {
    // This would filter properties whose coordinates fall within the polygon
    // For now, just close the drawing mode
    console.log('Polygon drawn, filtering properties...');
  };

  const toggleDrawing = () => {
    if (!drawingManager) return;

    if (isDrawing) {
      drawingManager.setDrawingMode(null);
      setIsDrawing(false);
    } else {
      drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      setIsDrawing(true);
    }
  };

  const clearFilters = () => {
    setPriceRange([0, 100000000]);
    setBedrooms("all");
    setPropertyType("all");
    setBounds(null);
  };

  // Update markers when properties change
  useState(() => {
    if (!map || !properties) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    if (markerClusterer) {
      markerClusterer.clearMarkers();
    }

    // Create new markers
    const newMarkers: google.maps.Marker[] = [];

    properties.forEach((property) => {
      // For demo, use random coordinates near Lagos
      const lat = 6.5244 + (Math.random() - 0.5) * 0.5;
      const lng = 3.3792 + (Math.random() - 0.5) * 0.5;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: property.title || property.addressLine1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedProperty(property);
        map.panTo(marker.getPosition()!);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    if (markerClusterer) {
      markerClusterer.clearMarkers();
      markerClusterer.addMarkers(newMarkers);
    }
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-8 w-8 text-primary" />
              <span>{APP_TITLE}</span>
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/properties">List View</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar Filters */}
        <div className="w-80 border-r bg-card p-4 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Map Search</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {properties?.length || 0} properties found
              </p>
            </div>

            {/* Map Style */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Map Style
              </h3>
              <Select value={mapStyle} onValueChange={(value: any) => setMapStyle(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="retro">Retro</SelectItem>
                  <SelectItem value="aubergine">Aubergine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3D Buildings */}
            <div className="space-y-2">
              <h3 className="font-semibold">3D Buildings</h3>
              <Button
                variant={enable3D ? "default" : "outline"}
                className="w-full"
                onClick={() => setEnable3D(!enable3D)}
              >
                {enable3D ? "3D Enabled" : "Enable 3D"}
              </Button>
            </div>

            {/* Drawing Tools */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Search Area
              </h3>
              <Button
                variant={isDrawing ? "default" : "outline"}
                className="w-full"
                onClick={toggleDrawing}
              >
                {isDrawing ? "Cancel Drawing" : "Draw Search Area"}
              </Button>
              {bounds && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setBounds(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Area
                </Button>
              )}
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Price Range: ₦{priceRange[0].toLocaleString()} - ₦{priceRange[1].toLocaleString()}
              </label>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={0}
                max={100000000}
                step={1000000}
                className="w-full"
              />
            </div>

            {/* Bedrooms */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bedrooms</label>
              <Select value={bedrooms} onValueChange={setBedrooms}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                  <SelectItem value="5">5+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Property Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Property Type</label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="w-full" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>

          {/* Selected Property Card */}
          {selectedProperty && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">
                    {selectedProperty.title || selectedProperty.addressLine1}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedProperty(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedProperty.city}, {selectedProperty.state}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <img
                  src={selectedProperty.primaryImage || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                  alt={selectedProperty.title}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-base font-bold">
                    ₦{selectedProperty.price.toLocaleString()}
                  </Badge>
                  <FavoriteButton propertyId={selectedProperty.id} />
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {selectedProperty.bedrooms && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{selectedProperty.bedrooms}</span>
                    </div>
                  )}
                  {selectedProperty.bathrooms && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{selectedProperty.bathrooms}</span>
                    </div>
                  )}
                  {selectedProperty.squareFeet && (
                    <div className="flex items-center gap-1">
                      <Ruler className="h-4 w-4" />
                      <span>{selectedProperty.squareFeet.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <Button className="w-full" asChild>
                  <Link href={`/property/${selectedProperty.id}`}>
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView onMapReady={handleMapReady} />
          {isDrawing && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
              Click on the map to draw your search area
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add to window for marker clusterer
declare global {
  interface Window {
    markerClusterer: any;
  }
}
