import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
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

interface MarketTrendData {
  neighborhoodId: string;
  neighborhoodName: string;
  trendDirection: 'up' | 'down' | 'stable';
  trendStrength: number;
  priceChangePrediction: number;
  timeHorizon: number;
  confidence: number;
  historicalData?: Array<{ date: string; price: number }>;
  predictionData?: Array<{ date: string; price: number; lower: number; upper: number }>;
}

interface MarketTrendPredictionProps {
  data: MarketTrendData;
  showChart?: boolean;
}

export function MarketTrendPrediction({ data, showChart = true }: MarketTrendPredictionProps) {
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
        return 'bg-green-100 text-green-800 border-green-300';
      case 'down':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const chartData = {
    labels: [
      ...(data.historicalData?.map(d => d.date) || []),
      ...(data.predictionData?.map(d => d.date) || [])
    ],
    datasets: [
      {
        label: 'Historical Prices',
        data: data.historicalData?.map(d => d.price) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Predicted Prices',
        data: [
          ...(data.historicalData ? new Array(data.historicalData.length).fill(null) : []),
          ...(data.predictionData?.map(d => d.price) || [])
        ],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderDash: [5, 5],
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Upper Bound',
        data: [
          ...(data.historicalData ? new Array(data.historicalData.length).fill(null) : []),
          ...(data.predictionData?.map(d => d.upper) || [])
        ],
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'transparent',
        borderDash: [2, 2],
        pointRadius: 0,
        tension: 0.4,
      },
      {
        label: 'Lower Bound',
        data: [
          ...(data.historicalData ? new Array(data.historicalData.length).fill(null) : []),
          ...(data.predictionData?.map(d => d.lower) || [])
        ],
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'transparent',
        borderDash: [2, 2],
        pointRadius: 0,
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number) => `₦${(value / 1000000).toFixed(1)}M`
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getTrendIcon()}
              {data.neighborhoodName} Market Trend
            </CardTitle>
            <CardDescription>
              {data.timeHorizon}-day price prediction with {(data.confidence * 100).toFixed(0)}% confidence
            </CardDescription>
          </div>
          <Badge className={getTrendColor()}>
            {data.priceChangePrediction > 0 ? '+' : ''}
            {data.priceChangePrediction.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Trend Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Direction</p>
              <p className="text-lg font-semibold capitalize">{data.trendDirection}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Strength</p>
              <p className="text-lg font-semibold">{(Math.abs(data.trendStrength) * 100).toFixed(0)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Confidence</p>
              <p className="text-lg font-semibold">{(data.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          {/* Confidence Warning */}
          {data.confidence < 0.7 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Lower Confidence Prediction</p>
                <p className="text-yellow-700">
                  This prediction has lower confidence due to limited historical data or high market volatility.
                </p>
              </div>
            </div>
          )}

          {/* Price Trend Chart */}
          {showChart && (data.historicalData || data.predictionData) && (
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          )}

          {/* Interpretation */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Market Interpretation</h4>
            <p className="text-sm text-muted-foreground">
              {data.trendDirection === 'up' && (
                <>
                  This neighborhood is experiencing an <strong>upward price trend</strong> with a predicted increase of{' '}
                  <strong>{data.priceChangePrediction.toFixed(1)}%</strong> over the next {data.timeHorizon} days.
                  This could indicate growing demand or improving neighborhood conditions.
                </>
              )}
              {data.trendDirection === 'down' && (
                <>
                  This neighborhood is experiencing a <strong>downward price trend</strong> with a predicted decrease of{' '}
                  <strong>{Math.abs(data.priceChangePrediction).toFixed(1)}%</strong> over the next {data.timeHorizon} days.
                  This could indicate reduced demand or market corrections.
                </>
              )}
              {data.trendDirection === 'stable' && (
                <>
                  This neighborhood is experiencing <strong>stable prices</strong> with minimal predicted change over the next{' '}
                  {data.timeHorizon} days. This indicates a balanced market with steady demand.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
