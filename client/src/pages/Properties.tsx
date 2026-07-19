// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Building2, Heart, MapPin, Search, Shield, GitCompare } from "lucide-react";
import { ValuationBadge } from "@/components/ValuationBadge";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { SaveSearchDialog } from "@/components/SaveSearchDialog";
import { SmartFilterSuggestions } from "@/components/SmartFilterSuggestions";
import { useComparison } from "@/contexts/ComparisonContext";
import { toast } from "sonner";

export default function Properties() {
  const [location] = useLocation();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [minBedrooms, setMinBedrooms] = useState(0);
  const [minBathrooms, setMinBathrooms] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>("all");

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get('city');
    const typeParam = params.get('type');
    
    if (cityParam) setCity(cityParam);
    if (typeParam) setPropertyType(typeParam);
  }, [location]);

  // Fetch verification counts
  const { data: verificationCounts } = trpc.propertyStats.getVerificationCounts.useQuery();

  const { data: properties, isLoading } = trpc.properties.list.useQuery({
    city: city || undefined,
    state: state || undefined,
    propertyType: propertyType || undefined,
    minPrice: minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice < 5000000 ? maxPrice : undefined,
    minBedrooms: minBedrooms > 0 ? minBedrooms : undefined,
    minBathrooms: minBathrooms > 0 ? minBathrooms : undefined,
    status: "active",
    limit: 20,
  });

  const addFavoriteMutation = trpc.favorites.add.useMutation();
  const { addProperty, removeProperty, isInComparison } = useComparison();

  const handleAddFavorite = async (propertyId: number) => {
    try {
      await addFavoriteMutation.mutateAsync({ propertyId });
    } catch (error) {
      console.error("Failed to add favorite:", error);
    }
  };

  const handleToggleComparison = (property: any) => {
    if (isInComparison(property.id)) {
      removeProperty(property.id);
      toast.success('Removed from comparison');
    } else {
      addProperty(property);
      toast.success('Added to comparison');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/map" className="text-muted-foreground hover:text-foreground transition-colors">
              Map View
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input
                    placeholder="Enter city..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input
                    placeholder="Enter state..."
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                {/* Verification Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Verification Status
                  </label>
                  <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Properties {verificationCounts && `(${verificationCounts.total})`}
                      </SelectItem>
                      <SelectItem value="verified">
                        ✓ Verified Only {verificationCounts && `(${verificationCounts.verified})`}
                      </SelectItem>
                      <SelectItem value="pending">
                        ⏳ Pending Verification {verificationCounts && `(${verificationCounts.pending})`}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Property Type</label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="single_family">Single Family</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="multi_family">Multi Family</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Price Range: ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}
                  </label>
                  <Slider
                    min={0}
                    max={5000000}
                    step={50000}
                    value={[minPrice, maxPrice]}
                    onValueChange={([min, max]) => {
                      setMinPrice(min);
                      setMaxPrice(max);
                    }}
                  />
                </div>

                {/* Bedrooms */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Bedrooms</label>
                  <Select value={minBedrooms.toString()} onValueChange={(v) => setMinBedrooms(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bathrooms */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Bathrooms</label>
                  <Select value={minBathrooms.toString()} onValueChange={(v) => setMinBathrooms(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amenities */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amenities</label>
                  <div className="space-y-2">
                    {['pool', 'gym', 'parking', 'security', 'garden'].map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={amenities.includes(amenity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAmenities([...amenities, amenity]);
                            } else {
                              setAmenities(amenities.filter(a => a !== amenity));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="capitalize">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <SaveSearchDialog
                    searchCriteria={{
                      city,
                      state,
                      propertyType,
                      minPrice,
                      maxPrice,
                      minBedrooms,
                      minBathrooms,
                      amenities: amenities.join(","),
                    }}
                    variant="default"
                    size="default"
                  />
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setCity("");
                      setState("");
                      setPropertyType("");
                      setMinPrice(0);
                      setMaxPrice(5000000);
                      setMinBedrooms(0);
                      setMinBathrooms(0);
                      setAmenities([]);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Property Listings */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Available Properties</h1>
              <p className="text-muted-foreground">
                {properties?.length || 0} properties found
              </p>
            </div>

            {/* Smart Filter Suggestions */}
            <div className="mb-6">
              <SmartFilterSuggestions
                currentFilters={{
                  minBedrooms,
                  minBathrooms,
                  minPrice,
                  maxPrice,
                  propertyType,
                  city,
                }}
                onApplyFilters={(filters) => {
                  if (filters.minBedrooms !== undefined) setMinBedrooms(filters.minBedrooms);
                  if (filters.minBathrooms !== undefined) setMinBathrooms(filters.minBathrooms);
                  if (filters.minPrice !== undefined) setMinPrice(filters.minPrice);
                  if (filters.maxPrice !== undefined) setMaxPrice(filters.maxPrice);
                  if (filters.propertyType !== undefined) setPropertyType(filters.propertyType);
                  if (filters.city !== undefined) setCity(filters.city);
                }}
              />
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted" />
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : properties && properties.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {properties.map((property) => {
                  const images = property.images ? JSON.parse(property.images) : [];
                  const primaryImage = property.primaryImage || images[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800";

                  return (
                    <Card key={property.id} className="hover:shadow-lg transition-shadow">
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={primaryImage}
                          alt={property.title || property.addressLine1}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                          ${property.price.toLocaleString()}
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <ValuationBadge hasValuation={true} variant="compact" />
                        </div>
                        <div className="absolute top-2 left-2 flex gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={(e) => {
                              e.preventDefault();
                              handleAddFavorite(property.id);
                            }}
                          >
                            <Heart className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={isInComparison(property.id) ? "default" : "secondary"}
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleComparison(property);
                            }}
                          >
                            <GitCompare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle className="line-clamp-1">
                          {property.title || property.addressLine1}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {property.addressLine1}, {property.city}, {property.state}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                          {property.bedrooms && <span>{property.bedrooms} beds</span>}
                          {property.bathrooms && <span>{property.bathrooms} baths</span>}
                          {property.squareFeet && <span>{property.squareFeet.toLocaleString()} sq ft</span>}
                        </div>
                        {property.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {property.description}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button variant="default" className="w-full" asChild>
                          <Link href={`/property/${property.id}`}>View Details</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No properties found matching your criteria.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setCity("");
                      setState("");
                      setPropertyType("");
                      setMinPrice(0);
                      setMaxPrice(5000000);
                      setMinBedrooms(0);
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
