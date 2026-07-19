import { useAuth } from "@/_core/hooks/useAuth";
import GNNExplanation from "@/components/GNNExplanation";
import GNNPropertyRecommendations from "@/components/GNNPropertyRecommendations";
import { MarketTrendPredictionLive } from "@/components/MarketTrendPredictionLive";
import { NeighborhoodIntelLive } from "@/components/NeighborhoodIntelLive";
import { TransitAccessibilityLive } from "@/components/TransitAccessibilityLive";
import { InvestmentScoreLive } from "@/components/InvestmentScoreLive";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/components/Map";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { VirtualTour } from "@/components/VirtualTour";
import { SimilarProperties } from "@/components/SimilarProperties";
import { PropertyReviews } from "@/components/PropertyReviews";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { NeighborhoodInsights } from "@/components/NeighborhoodInsights";
import { VirtualStaging } from "@/components/VirtualStaging";
import { ThreeDTour } from "@/components/3DTour";
import SchoolRatings from "@/components/SchoolRatings";
import NeighborhoodCrimeSafety from "@/components/NeighborhoodCrimeSafety";
import WalkabilityScore from "@/components/WalkabilityScore";
import NeighborhoodIntelligence from '@/components/NeighborhoodIntelligence';
import NearbySchools from '@/components/NearbySchools';
import CommuteTimeAnalysis from '@/components/CommuteTimeAnalysis';
import { PropertyVideoTours } from "@/components/PropertyVideoTours";
import { AppointmentCalendar } from "@/components/AppointmentCalendar";
import { StreetViewPanorama, StreetViewThumbnail } from "@/components/StreetViewPanorama";
import { trpc } from "@/lib/trpc";
import { Building2, Calendar, Heart, Home, MapPin, Ruler, TrendingUp, Sparkles, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id || "0");
  const { isAuthenticated } = useAuth();
  const [mapReady, setMapReady] = useState(false);

  const { data: property, isLoading } = trpc.properties.getById.useQuery({ id: propertyId });
  const { data: valuation } = trpc.valuations.getLatest.useQuery({ propertyId });
  const mlValuationMutation = trpc.microservices.getPropertyValuation.useMutation();
  const [mlValuation, setMlValuation] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);
  
  const trackViewMutation = trpc.properties.trackView.useMutation();
  const addFavoriteMutation = trpc.favorites.add.useMutation();
  const estimateValuationMutation = trpc.valuations.estimate.useMutation();

  useEffect(() => {
    if (propertyId) {
      trackViewMutation.mutate({ propertyId });
    }
  }, [propertyId]);

  const handleAddFavorite = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save favorites");
      return;
    }
    try {
      await addFavoriteMutation.mutateAsync({ propertyId });
      toast.success("Added to favorites");
    } catch (error) {
      toast.error("Failed to add favorite");
    }
  };

  const handleEstimateValue = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to get valuations");
      return;
    }
    if (!property) return;
    try {
      toast.info("Generating AI valuation...");
      setMlLoading(true);
      const result = await mlValuationMutation.mutateAsync({
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        square_feet: property.squareFeet || 0,
        location: `${property.city}, ${property.state}`,
        property_type: property.propertyType || "residential",
        year_built: property.yearBuilt || undefined,
        amenities: [],
      });
      setMlValuation(result);
      setMlLoading(false);
      toast.success(`Estimated value: $${result.estimated_price.toLocaleString()}`);
      await estimateValuationMutation.mutateAsync({ propertyId });
      toast.success("Valuation complete!");
    } catch (error) {
      toast.error("Failed to generate valuation");
    }
  };

  const handleMapReady = (map: google.maps.Map) => {
    if (property) {
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      
      new google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title: property.title || property.addressLine1,
      });

      map.setCenter({ lat, lng });
      map.setZoom(15);
    }
    setMapReady(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-8 w-8 text-primary" />
              <span>Real Estate Platform</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-96 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Property Not Found</CardTitle>
            <CardDescription>The property you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/properties">Browse Properties</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = property.images ? JSON.parse(property.images) : [];
  const primaryImage = property.primaryImage || images[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200";
  const features = property.features ? JSON.parse(property.features) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
          </nav>
        </div>
      </header>

      {/* Image Gallery */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={primaryImage}
          alt={property.title || property.addressLine1}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold mb-2">
              {property.title || property.addressLine1}
            </h1>
            <p className="text-xl flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {property.addressLine1}, {property.city}, {property.state} {property.zipCode}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price and Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-primary">
                      ${property.price.toLocaleString()}
                    </div>
                    {property.pricePerSqFt && (
                      <div className="text-sm text-muted-foreground mt-1">
                        ${property.pricePerSqFt}/sq ft
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleAddFavorite}>
                      <Heart className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/property/${propertyId}/valuation`}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        View AI Valuation
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/blockchain-registry?propertyId=prop_${propertyId}`}>
                        <Shield className="mr-2 h-4 w-4" />
                        Blockchain
                      </Link>
                    </Button>
                    <Button>Contact Agent</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Valuation */}
            {mlValuation && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI-Powered Valuation
                  </CardTitle>
                  <CardDescription>
                    Machine learning estimate based on {mlValuation.comparable_count} comparable properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Estimated Value</div>
                      <div className="text-2xl font-bold text-primary">
                        ${mlValuation.estimated_price.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="text-2xl font-bold">
                        {(mlValuation.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Price Range</div>
                      <div className="text-sm font-semibold">
                        ${mlValuation.price_range.min.toLocaleString()} - ${mlValuation.price_range.max.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {mlValuation.factors && mlValuation.factors.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-semibold mb-2">Key Factors</div>
                      <div className="flex flex-wrap gap-2">
                        {mlValuation.factors.map((factor: string, idx: number) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-primary/10 rounded">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {mlLoading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Loading AI valuation...
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {property.bedrooms && (
                    <div className="flex items-center gap-3">
                      <Home className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">{property.bedrooms}</div>
                        <div className="text-sm text-muted-foreground">Bedrooms</div>
                      </div>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-3">
                      <Home className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">{property.bathrooms}</div>
                        <div className="text-sm text-muted-foreground">Bathrooms</div>
                      </div>
                    </div>
                  )}
                  {property.squareFeet && (
                    <div className="flex items-center gap-3">
                      <Ruler className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">{property.squareFeet.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Sq Ft</div>
                      </div>
                    </div>
                  )}
                  {property.yearBuilt && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">{property.yearBuilt}</div>
                        <div className="text-sm text-muted-foreground">Year Built</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="description">
              <TabsList className="grid w-full grid-cols-12">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="neighborhood">Neighborhood</TabsTrigger>
                <TabsTrigger value="tour">Virtual Tour</TabsTrigger>
                <TabsTrigger value="calculator">Calculator</TabsTrigger>
                <TabsTrigger value="map">Map</TabsTrigger>
                <TabsTrigger value="street-view">Street View</TabsTrigger>
                <TabsTrigger value="price-history">Price History</TabsTrigger>
                <TabsTrigger value="staging">Virtual Staging</TabsTrigger>
                <TabsTrigger value="3d-tour">3D Tour</TabsTrigger>
                <TabsTrigger value="schools">Schools</TabsTrigger>
                <TabsTrigger value="safety">Safety & Crime</TabsTrigger>
                <TabsTrigger value="walkability">Walkability</TabsTrigger>
                <TabsTrigger value="videos">Video Tours</TabsTrigger>
                <TabsTrigger value="gnn-analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="gnn-insights">GNN Insights</TabsTrigger>
              </TabsList>
              <TabsContent value="description">
                <Card>
                  <CardHeader>
                    <CardTitle>About This Property</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {property.description || "No description available."}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="features">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {features.length > 0 ? (
                      <ul className="grid grid-cols-2 gap-3">
                        {features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No features listed.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="neighborhood">
                <NeighborhoodIntelligence
                  lat={parseFloat(property.latitude)}
                  lng={parseFloat(property.longitude)}
                  address={`${property.addressLine1}, ${property.city}, ${property.state}`}
                />
              </TabsContent>
              <TabsContent value="tour">
                <VirtualTour
                  photos360={property.virtualTour360 ? JSON.parse(property.virtualTour360) : []}
                  videoUrl={property.virtualTourVideo || undefined}
                />
              </TabsContent>
              <TabsContent value="calculator">
                <MortgageCalculator propertyPrice={property.price} />
              </TabsContent>
              <TabsContent value="map">
                <Card>
                  <CardContent className="p-0">
                    <div className="h-96 rounded-lg overflow-hidden">
                      <MapView onMapReady={handleMapReady} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="street-view">
                <Card>
                  <CardHeader>
                    <CardTitle>Street View</CardTitle>
                    <CardDescription>Explore the neighborhood with 360° street-level imagery</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[500px] rounded-lg overflow-hidden">
                      <StreetViewPanorama
                        position={{ lat: parseFloat(property.latitude), lng: parseFloat(property.longitude) }}
                        className="h-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="price-history">
                <PriceHistoryChart propertyId={property.id} currentPrice={property.price} />
              </TabsContent>
              <TabsContent value="staging">
                <VirtualStaging 
                  propertyId={property.id} 
                  images={[
                    property.primaryImage || '',
                    ...(property.additionalImages ? JSON.parse(property.additionalImages) : [])
                  ].filter(Boolean)}
                />
              </TabsContent>
              <TabsContent value="videos">
                <PropertyVideoTours propertyId={property.id} />
              </TabsContent>
              <TabsContent value="gnn-analysis">
                <GNNExplanation
                  data={{
                    predicted_price: property.price || 0,
                    confidence: 0.85,
                    feature_contributions: [
                      {
                        feature: "Bedrooms",
                        value: property.bedrooms || 0,
                        contribution: (property.bedrooms || 0) * 5000000,
                        impact: "positive" as const,
                        description: "Number of bedrooms significantly impacts property value in this area"
                      },
                      {
                        feature: "Bathrooms",
                        value: property.bathrooms || 0,
                        contribution: (property.bathrooms || 0) * 3000000,
                        impact: "positive" as const,
                        description: "Additional bathrooms add substantial value to the property"
                      },
                      {
                        feature: "Square Footage",
                        value: property.squareFeet || 0,
                        contribution: ((property.squareFeet || 0) / 100) * 500000,
                        impact: "positive" as const,
                        description: "Larger living space commands premium pricing"
                      },
                      {
                        feature: "Location",
                        value: 1,
                        contribution: 15000000,
                        impact: "positive" as const,
                        description: `${property.city} is a high-demand area with strong growth prospects`
                      },
                      {
                        feature: "Property Age",
                        value: property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : 0,
                        contribution: property.yearBuilt ? -((new Date().getFullYear() - property.yearBuilt) * 200000) : 0,
                        impact: property.yearBuilt && (new Date().getFullYear() - property.yearBuilt) > 10 ? "negative" as const : "neutral" as const,
                        description: "Property age affects maintenance costs and modern amenities"
                      }
                    ],
                    spatial_factors: [
                      {
                        factor: "Neighborhood Quality",
                        score: 0.82,
                        description: "This property is located in a well-established neighborhood with high property values",
                        properties: [1, 2, 3, 4, 5]
                      },
                      {
                        factor: "Proximity to Amenities",
                        score: 0.75,
                        description: "Good access to shopping, dining, and entertainment within 2km radius",
                        properties: [6, 7, 8]
                      },
                      {
                        factor: "School District Quality",
                        score: 0.88,
                        description: "Located in a highly-rated school district, increasing family appeal",
                        properties: [9, 10, 11, 12]
                      },
                      {
                        factor: "Transit Accessibility",
                        score: 0.65,
                        description: "Moderate public transportation access with bus stops nearby",
                        properties: [13, 14]
                      }
                    ],
                    network_centrality: 0.78,
                    neighborhood_effect: 0.12,
                    model_version: "graphsage_v1.0"
                  }}
                  propertyId={property.id}
                />
              </TabsContent>
              <TabsContent value="walkability">
                <WalkabilityScore propertyId={property.id} latitude={parseFloat(property.latitude)} longitude={parseFloat(property.longitude)} />
              </TabsContent>
              <TabsContent value="safety">
                <NeighborhoodCrimeSafety propertyId={property.id} latitude={parseFloat(property.latitude)} longitude={parseFloat(property.longitude)} />
              </TabsContent>
              <TabsContent value="schools">
                <SchoolRatings
                  propertyId={propertyId}
                  latitude={parseFloat(property.latitude)}
                  longitude={parseFloat(property.longitude)}
                />
              </TabsContent>

              <TabsContent value="3d-tour">
                <ThreeDTour 
                  propertyId={property.id}
                  tourUrl={property.virtualTour360 ? JSON.parse(property.virtualTour360)[0] : undefined}
                  images={[
                    property.primaryImage || '',
                    ...(property.additionalImages ? JSON.parse(property.additionalImages) : [])
                  ].filter(Boolean)}
                  floorPlanUrl={property.floorPlan || undefined}
                />
              </TabsContent>
              
              <TabsContent value="gnn-insights">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Live GNN-Powered Insights
                      </CardTitle>
                      <CardDescription>
                        Real-time market intelligence powered by Graph Neural Networks analyzing spatial relationships and neighborhood dynamics
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Market Trend Predictions */}
                  <MarketTrendPredictionLive
                    neighborhood={`${property.city}, ${property.state}`}
                    city={property.city}
                  />

                  {/* Enhanced Neighborhood Intelligence */}
                  <NeighborhoodIntelLive
                    neighborhood={`${property.city}, ${property.state}`}
                    city={property.city}
                  />

                  {/* Transit Accessibility */}
                  <TransitAccessibilityLive
                    propertyId={property.id}
                  />

                  {/* Investment Opportunity Scoring */}
                  <InvestmentScoreLive
                    propertyId={property.id}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Similar Properties */}
            <SimilarProperties propertyId={property.id} />

            {/* GNN-Based Recommendations */}
            <GNNPropertyRecommendations
              sourcePropertyId={property.id}
              recommendations={[
                {
                  id: 101,
                  title: "Luxury 3-Bedroom Apartment in Nearby Area",
                  price: property.price * 0.95,
                  location: `${property.city}, ${property.state}`,
                  bedrooms: property.bedrooms || 3,
                  bathrooms: property.bathrooms || 2,
                  squareFeet: (property.squareFeet || 1500) * 0.9,
                  primaryImage: property.primaryImage,
                  similarityScore: 88,
                  networkCentralityScore: 82,
                  spatialProximityScore: 91,
                  overallScore: 87,
                  explanation: {
                    reasons: [
                      "Located in a connected high-growth neighborhood",
                      "Similar property features and price range",
                      "High network centrality indicates strategic location"
                    ],
                    spatial_factors: [
                      "Within 2km of this property",
                      "Same school district",
                      "Similar amenity access"
                    ],
                    network_effects: [
                      "Connected to 15 high-value properties",
                      "Part of emerging market cluster"
                    ]
                  }
                },
                {
                  id: 102,
                  title: "Modern Home with Investment Potential",
                  price: property.price * 1.1,
                  location: `${property.city}, ${property.state}`,
                  bedrooms: (property.bedrooms || 3) + 1,
                  bathrooms: property.bathrooms || 2,
                  squareFeet: (property.squareFeet || 1500) * 1.2,
                  primaryImage: property.primaryImage,
                  similarityScore: 75,
                  networkCentralityScore: 95,
                  spatialProximityScore: 68,
                  overallScore: 79,
                  explanation: {
                    reasons: [
                      "Exceptional network centrality score",
                      "Located in rapidly appreciating area",
                      "Strong spatial connection to premium properties"
                    ],
                    spatial_factors: [
                      "Adjacent to commercial development",
                      "Near major transit hub"
                    ],
                    network_effects: [
                      "Highest centrality in neighborhood",
                      "Connected to multiple growth clusters"
                    ]
                  }
                },
                {
                  id: 103,
                  title: "Spacious Family Home in Connected Neighborhood",
                  price: property.price * 0.88,
                  location: `${property.city}, ${property.state}`,
                  bedrooms: property.bedrooms || 3,
                  bathrooms: (property.bathrooms || 2) + 1,
                  squareFeet: (property.squareFeet || 1500) * 1.1,
                  primaryImage: property.primaryImage,
                  similarityScore: 92,
                  networkCentralityScore: 78,
                  spatialProximityScore: 85,
                  overallScore: 85,
                  explanation: {
                    reasons: [
                      "Very similar property characteristics",
                      "Located in well-established neighborhood",
                      "Strong spatial proximity to amenities"
                    ],
                    spatial_factors: [
                      "Walking distance to schools",
                      "Close to shopping centers"
                    ],
                    network_effects: [
                      "Part of stable property network",
                      "Good connectivity to high-value areas"
                    ]
                  }
                }
              ]}
              title="GNN-Recommended Properties"
              description="AI-powered recommendations based on spatial network analysis"
            />

            {/* Reviews & Ratings */}
            <PropertyReviews propertyId={property.id} />

            {/* Appointment Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule a Viewing
                </CardTitle>
                <CardDescription>
                  Book an appointment to view this property in person
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppointmentCalendar 
                  propertyId={property.id} 
                  agentId={property.agentId} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Valuation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Valuation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {valuation ? (
                  <>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Estimated Value</div>
                      <div className="text-2xl font-bold text-primary">
                        ${valuation.estimatedValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Confidence Range</div>
                      <div className="text-sm">
                        ${valuation.confidenceLower?.toLocaleString()} - ${valuation.confidenceUpper?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Confidence Score</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${valuation.confidenceScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{valuation.confidenceScore}%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Get an AI-powered valuation estimate for this property
                    </p>
                    <Button
                      onClick={handleEstimateValue}
                      disabled={estimateValuationMutation.isPending}
                      className="w-full"
                    >
                      {estimateValuationMutation.isPending ? "Generating..." : "Get Valuation"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Info */}
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Type</span>
                  <span className="font-medium capitalize">{property.propertyType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listing Type</span>
                  <span className="font-medium capitalize">{property.listingType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{property.status}</span>
                </div>
                {property.lotSize && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lot Size</span>
                    <span className="font-medium">{property.lotSize.toLocaleString()} sq ft</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nearby Schools */}
            <NearbySchools
              propertyLocation={{
                lat: parseFloat(property.latitude),
                lng: parseFloat(property.longitude),
              }}
              maxSchools={3}
              maxDistance={5000}
            />

            {/* Commute Time Analysis */}
            <CommuteTimeAnalysis
              propertyLocation={{
                lat: parseFloat(property.latitude),
                lng: parseFloat(property.longitude),
              }}
            />

            {/* Neighborhood Insights */}
            <NeighborhoodInsights 
              latitude={property.latitude} 
              longitude={property.longitude} 
              address={`${property.addressLine1}, ${property.city}, ${property.state}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
