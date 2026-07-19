// @ts-nocheck
/**
 * Offer Comparison Page
 * 
 * Allows sellers to compare multiple offers side-by-side with intelligent highlighting
 * and recommendation engine for optimal offer selection
 */

import { useState, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar, 
  DollarSign, 
  FileText, 
  Download,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Star
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function OfferComparison() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const propertyId = params.propertyId ? parseInt(params.propertyId) : undefined;

  const [selectedOffers, setSelectedOffers] = useState<number[]>([]);

  // Fetch offers for property
  const { data: offers, isLoading } = trpc.offers.list.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyId }
  );

  // Fetch offer analytics
  const { data: analytics } = trpc.offerAnalytics.getPropertyAnalytics.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyId }
  );

  // Calculate offer scores
  const offersWithScores = useMemo(() => {
    if (!offers || !analytics) return [];

    return offers.map((offer) => {
      let score = 0;
      const factors: string[] = [];

      // Price score (40% weight)
      const priceRatio = parseFloat(offer.offerAmount) / ((analytics as any).avgOfferAmount || 1);
      if (priceRatio >= 1.1) {
        score += 40;
        factors.push('Excellent price (+40)');
      } else if (priceRatio >= 1.0) {
        score += 30;
        factors.push('Good price (+30)');
      } else if (priceRatio >= 0.95) {
        score += 20;
        factors.push('Fair price (+20)');
      } else {
        score += 10;
        factors.push('Below average price (+10)');
      }

      // Down payment score (20% weight)
      const downPaymentPercent = (parseFloat(offer.downPayment) / parseFloat(offer.offerAmount)) * 100;
      if (downPaymentPercent >= 30) {
        score += 20;
        factors.push('Strong down payment (+20)');
      } else if (downPaymentPercent >= 20) {
        score += 15;
        factors.push('Good down payment (+15)');
      } else {
        score += 10;
        factors.push('Standard down payment (+10)');
      }

      // Closing timeline score (20% weight)
      const daysToClose = Math.floor((new Date(offer.closingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToClose <= 30) {
        score += 20;
        factors.push('Quick closing (+20)');
      } else if (daysToClose <= 45) {
        score += 15;
        factors.push('Standard closing (+15)');
      } else {
        score += 10;
        factors.push('Extended closing (+10)');
      }

      // Contingencies score (20% weight)
      const contingencies = offer.contingencies?.toLowerCase() || '';
      if (contingencies.includes('cash') || contingencies.includes('no contingencies')) {
        score += 20;
        factors.push('No contingencies (+20)');
      } else if (contingencies.includes('inspection only')) {
        score += 15;
        factors.push('Minimal contingencies (+15)');
      } else {
        score += 10;
        factors.push('Standard contingencies (+10)');
      }

      return {
        ...offer,
        score,
        factors,
        downPaymentPercent,
        daysToClose,
      };
    }).sort((a: any, b: any) => b.score - a.score);
  }, [offers, analytics]);

  // Find best values
  const bestOffer = offersWithScores[0];
  const highestPrice = offersWithScores.reduce((max: any, offer: any) => 
    parseFloat(offer.offerAmount) > parseFloat(max.offerAmount) ? offer : max
  , offersWithScores[0]);
  const quickestClose = offersWithScores.reduce((min: any, offer: any) => 
    offer.daysToClose < min.daysToClose ? offer : min
  , offersWithScores[0]);

  const handleToggleOffer = (offerId: number) => {
    setSelectedOffers(prev =>
      prev.includes(offerId)
        ? prev.filter((id: any) => id !== offerId)
        : [...prev, offerId]
    );
  };

  const handleExportPDF = () => {
    toast.success('Exporting comparison to PDF...');
    // PDF export logic would go here
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading (offers as any)...</div>
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Offers Yet</h3>
            <p className="text-muted-foreground">
              You haven't received any offers for this property yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayedOffers = selectedOffers.length > 0
    ? offersWithScores.filter((o: any) => selectedOffers.includes(o.id))
    : offersWithScores.slice(0, 4);

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compare Offers</h1>
          <p className="text-muted-foreground">
            Analyze and compare offers to make the best decision
          </p>
        </div>
        <Button onClick={handleExportPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Recommendation Card */}
      {bestOffer && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle>Recommended Offer</CardTitle>
            </div>
            <CardDescription>
              Based on our analysis, this offer provides the best overall value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Buyer</div>
                <div className="font-semibold">{bestOffer.buyerName || 'Anonymous'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Offer Amount</div>
                <div className="font-semibold text-lg">{bestOffer.offerAmount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-lg">{bestOffer.score}/100</div>
                  <Star className="h-4 w-4 fill-primary text-primary" />
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Closing Date</div>
                <div className="font-semibold">{new Date(bestOffer.closingDate).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Scoring Factors:</div>
              <div className="flex flex-wrap gap-2">
                {bestOffer.factors.map((factor, idx) => (
                  <Badge key={idx} variant="secondary">{factor}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Offers to Compare</CardTitle>
          <CardDescription>
            Choose up to 4 offers for side-by-side comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offersWithScores.map((offer) => (
              <div
                key={offer.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => handleToggleOffer(offer.id)}
              >
                <Checkbox
                  checked={selectedOffers.includes(offer.id)}
                  onCheckedChange={() => handleToggleOffer(offer.id)}
                />
                <div className="flex-1">
                  <div className="font-semibold">{offer.buyerName || 'Anonymous Buyer'}</div>
                  <div className="text-sm text-muted-foreground">{offer.offerAmount}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={offer.score >= 80 ? 'default' : offer.score >= 60 ? 'secondary' : 'outline'}>
                      Score: {offer.score}/100
                    </Badge>
                    {offer.id === bestOffer?.id && (
                      <Badge variant="default">
                        <Trophy className="h-3 w-3 mr-1" />
                        Best
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Side-by-Side Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Metric</th>
                  {displayedOffers.map((offer) => (
                    <th key={offer.id} className="text-left p-4 font-medium">
                      {offer.buyerName || 'Anonymous'}
                      {offer.id === bestOffer?.id && (
                        <Badge variant="default" className="ml-2">Best</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Offer Amount */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Offer Amount
                    </div>
                  </td>
                  {displayedOffers.map((offer) => (
                    <td key={offer.id} className="p-4">
                      <div className="font-semibold">{offer.offerAmount}</div>
                      {offer.id === highestPrice?.id && (
                        <Badge variant="default" className="mt-1">Highest</Badge>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Down Payment */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-4 font-medium">Down Payment</td>
                  {displayedOffers.map((offer) => (
                    <td key={offer.id} className="p-4">
                      <div>{offer.downPayment}</div>
                      <div className="text-sm text-muted-foreground">
                        {offer.downPaymentPercent.toFixed(1)}%
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Closing Date */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Closing Date
                    </div>
                  </td>
                  {displayedOffers.map((offer) => (
                    <td key={offer.id} className="p-4">
                      <div>{new Date(offer.closingDate).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {offer.daysToClose} days
                      </div>
                      {offer.id === quickestClose?.id && (
                        <Badge variant="default" className="mt-1">Quickest</Badge>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Contingencies */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Contingencies
                    </div>
                  </td>
                  {displayedOffers.map((offer) => (
                    <td key={offer.id} className="p-4">
                      <div className="text-sm">{offer.contingencies || 'Standard'}</div>
                    </td>
                  ))}
                </tr>

                {/* Overall Score */}
                <tr className="border-b hover:bg-muted/50 bg-muted/30">
                  <td className="p-4 font-bold">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Overall Score
                    </div>
                  </td>
                  {displayedOffers.map((offer) => (
                    <td key={offer.id} className="p-4">
                      <div className="text-xl font-bold">{offer.score}/100</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {offer.factors.map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {factor.split('(')[0].trim()}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={() => setLocation('/my-offers')} variant="outline">
          Back to All Offers
        </Button>
        <Button onClick={handleExportPDF}>
          <Download className="mr-2 h-4 w-4" />
          Export Comparison
        </Button>
      </div>
    </div>
  );
}
