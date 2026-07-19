import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface AnalyticsChartsProps {
  timeRange?: string;
}

export function AnalyticsCharts({ timeRange = '30d' }: AnalyticsChartsProps) {
  // Generate mock data based on time range
  const { labels, userGrowthData, transactionData, propertyData } = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const labels: string[] = [];
    const userGrowthData: number[] = [];
    const transactionData: number[] = [];
    const propertyData: number[] = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      if (days <= 30) {
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      } else if (days <= 90) {
        if (i % 3 === 0) {
          labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
      } else {
        if (i % 30 === 0) {
          labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
        }
      }

      // Generate realistic-looking data with trends
      const baseUsers = 100 + Math.floor(i * 2.5);
      const baseTransactions = 20 + Math.floor(i * 0.8);
      const baseProperties = 50 + Math.floor(i * 1.2);

      userGrowthData.push(baseUsers + Math.floor(Math.random() * 20));
      transactionData.push(baseTransactions + Math.floor(Math.random() * 10));
      propertyData.push(baseProperties + Math.floor(Math.random() * 15));
    }

    return {
      labels: days <= 30 ? labels : days <= 90 ? labels.filter((_, i) => i % 3 === 0) : labels.filter((_, i) => i % 30 === 0),
      userGrowthData: days <= 30 ? userGrowthData : days <= 90 ? userGrowthData.filter((_, i) => i % 3 === 0) : userGrowthData.filter((_, i) => i % 30 === 0),
      transactionData: days <= 30 ? transactionData : days <= 90 ? transactionData.filter((_, i) => i % 3 === 0) : transactionData.filter((_, i) => i % 30 === 0),
      propertyData: days <= 30 ? propertyData : days <= 90 ? propertyData.filter((_, i) => i % 3 === 0) : propertyData.filter((_, i) => i % 30 === 0),
    };
  }, [timeRange]);

  const userGrowthChartData = {
    labels,
    datasets: [
      {
        label: 'Total Users',
        data: userGrowthData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const transactionChartData = {
    labels,
    datasets: [
      {
        label: 'Transactions',
        data: transactionData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const propertyChartData = {
    labels,
    datasets: [
      {
        label: 'Property Listings',
        data: propertyData,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const propertyStatusData = {
    labels: ['Active', 'Pending', 'Sold', 'Inactive'],
    datasets: [
      {
        data: [245, 87, 156, 43],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(59, 130, 246)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: false,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>Total registered users over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line data={userGrowthChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
          <CardDescription>Number of transactions completed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Bar data={transactionChartData} options={barChartOptions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property Listings Trend</CardTitle>
          <CardDescription>New property listings over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line data={propertyChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property Status Distribution</CardTitle>
          <CardDescription>Current property inventory breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Doughnut data={propertyStatusData} options={doughnutOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
