import { useState } from 'react';
import {
  LagosNeighborhoodProperties,
  formatPriceMillions,
  getPriceColor,
} from '@/components/NeighborhoodOverlay';
import {
  calculateWalkabilityScore,
  getWalkabilityColor,
} from '@/services/walkabilityScore';
import { getSchoolsNearLocation } from '@/data/lagosSchools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Home,
  DollarSign,
  TrendingUp,
  Users,
  School,
  Navigation,
  Building2,
  X,
  Download,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

interface NeighborhoodComparisonProps {
  neighborhoods: Array<{ properties: LagosNeighborhoodProperties }>; // Available neighborhoods
  initialNeighborhoods?: string[]; // neighborhood IDs
  maxComparisons?: number;
}

export default function NeighborhoodComparison({
  neighborhoods,
  initialNeighborhoods = [],
  maxComparisons = 3,
}: NeighborhoodComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialNeighborhoods);
  const availableNeighborhoods = neighborhoods;

  const selectedNeighborhoods = selectedIds
    .map((id) => availableNeighborhoods.find((n) => n.properties.id === id))
    .filter(Boolean) as Array<{ properties: LagosNeighborhoodProperties }>;

  const addNeighborhood = (id: string) => {
    if (selectedIds.length >= maxComparisons) {
      toast.error(`Maximum ${maxComparisons} neighborhoods can be compared`);
      return;
    }
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeNeighborhood = (id: string) => {
    setSelectedIds(selectedIds.filter((nid) => nid !== id));
  };

  const exportComparison = () => {
    // Generate CSV data
    const headers = ['Metric', ...selectedNeighborhoods.map((n) => n.properties.name)];
    const rows = [
      ['Median Price', ...selectedNeighborhoods.map((n) => formatPriceMillions(n.properties.medianPrice))],
      ['Property Count', ...selectedNeighborhoods.map((n) => n.properties.propertyCount.toString())],
      ['Price Growth', ...selectedNeighborhoods.map((n) => `${n.properties.priceGrowth}%`)],
      ['Tier', ...selectedNeighborhoods.map((n) => n.properties.tier)],
      ['Zone', ...selectedNeighborhoods.map((n) => n.properties.zone)],
    ];

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neighborhood-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Comparison exported!');
  };

  const shareComparison = () => {
    const url = `${window.location.origin}/neighborhoods?compare=${selectedIds.join(',')}`;
    navigator.clipboard.writeText(url);
    toast.success('Comparison link copied to clipboard!');
  };

  if (selectedNeighborhoods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Neighborhood Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Select neighborhoods to compare side-by-side
            </p>
            <Select onValueChange={addNeighborhood}>
              <SelectTrigger className="w-full max-w-sm mx-auto">
                <SelectValue placeholder="Select a neighborhood" />
              </SelectTrigger>
              <SelectContent>
                {availableNeighborhoods.map((n) => (
                  <SelectItem key={n.properties.id} value={n.properties.id}>
                    {n.properties.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Neighborhood Comparison
              <Badge variant="secondary">
                {selectedNeighborhoods.length}/{maxComparisons}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportComparison}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={shareComparison}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {selectedNeighborhoods.map((n) => (
              <Badge key={n.properties.id} variant="secondary" className="px-3 py-1">
                {n.properties.name}
                <button
                  onClick={() => removeNeighborhood(n.properties.id)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedNeighborhoods.length < maxComparisons && (
              <Select onValueChange={addNeighborhood}>
                <SelectTrigger className="w-[180px] h-7">
                  <SelectValue placeholder="+ Add neighborhood" />
                </SelectTrigger>
                <SelectContent>
                  {availableNeighborhoods
                    .filter((n) => !selectedIds.includes(n.properties.id))
                    .map((n) => (
                      <SelectItem key={n.properties.id} value={n.properties.id}>
                        {n.properties.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview & Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Metric</TableHead>
                {selectedNeighborhoods.map((n) => (
                  <TableHead key={n.properties.id} className="text-center">
                    {n.properties.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Median Price
                  </div>
                </TableCell>
                {selectedNeighborhoods.map((n) => (
                  <TableCell key={n.properties.id} className="text-center">
                    <span
                      className="font-bold"
                      style={{ color: getPriceColor(n.properties.medianPrice) }}
                    >
                      {formatPriceMillions(n.properties.medianPrice)}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Price Growth (YoY)
                  </div>
                </TableCell>
                {selectedNeighborhoods.map((n) => (
                  <TableCell key={n.properties.id} className="text-center">
                    <Badge
                      variant={n.properties.priceGrowth > 0 ? 'default' : 'secondary'}
                    >
                      {n.properties.priceGrowth > 0 ? '+' : ''}
                      {n.properties.priceGrowth}%
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    Property Count
                  </div>
                </TableCell>
                {selectedNeighborhoods.map((n) => (
                  <TableCell key={n.properties.id} className="text-center">
                    {n.properties.propertyCount.toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Classification</TableCell>
                {selectedNeighborhoods.map((n) => (
                  <TableCell key={n.properties.id} className="text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <Badge className="capitalize">{n.properties.tier}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {n.properties.zone}
                      </Badge>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Walkability Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Walkability Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Category</TableHead>
                {selectedNeighborhoods.map((n) => (
                  <TableHead key={n.properties.id} className="text-center">
                    {n.properties.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedNeighborhoods.map((n, index) => {
                const walkability = calculateWalkabilityScore(n.properties.id);
                if (index === 0) {
                  return (
                    <>
                      <TableRow key={`overall-${n.properties.id}`}>
                        <TableCell className="font-medium">Overall Score</TableCell>
                        {selectedNeighborhoods.map((neighborhood) => {
                          const score = calculateWalkabilityScore(neighborhood.properties.id);
                          return (
                            <TableCell key={neighborhood.properties.id} className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className="text-2xl font-bold"
                                  style={{ color: getWalkabilityColor(score.overall) }}
                                >
                                  {score.overall}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {score.label}
                                </span>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Amenities</TableCell>
                        {selectedNeighborhoods.map((neighborhood) => {
                          const score = calculateWalkabilityScore(neighborhood.properties.id);
                          return (
                            <TableCell key={neighborhood.properties.id}>
                              <Progress value={score.breakdown.amenities} className="h-2" />
                              <span className="text-xs text-muted-foreground">
                                {score.breakdown.amenities}/100
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Transit</TableCell>
                        {selectedNeighborhoods.map((neighborhood) => {
                          const score = calculateWalkabilityScore(neighborhood.properties.id);
                          return (
                            <TableCell key={neighborhood.properties.id}>
                              <Progress value={score.breakdown.transit} className="h-2" />
                              <span className="text-xs text-muted-foreground">
                                {score.breakdown.transit}/100
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Safety</TableCell>
                        {selectedNeighborhoods.map((neighborhood) => {
                          const score = calculateWalkabilityScore(neighborhood.properties.id);
                          return (
                            <TableCell key={neighborhood.properties.id}>
                              <Progress value={score.breakdown.safety} className="h-2" />
                              <span className="text-xs text-muted-foreground">
                                {score.breakdown.safety}/100
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </>
                  );
                }
                return null;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schools Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <School className="h-4 w-4" />
            School Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Metric</TableHead>
                {selectedNeighborhoods.map((n) => (
                  <TableHead key={n.properties.id} className="text-center">
                    {n.properties.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Schools Within 5km</TableCell>
                {selectedNeighborhoods.map((n) => {
                  // Get approximate center of neighborhood
                  const schools = getSchoolsNearLocation(
                    { lat: 6.5244, lng: 3.3792 }, // Placeholder, would need actual neighborhood center
                    5000
                  );
                  return (
                    <TableCell key={n.properties.id} className="text-center">
                      {n.properties.schools.length}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Top Rated Schools</TableCell>
                {selectedNeighborhoods.map((n) => (
                  <TableCell key={n.properties.id} className="text-center">
                    <div className="flex flex-col gap-1">
                      {n.properties.schools.slice(0, 2).map((school, i) => (
                        <div key={i} className="text-xs">
                          {school.name} ({school.rating}/10)
                        </div>
                      ))}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
