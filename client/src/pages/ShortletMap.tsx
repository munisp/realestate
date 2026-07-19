// @ts-nocheck
import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Save,
  Bookmark,
  CalendarIcon,
  MapPin, 
  Users, 
  Star, 
  Bed, 
  Bath, 
  Wifi, 
  Car, 
  Waves,
  X,
  List,
  Map as MapIcon,
  Filter,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { GoogleMap, useLoadScript, Marker, InfoWindow, MarkerClusterer, StreetViewPanorama } from '@react-google-maps/api';
import PropertyComparisonPanel from '@/components/PropertyComparisonPanel';
import BottomSheet from '@/components/BottomSheet';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 6.5244, // Lagos, Nigeria
  lng: 3.3792,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

interface ShortletProperty {
  id: number;
  title: string;
  addressLine1: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  pricePerNight: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  images: string[];
  amenities?: string[];
}

export default function ShortletMap() {
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<ShortletProperty | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(12);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showFilters, setShowFilters] = useState(true);
  const [showStreetView, setShowStreetView] = useState(false);
  const [streetViewPosition, setStreetViewPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [comparisonProperties, setComparisonProperties] = useState<ShortletProperty[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [heatmapLayer, setHeatmapLayer] = useState<'none' | 'price' | 'availability' | 'popularity'>('none');
  const [heatmapInstance, setHeatmapInstance] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'distance' | 'rating'>('price');
  const [sortLocation, setSortLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['visualization'],
  });

  const { data, isLoading } = trpc.shortlet.getListings.useQuery({
    city: city || undefined,
    checkIn: checkIn?.toISOString(),
    checkOut: checkOut?.toISOString(),
    guests,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
  });

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    if (!(data as any)?.properties) return [];
    
    let filtered = [...(data as any).properties];

    // Filter by property type
    if (propertyTypes.length > 0) {
      filtered = filtered.filter((p: ShortletProperty) => {
        // Assuming properties have a propertyType field
        const propType = (p as any).propertyType?.toLowerCase() || 'apartment';
        return propertyTypes.includes(propType);
      });
    }

    // Filter by availability if dates selected and onlyAvailable is checked
    if (onlyAvailable && checkIn && checkOut && availabilityData) {
      filtered = filtered.filter((p: ShortletProperty) => {
        const status = availabilityData.find((a: any) => a.propertyId === p.id);
        return status?.status === 'available';
      });
    }

    // Sort properties
    if (sortBy === 'price') {
      filtered.sort((a: any, b: any) => a.pricePerNight - b.pricePerNight);
    } else if (sortBy === 'rating') {
      // Assuming properties have a rating field
      filtered.sort((a: any, b: any) => ((b as any).rating || 0) - ((a as any).rating || 0));
    } else if (sortBy === 'distance' && sortLocation) {
      // Calculate distance from sortLocation
      filtered.sort((a: any, b: any) => {
        const distA = calculateDistance(
          sortLocation.lat,
          sortLocation.lng,
          a.latitude,
          a.longitude
        );
        const distB = calculateDistance(
          sortLocation.lat,
          sortLocation.lng,
          b.latitude,
          b.longitude
        );
        return distA - distB;
      });
    }

    return filtered;
  }, [(data as any)?.properties, propertyTypes, onlyAvailable, checkIn, checkOut, availabilityData, sortBy, sortLocation]);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get availability status for properties
  const { data: availabilityData } = trpc.shortlet.getAvailabilityStatus.useQuery(
    {
      propertyIds: (data as any)?.properties.map((p: ShortletProperty) => p.id) || [],
      checkIn: checkIn?.toISOString(),
      checkOut: checkOut?.toISOString(),
    },
    { enabled: !!(data as any)?.properties && (data as any).properties.length > 0 }
  );

  const saveSearchMutation = trpc.shortlet.saveMapSearch.useMutation({
    onSuccess: () => {
      toast.success('Map search saved successfully!');
      setShowSaveDialog(false);
      setSearchName('');
    },
    onError: () => {
      toast.error('Failed to save search');
    },
  });

  const amenitiesList = [
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'parking', label: 'Parking', icon: Car },
    { id: 'pool', label: 'Pool', icon: Waves },
  ];

  const handleAmenityToggle = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter((id: any) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    // Fit bounds to show all properties
    if ((data as any)?.properties && (data as any).properties.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      (data as any).properties.forEach((property: ShortletProperty) => {
        if (property.latitude && property.longitude) {
          bounds.extend({ lat: property.latitude, lng: property.longitude });
        }
      });
      map.fitBounds(bounds);
    }
  }, [(data as any)?.properties]);

  const handleMarkerClick = (property: ShortletProperty) => {
    setSelectedProperty(property);
    setMapCenter({ lat: property.latitude, lng: property.longitude });
  };

  const handleStreetView = (property: ShortletProperty) => {
    setStreetViewPosition({ lat: property.latitude, lng: property.longitude });
    setShowStreetView(true);
  };

  const handleSaveSearch = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save searches');
      return;
    }
    if (!mapBounds) {
      toast.error('Please adjust the map view first');
      return;
    }
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    if (!searchName.trim()) {
      toast.error('Please enter a name for this search');
      return;
    }
    if (!mapBounds) return;

    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();

    saveSearchMutation.mutate({
      name: searchName,
      northEastLat: ne.lat(),
      northEastLng: ne.lng(),
      southWestLat: sw.lat(),
      southWestLng: sw.lng(),
      city,
      checkIn: checkIn?.toISOString(),
      checkOut: checkOut?.toISOString(),
      guests,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      amenities: selectedAmenities,
      alertEnabled: true,
    });
  };

  const getMarkerColor = (propertyId: number): string => {
    const status = (availabilityData as any)?.[propertyId]?.status;
    if (!status) return '#3b82f6'; // blue default
    switch (status) {
      case 'available':
        return '#22c55e'; // green
      case 'limited':
        return '#f59e0b'; // yellow/orange
      case 'booked':
        return '#ef4444'; // red
      default:
        return '#3b82f6';
    }
  };

  const clearFilters = () => {
    setCity('');
    setCheckIn(undefined);
    setCheckOut(undefined);
    setGuests(1);
    setPriceRange([0, 100000]);
    setSelectedAmenities([]);
    setPropertyTypes([]);
    setSortBy('price');
    setSortLocation(null);
    setOnlyAvailable(false);
  };

  const togglePropertyComparison = (property: ShortletProperty) => {
    setComparisonProperties(prev => {
      const exists = prev.find((p: any) => p.id === property.id);
      if (exists) {
        return prev.filter((p: any) => p.id !== property.id);
      } else {
        if (prev.length >= 3) {
          toast.error('You can compare up to 3 properties at a time');
          return prev;
        }
        return [...prev, property];
      }
    });
  };

  const isPropertyInComparison = (propertyId: number): boolean => {
    return comparisonProperties.some((p: any) => p.id === propertyId);
  };

  const removeFromComparison = (propertyId: number) => {
    setComparisonProperties(prev => prev.filter((p: any) => p.id !== propertyId));
  };

  const clearComparison = () => {
    setComparisonProperties([]);
    setShowComparison(false);
  };

  const generateHeatmapData = (type: 'price' | 'availability' | 'popularity'): google.maps.visualization.WeightedLocation[] => {
    if (!(data as any)?.properties) return [];

    return (data as any).properties.map((property: ShortletProperty) => {
      let weight = 1;
      
      switch (type) {
        case 'price':
          // Higher price = higher weight
          weight = property.pricePerNight / 1000; // Normalize
          break;
        case 'availability':
          // Available properties get higher weight
          const status = (availabilityData as any)?.[property.id]?.status;
          weight = status === 'available' ? 3 : status === 'limited' ? 2 : 1;
          break;
        case 'popularity':
          // Mock popularity based on price and location (in real app, use actual booking data)
          weight = Math.random() * 5 + 1;
          break;
      }

      return {
        location: new google.maps.LatLng(property.latitude, property.longitude),
        weight,
      };
    });
  };

  const toggleHeatmap = (type: 'none' | 'price' | 'availability' | 'popularity') => {
    // Remove existing heatmap
    if (heatmapInstance) {
      heatmapInstance.setMap(null);
      setHeatmapInstance(null);
    }

    setHeatmapLayer(type);

    // Create new heatmap if not 'none'
    if (type !== 'none' && mapInstance && google.maps.visualization) {
      const heatmapData = generateHeatmapData(type);
      
      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapInstance,
        radius: 50,
        opacity: 0.6,
        gradient: type === 'price' 
          ? ['rgba(0, 255, 0, 0)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'] // Green to red for price
          : type === 'availability'
          ? ['rgba(255, 0, 0, 0)', 'rgba(255, 255, 0, 1)', 'rgba(0, 255, 0, 1)'] // Red to green for availability
          : ['rgba(0, 0, 255, 0)', 'rgba(0, 255, 255, 1)', 'rgba(255, 0, 255, 1)'], // Blue to purple for popularity
      });

      setHeatmapInstance(heatmap);
    }
  };

  // Update heatmap when data changes
  useEffect(() => {
    if (heatmapLayer !== 'none') {
      toggleHeatmap(heatmapLayer);
    }
  }, [(data as any)?.properties, availabilityData]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Map Loading Error</CardTitle>
            <CardDescription>Unable to load Google Maps. Please check your API key.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 px-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shortlet Map Search</h1>
          <p className="text-sm opacity-90">
            {filteredAndSortedProperties.length} of {(data as any)?.total || 0} properties
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'map' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Map
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // On mobile, use bottom sheet; on desktop, use sidebar
              if (window.innerWidth < 768) {
                setShowMobileFilters(true);
              } else {
                setShowFilters(!showFilters);
              }
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={heatmapLayer !== 'none' ? 'secondary' : 'ghost'}
                size="sm"
              >
                <Layers className="h-4 w-4 mr-2" />
                Heatmap
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-3">Heatmap Layers</h4>
                <Button
                  variant={heatmapLayer === 'none' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => toggleHeatmap('none')}
                >
                  None
                </Button>
                <Button
                  variant={heatmapLayer === 'price' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => toggleHeatmap('price')}
                >
                  Price Density
                </Button>
                <Button
                  variant={heatmapLayer === 'availability' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => toggleHeatmap('availability')}
                >
                  Availability
                </Button>
                <Button
                  variant={heatmapLayer === 'popularity' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => toggleHeatmap('popularity')}
                >
                  Popularity
                </Button>
                {heatmapLayer !== 'none' && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground">
                      {heatmapLayer === 'price' && 'Red = Higher prices, Green = Lower prices'}
                      {heatmapLayer === 'availability' && 'Green = More available, Red = Less available'}
                      {heatmapLayer === 'popularity' && 'Purple = High demand areas'}
                    </p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveSearch}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Search
          </Button>
          <Link href="/shortlet/saved-searches">
            <Button variant="ghost" size="sm">
              <Bookmark className="h-4 w-4 mr-2" />
              Saved
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 bg-background border-r overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Search Filters</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* City */}
            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Input
                placeholder="Lagos, Abuja, New York..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            {/* Check-in Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Check-in</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Check-out</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => !checkIn || date <= checkIn}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Guests */}
            <div>
              <label className="text-sm font-medium mb-2 block">Guests</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Price Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Price Range: ₦{priceRange[0].toLocaleString()} - ₦{priceRange[1].toLocaleString()}
              </label>
              <Slider
                min={0}
                max={100000}
                step={5000}
                value={priceRange}
                onValueChange={setPriceRange}
                className="mt-2"
              />
            </div>

            {/* Amenities */}
            <div>
              <label className="text-sm font-medium mb-2 block">Amenities</label>
              <div className="space-y-2">
                {amenitiesList.map((amenity) => (
                  <div key={amenity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity.id}
                      checked={selectedAmenities.includes(amenity.id)}
                      onCheckedChange={() => handleAmenityToggle(amenity.id)}
                    />
                    <label
                      htmlFor={amenity.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <amenity.icon className="h-4 w-4" />
                      {amenity.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Property Type</label>
              <div className="space-y-2">
                {['Apartment', 'House', 'Studio', 'Villa', 'Condo'].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={propertyTypes.includes(type.toLowerCase())}
                      onCheckedChange={() => {
                        const typeValue = type.toLowerCase();
                        setPropertyTypes(prev =>
                          prev.includes(typeValue)
                            ? prev.filter((t: any) => t !== typeValue)
                            : [...prev, typeValue]
                        );
                      }}
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <div className="space-y-2">
                <Button
                  variant={sortBy === 'price' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy('price')}
                >
                  Price (Low to High)
                </Button>
                <Button
                  variant={sortBy === 'rating' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSortBy('rating')}
                >
                  Rating (High to Low)
                </Button>
                <Button
                  variant={sortBy === 'distance' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSortBy('distance');
                    if (!sortLocation) {
                      // Use map center as default location
                      setSortLocation(mapCenter);
                    }
                  }}
                >
                  Distance from Location
                </Button>
                {sortBy === 'distance' && (
                  <Input
                    placeholder="Enter address or click map"
                    className="mt-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ address: e.currentTarget.value }, (results, status) => {
                          if (status === 'OK' && results && results[0]) {
                            const location = results[0].geometry.location;
                            setSortLocation({ lat: location.lat(), lng: location.lng() });
                            setMapCenter({ lat: location.lat(), lng: location.lng() });
                            toast.success('Location set for distance sorting');
                          } else {
                            toast.error('Location not found');
                          }
                        });
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* Only Available */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="only-available"
                checked={onlyAvailable}
                onCheckedChange={(checked) => setOnlyAvailable(checked as boolean)}
              />
              <label
                htmlFor="only-available"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show only available for selected dates
              </label>
            </div>

            {/* Clear Filters */}
            <Button variant="outline" className="w-full" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Map/List View */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={mapZoom}
              center={mapCenter}
              options={mapOptions}
              onLoad={handleMapLoad}
              onBoundsChanged={() => {
                // Update bounds when map moves
                if (window.google && window.google.maps) {
                  const map = document.querySelector('div[role="region"]') as any;
                  if (map && map.getBounds) {
                    setMapBounds(map.getBounds());
                  }
                }
              }}
            >
              {filteredAndSortedProperties && filteredAndSortedProperties.length > 0 && (
                <MarkerClusterer
                  options={{
                    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
                  }}
                >
                  {(clusterer) => (
                    <>
                      {filteredAndSortedProperties.map((property: ShortletProperty) => (
                        property.latitude && property.longitude && (
                          <Marker
                            key={property.id}
                            position={{ lat: property.latitude, lng: property.longitude }}
                            clusterer={clusterer}
                            onClick={() => handleMarkerClick(property)}
                            icon={{
                              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                <svg width="40" height="50" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" fill="${getMarkerColor(property.id)}"/>
                                  <circle cx="20" cy="20" r="8" fill="white"/>
                                  <text x="20" y="25" font-size="10" text-anchor="middle" fill="${getMarkerColor(property.id)}" font-weight="bold">₦${Math.round(property.pricePerNight / 1000)}k</text>
                                </svg>
                              `),
                              scaledSize: new google.maps.Size(40, 50),
                            }}
                          />
                        )
                      ))}
                    </>
                  )}
                </MarkerClusterer>
              )}

              {selectedProperty && (
                <InfoWindow
                  position={{ lat: selectedProperty.latitude, lng: selectedProperty.longitude }}
                  onCloseClick={() => setSelectedProperty(null)}
                >
                  <div className="p-2 max-w-xs">
                    {selectedProperty.images && selectedProperty.images.length > 0 && (
                      <img
                        src={selectedProperty.images[0]}
                        alt={selectedProperty.title}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="font-semibold text-sm mb-1">{selectedProperty.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">
                      {selectedProperty.city}, {selectedProperty.state}
                    </p>
                    <div className="flex gap-2 text-xs text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Bed className="h-3 w-3" />
                        {selectedProperty.bedrooms}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="h-3 w-3" />
                        {selectedProperty.bathrooms}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {selectedProperty.maxGuests}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">
                          ₦{selectedProperty.pricePerNight.toLocaleString()}/night
                        </span>
                        {(availabilityData as any)?.[selectedProperty.id] && (
                          <Badge
                            variant={
                              availabilityData[selectedProperty.id].status === 'available'
                                ? 'default'
                                : availabilityData[selectedProperty.id].status === 'limited'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {availabilityData[selectedProperty.id].status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          id={`compare-${selectedProperty.id}`}
                          checked={isPropertyInComparison(selectedProperty.id)}
                          onCheckedChange={() => togglePropertyComparison(selectedProperty)}
                        />
                        <label htmlFor={`compare-${selectedProperty.id}`} className="text-xs cursor-pointer">
                          Add to comparison
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/shortlet/${selectedProperty.id}`} className="flex-1">
                          <Button size="sm" className="w-full">View Details</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStreetView(selectedProperty)}
                        >
                          Street View
                        </Button>
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-muted" />
                      <CardHeader>
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (data as any)?.properties.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No properties found matching your criteria</p>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(data as any)?.properties.map((property: ShortletProperty) => (
                    <Link key={property.id} href={`/shortlet/${property.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          {property.images && property.images.length > 0 ? (
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <MapPin className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                            ₦{property.pricePerNight?.toLocaleString()}/night
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle className="line-clamp-1">{property.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {property.city}, {property.state}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Bed className="h-4 w-4" />
                              {property.bedrooms} beds
                            </div>
                            <div className="flex items-center gap-1">
                              <Bath className="h-4 w-4" />
                              {property.bathrooms} baths
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {property.maxGuests} guests
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">4.8</span>
                            <span className="text-sm text-muted-foreground">(24 reviews)</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Map Search</DialogTitle>
            <DialogDescription>
              Save this search to get alerts when new properties match your criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Name</label>
              <Input
                placeholder="e.g., Lagos Shortlets under ₦50k"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Location:</strong> {city || 'All locations'}</p>
              {checkIn && checkOut && (
                <p>
                  <strong>Dates:</strong> {format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d')}
                </p>
              )}
              <p><strong>Guests:</strong> {guests}</p>
              <p>
                <strong>Price:</strong> ₦{priceRange[0].toLocaleString()} - ₦{priceRange[1].toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} disabled={saveSearchMutation.isPending}>
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparison Panel Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Comparison</DialogTitle>
            <DialogDescription>
              Compare selected properties side by side
            </DialogDescription>
          </DialogHeader>
          <PropertyComparisonPanel
            properties={comparisonProperties.map((p: any) => ({
              id: p.id,
              name: p.title,
              address: `${p.addressLine1}, ${p.city}`,
              price: p.pricePerNight,
              bedrooms: p.bedrooms,
              bathrooms: p.bathrooms,
              squareFeet: undefined,
              images: p.images || [],
              amenities: p.amenities || [],
              availabilityStatus: (availabilityData as any)?.[p.id]?.status || 'available',
              rating: 4.5,
              reviewCount: 24,
            }))}
            onRemoveProperty={removeFromComparison}
            onClearAll={clearComparison}
            maxProperties={3}
          />
        </DialogContent>
      </Dialog>

      {/* Floating Comparison Button */}
      {comparisonProperties.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="shadow-lg"
            onClick={() => setShowComparison(true)}
          >
            Compare Properties ({comparisonProperties.length})
          </Button>
        </div>
      )}

      {/* Mobile Filters Bottom Sheet */}
      <BottomSheet
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Search Filters"
      >
        <div className="space-y-4">
          {/* City */}
          <div>
            <label className="text-sm font-medium mb-2 block">City</label>
            <Input
              placeholder="Lagos, Abuja, New York..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* Check-in Date */}
          <div>
            <label className="text-sm font-medium mb-2 block">Check-in</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={setCheckIn}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Check-out Date */}
          <div>
            <label className="text-sm font-medium mb-2 block">Check-out</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(date) => !checkIn || date <= checkIn}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Guests */}
          <div>
            <label className="text-sm font-medium mb-2 block">Guests</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Price Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Price Range: ₦{priceRange[0].toLocaleString()} - ₦{priceRange[1].toLocaleString()}
            </label>
            <Slider
              min={0}
              max={100000}
              step={5000}
              value={priceRange}
              onValueChange={setPriceRange}
              className="mt-2"
            />
          </div>

          {/* Property Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Property Type</label>
            <div className="space-y-2">
              {['Apartment', 'House', 'Studio', 'Villa', 'Condo'].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mobile-type-${type}`}
                    checked={propertyTypes.includes(type.toLowerCase())}
                    onCheckedChange={() => {
                      const typeValue = type.toLowerCase();
                      setPropertyTypes(prev =>
                        prev.includes(typeValue)
                          ? prev.filter((t: any) => t !== typeValue)
                          : [...prev, typeValue]
                      );
                    }}
                  />
                  <label
                    htmlFor={`mobile-type-${type}`}
                    className="text-sm font-medium leading-none"
                  >
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="text-sm font-medium mb-2 block">Amenities</label>
            <div className="space-y-2">
              {amenitiesList.map((amenity) => (
                <div key={amenity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mobile-${amenity.id}`}
                    checked={selectedAmenities.includes(amenity.id)}
                    onCheckedChange={() => handleAmenityToggle(amenity.id)}
                  />
                  <label
                    htmlFor={`mobile-${amenity.id}`}
                    className="text-sm font-medium leading-none flex items-center gap-2"
                  >
                    <amenity.icon className="h-4 w-4" />
                    {amenity.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Only Available */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mobile-only-available"
              checked={onlyAvailable}
              onCheckedChange={(checked) => setOnlyAvailable(checked as boolean)}
            />
            <label
              htmlFor="mobile-only-available"
              className="text-sm font-medium leading-none"
            >
              Show only available for selected dates
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Clear All
            </Button>
            <Button className="flex-1" onClick={() => setShowMobileFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Street View Modal */}
      <Dialog open={showStreetView} onOpenChange={setShowStreetView}>
        <DialogContent className="max-w-4xl h-[600px]">
          <DialogHeader>
            <DialogTitle>Street View</DialogTitle>
            <DialogDescription>
              Explore the neighborhood around this property
            </DialogDescription>
          </DialogHeader>
          <div className="h-full w-full">
            {showStreetView && streetViewPosition && (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                zoom={14}
                center={streetViewPosition}
                options={{
                  streetViewControl: true,
                  fullscreenControl: true,
                }}
              >
                <StreetViewPanorama
                  position={streetViewPosition}
                  visible={true}
                  options={{
                    enableCloseButton: false,
                    addressControl: true,
                    linksControl: true,
                    panControl: true,
                    zoomControl: true,
                  }}
                />
              </GoogleMap>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
