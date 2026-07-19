import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle, Loader2 } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { trpc } from "@/lib/trpc";

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

interface MarketTrendPredictionLiveProps {
  neighborhood: string;
  city: string;
  showChart?: boolean;
}

export function MarketTrendPredictionLive({ 
  neighborhood, 
  city, 
  showChart = true 
}: MarketTrendPredictionLiveProps) {
  const { data, isLoading, error } = trpc.gnn.getMarketTrends.useQuery({
    neighborhood,
    city,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Trend Prediction</CardTitle>
          <CardDescription>Loading market analysis...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Trend Prediction</CardTitle>
          <CardDescription>Unable to load market data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading market trends. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (data.trendDirection) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (data.trendDirection) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendBadgeVariant = (): "default" | "secondary" | "destructive" => {
    switch (data.trendDirection) {
      case 'up':
        return 'default';
      case 'down':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare chart data
  const chartData = {
    labels: ['Current', '3 Months', '6 Months', '12 Months'],
    datasets: [
      {
        label: 'Predicted Price',
        data: [
          data.currentPrice,
          data.predictedPrice3Months,
          data.predictedPrice6Months,
          data.predictedPrice12Months,
        ],
        borderColor: data.trendDirection === 'up' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: data.trendDirection === 'up' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Market Trend Prediction</CardTitle>
            <CardDescription>{neighborhood}, {city}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <Badge variant={getTrendBadgeVariant()}>
              {data.trendDirection.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Avg Price</p>
            <p className="text-2xl font-bold">{formatCurrency(data.currentPrice)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">12-Month Prediction</p>
            <p className={`text-2xl font-bold ${getTrendColor()}`}>
              {formatCurrency(data.predictedPrice12Months)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expected Change</p>
            <p className={`text-xl font-semibold ${getTrendColor()}`}>
              {data.percentageChange > 0 ? '+' : ''}{data.percentageChange.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="text-xl font-semibold">{(data.confidence * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Chart */}
        {showChart && (
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Factors */}
        <div>
          <h4 className="font-semibold mb-3">Key Factors</h4>
          <div className="space-y-2">
            {data.factors.map((factor, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-24 flex-shrink-0">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${factor.impact * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(factor.impact * 100).toFixed(0)}% impact
                  </p>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{factor.name}</p>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
