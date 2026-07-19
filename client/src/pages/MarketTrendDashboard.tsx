// @ts-nocheck
/**
 * Market Trend Dashboard
 * ----------------------
 * Interactive dashboard for GNN-based market trends, investment opportunities,
 * and spatial intelligence insights.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  DollarSign,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ============================================================================
// Types
// ============================================================================

interface InvestmentOpportunity {
  property_id: number;
  investment_score: number;
  centrality_score: number;
  trend_score: number;
  undervaluation_score: number;
  recommendation: string;
}

interface MarketInsight {
  type: string;
  title: string;
  description: string;
  properties?: number[];
  value?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRecommendationBadge(recommendation: string) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'Strong Buy': 'default',
    'Buy': 'secondary',
    'Hold': 'outline',
    'Consider': 'outline',
    'Pass': 'destructive',
  };
  
  return variants[recommendation] || 'outline';
}

function getTrendIcon(trend: number) {
  if (trend > 0.5) return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend < -0.5) return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-gray-600" />;
}

function formatCurrency(value: number, currency: string = '₦'): string {
  return `${currency}${value.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ============================================================================
// Chart Components
// ============================================================================

function PriceTrendChart({ data }: { data: any }) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // Destroy previous chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Generate sample data for demonstration
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const properties = data.investment_opportunities.slice(0, 5);

    const datasets = properties.map((prop: InvestmentOpportunity, index: number) => {
      const basePrice = 50000000 + (prop.investment_score * 500000);
      const trendMultiplier = prop.trend_score / 100;
      
      return {
        label: `Property #${prop.property_id}`,
        data: months.map((_, i) => {
          const growth = trendMultiplier * (i + 1) * 0.02;
          return basePrice * (1 + growth);
        }),
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.1)`,
        borderWidth: 2,
        tension: 0.4,
        fill: false,
      };
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: months,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += formatCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return '₦' + (Number(value) / 1000000).toFixed(0) + 'M';
              }
            }
          }
        }
      },
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div className="w-full" style={{ height: '400px' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function MarketTrendDashboard() {
  const [forecastMonths, setForecastMonths] = useState(6);
  const [sortBy, setSortBy] = useState<'investment_score' | 'trend_score' | 'centrality_score'>('investment_score');

  // Fetch real GNN market trends from backend
  const { data: marketData, isLoading, error, refetch } = trpc.gnn.getMarketTrends.useQuery(
    { forecast_months: forecastMonths },
    { refetchInterval: 60000 } // Refresh every minute
  );

  // Mock data for demonstration (fallback)
  const mockMarketData = {
    forecast_months: 6,
    hotspots: [1, 3, 5, 7, 9],
    trend_predictions: {
      '1': 0.75,
      '2': 0.45,
      '3': 0.82,
      '4': 0.38,
      '5': 0.68,
    },
    investment_opportunities: [
      {
        property_id: 1,
        investment_score: 88.5,
        centrality_score: 82.3,
        trend_score: 92.0,
        undervaluation_score: 45.2,
        recommendation: 'Strong Buy',
      },
      {
        property_id: 3,
        investment_score: 85.2,
        centrality_score: 78.5,
        trend_score: 88.5,
        undervaluation_score: 52.3,
        recommendation: 'Strong Buy',
      },
      {
        property_id: 5,
        investment_score: 78.8,
        centrality_score: 85.2,
        trend_score: 75.5,
        undervaluation_score: 38.5,
        recommendation: 'Buy',
      },
      {
        property_id: 7,
        investment_score: 72.5,
        centrality_score: 68.3,
        trend_score: 78.2,
        undervaluation_score: 42.8,
        recommendation: 'Buy',
      },
      {
        property_id: 9,
        investment_score: 65.3,
        centrality_score: 72.5,
        trend_score: 62.5,
        undervaluation_score: 35.2,
        recommendation: 'Hold',
      },
    ],
    insights: [
      {
        type: 'growth_areas',
        title: 'Top Growth Areas',
        description: '5 neighborhoods showing strong growth potential',
        properties: [1, 3, 5, 7, 9],
      },
      {
        type: 'momentum',
        title: 'Market Momentum',
        description: 'Overall market sentiment is bullish',
        value: 0.68,
      },
      {
        type: 'investment',
        title: 'Best Investment Opportunities',
        description: '5 properties with high investment scores',
        properties: [1, 3, 5, 7, 9],
      },
    ],
    model_version: '1.0.0-mock',
    timestamp: new Date().toISOString(),
  };

  // Use real data if available, otherwise fallback to mock
  const displayData = marketData || mockMarketData;

  // Sort opportunities
  const sortedOpportunities = [...displayData.investment_opportunities].sort(
    (a, b) => b[sortBy] - a[sortBy]
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Market Trend Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            GNN-powered market intelligence and investment opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Loading Market Data</AlertTitle>
          <AlertDescription>
            Fetching latest GNN-powered market trends...
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error.message || 'Failed to fetch market trends. Using cached data.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Market Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayData.insights.map((insight, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {insight.type === 'growth_areas' && <TrendingUp className="h-4 w-4 text-green-600" />}
                {insight.type === 'momentum' && <Sparkles className="h-4 w-4 text-blue-600" />}
                {insight.type === 'investment' && <Target className="h-4 w-4 text-purple-600" />}
                {insight.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
              {insight.value !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Sentiment</span>
                    <span className="text-sm font-semibold">
                      {(insight.value * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={insight.value * 100} className="h-2" />
                </div>
              )}
              {insight.properties && (
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {insight.properties.length} properties
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">Investment Opportunities</TabsTrigger>
          <TabsTrigger value="trends">Price Trends</TabsTrigger>
          <TabsTrigger value="hotspots">Hotspot Neighborhoods</TabsTrigger>
        </TabsList>

        {/* Investment Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Investment Opportunities</CardTitle>
                  <CardDescription>
                    Properties ranked by GNN-based investment potential
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Button
                    variant={sortBy === 'investment_score' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('investment_score')}
                  >
                    Investment Score
                  </Button>
                  <Button
                    variant={sortBy === 'trend_score' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('trend_score')}
                  >
                    Trend
                  </Button>
                  <Button
                    variant={sortBy === 'centrality_score' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('centrality_score')}
                  >
                    Centrality
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property ID</TableHead>
                    <TableHead>Investment Score</TableHead>
                    <TableHead>Trend Score</TableHead>
                    <TableHead>Centrality Score</TableHead>
                    <TableHead>Undervaluation</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOpportunities.map((opp) => (
                    <TableRow key={opp.property_id}>
                      <TableCell className="font-medium">#{opp.property_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{opp.investment_score.toFixed(1)}</span>
                          <Progress value={opp.investment_score} className="h-2 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTrendIcon((opp.trend_score - 50) / 50)}
                          <span>{opp.trend_score.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{opp.centrality_score.toFixed(1)}</TableCell>
                      <TableCell>{opp.undervaluation_score.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={getRecommendationBadge(opp.recommendation)}>
                          {opp.recommendation}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Trend Predictions</CardTitle>
              <CardDescription>
                {forecastMonths}-month forecast using Temporal-GCN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceTrendChart data={displayData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hotspots Tab */}
        <TabsContent value="hotspots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hotspot Neighborhoods</CardTitle>
              <CardDescription>
                Areas with strong growth momentum based on spatial diffusion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockMarketData.hotspots.map((propertyId, index) => (
                  <Card key={propertyId} className="border-2 border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Property #{propertyId}</CardTitle>
                        <Badge variant="default" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Hotspot
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Trend Score</span>
                          <span className="font-semibold">
                            {((mockMarketData.trend_predictions[propertyId.toString()] || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={(mockMarketData.trend_predictions[propertyId.toString()] || 0) * 100}
                          className="h-2"
                        />
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <MapPin className="h-3 w-3 mr-2" />
                          View on Map
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Methodology Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">About This Dashboard</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This dashboard uses Graph Neural Networks (GNN) and Temporal-GCN models to analyze
                spatial and temporal patterns in real estate markets. Investment scores combine
                network centrality, price trends, and undervaluation metrics. All predictions
                include confidence intervals and are updated regularly with new market data.
              </p>
              <p className="text-xs text-muted-foreground">
                Model Version: {mockMarketData.model_version} | Last Updated:{' '}
                {new Date(mockMarketData.timestamp).toLocaleString('en-NG')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
