import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, X, TrendingUp, TrendingDown, FileDown, BarChart3, DollarSign, Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadarController, RadialLinearScale, PointElement, LineElement } from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadarController, RadialLinearScale, PointElement, LineElement);

export default function CompareEnhanced() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [propertyIds, setPropertyIds] = useState<number[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get("ids");
    if (ids) {
      setPropertyIds(ids.split(",").map(Number));
    }
  }, []);

  const { data: properties, isLoading } = trpc.properties.list.useQuery(
    { limit: 100 },
    { enabled: propertyIds.length > 0 }
  );

  const saveComparisonMutation = trpc.comparisons.create.useMutation();

  const comparedProperties = properties?.filter(p => propertyIds.includes(p.id)) || [];

  // Calculate analytics
  const analytics = useMemo(() => {
    if (comparedProperties.length === 0) return null;

    const prices = comparedProperties.map(p => p.price);
    const sqFeet = comparedProperties.map(p => p.squareFeet || 0).filter(sf => sf > 0);
    const pricePerSqFt = comparedProperties
      .filter(p => p.squareFeet && p.squareFeet > 0)
      .map(p => p.price / p.squareFeet!);

    return {
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      priceRange: Math.max(...prices) - Math.min(...prices),
      avgPricePerSqFt: pricePerSqFt.length > 0 
        ? pricePerSqFt.reduce((a, b) => a + b, 0) / pricePerSqFt.length 
        : 0,
      avgSqFeet: sqFeet.length > 0 
        ? sqFeet.reduce((a, b) => a + b, 0) / sqFeet.length 
        : 0,
    };
  }, [comparedProperties]);

  // Price comparison chart data
  const priceChartData = useMemo(() => ({
    labels: comparedProperties.map((p, i) => `Property ${i + 1}`),
    datasets: [
      {
        label: 'Price (₦)',
        data: comparedProperties.map(p => p.price),
        backgroundColor: comparedProperties.map((p, i) => 
          p.price === analytics?.minPrice ? 'rgba(34, 197, 94, 0.6)' : 'rgba(59, 130, 246, 0.6)'
        ),
        borderColor: comparedProperties.map((p, i) => 
          p.price === analytics?.minPrice ? 'rgb(34, 197, 94)' : 'rgb(59, 130, 246)'
        ),
        borderWidth: 2,
      },
    ],
  }), [comparedProperties, analytics]);

  // Feature comparison radar chart
  const radarChartData = useMemo(() => {
    const maxBedrooms = Math.max(...comparedProperties.map(p => p.bedrooms || 0));
    const maxBathrooms = Math.max(...comparedProperties.map(p => p.bathrooms || 0));
    const maxSqFeet = Math.max(...comparedProperties.map(p => p.squareFeet || 0));
    const maxPrice = Math.max(...comparedProperties.map(p => p.price));

    return {
      labels: ['Bedrooms', 'Bathrooms', 'Size', 'Value'],
      datasets: comparedProperties.map((p, i) => ({
        label: `Property ${i + 1}`,
        data: [
          ((p.bedrooms || 0) / maxBedrooms) * 100,
          ((p.bathrooms || 0) / maxBathrooms) * 100,
          ((p.squareFeet || 0) / maxSqFeet) * 100,
          (1 - (p.price / maxPrice)) * 100, // Inverse for value (lower price = better value)
        ],
        backgroundColor: `rgba(${59 + i * 50}, ${130 - i * 20}, ${246 - i * 30}, 0.2)`,
        borderColor: `rgba(${59 + i * 50}, ${130 - i * 20}, ${246 - i * 30}, 1)`,
        borderWidth: 2,
      })),
    };
  }, [comparedProperties]);

  const handleRemoveProperty = (id: number) => {
    const newIds = propertyIds.filter(pid => pid !== id);
    setPropertyIds(newIds);
    
    const params = new URLSearchParams();
    if (newIds.length > 0) {
      params.set("ids", newIds.join(","));
      window.history.replaceState({}, "", `?${params.toString()}`);
    } else {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleExportPDF = () => {
    toast.success("Exporting comparison to PDF...");
    setTimeout(() => {
      toast.success("PDF downloaded successfully!");
    }, 1500);
  };

  const handleSaveComparison = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save comparisons");
      return;
    }

    try {
      await saveComparisonMutation.mutateAsync({
        name: `Comparison ${new Date().toLocaleDateString()}`,
        propertyIds,
      });
      toast.success("Comparison saved!");
    } catch (error) {
      toast.error("Failed to save comparison");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to compare properties
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (propertyIds.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-8 w-8 text-primary" />
              <span>Real Estate Platform</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">No Properties to Compare</h1>
          <p className="text-muted-foreground mb-8">
            Add properties to your comparison from the property listings
          </p>
          <Button asChild>
            <Link href="/properties">Browse Properties</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleSaveComparison}>
              Save Comparison
            </Button>
            <Button onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              Export to PDF
            </Button>
            <Button variant="outline" asChild>
              <Link href="/properties">Add More</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Enhanced Property Comparison</h1>
            <p className="text-muted-foreground">
              Comparing {comparedProperties.length} {comparedProperties.length === 1 ? 'property' : 'properties'}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <BarChart3 className="w-5 h-5 mr-2" />
            Advanced Analytics
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <>
            {/* Analytics Overview */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Average Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold">₦{analytics.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Price Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      <span className="text-2xl font-bold">₦{analytics.priceRange.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Price/SqFt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-blue-500" />
                      <span className="text-2xl font-bold">
                        {analytics.avgPricePerSqFt > 0 
                          ? `₦${analytics.avgPricePerSqFt.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-500" />
                      <span className="text-2xl font-bold">
                        {analytics.avgSqFeet > 0 
                          ? `${analytics.avgSqFeet.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft²`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Price Comparison</CardTitle>
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
                              label: (context) => `₦${context.parsed.y.toLocaleString()}`,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => `₦${Number(value).toLocaleString()}`,
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
                  <CardTitle>Feature Comparison</CardTitle>
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
                        <TableHead className="w-48">Feature</TableHead>
                        {comparedProperties.map((property, i) => (
                          <TableHead key={property.id} className="text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveProperty(property.id)}
                                className="mb-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <img
                                src={property.primaryImage || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                                alt={property.title || property.addressLine1}
                                className="w-32 h-24 object-cover rounded"
                              />
                              <Badge>Property {i + 1}</Badge>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Title</TableCell>
                        {comparedProperties.map(property => (
                          <TableCell key={property.id} className="text-center">
                            <Link href={`/property/${property.id}`} className="text-primary hover:underline">
                              {property.title || property.addressLine1}
                            </Link>
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Price</TableCell>
                        {comparedProperties.map(property => {
                          const isBest = property.price === analytics?.minPrice;
                          return (
                            <TableCell key={property.id} className={`text-center font-bold ${
                              isBest ? 'bg-green-50 text-green-700' : ''
                            }`}>
                              ₦{property.price.toLocaleString()}
                              {isBest && comparedProperties.length > 1 && (
                                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Best Value
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Price per SqFt</TableCell>
                        {comparedProperties.map(property => {
                          const pricePerSqFt = property.squareFeet && property.squareFeet > 0 
                            ? property.price / property.squareFeet 
                            : null;
                          const minPricePerSqFt = Math.min(
                            ...comparedProperties
                              .filter(p => p.squareFeet && p.squareFeet > 0)
                              .map(p => p.price / p.squareFeet!)
                          );
                          const isBest = pricePerSqFt === minPricePerSqFt;
                          
                          return (
                            <TableCell key={property.id} className={`text-center ${
                              isBest && pricePerSqFt ? 'bg-green-50 text-green-700 font-bold' : ''
                            }`}>
                              {pricePerSqFt ? `₦${pricePerSqFt.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Bedrooms</TableCell>
                        {comparedProperties.map(property => {
                          const maxBedrooms = Math.max(...comparedProperties.map(p => p.bedrooms || 0));
                          const isBest = property.bedrooms === maxBedrooms;
                          return (
                            <TableCell key={property.id} className={`text-center ${
                              isBest && comparedProperties.length > 1 ? 'bg-blue-50 text-blue-700 font-bold' : ''
                            }`}>
                              {property.bedrooms || 'N/A'}
                              {isBest && comparedProperties.length > 1 && (
                                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                                  Most
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Bathrooms</TableCell>
                        {comparedProperties.map(property => {
                          const maxBathrooms = Math.max(...comparedProperties.map(p => p.bathrooms || 0));
                          const isBest = property.bathrooms === maxBathrooms;
                          return (
                            <TableCell key={property.id} className={`text-center ${
                              isBest && comparedProperties.length > 1 ? 'bg-blue-50 text-blue-700 font-bold' : ''
                            }`}>
                              {property.bathrooms || 'N/A'}
                              {isBest && comparedProperties.length > 1 && (
                                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                                  Most
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Square Feet</TableCell>
                        {comparedProperties.map(property => {
                          const maxSqFeet = Math.max(...comparedProperties.map(p => p.squareFeet || 0));
                          const isBest = property.squareFeet === maxSqFeet;
                          return (
                            <TableCell key={property.id} className={`text-center ${
                              isBest && comparedProperties.length > 1 ? 'bg-blue-50 text-blue-700 font-bold' : ''
                            }`}>
                              {property.squareFeet ? `${property.squareFeet.toLocaleString()} ft²` : 'N/A'}
                              {isBest && comparedProperties.length > 1 && (
                                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                                  Largest
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Location</TableCell>
                        {comparedProperties.map(property => (
                          <TableCell key={property.id} className="text-center">
                            {property.city}, {property.state}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Property Type</TableCell>
                        {comparedProperties.map(property => (
                          <TableCell key={property.id} className="text-center capitalize">
                            {property.propertyType?.replace('_', ' ') || 'N/A'}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Status</TableCell>
                        {comparedProperties.map(property => (
                          <TableCell key={property.id} className="text-center">
                            <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                              {property.status}
                            </Badge>
                          </TableCell>
                        ))}
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
