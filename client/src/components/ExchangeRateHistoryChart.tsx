// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { trpc } from "@/lib/trpc";

Chart.register(...registerables);

interface ExchangeRateHistoryChartProps {
  currency: string;
}

export function ExchangeRateHistoryChart({ currency }: ExchangeRateHistoryChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [rateChange, setRateChange] = useState<number>(0);

  // Fetch real historical data from API
  const { data: historyData, isLoading } = trpc.currencyHistory.getHistory.useQuery({
    base: currency,
    target: 'USD',
    days: 30,
  });

  useEffect(() => {
    if (!chartRef.current || !historyData) return;

    // Use real API data
    const processHistoricalData = () => {
      const labels = historyData.history.map(h => {
        const date = new Date(h.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const data = historyData.history.map(h => h.rate);
      
      // Set rate change from API stats
      setRateChange(historyData.stats.change);
      
      return { labels, data };
    };

    const { labels, data } = processHistoricalData();

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${currency} Exchange Rate`,
            data,
            borderColor: rateChange >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
            backgroundColor: rateChange >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
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
                return `Rate: ${context.parsed.y.toFixed(4)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 0,
              autoSkipPadding: 20,
            },
          },
          y: {
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              callback: (value) => {
                return typeof value === 'number' ? value.toFixed(2) : value;
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
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [currency, historyData, rateChange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {rateChange >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              30-Day Exchange Rate History
            </CardTitle>
            <CardDescription>
              {currency} to USD exchange rate trend
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${rateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rateChange >= 0 ? '+' : ''}{rateChange.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">30-day change</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        ) : (
          <div style={{ height: '300px' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Period</p>
            <p className="font-semibold">30 Days</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="font-semibold">{currency}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Base</p>
            <p className="font-semibold">USD</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
