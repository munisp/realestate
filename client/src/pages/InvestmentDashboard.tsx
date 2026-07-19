import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  MapPin, 
  Target,
  Sparkles,
  Network,
  BarChart3,
  Download,
  Settings
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function InvestmentDashboard() {
  const [, setLocation] = useLocation();
  const [selectedCity, setSelectedCity] = useState("Lagos");

  // Fetch investment opportunities
  const { data: opportunities, isLoading } = trpc.advancedSearch.search.useQuery({
    city: selectedCity,
    minInvestmentPotential: 80,
    minGNNScore: 75,
    limit: 20,
  });

  // Fetch market trends
  const { data: marketStats } = trpc.advancedSearch.getFilterStats.useQuery();

  const formatPrice = (price: number) => {
    return `₦${(price / 1_000_000).toFixed(1)}M`;
  };

  const calculateROI = (property: any) => {
    // Simple ROI calculation based on GNN scores
    const baseROI = 8; // 8% base
    const gnnBonus = (property.gnnScore - 70) * 0.2; // 0.2% per point above 70
    const investmentBonus = (property.investmentPotential - 70) * 0.15;
    return (baseROI + gnnBonus + investmentBonus).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Investment Dashboard</h1>
            <p className="text-muted-foreground">
              AI-powered insights for smart property investments
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/search/advanced")}>
              <Settings className="h-4 w-4 mr-2" />
              Advanced Search
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{opportunities?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                High-potential properties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Investment Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {opportunities
                  ? (
                      opportunities.reduce((sum, p: any) => sum + p.investmentPotential, 0) /
                      opportunities.length
                    ).toFixed(0)
                  : 0}
              </div>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Market Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {marketStats
                  ? formatPrice(marketStats.avgPrice)
                  : "₦0M"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {marketStats?.totalProperties || 0} properties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projected ROI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12.5%</div>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Above market average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="opportunities" className="w-full">
          <TabsList>
            <TabsTrigger value="opportunities">
              <Target className="h-4 w-4 mr-2" />
              Investment Opportunities
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="h-4 w-4 mr-2" />
              Market Trends
            </TabsTrigger>
            <TabsTrigger value="portfolio">
              <BarChart3 className="h-4 w-4 mr-2" />
              Portfolio Analysis
            </TabsTrigger>
          </TabsList>

          {/* Investment Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Investment Opportunities</CardTitle>
                <CardDescription>
                  Properties ranked by GNN investment potential score
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : opportunities && opportunities.length > 0 ? (
                  <div className="space-y-4">
                    {opportunities.map((property: any, index: number) => (
                      <Card
                        key={property.id}
                        className="cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => setLocation(`/property/${property.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Rank Badge */}
                            <div className="flex-shrink-0">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                  index === 0
                                    ? "bg-yellow-500 text-white"
                                    : index === 1
                                    ? "bg-gray-400 text-white"
                                    : index === 2
                                    ? "bg-orange-600 text-white"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                #{index + 1}
                              </div>
                            </div>

                            {/* Property Info */}
                            <div className="flex-1">
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
                                    {formatPrice(property.price)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {property.bedrooms} bed • {property.bathrooms} bath
                                  </div>
                                </div>
                              </div>

                              {/* Investment Metrics */}
                              <div className="grid grid-cols-4 gap-3 mt-3">
                                <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Investment Score
                                  </div>
                                  <div className="text-lg font-bold text-green-600">
                                    {property.investmentPotential.toFixed(0)}
                                  </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    GNN Score
                                  </div>
                                  <div className="text-lg font-bold text-blue-600">
                                    {property.gnnScore.toFixed(0)}
                                  </div>
                                </div>

                                <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Growth Momentum
                                  </div>
                                  <div className="text-lg font-bold text-purple-600">
                                    {property.growthMomentum?.toFixed(0) || "N/A"}
                                  </div>
                                </div>

                                <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Projected ROI
                                  </div>
                                  <div className="text-lg font-bold text-orange-600">
                                    {calculateROI(property)}%
                                  </div>
                                </div>
                              </div>

                              {/* Tags */}
                              <div className="flex items-center gap-2 mt-3">
                                {property.investmentPotential >= 90 && (
                                  <Badge className="bg-green-600">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Top Pick
                                  </Badge>
                                )}
                                {property.growthMomentum >= 80 && (
                                  <Badge className="bg-blue-600">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    High Growth
                                  </Badge>
                                )}
                                {property.networkCentrality >= 0.8 && (
                                  <Badge className="bg-purple-600">
                                    <Network className="h-3 w-3 mr-1" />
                                    Strategic Location
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No investment opportunities found. Try adjusting your filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Trends Tab */}
          <TabsContent value="trends" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Price Trends</CardTitle>
                  <CardDescription>Average property prices by city</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["Lagos", "Abuja", "Port Harcourt", "Kano"].map((city) => (
                      <div key={city} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{city}</div>
                          <div className="text-sm text-muted-foreground">
                            {city === "Lagos" ? "₦75M avg" : city === "Abuja" ? "₦65M avg" : "₦45M avg"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-medium">
                            {city === "Lagos" ? "+8.5%" : city === "Abuja" ? "+6.2%" : "+4.1%"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hot Neighborhoods</CardTitle>
                  <CardDescription>Fastest growing areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Lekki Phase 1", growth: 12.5, momentum: 92 },
                      { name: "Maitama, Abuja", growth: 10.2, momentum: 88 },
                      { name: "Victoria Island", growth: 9.8, momentum: 85 },
                      { name: "Ikoyi", growth: 8.5, momentum: 82 },
                    ].map((neighborhood) => (
                      <div key={neighborhood.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{neighborhood.name}</div>
                          <Badge variant="secondary">
                            Momentum: {neighborhood.momentum}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${neighborhood.momentum}%` }}
                            />
                          </div>
                          <span className="text-sm text-green-600 font-medium">
                            +{neighborhood.growth}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Portfolio Analysis Tab */}
          <TabsContent value="portfolio" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Overview</CardTitle>
                <CardDescription>
                  Track your saved properties and investment performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Save properties to start building your portfolio</p>
                  <Button className="mt-4" onClick={() => setLocation("/properties")}>
                    Browse Properties
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
