import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Download,
  BarChart3,
  AlertCircle,
} from "lucide-react";

export default function CompetitorInsights() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const { data: allInsights, isLoading: insightsLoading } = trpc.competitorInsights.getAllInsights.useQuery();
  const { data: marketPositioning } = trpc.competitorInsights.getMarketPositioning.useQuery();
  const { data: propertyInsight } = trpc.competitorInsights.getPropertyInsights.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );
  const { data: pricingRecommendation } = trpc.competitorInsights.getPricingRecommendation.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  const exportReportMutation = trpc.competitorInsights.exportInsightsReport.useQuery(
    { format: "csv" },
    { enabled: false }
  );

  const handleExportReport = async () => {
    try {
      const result = await exportReportMutation.refetch();
      if (result.data && result.data.format === "csv") {
        const blob = new Blob([result.data.data as string], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `competitor-insights-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report exported successfully");
      }
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  const getPricePositionBadge = (position: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      below_market: { variant: "default", label: "Below Market" },
      at_market: { variant: "secondary", label: "At Market" },
      above_market: { variant: "destructive", label: "Above Market" },
    };
    const config = variants[position] || variants.at_market;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competitor Insights Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Market intelligence and pricing recommendations
          </p>
        </div>
        <Button onClick={handleExportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Market Overview */}
      {marketPositioning && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{marketPositioning.totalProperties}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Competitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{marketPositioning.totalCompetitors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Market Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(marketPositioning.avgMarketPrice)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Competition Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {marketPositioning.totalProperties > 0
                  ? (marketPositioning.totalCompetitors / marketPositioning.totalProperties).toFixed(1)
                  : "0"}
                :1
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Target className="h-4 w-4 mr-2" />
            Property Insights
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <DollarSign className="h-4 w-4 mr-2" />
            Price Distribution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>All Properties Overview</CardTitle>
              <CardDescription>Competitive analysis for all tracked properties</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="text-center py-8">Loading insights...</div>
              ) : !allInsights || allInsights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No properties with competitor data found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Competitors</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Advantage</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInsights.map((insight) => (
                      <TableRow
                        key={insight.propertyId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedPropertyId(insight.propertyId)}
                      >
                        <TableCell className="font-medium">
                          {insight.propertyAddress}
                        </TableCell>
                        <TableCell>{formatCurrency(insight.propertyPrice)}</TableCell>
                        <TableCell>{insight.competitorCount}</TableCell>
                        <TableCell>{getPricePositionBadge(insight.pricePosition)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {insight.competitiveAdvantage > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : insight.competitiveAdvantage < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : null}
                            <span>{Math.abs(insight.competitiveAdvantage)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          {!selectedPropertyId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a property from the Overview tab to view detailed insights
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Property Insights */}
              {propertyInsight && (
                <Card>
                  <CardHeader>
                    <CardTitle>Property Insights</CardTitle>
                    <CardDescription>{propertyInsight.propertyAddress}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Your Price</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(propertyInsight.propertyPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Avg Competitor</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(propertyInsight.avgCompetitorPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Market Share</div>
                        <div className="text-2xl font-bold">{propertyInsight.marketShare}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Competitors</div>
                        <div className="text-2xl font-bold">{propertyInsight.competitorCount}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Competitive Advantage</div>
                      <div className="flex items-center gap-4">
                        <Progress
                          value={50 + propertyInsight.competitiveAdvantage / 2}
                          className="flex-1"
                        />
                        <span className="text-lg font-bold">
                          {propertyInsight.competitiveAdvantage > 0 ? "+" : ""}
                          {propertyInsight.competitiveAdvantage}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Recommended Action</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {propertyInsight.recommendedAction}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pricing Recommendation */}
              {pricingRecommendation && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Recommendation</CardTitle>
                    <CardDescription>AI-powered pricing optimization</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Current Price</div>
                        <div className="text-xl font-bold">
                          {formatCurrency(pricingRecommendation.currentPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Recommended Price</div>
                        <div className="text-xl font-bold text-green-600">
                          {formatCurrency(pricingRecommendation.recommendedPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Adjustment</div>
                        <div className="text-xl font-bold">
                          {pricingRecommendation.priceAdjustment > 0 ? "+" : ""}
                          {formatCurrency(pricingRecommendation.priceAdjustment)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">
                        Confidence: {pricingRecommendation.confidence}%
                      </div>
                      <Progress value={pricingRecommendation.confidence} />
                    </div>

                    <div>
                      <div className="font-medium mb-2">Reasoning:</div>
                      <ul className="space-y-1">
                        {pricingRecommendation.reasoning.map((reason, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Price Distribution</CardTitle>
              <CardDescription>Market price segmentation analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {marketPositioning && (
                <div className="space-y-4">
                  {marketPositioning.priceDistribution.map((segment) => (
                    <div key={segment.range} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{segment.range}</span>
                        <span className="text-muted-foreground">
                          {segment.count} properties ({segment.percentage}%)
                        </span>
                      </div>
                      <Progress value={segment.percentage} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {marketPositioning && marketPositioning.topPerformers.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Properties with best competitive positioning</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketPositioning.topPerformers.map((performer, index) => (
                    <div
                      key={performer.propertyId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{performer.address}</div>
                          <div className="text-sm text-muted-foreground">
                            Property ID: {performer.propertyId}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          +{performer.competitiveScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Advantage</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
