import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import {
  X,
  Plus,
  Home,
  Bed,
  Bath,
  Maximize,
  MapPin,
  DollarSign,
  TrendingUp,
  Calendar,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Share2, Download } from 'lucide-react';

export default function PropertyComparison() {
  const [, setLocation] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Get comparison data
  const { data: comparisonData, isLoading } = trpc.comparison.getPropertiesForComparison.useQuery(
    { propertyIds: selectedIds },
    { enabled: selectedIds.length > 0 }
  );

  const properties = comparisonData?.properties || [];

  const handleRemoveProperty = (id: number) => {
    setSelectedIds(selectedIds.filter((pid) => pid !== id));
    toast.success('Property removed from comparison');
  };

  const handleAddProperty = () => {
    if (selectedIds.length >= 4) {
      toast.error('Maximum 4 properties can be compared');
      return;
    }
    setLocation('/search?compare=true');
  };

  const saveComparisonMutation = trpc.comparison.saveComparison.useMutation({
    onSuccess: (data) => {
      navigator.clipboard.writeText(window.location.origin + data.shareUrl);
      toast.success('Comparison link copied to clipboard!');
    },
  });

  const handleShare = () => {
    if (selectedIds.length < 2) {
      toast.error('Please select at least 2 properties to share');
      return;
    }
    saveComparisonMutation.mutate({ propertyIds: selectedIds });
  };

  const handleExportPDF = () => {
    window.print();
  };

  const comparisonMetrics = [
    { key: 'price', label: 'Price', icon: DollarSign, format: (val: number, currency: string) => `${currency} ${val.toLocaleString()}` },
    { key: 'bedrooms', label: 'Bedrooms', icon: Bed, format: (val: number) => val },
    { key: 'bathrooms', label: 'Bathrooms', icon: Bath, format: (val: number) => val },
    { key: 'sqft', label: 'Square Feet', icon: Maximize, format: (val: number) => val.toLocaleString() },
    { key: 'yearBuilt', label: 'Year Built', icon: Calendar, format: (val: number) => val },
    { key: 'pricePerSqft', label: 'Price/sqft', icon: TrendingUp, format: (val: number, currency: string) => `${currency} ${val.toLocaleString()}` },
  ];

  const getBestValue = (key: string, properties: any[]) => {
    if (!properties || properties.length === 0) return null;
    
    if (key === 'price' || key === 'pricePerSqft') {
      return Math.min(...properties.map(p => p[key] || Infinity));
    } else if (key === 'sqft' || key === 'bedrooms' || key === 'bathrooms') {
      return Math.max(...properties.map(p => p[key] || 0));
    } else if (key === 'yearBuilt') {
      return Math.max(...properties.map(p => p[key] || 0));
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Property Comparison</h1>
              <p className="text-muted-foreground">
                Compare up to 4 properties side-by-side
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => setLocation('/search')}>
                Back to Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {selectedIds.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Properties Selected</h3>
              <p className="text-muted-foreground mb-6">
                Add properties from search results to compare them side-by-side
              </p>
              <Button onClick={() => setLocation('/search')}>
                <Plus className="w-4 h-4 mr-2" />
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Property Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {properties?.map((property) => (
                <Card key={property.id} className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => handleRemoveProperty(property.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>

                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {property.images?.[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Home className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute bottom-2 left-2">
                      {property.status}
                    </Badge>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-base line-clamp-2">
                      {property.title}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{property.city}, {property.state}</span>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {/* Add Property Slot */}
              {selectedIds.length < 4 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px]">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleAddProperty}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Property
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      {4 - selectedIds.length} slots remaining
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Feature</th>
                        {properties?.map((property) => (
                          <th key={property.id} className="text-center p-3 font-medium w-1/4">
                            Property {property.id}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonMetrics.map((metric) => {
                        const bestValue = getBestValue(metric.key, properties || []);
                        
                        return (
                          <tr key={metric.key} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <metric.icon className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{metric.label}</span>
                              </div>
                            </td>
                            {properties?.map((property) => {
                              const value = property[metric.key];
                              const isBest = value === bestValue && bestValue !== null;
                              
                              return (
                                <td key={property.id} className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {isBest && (
                                      <Check className="w-4 h-4 text-green-600" />
                                    )}
                                    <span className={isBest ? 'font-semibold text-green-600' : ''}>
                                      {metric.format(value, property.currency || 'USD')}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Property Type */}
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Property Type</span>
                          </div>
                        </td>
                        {properties?.map((property) => (
                          <td key={property.id} className="p-3 text-center capitalize">
                            {property.propertyType}
                          </td>
                        ))}
                      </tr>

                      {/* Parking */}
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Parking Spaces</span>
                          </div>
                        </td>
                        {properties?.map((property) => (
                          <td key={property.id} className="p-3 text-center">
                            {property.parking || 'N/A'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Neighborhood Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Neighborhood Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {properties?.map((property) => (
                    <div key={property.id} className="space-y-3">
                      <h4 className="font-semibold">{property.city}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg. Price</span>
                          <span className="font-medium">
                            {property.currency} {property.neighborhoodAvgPrice?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Properties</span>
                          <span className="font-medium">
                            {property.neighborhoodPropertyCount || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Walk Score</span>
                          <span className="font-medium">
                            {property.walkScore || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cost Analysis Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {properties?.map((property) => (
                    <CostAnalysisWidget key={property.id} propertyId={property.id} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button onClick={() => setLocation('/search')}>
                Add More Properties
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// Cost Analysis Widget Component
function CostAnalysisWidget({ propertyId }: { propertyId: number }) {
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);

  const { data: analysis } = trpc.comparison.calculateCostAnalysis.useQuery({
    propertyId,
    downPaymentPercent: downPayment,
    interestRate,
  });

  if (!analysis) {
    return <div className="animate-pulse h-64 bg-muted rounded" />;
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Down Payment (%)</label>
        <input
          type="number"
          value={downPayment}
          onChange={(e) => setDownPayment(Number(e.target.value))}
          className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Interest Rate (%)</label>
        <input
          type="number"
          step="0.1"
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
          className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div className="pt-3 border-t space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Down Payment</span>
          <span className="font-medium">${analysis.downPayment.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Loan Amount</span>
          <span className="font-medium">${analysis.loanAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monthly Mortgage</span>
          <span className="font-medium">
            ${analysis.monthlyMortgage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Property Tax</span>
          <span className="font-medium">
            ${analysis.monthlyPropertyTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Insurance</span>
          <span className="font-medium">
            ${analysis.monthlyInsurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="font-medium">Total Monthly</span>
          <span className="font-bold text-primary">
            ${analysis.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}
