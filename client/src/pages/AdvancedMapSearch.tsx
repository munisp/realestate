// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { MapView } from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { 
  Pencil, 
  Circle, 
  Square, 
  Trash2, 
  Save, 
  Layers, 
  X,
  Search,
  MapPin,
  Home
} from 'lucide-react';
import { Link } from 'wouter';

type BoundaryType = 'polygon' | 'circle' | 'rectangle' | null;

interface BoundaryData {
  coordinates?: Array<{ lat: number; lng: number }>;
  center?: { lat: number; lng: number };
  radius?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export default function AdvancedMapSearch() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const currentShapeRef = useRef<google.maps.Polygon | google.maps.Circle | google.maps.Rectangle | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const [activeTool, setActiveTool] = useState<BoundaryType>(null);
  const [boundaryType, setBoundaryType] = useState<BoundaryType>(null);
  const [boundaryData, setBoundaryData] = useState<BoundaryData | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapMetric, setHeatmapMetric] = useState<'density' | 'price'>('density');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  
  // Filters
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [minBedrooms, setMinBedrooms] = useState<number | undefined>();
  const [propertyType, setPropertyType] = useState<string | undefined>();

  // Search results
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchMutation = trpc.mapSearch.searchWithinBoundary.useMutation();
  const saveMutation = trpc.mapSearch.saveBoundarySearch.useMutation();
  const heatmapQuery = trpc.mapSearch.getHeatmapData.useQuery(
    {
      bounds: {
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      },
      metric: heatmapMetric,
    },
    { enabled: false }
  );

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;

    // Initialize Drawing Manager
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#2563eb',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#2563eb',
        clickable: true,
        editable: true,
        zIndex: 1,
      },
      circleOptions: {
        fillColor: '#2563eb',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#2563eb',
        clickable: true,
        editable: true,
        zIndex: 1,
      },
      rectangleOptions: {
        fillColor: '#2563eb',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#2563eb',
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    // Listen for shape completion
    google.maps.event.addListener(drawingManager, 'overlaycomplete', (event: any) => {
      // Remove previous shape
      if (currentShapeRef.current) {
        currentShapeRef.current.setMap(null);
      }

      currentShapeRef.current = event.overlay;
      setActiveTool(null);
      drawingManager.setDrawingMode(null);

      // Extract boundary data
      if (event.type === 'polygon') {
        const path = event.overlay.getPath();
        const coordinates = path.getArray().map((latLng: google.maps.LatLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        }));
        setBoundaryType('polygon');
        setBoundaryData({ coordinates });
      } else if (event.type === 'circle') {
        const center = event.overlay.getCenter();
        const radius = event.overlay.getRadius();
        setBoundaryType('circle');
        setBoundaryData({
          center: { lat: center.lat(), lng: center.lng() },
          radius,
        });
      } else if (event.type === 'rectangle') {
        const bounds = event.overlay.getBounds();
        setBoundaryType('rectangle');
        setBoundaryData({
          bounds: {
            north: bounds.getNorthEast().lat(),
            south: bounds.getSouthWest().lat(),
            east: bounds.getNorthEast().lng(),
            west: bounds.getSouthWest().lng(),
          },
        });
      }

      // Auto-search after drawing
      performSearch(event.type, getBoundaryDataFromEvent(event));
    });
  };

  const getBoundaryDataFromEvent = (event: any): BoundaryData => {
    if (event.type === 'polygon') {
      const path = event.overlay.getPath();
      return {
        coordinates: path.getArray().map((latLng: google.maps.LatLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        })),
      };
    } else if (event.type === 'circle') {
      const center = event.overlay.getCenter();
      return {
        center: { lat: center.lat(), lng: center.lng() },
        radius: event.overlay.getRadius(),
      };
    } else if (event.type === 'rectangle') {
      const bounds = event.overlay.getBounds();
      return {
        bounds: {
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng(),
        },
      };
    }
    return {};
  };

  const handleToolSelect = (tool: BoundaryType) => {
    if (!drawingManagerRef.current) return;

    if (activeTool === tool) {
      // Deactivate
      setActiveTool(null);
      drawingManagerRef.current.setDrawingMode(null);
    } else {
      // Activate
      setActiveTool(tool);
      if (tool === 'polygon') {
        drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      } else if (tool === 'circle') {
        drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.CIRCLE);
      } else if (tool === 'rectangle') {
        drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
      }
    }
  };

  const handleClearBoundary = () => {
    if (currentShapeRef.current) {
      currentShapeRef.current.setMap(null);
      currentShapeRef.current = null;
    }
    setBoundaryType(null);
    setBoundaryData(null);
    setSearchResults([]);
    clearMarkers();
  };

  const performSearch = async (type: BoundaryType, data: BoundaryData) => {
    if (!type || !data) return;

    setIsSearching(true);
    try {
      const result = await searchMutation.mutateAsync({
        boundaryType: type,
        boundaryData: data,
        filters: {
          minPrice,
          maxPrice,
          minBedrooms,
          propertyType,
          status: 'active',
        },
      });

      setSearchResults(result.properties);
      displayPropertiesOnMap(result.properties);
      toast.success(`Found ${result.count} properties`);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Failed to search properties');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    if (boundaryType && boundaryData) {
      performSearch(boundaryType, boundaryData);
    } else {
      toast.error('Please draw a search area first');
    }
  };

  const displayPropertiesOnMap = (properties: any[]) => {
    if (!mapRef.current) return;

    // Clear existing markers
    clearMarkers();

    // Add new markers
    properties.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: property.latitude, lng: property.longitude },
        title: property.addressLine1,
      });

      // Add click listener
      marker.addListener('click', () => {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 4px;">${property.addressLine1}</h3>
              <p style="color: #2563eb; font-weight: bold; font-size: 18px;">$${property.price?.toLocaleString()}</p>
              <p style="font-size: 14px; color: #666;">${property.bedrooms} bed • ${property.bathrooms} bath • ${property.squareFeet} sqft</p>
              <a href="/property/${property.id}" style="color: #2563eb; text-decoration: underline;">View Details</a>
            </div>
          `,
        });
        infoWindow.open(mapRef.current!, marker);
      });

      markersRef.current.push(marker);
    });
  };

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.map = null);
    markersRef.current = [];
  };

  const toggleHeatmap = async () => {
    if (!mapRef.current) return;

    if (showHeatmap) {
      // Hide heatmap
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
      setShowHeatmap(false);
    } else {
      // Show heatmap
      const bounds = mapRef.current.getBounds();
      if (!bounds) return;

      try {
        const result = await heatmapQuery.refetch({
          queryKey: [
            'mapSearch.getHeatmapData',
            {
              bounds: {
                north: bounds.getNorthEast().lat(),
                south: bounds.getSouthWest().lat(),
                east: bounds.getNorthEast().lng(),
                west: bounds.getSouthWest().lng(),
              },
              metric: heatmapMetric,
            },
          ],
        } as any);

        if (result.data && result.data.points.length > 0) {
          const heatmapData = result.data.points.map(
            (point: any) =>
              ({
                location: new google.maps.LatLng(point.lat, point.lng),
                weight: point.weight,
              } as google.maps.visualization.WeightedLocation)
          );

          const heatmap = new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: mapRef.current,
            radius: 20,
            opacity: 0.6,
          });

          heatmapRef.current = heatmap;
          setShowHeatmap(true);
          toast.success('Heatmap loaded');
        } else {
          toast.info('No data available for heatmap');
        }
      } catch (error) {
        console.error('Heatmap error:', error);
        toast.error('Failed to load heatmap');
      }
    }
  };

  const handleSaveSearch = async () => {
    if (!boundaryType || !boundaryData) {
      toast.error('Please draw a search area first');
      return;
    }

    if (!searchName.trim()) {
      toast.error('Please enter a search name');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        name: searchName,
        boundaryType,
        boundaryData,
        searchCriteria: {
          minPrice,
          maxPrice,
          minBedrooms,
          propertyType,
        },
        notificationsEnabled: true,
      });

      toast.success('Search saved successfully');
      setSaveDialogOpen(false);
      setSearchName('');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save search');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/map">
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4 mr-2" />
              Exit Advanced Search
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Advanced Map Search</h1>
          {searchResults.length > 0 && (
            <Badge variant="secondary">{searchResults.length} properties found</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSearch} disabled={!boundaryType || isSearching}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!boundaryType}>
            <Save className="h-4 w-4 mr-2" />
            Save Search
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-background border-r overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Drawing Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Drawing Tools</CardTitle>
                <CardDescription>Draw a custom search area</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={activeTool === 'polygon' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => handleToolSelect('polygon')}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Draw Polygon
                </Button>
                <Button
                  variant={activeTool === 'circle' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => handleToolSelect('circle')}
                >
                  <Circle className="h-4 w-4 mr-2" />
                  Draw Circle
                </Button>
                <Button
                  variant={activeTool === 'rectangle' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => handleToolSelect('rectangle')}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Draw Rectangle
                </Button>
                {boundaryType && (
                  <Button variant="destructive" className="w-full justify-start" onClick={handleClearBoundary}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Boundary
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Price Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice || ''}
                      onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice || ''}
                      onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Min Bedrooms</Label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={minBedrooms || ''}
                    onChange={(e) => setMinBedrooms(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Heatmap</CardTitle>
                <CardDescription>Visualize property data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show Heatmap</Label>
                  <Switch checked={showHeatmap} onCheckedChange={toggleHeatmap} />
                </div>
                {showHeatmap && (
                  <div className="space-y-2">
                    <Label>Metric</Label>
                    <Select value={heatmapMetric} onValueChange={(v: any) => setHeatmapMetric(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="density">Property Density</SelectItem>
                        <SelectItem value="price">Price Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Results ({searchResults.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.slice(0, 10).map((property) => (
                    <Link key={property.id} href={`/property/${property.id}`}>
                      <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                        <div className="font-medium text-sm">{property.addressLine1}</div>
                        <div className="text-primary font-bold">${property.price?.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {property.bedrooms} bed • {property.bathrooms} bath
                        </div>
                      </div>
                    </Link>
                  ))}
                  {searchResults.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      + {searchResults.length - 10} more properties
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            initialCenter={{ lat: 6.5244, lng: 3.3792 }}
            initialZoom={12}
            onMapReady={handleMapReady}
          />
        </div>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save this search area and filters to get notifications about new listings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="searchName">Search Name</Label>
              <Input
                id="searchName"
                placeholder="e.g., Downtown Lagos Apartments"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            {boundaryType && (
              <div className="text-sm text-muted-foreground">
                <p>Boundary: {boundaryType}</p>
                {minPrice && <p>Min Price: ${minPrice.toLocaleString()}</p>}
                {maxPrice && <p>Max Price: ${maxPrice.toLocaleString()}</p>}
                {minBedrooms && <p>Min Bedrooms: {minBedrooms}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
