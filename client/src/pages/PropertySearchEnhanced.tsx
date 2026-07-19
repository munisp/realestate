// @ts-nocheck
import { useState } from 'react';
import { MapView } from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import { 
  Search, MapPin, Layers, TrendingUp, Home, DollarSign, 
  Bed, Bath, Maximize, Calendar, Filter, Save, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

interface AdvancedFilters {
  location?: { lat: number; lng: number };
  radius: number;
  propertyTypes: string[];
  priceRange: { min: number; max: number };
  bedrooms?: number;
  bathrooms?: number;
  sqftRange: { min: number; max: number };
  yearBuiltRange: { min: number; max: number };
  amenities: string[];
  status: string[];
  sortBy: 'price_asc' | 'price_desc' | 'date_new' | 'date_old' | 'sqft_asc' | 'sqft_desc';
}

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi-Family' },
];

const AMENITIES = [
  { value: 'pool', label: 'Pool', icon: '🏊' },
  { value: 'garage', label: 'Garage', icon: '🚗' },
  { value: 'gym', label: 'Gym', icon: '💪' },
  { value: 'garden', label: 'Garden', icon: '🌳' },
  { value: 'balcony', label: 'Balcony', icon: '🏡' },
  { value: 'fireplace', label: 'Fireplace', icon: '🔥' },
  { value: 'ac', label: 'Air Conditioning', icon: '❄️' },
  { value: 'heating', label: 'Heating', icon: '🔥' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'sold', label: 'Sold', color: 'bg-gray-500' },
];

