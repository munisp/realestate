import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, DollarSign, Home, BarChart3, Calendar } from "lucide-react";
import { useParams } from "wouter";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PropertyValuationHistory() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id || '0');

  const { data: valuationData, isLoading } = trpc.properties.getValuationHistory.useQuery(
    { propertyId },
    { enabled: !!propertyId }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!valuationData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Valuation history not available
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { property, history, insights, neighborhoodComparison } = valuationData;

  // Prepare chart data
  const chartData = {
    labels: history.map(h => new Date(h.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Property Valuation',
        data: history.map(h => h.estimatedValue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Neighborhood Average',
        data: history.map(h => h.neighborhoodAverage),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        fill: false,
        tension: 0.4,
        borderDash: [5, 5],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return '$' + (value / 1000000).toFixed(1) + 'M';
          },
        },
      },
    },
  };

  const currentValue = history[history.length - 1]?.estimatedValue || property.price;
  const previousValue = history[0]?.estimatedValue || property.price;
  const valueChange = currentValue - previousValue;
  const percentChange = ((valueChange / previousValue) * 100);
  const isPositive = valueChange >= 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Property Valuation History</h1>
        <p className="text-muted-foreground">
          ML-powered automated valuations and market trends
        </p>
      </div>

      {/* Current Valuation Card */}
      <Card className="mb-8 border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            Current Estimated Value
          </CardTitle>
          <CardDescription>{property.address}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Valuation</p>
              <p className="text-3xl font-bold text-primary">
                ${currentValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Change (12 months)</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                </p>
                {isPositive ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ${Math.abs(valueChange).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">List Price</p>
              <p className="text-2xl font-bold">${property.price.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                {((property.price - currentValue) / currentValue * 100).toFixed(1)}% {property.price > currentValue ? 'above' : 'below'} estimate
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Confidence Score</p>
              <p className="text-2xl font-bold">{insights.confidenceScore}%</p>
              <Badge variant={insights.confidenceScore >= 80 ? 'default' : 'secondary'}>
                {insights.confidenceScore >= 80 ? 'High' : 'Medium'} Confidence
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">Valuation Chart</TabsTrigger>
          <TabsTrigger value="insights">Market Insights</TabsTrigger>
          <TabsTrigger value="comparison">Neighborhood Comparison</TabsTrigger>
          <TabsTrigger value="history">Detailed History</TabsTrigger>
        </TabsList>

        {/* Chart Tab */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>12-Month Valuation Trend</CardTitle>
              <CardDescription>
                Automated monthly valuations powered by ML model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Market Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Appreciation Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{insights.appreciationRate.toFixed(1)}% annually
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {insights.appreciationRate > 5 ? 'Strong' : insights.appreciationRate > 3 ? 'Moderate' : 'Slow'} growth market
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Market Velocity</p>
                  <p className="text-lg">{insights.marketVelocity}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Average days on market: {insights.avgDaysOnMarket} days
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Investment Potential</p>
                  <Badge variant={insights.investmentPotential === 'High' ? 'default' : 'secondary'}>
                    {insights.investmentPotential}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on historical trends and market conditions
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Valuation Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.factors.map((factor: any, index: number) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{factor.name}</span>
                      <span className={`text-sm font-semibold ${factor.impact > 0 ? 'text-green-600' : factor.impact < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {factor.impact > 0 ? '+' : ''}{factor.impact}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${factor.impact > 0 ? 'bg-green-500' : factor.impact < 0 ? 'bg-red-500' : 'bg-gray-400'}`}
                        style={{ width: `${Math.abs(factor.impact) * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Neighborhood Benchmark</CardTitle>
              <CardDescription>
                How this property compares to similar properties in the area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">This Property</p>
                  <p className="text-2xl font-bold text-primary">
                    ${currentValue.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Neighborhood Avg</p>
                  <p className="text-2xl font-bold">
                    ${neighborhoodComparison.averageValue.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Difference</p>
                  <p className={`text-2xl font-bold ${currentValue > neighborhoodComparison.averageValue ? 'text-green-600' : 'text-red-600'}`}>
                    {currentValue > neighborhoodComparison.averageValue ? '+' : ''}
                    {((currentValue - neighborhoodComparison.averageValue) / neighborhoodComparison.averageValue * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Price per Sq Ft</span>
                    <span className="text-sm font-semibold">
                      ${(currentValue / property.squareFeet).toFixed(0)} vs ${neighborhoodComparison.avgPricePerSqFt.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(((currentValue / property.squareFeet) / neighborhoodComparison.avgPricePerSqFt) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Comparable Sales (Last 6 months)</p>
                  <div className="space-y-2">
                    {neighborhoodComparison.comparables.map((comp: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{comp.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {comp.beds} bed, {comp.baths} bath • {comp.sqft.toLocaleString()} sq ft
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${comp.price.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            ${(comp.price / comp.sqft).toFixed(0)}/sq ft
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Valuation History</CardTitle>
              <CardDescription>
                Automated valuations for the past 12 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((entry: any, index: number) => {
                  const prevEntry = history[index - 1];
                  const change = prevEntry ? entry.estimatedValue - prevEntry.estimatedValue : 0;
                  const percentChange = prevEntry ? (change / prevEntry.estimatedValue) * 100 : 0;

                  return (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Confidence: {entry.confidence}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${entry.estimatedValue.toLocaleString()}
                        </p>
                        {prevEntry && (
                          <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
