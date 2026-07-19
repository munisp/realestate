// @ts-nocheck
import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, TrendingDown, DollarSign, Users, GraduationCap, Shield, Building2, X, Plus } from 'lucide-react';
import { Bar, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadarController, RadialLinearScale, PointElement, LineElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadarController, RadialLinearScale, PointElement, LineElement);

interface NeighborhoodData {
  name: string;
  city: string;
  avgPrice: number;
  priceChange1Y: number;
  population: number;
  crimeRate: number; // per 1000 residents
  schoolRating: number; // 1-10
  walkScore: number; // 0-100
  transitScore: number; // 0-100
  amenitiesCount: number;
  medianIncome: number;
  unemploymentRate: number;
}

// Sample data - in production, this would come from an API
const SAMPLE_NEIGHBORHOODS: NeighborhoodData[] = [
  {
    name: 'Ikoyi',
    city: 'Lagos',
    avgPrice: 85000000,
    priceChange1Y: 12.5,
    population: 45000,
    crimeRate: 15,
    schoolRating: 9,
    walkScore: 75,
    transitScore: 65,
    amenitiesCount: 120,
    medianIncome: 8500000,
    unemploymentRate: 4.2,
  },
  {
    name: 'Victoria Island',
    city: 'Lagos',
    avgPrice: 95000000,
    priceChange1Y: 15.2,
    population: 52000,
    crimeRate: 12,
    schoolRating: 9,
    walkScore: 82,
    transitScore: 78,
    amenitiesCount: 150,
    medianIncome: 9200000,
    unemploymentRate: 3.8,
  },
  {
    name: 'Lekki Phase 1',
    city: 'Lagos',
    avgPrice: 55000000,
    priceChange1Y: 18.3,
    population: 68000,
    crimeRate: 18,
    schoolRating: 8,
    walkScore: 68,
    transitScore: 55,
    amenitiesCount: 95,
    medianIncome: 6500000,
    unemploymentRate: 5.1,
  },
  {
    name: 'Banana Island',
    city: 'Lagos',
    avgPrice: 250000000,
    priceChange1Y: 8.7,
    population: 3500,
    crimeRate: 5,
    schoolRating: 10,
    walkScore: 60,
    transitScore: 45,
    amenitiesCount: 80,
    medianIncome: 15000000,
    unemploymentRate: 2.1,
  },
  {
    name: 'Ikeja GRA',
    city: 'Lagos',
    avgPrice: 45000000,
    priceChange1Y: 10.5,
    population: 38000,
    crimeRate: 20,
    schoolRating: 7,
    walkScore: 72,
    transitScore: 70,
    amenitiesCount: 110,
    medianIncome: 5800000,
    unemploymentRate: 6.2,
  },
];

