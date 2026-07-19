// @ts-nocheck
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function MarketIntelligence() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  // Fetch user's shortlet properties
  const { data: properties, isLoading: propertiesLoading } = trpc.shortlet.getMyProperties.useQuery();

  // Get selected property details
  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);

  // Fetch market analysis
  const { data: marketAnalysis, isLoading: analysisLoading, refetch: refetchAnalysis } = trpc.competitorTracking.getMarketAnalysis.useQuery(
    {
      city: selectedProperty?.city || '',
      bedrooms: selectedProperty?.bedrooms || 1,
      bathrooms: selectedProperty?.bathrooms || 1,
      guests: selectedProperty?.maxGuests || 2,
    },
    { enabled: !!selectedProperty }
  );

  // Fetch pricing recommendation
  const { data: recommendation, isLoading: recommendationLoading } = trpc.competitorTracking.getPricingRecommendation.useQuery(
    {
      city: selectedProperty?.city || '',
      bedrooms: selectedProperty?.bedrooms || 1,
      bathrooms: selectedProperty?.bathrooms || 1,
      guests: selectedProperty?.maxGuests || 2,
      currentPrice: selectedProperty?.nightlyRate || 0,
      propertyQuality: 'standard',
    },
    { enabled: !!selectedProperty }
  );

  // Fetch competitor listings
  const { data: competitors, isLoading: competitorsLoading } = trpc.competitorTracking.getCompetitorListings.useQuery(
    {
      city: selectedProperty?.city || '',
      bedrooms: selectedProperty?.bedrooms || 1,
      bathrooms: selectedProperty?.bathrooms || 1,
      guests: selectedProperty?.maxGuests || 2,
      limit: 10,
    },
    { enabled: !!selectedProperty }
  );

  // Manual refresh handler
  const handleRefresh = () => {
    refetchAnalysis();
  };

  // Calculate price change
  const priceChange = recommendation && selectedProperty
    ? recommendation.recommendedPrice - selectedProperty.nightlyRate
    : 0;
  const changePercent = selectedProperty && priceChange !== 0
    ? (priceChange / selectedProperty.nightlyRate) * 100
    : 0;

  // Chart data for price distribution
  const priceDistributionData = marketAnalysis ? {
    labels: ['Budget', 'Mid-Range', 'Premium'],
    datasets: [{
      label: 'Market Distribution',
      data: [
        marketAnalysis.priceDistribution.budget,
        marketAnalysis.priceDistribution.midRange,
        marketAnalysis.priceDistribution.premium,
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
      ],
      borderWidth: 0,
    }],
  } : null;

  // Chart data for competitor prices
  const competitorPricesData = competitors ? {
    labels: competitors.map((c, i) => `Property ${i + 1}`),
    datasets: [{
      label: 'Competitor Prices (₦)',
      data: competitors.map(c => c.price),
      backgroundColor: 'rgba(99, 102, 241, 0.6)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2,
    }],
  } : null;

  if (propertiesLoading) {
    return <div className="container mx-auto p-6">Loading your properties...</div>;
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Properties Found</CardTitle>
            <CardDescription>
              You need to add shortlet properties before accessing market intelligence.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Intelligence</h1>
          <p className="text-muted-foreground">
            Real-time competitor analysis and pricing recommendations
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={!selectedProperty}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Property Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Property</CardTitle>
          <CardDescription>Choose a property to analyze market competition</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedPropertyId?.toString() || ''}
            onValueChange={(value) => setSelectedPropertyId(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.title} - {property.city} ({property.bedrooms} bed, {property.bathrooms} bath)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedProperty && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Select a property above to view market intelligence
            </p>
          </CardContent>
        </Card>
      )}

      {selectedProperty && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Recommendation</TabsTrigger>
            <TabsTrigger value="competitors">Competitor Listings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Market Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <p className="text-sm">Loading...</p>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ₦{marketAnalysis?.averagePrice.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Median: ₦{marketAnalysis?.medianPrice.toLocaleString()}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Demand Score</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <p className="text-sm">Loading...</p>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{marketAnalysis?.demandScore}/100</div>
                      <p className="text-xs text-muted-foreground">
                        {marketAnalysis && marketAnalysis.demandScore >= 80 ? 'High Demand' :
                         marketAnalysis && marketAnalysis.demandScore >= 60 ? 'Moderate Demand' : 'Low Demand'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <p className="text-sm">Loading...</p>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {((marketAnalysis?.occupancyRate || 0) * 100).toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {marketAnalysis?.totalListings} listings
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Seasonality</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <p className="text-sm">Loading...</p>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {marketAnalysis?.seasonalityFactor.toFixed(2)}x
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {marketAnalysis && marketAnalysis.seasonalityFactor > 1 ? 'Peak Season' : 'Off Season'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Price Distribution</CardTitle>
                  <CardDescription>Market segmentation by price tier</CardDescription>
                </CardHeader>
                <CardContent>
                  {priceDistributionData && (
                    <Doughnut
                      data={priceDistributionData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Competitor Sources</CardTitle>
                  <CardDescription>Listings by platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {marketAnalysis && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Airbnb</span>
                        <Badge variant="secondary">{marketAnalysis.competitorCount.airbnb} listings</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Booking.com</span>
                        <Badge variant="secondary">{marketAnalysis.competitorCount.booking} listings</Badge>
                      </div>
                      <div className="flex items-center justify-between border-t pt-4">
                        <span className="text-sm font-bold">Total</span>
                        <Badge>{marketAnalysis.competitorCount.total} listings</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing Recommendation Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Recommendation</CardTitle>
                <CardDescription>AI-powered pricing analysis for your property</CardDescription>
              </CardHeader>
              <CardContent>
                {recommendationLoading ? (
                  <p>Loading recommendation...</p>
                ) : recommendation ? (
                  <div className="space-y-6">
                    {/* Price Comparison */}
                    <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-3xl font-bold">₦{selectedProperty.nightlyRate.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        {priceChange > 0 ? (
                          <TrendingUp className="h-8 w-8 text-green-600 mx-auto" />
                        ) : priceChange < 0 ? (
                          <TrendingDown className="h-8 w-8 text-red-600 mx-auto" />
                        ) : (
                          <div className="h-8 w-8 mx-auto" />
                        )}
                        <p className="text-sm font-medium mt-2">
                          {priceChange > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Recommended Price</p>
                        <p className="text-3xl font-bold text-green-600">
                          ₦{recommendation.recommendedPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Confidence & Position */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Confidence Level</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${recommendation.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{recommendation.confidence}%</span>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Market Position</p>
                        <Badge
                          variant={
                            recommendation.competitivePosition === 'below_market' ? 'destructive' :
                            recommendation.competitivePosition === 'above_market' ? 'secondary' :
                            'default'
                          }
                          className="text-sm"
                        >
                          {recommendation.competitivePosition === 'below_market' ? 'Below Market' :
                           recommendation.competitivePosition === 'above_market' ? 'Above Market' :
                           'At Market'}
                        </Badge>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div>
                      <h3 className="font-semibold mb-3">Why this recommendation?</h3>
                      <ul className="space-y-2">
                        {recommendation.reasoning.map((reason, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Price Adjustments */}
                    <div>
                      <h3 className="font-semibold mb-3">Dynamic Pricing Factors</h3>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="p-3 border rounded">
                          <p className="text-xs text-muted-foreground">Weekend Multiplier</p>
                          <p className="text-lg font-bold">
                            {recommendation.priceAdjustments.weekendMultiplier.toFixed(2)}x
                          </p>
                        </div>
                        <div className="p-3 border rounded">
                          <p className="text-xs text-muted-foreground">Seasonal Multiplier</p>
                          <p className="text-lg font-bold">
                            {recommendation.priceAdjustments.seasonalMultiplier.toFixed(2)}x
                          </p>
                        </div>
                        <div className="p-3 border rounded">
                          <p className="text-xs text-muted-foreground">Demand Multiplier</p>
                          <p className="text-lg font-bold">
                            {recommendation.priceAdjustments.demandMultiplier.toFixed(2)}x
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitor Listings Tab */}
          <TabsContent value="competitors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Competitor Listings</CardTitle>
                <CardDescription>Similar properties in your market</CardDescription>
              </CardHeader>
              <CardContent>
                {competitorsLoading ? (
                  <p>Loading competitors...</p>
                ) : competitors && competitors.length > 0 ? (
                  <div className="space-y-6">
                    {/* Competitor Price Chart */}
                    <div className="h-64">
                      {competitorPricesData && (
                        <Bar
                          data={competitorPricesData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value) => `₦${value.toLocaleString()}`,
                                },
                              },
                            },
                          }}
                        />
                      )}
                    </div>

                    {/* Competitor List */}
                    <div className="space-y-3">
                      {competitors.map((comp, index) => (
                        <div key={comp.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{comp.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {comp.source === 'airbnb' ? 'Airbnb' : 'Booking.com'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {comp.bedrooms} bed • {comp.bathrooms} bath • {comp.guests} guests
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm">⭐ {comp.rating.toFixed(1)}</span>
                              <span className="text-sm text-muted-foreground">
                                ({comp.reviewCount} reviews)
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">₦{comp.price.toLocaleString()}</p>
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              View Listing
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No competitor listings found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
