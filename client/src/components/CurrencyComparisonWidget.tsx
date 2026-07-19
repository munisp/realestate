import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

const AVAILABLE_CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪" },
  { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
];

export function CurrencyComparisonWidget() {
  const [currency1, setCurrency1] = useState("USD");
  const [currency2, setCurrency2] = useState("EUR");
  const [currency3, setCurrency3] = useState("GBP");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Fetch historical data for all three currencies
  const { data: history1 } = trpc.currencyHistory.getHistory.useQuery({
    base: currency1,
    target: "USD",
    days: 30,
  });

  const { data: history2 } = trpc.currencyHistory.getHistory.useQuery({
    base: currency2,
    target: "USD",
    days: 30,
  });

  const { data: history3 } = trpc.currencyHistory.getHistory.useQuery({
    base: currency3,
    target: "USD",
    days: 30,
  });

  useEffect(() => {
    if (!chartRef.current || !history1 || !history2 || !history3) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = history1.history.map(h => {
      const date = new Date(h.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: getCurrencyName(currency1),
            data: history1.history.map(h => h.rate),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: getCurrencyName(currency2),
            data: history2.history.map(h => h.rate),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: getCurrencyName(currency3),
            data: history3.history.map(h => h.rate),
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
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
  }, [currency1, currency2, currency3, history1, history2, history3]);

  const getCurrencyName = (code: string) => {
    return AVAILABLE_CURRENCIES.find(c => c.code === code)?.name || code;
  };

  const getCurrencyFlag = (code: string) => {
    return AVAILABLE_CURRENCIES.find(c => c.code === code)?.flag || "";
  };

  const renderCurrencyStats = (data: typeof history1, color: string) => {
    if (!data) return null;

    const change = data.stats.change;
    const isPositive = change >= 0;

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: color }}>
        <div>
          <div className="text-sm text-muted-foreground">Current Rate</div>
          <div className="text-2xl font-bold">{data.stats.current.toFixed(4)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">30-Day Change</div>
          <div className={`text-lg font-semibold flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Comparison</CardTitle>
        <CardDescription>
          Compare 30-day exchange rate trends for up to 3 currencies side-by-side
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Currency Selectors */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Currency 1</label>
            <Select value={currency1} onValueChange={setCurrency1}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Currency 2</label>
            <Select value={currency2} onValueChange={setCurrency2}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Currency 3</label>
            <Select value={currency3} onValueChange={setCurrency3}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <canvas ref={chartRef} />
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          {renderCurrencyStats(history1, 'rgb(59, 130, 246)')}
          {renderCurrencyStats(history2, 'rgb(16, 185, 129)')}
          {renderCurrencyStats(history3, 'rgb(245, 158, 11)')}
        </div>

        {/* Conversion Helper */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="text-sm font-medium mb-2">Quick Conversion</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="font-semibold">{getCurrencyFlag(currency1)} {currency1}</div>
              <div className="text-muted-foreground">1.00</div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="font-semibold">🇺🇸 USD</div>
              <div className="text-muted-foreground">{history1?.stats.current.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