export default function NeighborhoodCompare() {
  const [, setLocation] = useLocation();
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNeighborhoods = useMemo(() => {
    return SAMPLE_NEIGHBORHOODS.filter(n =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const comparedNeighborhoods = useMemo(() => {
    return SAMPLE_NEIGHBORHOODS.filter(n => selectedNeighborhoods.includes(n.name));
  }, [selectedNeighborhoods]);

  const toggleNeighborhood = (name: string) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  // Price comparison chart
  const priceChartData = useMemo(() => ({
    labels: comparedNeighborhoods.map(n => n.name),
    datasets: [
      {
        label: 'Average Price (₦)',
        data: comparedNeighborhoods.map(n => n.avgPrice),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  }), [comparedNeighborhoods]);

  // Quality of life radar chart
  const radarChartData = useMemo(() => {
    return {
      labels: ['Schools', 'Safety', 'Walkability', 'Transit', 'Amenities'],
      datasets: comparedNeighborhoods.map((n, i) => ({
        label: n.name,
        data: [
          n.schoolRating * 10,
          100 - (n.crimeRate * 2),
          n.walkScore,
          n.transitScore,
          (n.amenitiesCount / 150) * 100,
        ],
        backgroundColor: `rgba(${59 + i * 50}, ${130 - i * 20}, ${246 - i * 30}, 0.2)`,
        borderColor: `rgba(${59 + i * 50}, ${130 - i * 20}, ${246 - i * 30}, 1)`,
        borderWidth: 2,
      })),
    };
  }, [comparedNeighborhoods]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" />
            Neighborhood Comparison
          </h1>
          <p className="text-muted-foreground">
            Compare neighborhoods based on prices, safety, schools, and quality of life
          </p>
        </div>

        {/* Search and Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Neighborhoods to Compare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search neighborhoods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNeighborhoods.map((neighborhood) => (
                <Card
                  key={neighborhood.name}
                  className={`cursor-pointer transition-all ${
                    selectedNeighborhoods.includes(neighborhood.name)
                      ? 'ring-2 ring-primary'
                      : 'hover:border-primary'
                  }`}
                  onClick={() => toggleNeighborhood(neighborhood.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{neighborhood.name}</h3>
                        <p className="text-sm text-muted-foreground">{neighborhood.city}</p>
                      </div>
                      {selectedNeighborhoods.includes(neighborhood.name) ? (
                        <Badge className="bg-primary">
                          <X className="h-3 w-3" />
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Plus className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-bold text-primary">
                      ₦{(neighborhood.avgPrice / 1000000).toFixed(1)}M
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      {neighborhood.priceChange1Y > 0 ? (
                        <span className="text-green-600 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{neighborhood.priceChange1Y}%
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {neighborhood.priceChange1Y}%
                        </span>
                      )}
                      <span className="text-muted-foreground">1Y</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {comparedNeighborhoods.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Neighborhoods Selected</h3>
              <p className="text-muted-foreground">
                Select at least one neighborhood above to start comparing
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Average Property Prices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar
                      data={priceChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => `₦${(context.parsed.y / 1000000).toFixed(1)}M`,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => `₦${(Number(value) / 1000000).toFixed(0)}M`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality of Life Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Radar
                      data={radarChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            beginAtZero: true,
                            max: 100,
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Metric</TableHead>
                        {comparedNeighborhoods.map((n) => (
                          <TableHead key={n.name} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold">{n.name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleNeighborhood(n.name)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Avg. Price
                        </TableCell>
                        {comparedNeighborhoods.map((n) => {
                          const isLowest = n.avgPrice === Math.min(...comparedNeighborhoods.map(x => x.avgPrice));
                          return (
                            <TableCell key={n.name} className={`text-center font-bold ${isLowest ? 'bg-green-50 text-green-700' : ''}`}>
                              ₦{(n.avgPrice / 1000000).toFixed(1)}M
                              {isLowest && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Best Value</Badge>}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          1Y Price Change
                        </TableCell>
                        {comparedNeighborhoods.map((n) => {
                          const isHighest = n.priceChange1Y === Math.max(...comparedNeighborhoods.map(x => x.priceChange1Y));
                          return (
                            <TableCell key={n.name} className={`text-center ${isHighest ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}>
                              <span className={n.priceChange1Y > 0 ? 'text-green-600' : 'text-red-600'}>
                                {n.priceChange1Y > 0 ? '+' : ''}{n.priceChange1Y}%
                              </span>
                              {isHighest && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">Highest Growth</Badge>}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Population
                        </TableCell>
                        {comparedNeighborhoods.map((n) => (
                          <TableCell key={n.name} className="text-center">
                            {n.population.toLocaleString()}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          Crime Rate
                        </TableCell>
                        {comparedNeighborhoods.map((n) => {
                          const isLowest = n.crimeRate === Math.min(...comparedNeighborhoods.map(x => x.crimeRate));
                          return (
                            <TableCell key={n.name} className={`text-center ${isLowest ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                              {n.crimeRate} per 1k
                              {isLowest && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Safest</Badge>}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          School Rating
                        </TableCell>
                        {comparedNeighborhoods.map((n) => {
                          const isHighest = n.schoolRating === Math.max(...comparedNeighborhoods.map(x => x.schoolRating));
                          return (
                            <TableCell key={n.name} className={`text-center ${isHighest ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}>
                              {n.schoolRating}/10
                              {isHighest && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">Best Schools</Badge>}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Walk Score
                        </TableCell>
                        {comparedNeighborhoods.map((n) => {
                          const isHighest = n.walkScore === Math.max(...comparedNeighborhoods.map(x => x.walkScore));
                          return (
                            <TableCell key={n.name} className={`text-center ${isHighest ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}>
                              {n.walkScore}/100
                              {isHighest && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">Most Walkable</Badge>}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          Transit Score
                        </TableCell>
                        {comparedNeighborhoods.map((n) => {
                          const isHighest = n.transitScore === Math.max(...comparedNeighborhoods.map(x => x.transitScore));
                          return (
                            <TableCell key={n.name} className={`text-center ${isHighest ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}>
                              {n.transitScore}/100
                              {isHighest && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">Best Transit</Badge>}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Amenities</TableCell>
                        {comparedNeighborhoods.map((n) => (
                          <TableCell key={n.name} className="text-center">
                            {n.amenitiesCount}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Median Income</TableCell>
                        {comparedNeighborhoods.map((n) => (
                          <TableCell key={n.name} className="text-center">
                            ₦{(n.medianIncome / 1000000).toFixed(1)}M
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Unemployment</TableCell>
                        {comparedNeighborhoods.map((n) => {
                          const isLowest = n.unemploymentRate === Math.min(...comparedNeighborhoods.map(x => x.unemploymentRate));
                          return (
                            <TableCell key={n.name} className={`text-center ${isLowest ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                              {n.unemploymentRate}%
                              {isLowest && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Lowest</Badge>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
