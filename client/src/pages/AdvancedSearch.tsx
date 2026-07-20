// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  TrendingUp, 
  MapPin, 
  Network, 
  Sparkles, 
  Search,
  SlidersHorizontal,
  Bed,
  Bath,
  Square,
  DollarSign
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface SearchFilters {
  // Basic filters
  city: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  bathrooms: number;
  minSquareFeet: number;
  propertyType: string;
  
  // GNN-enhanced filters
  minInvestmentPotential: number;
  minGrowthMomentum: number;
  minNetworkCentrality: number;
  minGNNScore: number;
  
  // Preset filters
  preset: "high-investment" | "growing-neighborhoods" | "network-hotspots" | "custom";
}

const FILTER_PRESETS = {
  "high-investment": {
    label: "High Investment Potential",
    description: "Properties with GNN investment score > 85",
    icon: TrendingUp,
    color: "text-green-600",
    filters: {
      minInvestmentPotential: 85,
      minGNNScore: 80,
    }
  },
  "growing-neighborhoods": {
    label: "Growing Neighborhoods",
    description: "Areas with market momentum > 80",
    icon: Sparkles,
    color: "text-blue-600",
    filters: {
      minGrowthMomentum: 80,
      minGNNScore: 75,
    }
  },
  "network-hotspots": {
    label: "Network Hotspots",
    description: "Strategic locations with centrality > 0.8",
    icon: Network,
    color: "text-purple-600",
    filters: {
      minNetworkCentrality: 0.8,
      minGNNScore: 75,
    }
  },
  "custom": {
    label: "Custom Search",
    description: "Define your own criteria",
    icon: SlidersHorizontal,
    color: "text-gray-600",
    filters: {}
  }
};

