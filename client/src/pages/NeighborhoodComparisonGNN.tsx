/**
 * Neighborhood Comparison Tool (GNN-Powered)
 * -------------------------------------------
 * Side-by-side comparison of neighborhoods using Graph Neural Network
 * spatial intelligence, walkability scores, and amenity density analysis.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Home,
  DollarSign,
  Users,
  Zap,
  Target,
  Download,
  Plus,
  X,
  BarChart3,
  Network,
  Footprints,
  Building2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import PropertyNetworkGraph, { PropertyNode, PropertyLink } from '@/components/PropertyNetworkGraph';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

// ============================================================================
// Types
// ============================================================================

interface NeighborhoodMetrics {
  name: string;
  city: string;
  growth_momentum: number;
  walkability_score: number;
  amenity_density: number;
  transit_accessibility: number;
  investment_potential: number;
  avg_property_price: number;
  price_trend_6m: number;
  network_centrality: number;
  population_density: number;
  safety_score: number;
}

interface ComparisonData {
  neighborhoods: NeighborhoodMetrics[];
  timestamp: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  return `₦${(value / 1000000).toFixed(1)}M`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBadge(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  if (score >= 40) return 'outline';
  return 'destructive';
}

function getTrendIcon(trend: number) {
  if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <div className="h-4 w-4" />;
}

// ============================================================================
// Radar Chart Component
// ============================================================================

function RadarComparisonChart({ neighborhoods }: { neighborhoods: NeighborhoodMetrics[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || neighborhoods.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = [
      'Growth Momentum',
      'Walkability',
      'Amenity Density',
      'Transit Access',
      'Investment Potential',
      'Network Centrality',
    ];

    const datasets = neighborhoods.map((neighborhood, index) => ({
      label: neighborhood.name,
      data: [
        neighborhood.growth_momentum,
        neighborhood.walkability_score,
        neighborhood.amenity_density,
        neighborhood.transit_accessibility,
        neighborhood.investment_potential,
        neighborhood.network_centrality,
      ],
      borderColor: `hsl(${index * 120}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 120}, 70%, 50%, 0.2)`,
      borderWidth: 2,
    }));

    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [neighborhoods]);

  return (
    <div className="w-full" style={{ height: '400px' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NeighborhoodComparisonGNN() {
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([
    'Lekki Phase 1',
    'Victoria Island',
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration (replace with tRPC query)
  const mockData: ComparisonData = {
    neighborhoods: [
      {
        name: 'Lekki Phase 1',
        city: 'Lagos',
        growth_momentum: 88,
        walkability_score: 65,
        amenity_density: 82,
        transit_accessibility: 58,
        investment_potential: 92,
        avg_property_price: 85000000,
        price_trend_6m: 12.5,
        network_centrality: 78,
        population_density: 4200,
        safety_score: 85,
      },
      {
        name: 'Victoria Island',
        city: 'Lagos',
        growth_momentum: 75,
        walkability_score: 78,
        amenity_density: 95,
        transit_accessibility: 72,
        investment_potential: 85,
        avg_property_price: 120000000,
        price_trend_6m: 8.2,
        network_centrality: 92,
        population_density: 6800,
        safety_score: 90,
      },
      {
        name: 'Ikoyi',
        city: 'Lagos',
        growth_momentum: 68,
        walkability_score: 72,
        amenity_density: 88,
        transit_accessibility: 68,
        investment_potential: 78,
        avg_property_price: 150000000,
        price_trend_6m: 5.8,
        network_centrality: 88,
        population_density: 5200,
        safety_score: 92,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const compareData = mockData.neighborhoods.filter((n) =>
    selectedNeighborhoods.includes(n.name)
  );

  const addNeighborhood = (name: string) => {
    if (selectedNeighborhoods.length < 4 && !selectedNeighborhoods.includes(name)) {
      setSelectedNeighborhoods([...selectedNeighborhoods, name]);
    }
  };

  const removeNeighborhood = (name: string) => {
    setSelectedNeighborhoods(selectedNeighborhoods.filter((n) => n !== name));
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8" />
            Neighborhood Comparison
          </h1>
          <p className="text-muted-foreground mt-1">
            GNN-powered spatial intelligence and walkability analysis
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Neighborhood Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Neighborhoods to Compare</CardTitle>
          <CardDescription>Choose 2-4 neighborhoods for side-by-side analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedNeighborhoods.map((name) => (
              <Badge key={name} variant="secondary" className="text-sm px-3 py-1">
                {name}
                <button
                  onClick={() => removeNeighborhood(name)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          {selectedNeighborhoods.length < 4 && (
            <div className="flex gap-2">
              <Select onValueChange={addNeighborhood}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add neighborhood..." />
                </SelectTrigger>
                <SelectContent>
                  {mockData.neighborhoods
                    .filter((n) => !selectedNeighborhoods.includes(n.name))
                    .map((n) => (
                      <SelectItem key={n.name} value={n.name}>
                        {n.name}, {n.city}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Radar Chart Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Comparison</CardTitle>
          <CardDescription>Radar chart showing all key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <RadarComparisonChart neighborhoods={compareData} />
        </CardContent>
      </Card>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
          <CardDescription>Side-by-side comparison of all factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Metric</th>
                  {compareData.map((neighborhood) => (
                    <th key={neighborhood.name} className="text-center p-3 font-medium">
                      {neighborhood.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Growth Momentum */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Growth Momentum</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${getScoreColor(n.growth_momentum)}`}>
                          {n.growth_momentum}%
                        </span>
                        <Progress value={n.growth_momentum} className="h-1 w-20" />
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Walkability Score */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <Footprints className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Walkability Score</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${getScoreColor(n.walkability_score)}`}>
                          {n.walkability_score}%
                        </span>
                        <Progress value={n.walkability_score} className="h-1 w-20" />
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Amenity Density */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Amenity Density</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${getScoreColor(n.amenity_density)}`}>
                          {n.amenity_density}%
                        </span>
                        <Progress value={n.amenity_density} className="h-1 w-20" />
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Transit Accessibility */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Transit Accessibility</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-semibold ${getScoreColor(n.transit_accessibility)}`}>
                          {n.transit_accessibility}%
                        </span>
                        <Progress value={n.transit_accessibility} className="h-1 w-20" />
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Investment Potential */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Investment Potential</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant={getScoreBadge(n.investment_potential)}>
                          {n.investment_potential}%
                        </Badge>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Average Price */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Avg. Property Price</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <span className="font-semibold">{formatCurrency(n.avg_property_price)}</span>
                    </td>
                  ))}
                </tr>

                {/* Price Trend */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">6-Month Price Trend</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(n.price_trend_6m)}
                        <span
                          className={`font-semibold ${
                            n.price_trend_6m > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {n.price_trend_6m > 0 ? '+' : ''}
                          {n.price_trend_6m.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Network Centrality */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-3 flex items-center gap-2">
                    <Network className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Network Centrality</span>
                  </td>
                  {compareData.map((n) => (
                    <td key={n.name} className="text-center p-3">
                      <span className="font-semibold">{n.network_centrality}%</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Winner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-600" />
              Best Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const best = compareData.reduce((prev, current) =>
                current.investment_potential > prev.investment_potential ? current : prev
              );
              return (
                <div>
                  <p className="font-semibold text-lg">{best.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {best.investment_potential}% potential score
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Footprints className="h-4 w-4 text-green-600" />
              Most Walkable
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const best = compareData.reduce((prev, current) =>
                current.walkability_score > prev.walkability_score ? current : prev
              );
              return (
                <div>
                  <p className="font-semibold text-lg">{best.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {best.walkability_score}% walkability
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              Fastest Growing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const best = compareData.reduce((prev, current) =>
                current.growth_momentum > prev.growth_momentum ? current : prev
              );
              return (
                <div>
                  <p className="font-semibold text-lg">{best.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {best.growth_momentum}% momentum
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Property Network Visualization */}
      <PropertyNetworkGraph
        nodes={[
          { id: 1, name: 'Property A', price: 85000000, type: 'residential', neighborhood: compareData[0]?.name || 'Lekki Phase 1', centrality: 0.92 },
          { id: 2, name: 'Property B', price: 75000000, type: 'residential', neighborhood: compareData[0]?.name || 'Lekki Phase 1', centrality: 0.78 },
          { id: 3, name: 'Property C', price: 95000000, type: 'residential', neighborhood: compareData[0]?.name || 'Lekki Phase 1', centrality: 0.85 },
          { id: 4, name: 'Property D', price: 120000000, type: 'commercial', neighborhood: compareData[1]?.name || 'Victoria Island', centrality: 0.95 },
          { id: 5, name: 'Property E', price: 65000000, type: 'residential', neighborhood: compareData[1]?.name || 'Victoria Island', centrality: 0.65 },
          { id: 6, name: 'Property F', price: 55000000, type: 'residential', neighborhood: compareData[2]?.name || 'Ikoyi', centrality: 0.58 },
          { id: 7, name: 'Property G', price: 88000000, type: 'residential', neighborhood: compareData[2]?.name || 'Ikoyi', centrality: 0.72 },
          { id: 8, name: 'Property H', price: 105000000, type: 'commercial', neighborhood: compareData[1]?.name || 'Victoria Island', centrality: 0.88 },
          { id: 9, name: 'Property I', price: 92000000, type: 'residential', neighborhood: compareData[0]?.name || 'Lekki Phase 1', centrality: 0.81 },
          { id: 10, name: 'Property J', price: 78000000, type: 'residential', neighborhood: compareData[0]?.name || 'Lekki Phase 1', centrality: 0.68 },
        ]}
        links={[
          { source: 1, target: 2, strength: 0.8, type: 'spatial' },
          { source: 1, target: 3, strength: 0.7, type: 'market' },
          { source: 2, target: 3, strength: 0.6, type: 'feature' },
          { source: 1, target: 10, strength: 0.75, type: 'spatial' },
          { source: 4, target: 5, strength: 0.65, type: 'spatial' },
          { source: 4, target: 8, strength: 0.9, type: 'market' },
          { source: 6, target: 7, strength: 0.7, type: 'spatial' },
          { source: 8, target: 9, strength: 0.5, type: 'market' },
          { source: 3, target: 9, strength: 0.5, type: 'market' },
          { source: 5, target: 9, strength: 0.6, type: 'feature' },
          { source: 2, target: 7, strength: 0.4, type: 'market' },
          { source: 1, target: 4, strength: 0.55, type: 'market' },
        ]}
        width={1200}
        height={700}
        onNodeClick={(node) => console.log('Clicked node:', node)}
      />
    </div>
  );
}
