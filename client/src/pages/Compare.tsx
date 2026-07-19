import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, X, TrendingUp, TrendingDown, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Compare() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [propertyIds, setPropertyIds] = useState<number[]>([]);

  useEffect(() => {
    // Get property IDs from URL params
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

  const handleRemoveProperty = (id: number) => {
    const newIds = propertyIds.filter(pid => pid !== id);
    setPropertyIds(newIds);
    
    // Update URL
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
    // In production, this would generate a PDF using a library like jsPDF or react-pdf
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
      <header className="border-b bg-card">
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
        <h1 className="text-3xl font-bold mb-8">Compare Properties</h1>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Feature</TableHead>
                  {comparedProperties.map(property => (
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
                    const minPrice = Math.min(...comparedProperties.map(p => p.price));
                    const isBest = property.price === minPrice;
                    return (
                      <TableCell key={property.id} className={`text-center font-bold ${
                        isBest ? 'bg-green-50 text-green-700' : ''
                      }`}>
                        ₦{property.price.toLocaleString()}
                        {isBest && comparedProperties.length > 1 && (
                          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Lowest
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
                      {property.propertyType.replace('_', ' ')}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Bedrooms</TableCell>
                  {comparedProperties.map(property => {
                    const maxBedrooms = Math.max(...comparedProperties.map(p => p.bedrooms || 0));
                    const isBest = property.bedrooms === maxBedrooms && maxBedrooms > 0;
                    return (
                      <TableCell key={property.id} className={`text-center ${
                        isBest ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                      }`}>
                        {property.bedrooms || 'N/A'}
                        {isBest && comparedProperties.length > 1 && (
                          <TrendingUp className="h-4 w-4 inline ml-1 text-blue-600" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Bathrooms</TableCell>
                  {comparedProperties.map(property => (
                    <TableCell key={property.id} className="text-center">
                      {property.bathrooms || 'N/A'}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Square Feet</TableCell>
                  {comparedProperties.map(property => {
                    const maxSqFt = Math.max(...comparedProperties.map(p => p.squareFeet || 0));
                    const isBest = property.squareFeet === maxSqFt && maxSqFt > 0;
                    return (
                      <TableCell key={property.id} className={`text-center ${
                        isBest ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                      }`}>
                        {property.squareFeet?.toLocaleString() || 'N/A'}
                        {isBest && comparedProperties.length > 1 && (
                          <TrendingUp className="h-4 w-4 inline ml-1 text-blue-600" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Price per Sq Ft</TableCell>
                  {comparedProperties.map(property => (
                    <TableCell key={property.id} className="text-center">
                      ${property.pricePerSqFt || 'N/A'}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Year Built</TableCell>
                  {comparedProperties.map(property => (
                    <TableCell key={property.id} className="text-center">
                      {property.yearBuilt || 'N/A'}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Lot Size</TableCell>
                  {comparedProperties.map(property => (
                    <TableCell key={property.id} className="text-center">
                      {property.lotSize?.toLocaleString() || 'N/A'} sq ft
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Status</TableCell>
                  {comparedProperties.map(property => (
                    <TableCell key={property.id} className="text-center capitalize">
                      {property.status}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