export default function AdvancedSearch() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<SearchFilters>({
    city: "",
    minPrice: 0,
    maxPrice: 500000000,
    bedrooms: 0,
    bathrooms: 0,
    minSquareFeet: 0,
    propertyType: "any",
    minInvestmentPotential: 0,
    minGrowthMomentum: 0,
    minNetworkCentrality: 0,
    minGNNScore: 0,
    preset: "custom",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Search query
  const { data: searchResults, isLoading, refetch } = trpc.property.advancedSearch.useQuery(
    filters,
    { enabled: false } // Manual trigger
  );

  const handlePresetSelect = (preset: SearchFilters["preset"]) => {
    const presetConfig = FILTER_PRESETS[preset];
    setFilters({
      ...filters,
      ...presetConfig.filters,
      preset,
    });
  };

  const handleSearch = () => {
    refetch();
  };

  const formatPrice = (price: number) => {
    return `₦${(price / 1_000_000).toFixed(0)}M`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Advanced Property Search</h1>
          <p className="text-muted-foreground">
            Discover investment opportunities using AI-powered Graph Neural Network analysis
          </p>
        </div>

        {/* Filter Presets */}
        <Card>
          <CardHeader>
            <CardTitle>Search Presets</CardTitle>
            <CardDescription>Quick filters for different investment strategies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(FILTER_PRESETS).map(([key, preset]) => {
                const Icon = preset.icon;
                const isSelected = filters.preset === key;
                
                return (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => handlePresetSelect(key as SearchFilters["preset"])}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-6 w-6 ${preset.color}`} />
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{preset.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Filters</CardTitle>
                <CardDescription>Customize your property search criteria</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {showAdvanced ? "Hide" : "Show"} Advanced
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Filters</TabsTrigger>
                <TabsTrigger value="gnn">GNN Filters</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Select
                      value={filters.city}
                      onValueChange={(value) => setFilters({ ...filters, city: value })}
                    >
                      <SelectTrigger id="city">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        <SelectItem value="Lagos">Lagos</SelectItem>
                        <SelectItem value="Abuja">Abuja</SelectItem>
                        <SelectItem value="Port Harcourt">Port Harcourt</SelectItem>
                        <SelectItem value="Kano">Kano</SelectItem>
                        <SelectItem value="Ibadan">Ibadan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Property Type</Label>
                    <Select
                      value={filters.propertyType}
                      onValueChange={(value) => setFilters({ ...filters, propertyType: value })}
                    >
                      <SelectTrigger id="propertyType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Type</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label>Price Range: {formatPrice(filters.minPrice)} - {formatPrice(filters.maxPrice)}</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Min Price"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      placeholder="Max Price"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Min Bedrooms</Label>
                    <Select
                      value={filters.bedrooms.toString()}
                      onValueChange={(value) => setFilters({ ...filters, bedrooms: Number(value) })}
                    >
                      <SelectTrigger id="bedrooms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num === 0 ? "Any" : `${num}+`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Min Bathrooms</Label>
                    <Select
                      value={filters.bathrooms.toString()}
                      onValueChange={(value) => setFilters({ ...filters, bathrooms: Number(value) })}
                    >
                      <SelectTrigger id="bathrooms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num === 0 ? "Any" : `${num}+`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sqft">Min Square Feet</Label>
                    <Input
                      id="sqft"
                      type="number"
                      placeholder="0"
                      value={filters.minSquareFeet}
                      onChange={(e) => setFilters({ ...filters, minSquareFeet: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="gnn" className="space-y-6 mt-4">
                {/* Investment Potential */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Investment Potential Score</Label>
                    <Badge variant="secondary">{filters.minInvestmentPotential}+</Badge>
                  </div>
                  <Slider
                    value={[filters.minInvestmentPotential]}
                    onValueChange={([value]) => setFilters({ ...filters, minInvestmentPotential: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Properties with higher scores have better investment potential based on GNN analysis
                  </p>
                </div>

                {/* Growth Momentum */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Neighborhood Growth Momentum</Label>
                    <Badge variant="secondary">{filters.minGrowthMomentum}+</Badge>
                  </div>
                  <Slider
                    value={[filters.minGrowthMomentum]}
                    onValueChange={([value]) => setFilters({ ...filters, minGrowthMomentum: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Areas with higher momentum are experiencing faster price appreciation
                  </p>
                </div>

                {/* Network Centrality */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Network Centrality</Label>
                    <Badge variant="secondary">{filters.minNetworkCentrality.toFixed(2)}+</Badge>
                  </div>
                  <Slider
                    value={[filters.minNetworkCentrality * 100]}
                    onValueChange={([value]) => setFilters({ ...filters, minNetworkCentrality: value / 100 })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Strategic locations with high connectivity in the property network
                  </p>
                </div>

                {/* Overall GNN Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Minimum GNN Score</Label>
                    <Badge variant="secondary">{filters.minGNNScore}+</Badge>
                  </div>
                  <Slider
                    value={[filters.minGNNScore]}
                    onValueChange={([value]) => setFilters({ ...filters, minGNNScore: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Overall quality score from Graph Neural Network analysis
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              <Search className="h-5 w-5 mr-2" />
              {isLoading ? "Searching..." : "Search Properties"}
            </Button>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {searchResults.length} properties matching your criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((property: any) => (
                  <Card
                    key={property.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => setLocation(`/property/${property.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="flex gap-4">
                        {/* Property Image */}
                        <div className="relative w-64 h-48 flex-shrink-0">
                          <img
                            src={property.imageUrl || "/placeholder-property.jpg"}
                            alt={property.title}
                            className="w-full h-full object-cover rounded-l-lg"
                          />
                          {property.gnnScore >= 85 && (
                            <Badge className="absolute top-2 left-2 bg-green-600">
                              ⭐ Top Rated
                            </Badge>
                          )}
                        </div>

                        {/* Property Details */}
                        <div className="flex-1 py-4 pr-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{property.title}</h3>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{property.address}, {property.city}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                ₦{(property.price / 1_000_000).toFixed(1)}M
                              </div>
                            </div>
                          </div>

                          {/* Property Stats */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <Bed className="h-4 w-4" />
                              <span>{property.bedrooms} beds</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Bath className="h-4 w-4" />
                              <span>{property.bathrooms} baths</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Square className="h-4 w-4" />
                              <span>{property.squareFeet.toLocaleString()} sqft</span>
                            </div>
                          </div>

                          {/* GNN Metrics */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">
                              GNN Score: {property.gnnScore.toFixed(0)}
                            </Badge>
                            {property.investmentPotential >= 85 && (
                              <Badge className="bg-green-600">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Investment: {property.investmentPotential.toFixed(0)}
                              </Badge>
                            )}
                            {property.growthMomentum >= 80 && (
                              <Badge className="bg-blue-600">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Growth: {property.growthMomentum.toFixed(0)}
                              </Badge>
                            )}
                            {property.networkCentrality >= 0.8 && (
                              <Badge className="bg-purple-600">
                                <Network className="h-3 w-3 mr-1" />
                                Centrality: {property.networkCentrality.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {searchResults.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No properties found matching your criteria. Try adjusting your filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
