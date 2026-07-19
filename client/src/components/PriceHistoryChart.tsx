// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface PriceHistoryChartProps {
  propertyId: number;
  currentPrice: number;
}

export function PriceHistoryChart({ propertyId, currentPrice }: PriceHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [timeRange, setTimeRange] = useState<'30d' | '60d' | '90d' | 'all'>('30d');

  // Fetch price history
  const { data: priceHistory, isLoading } = trpc.properties.getPriceHistory.useQuery({
    propertyId,
    days: timeRange === '30d' ? 30 : timeRange === '60d' ? 60 : timeRange === '90d' ? 90 : 365,
  });

  useEffect(() => {
    if (!canvasRef.current || !priceHistory || priceHistory.length === 0) return;

    // Dynamically import Chart.js to avoid SSR issues
    import('chart.js/auto').then((ChartJS) => {
      const Chart = ChartJS.default;

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      // Prepare data
      const labels = priceHistory.map((item: any) => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      const prices = priceHistory.map((item: any) => item.price);

      // Calculate trend
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const priceChange = lastPrice - firstPrice;
      const priceChangePercent = (priceChange / firstPrice) * 100;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      if (priceChange >= 0) {
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      }

      // Create chart
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Price',
              data: prices,
              borderColor: priceChange >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
              backgroundColor: gradient,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'white',
              pointBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  return `$${context.parsed.y.toLocaleString()}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
            y: {
              beginAtZero: false,
              ticks: {
                callback: (value) => {
                  return `$${(Number(value) / 1000000).toFixed(1)}M`;
                },
              },
            },
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
          },
        },
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [priceHistory]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Loading price trends...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Track price changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No price history available yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Price tracking will begin once the property is listed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const prices = priceHistory.map((item: any) => item.price);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Price History</CardTitle>
            <CardDescription>Track price changes over time</CardDescription>
          </div>
          <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <TabsList>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="60d">60D</TabsTrigger>
              <TabsTrigger value="90d">90D</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
            <p className="text-lg font-bold">${(currentPrice / 1000000).toFixed(2)}M</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Price Change</p>
            <div className="flex items-center gap-2">
              <p className={`text-lg font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : ''}${(priceChange / 1000000).toFixed(2)}M
              </p>
              {priceChange > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : priceChange < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : (
                <Minus className="w-4 h-4 text-gray-600" />
              )}
            </div>
            <Badge 
              variant={priceChange >= 0 ? 'default' : 'destructive'} 
              className="mt-1"
            >
              {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%
            </Badge>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Average Price</p>
            <p className="text-lg font-bold">${(avgPrice / 1000000).toFixed(2)}M</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Price Range</p>
            <p className="text-sm font-semibold">
              ${(minPrice / 1000000).toFixed(1)}M - ${(maxPrice / 1000000).toFixed(1)}M
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <canvas ref={canvasRef}></canvas>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium mb-2">💡 Price Insights</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {priceChange > 0 && (
              <li>• Property value has increased by {priceChangePercent.toFixed(1)}% over the selected period</li>
            )}
            {priceChange < 0 && (
              <li>• Property value has decreased by {Math.abs(priceChangePercent).toFixed(1)}% over the selected period</li>
            )}
            {priceChange === 0 && (
              <li>• Property price has remained stable over the selected period</li>
            )}
            <li>• Current price is {((currentPrice - avgPrice) / avgPrice * 100).toFixed(1)}% {currentPrice > avgPrice ? 'above' : 'below'} the average</li>
            {currentPrice === minPrice && <li>• This is the lowest recorded price for this property</li>}
            {currentPrice === maxPrice && <li>• This is the highest recorded price for this property</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