export default function PropertySearchEnhanced() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<AdvancedFilters>({
    radius: 5,
    propertyTypes: [],
    priceRange: { min: 0, max: 5000000 },
    sqftRange: { min: 0, max: 10000 },
    yearBuiltRange: { min: 1950, max: new Date().getFullYear() },
    amenities: [],
    status: ['active'],
    sortBy: 'date_new',
  });

  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Search properties
  const { data: searchResults, isLoading, refetch } = trpc.properties.search.useQuery(
    {
      center: searchCenter,
      radiusKm: filters.radius,
      propertyTypes: filters.propertyTypes.length > 0 ? filters.propertyTypes : undefined,
      priceRange: filters.priceRange,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      sqftRange: filters.sqftRange.min > 0 || filters.sqftRange.max < 10000 ? filters.sqftRange : undefined,
      yearBuiltRange: filters.yearBuiltRange.min > 1950 || filters.yearBuiltRange.max < new Date().getFullYear() 
        ? filters.yearBuiltRange 
        : undefined,
      status: filters.status,
      sortBy: filters.sortBy,
      limit: 50,
    },
    {
      enabled: !!searchCenter,
    }
  );

  const handleLocationSearch = async (address: string) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });
      
      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        setSearchCenter({
          lat: location.lat(),
          lng: location.lng(),
        });
        toast.success(`Found location: ${result.results[0].formatted_address}`);
      }
    } catch (error) {
      toast.error('Failed to find location');
    }
  };

  const handleSaveSearch = () => {
    // Navigate to saved searches page with current filters
    setLocation('/saved-searches?action=save');
    toast.success('Redirecting to save search...');
  };

  const handleClearFilters = () => {
    setFilters({
      radius: 5,
      propertyTypes: [],
      priceRange: { min: 0, max: 5000000 },
      sqftRange: { min: 0, max: 10000 },
      yearBuiltRange: { min: 1950, max: new Date().getFullYear() },
      amenities: [],
      status: ['active'],
      sortBy: 'date_new',
    });
    toast.info('Filters cleared');
  };

  const activeFilterCount = [
    filters.propertyTypes.length > 0,
    filters.bedrooms !== undefined,
    filters.bathrooms !== undefined,
    filters.priceRange.min > 0 || filters.priceRange.max < 5000000,
    filters.sqftRange.min > 0 || filters.sqftRange.max < 10000,
    filters.yearBuiltRange.min > 1950 || filters.yearBuiltRange.max < new Date().getFullYear(),
    filters.amenities.length > 0,
    filters.status.length !== 1 || filters.status[0] !== 'active',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <h1 className="text-3xl font-bold mb-2">Advanced Property Search</h1>
          <p className="text-muted-foreground">
            Search through {searchResults?.total || '1,622'} properties with powerful filters
          </p>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary">{activeFilterCount}</Badge>
                    )}
                  </span>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-6 pr-4">
                    {/* Location Search */}
                    <div>
                      <Label className="mb-2">Location</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter city or address..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleLocationSearch(e.currentTarget.value);
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleLocationSearch(input.value);
                          }}
                        >
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                      {searchCenter && (
                        <Badge variant="secondary" className="mt-2">
                          <MapPin className="w-3 h-3 mr-1" />
                          {searchCenter.lat.toFixed(4)}, {searchCenter.lng.toFixed(4)}
                        </Badge>
                      )}
                    </div>

                    {/* Radius */}
                    <div>
                      <Label className="mb-2 block">
                        Search Radius: {filters.radius} km
                      </Label>
                      <Slider
                        value={[filters.radius]}
                        onValueChange={([value]) => setFilters({ ...filters, radius: value })}
                        min={1}
                        max={50}
                        step={1}
                      />
                    </div>

                    <Separator />

                    {/* Property Types (Multi-select) */}
                    <div>
                      <Label className="mb-3 block">Property Type</Label>
                      <div className="space-y-2">
                        {PROPERTY_TYPES.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={type.value}
                              checked={filters.propertyTypes.includes(type.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters({
                                    ...filters,
                                    propertyTypes: [...filters.propertyTypes, type.value],
                                  });
                                } else {
                                  setFilters({
                                    ...filters,
                                    propertyTypes: filters.propertyTypes.filter((t) => t !== type.value),
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={type.value} className="cursor-pointer">
                              {type.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Price Range */}
                    <div>
                      <Label className="mb-2 block">
                        Price Range: ${filters.priceRange.min.toLocaleString()} - $
                        {filters.priceRange.max.toLocaleString()}
                      </Label>
                      <Slider
                        value={[filters.priceRange.min, filters.priceRange.max]}
                        onValueChange={([min, max]) =>
                          setFilters({ ...filters, priceRange: { min, max } })
                        }
                        min={0}
                        max={5000000}
                        step={50000}
                      />
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <Label className="mb-2 block">Bedrooms</Label>
                      <Select
                        value={filters.bedrooms?.toString() || 'any'}
                        onValueChange={(value) =>
                          setFilters({ ...filters, bedrooms: value === 'any' ? undefined : parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                          <SelectItem value="5">5+</SelectItem>
                          <SelectItem value="6">6+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <Label className="mb-2 block">Bathrooms</Label>
                      <Select
                        value={filters.bathrooms?.toString() || 'any'}
                        onValueChange={(value) =>
                          setFilters({ ...filters, bathrooms: value === 'any' ? undefined : parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Advanced Filters Toggle */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      {showAdvanced ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Hide Advanced Filters
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Show Advanced Filters
                        </>
                      )}
                    </Button>

                    {showAdvanced && (
                      <>
                        {/* Square Footage */}
                        <div>
                          <Label className="mb-2 block">
                            Square Footage: {filters.sqftRange.min.toLocaleString()} - {filters.sqftRange.max.toLocaleString()} sq ft
                          </Label>
                          <Slider
                            value={[filters.sqftRange.min, filters.sqftRange.max]}
                            onValueChange={([min, max]) =>
                              setFilters({ ...filters, sqftRange: { min, max } })
                            }
                            min={0}
                            max={10000}
                            step={100}
                          />
                        </div>

                        {/* Year Built */}
                        <div>
                          <Label className="mb-2 block">
                            Year Built: {filters.yearBuiltRange.min} - {filters.yearBuiltRange.max}
                          </Label>
                          <Slider
                            value={[filters.yearBuiltRange.min, filters.yearBuiltRange.max]}
                            onValueChange={([min, max]) =>
                              setFilters({ ...filters, yearBuiltRange: { min, max } })
                            }
                            min={1950}
                            max={new Date().getFullYear()}
                            step={1}
                          />
                        </div>

                        {/* Amenities */}
                        <div>
                          <Label className="mb-3 block">Amenities</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {AMENITIES.map((amenity) => (
                              <div key={amenity.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={amenity.value}
                                  checked={filters.amenities.includes(amenity.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFilters({
                                        ...filters,
                                        amenities: [...filters.amenities, amenity.value],
                                      });
                                    } else {
                                      setFilters({
                                        ...filters,
                                        amenities: filters.amenities.filter((a) => a !== amenity.value),
                                      });
                                    }
                                  }}
                                />
                                <Label htmlFor={amenity.value} className="cursor-pointer text-sm">
                                  {amenity.icon} {amenity.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <Label className="mb-3 block">Property Status</Label>
                          <div className="space-y-2">
                            {STATUS_OPTIONS.map((status) => (
                              <div key={status.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={status.value}
                                  checked={filters.status.includes(status.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFilters({
                                        ...filters,
                                        status: [...filters.status, status.value],
                                      });
                                    } else {
                                      setFilters({
                                        ...filters,
                                        status: filters.status.filter((s) => s !== status.value),
                                      });
                                    }
                                  }}
                                />
                                <Label htmlFor={status.value} className="cursor-pointer flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${status.color}`} />
                                  {status.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Save Search Button */}
                    <Button className="w-full" onClick={handleSaveSearch}>
                      <Save className="w-4 h-4 mr-2" />
                      Save This Search
                    </Button>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Sort and View Controls */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {searchResults?.total || 0} properties found
                    </span>
                    {isLoading && (
                      <Badge variant="secondary">Loading...</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Sort by:</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value: any) => setFilters({ ...filters, sortBy: value })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_new">Newest First</SelectItem>
                        <SelectItem value="date_old">Oldest First</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="sqft_asc">Size: Small to Large</SelectItem>
                        <SelectItem value="sqft_desc">Size: Large to Small</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Results */}
            {!searchCenter ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Start Your Search</h3>
                  <p className="text-muted-foreground">
                    Enter a location above to find properties near you
                  </p>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchResults && searchResults.properties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.properties.map((property: any) => (
                  <Card key={property.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                      <Badge className="absolute top-2 right-2">
                        {property.status}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
                      <p className="text-2xl font-bold text-primary mb-2">
                        ${property.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {property.bedrooms} bed
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {property.bathrooms} bath
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize className="w-4 h-4" />
                          {property.squareFeet?.toLocaleString()} sq ft
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {property.city}, {property.state}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search in a different area
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
