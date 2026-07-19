// @ts-nocheck
import { useState, useEffect } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { 
  Search, 
  Eye, 
  TrendingDown, 
  Calendar, 
  FileText, 
  Calculator, 
  TrendingUp,
  Settings,
  GripVertical
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget Components
function SavedSearchesWidget() {
  const { data: searches, isLoading } = trpc.mapSearch.getSavedSearches.useQuery();

  if (isLoading) {
    return <div className="animate-pulse h-full bg-muted rounded" />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Saved Searches</h3>
        </div>
        <Badge variant="secondary">{searches?.length || 0}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {searches && searches.length > 0 ? (
          searches.slice(0, 3).map((search) => (
            <div key={search.id} className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <div className="font-medium text-sm">{search.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {search.boundaryType !== 'none' ? `${search.boundaryType} boundary` : 'No boundary'}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            No saved searches yet
          </div>
        )}
      </div>
      <Link href="/saved-searches">
        <Button variant="outline" size="sm" className="w-full mt-2">
          View All
        </Button>
      </Link>
    </div>
  );
}

function RecentlyViewedWidget() {
  const { data: recentViews } = trpc.properties.getRecentlyViewed.useQuery(
    { limit: 3 },
    { enabled: true }
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recently Viewed</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {recentViews && recentViews.length > 0 ? (
          recentViews.map((property: any) => (
            <Link key={property.id} href={`/property/${property.id}`}>
              <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <div className="font-medium text-sm line-clamp-1">{property.addressLine1}</div>
                <div className="text-primary font-bold text-sm mt-1">
                  ${property.price?.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {property.bedrooms} bed • {property.bathrooms} bath
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            No properties viewed yet
          </div>
        )}
      </div>
      <Link href="/properties">
        <Button variant="outline" size="sm" className="w-full mt-2">
          Browse Properties
        </Button>
      </Link>
    </div>
  );
}

function PriceAlertsWidget() {
  const { data: alerts } = trpc.alerts.getMyAlerts.useQuery();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Price Alerts</h3>
        </div>
        <Badge variant="secondary">{alerts?.length || 0}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {alerts && alerts.length > 0 ? (
          alerts.slice(0, 3).map((alert: any) => (
            <div key={alert.id} className="p-3 border rounded-lg">
              <div className="font-medium text-sm line-clamp-1">{alert.alertName}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {alert.frequency} updates • {alert.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            No active alerts
          </div>
        )}
      </div>
      <Link href="/alerts">
        <Button variant="outline" size="sm" className="w-full mt-2">
          Manage Alerts
        </Button>
      </Link>
    </div>
  );
}

function TourScheduleWidget() {
  const { data: tours } = trpc.tours.getMyTours.useQuery();

  const upcomingTours = tours?.filter(
    (t: any) => t.status === 'pending' || t.status === 'confirmed'
  ) || [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Upcoming Tours</h3>
        </div>
        <Badge variant="secondary">{upcomingTours.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {upcomingTours.length > 0 ? (
          upcomingTours.slice(0, 3).map((tour: any) => (
            <div key={tour.id} className="p-3 border rounded-lg">
              <div className="font-medium text-sm line-clamp-1">
                {tour.property?.addressLine1}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(tour.appointmentDate).toLocaleDateString()} •{' '}
                {new Date(tour.appointmentDate).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <Badge variant="outline" className="mt-2 text-xs">
                {tour.tourType === 'in_person' ? 'In-Person' : 'Virtual'}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            No upcoming tours
          </div>
        )}
      </div>
      <Link href="/my-tours">
        <Button variant="outline" size="sm" className="w-full mt-2">
          View All Tours
        </Button>
      </Link>
    </div>
  );
}

function OffersTrackerWidget() {
  const { data: offers } = trpc.offers.getMyOffers.useQuery();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">My Offers</h3>
        </div>
        <Badge variant="secondary">{offers?.length || 0}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {offers && offers.length > 0 ? (
          offers.slice(0, 3).map((offer: any) => (
            <div key={offer.id} className="p-3 border rounded-lg">
              <div className="font-medium text-sm line-clamp-1">
                {offer.property?.addressLine1}
              </div>
              <div className="text-primary font-bold text-sm mt-1">
                ${offer.offerAmount?.toLocaleString()}
              </div>
              <Badge
                variant={
                  offer.status === 'accepted'
                    ? 'default'
                    : offer.status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
                className="mt-2 text-xs"
              >
                {offer.status}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            No offers submitted
          </div>
        )}
      </div>
      <Link href="/offers">
        <Button variant="outline" size="sm" className="w-full mt-2">
          View All Offers
        </Button>
      </Link>
    </div>
  );
}

function MortgageCalculatorWidget() {
  const [price, setPrice] = useState(500000);
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);

  const calculateMonthlyPayment = () => {
    const principal = price * (1 - downPayment / 100);
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    const monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    return monthlyPayment;
  };

  const monthlyPayment = calculateMonthlyPayment();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Mortgage Calculator</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div>
          <label className="text-xs text-muted-foreground">Home Price</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
          />
        </div>
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
        <div>
          <label className="text-xs text-muted-foreground">Loan Term (years)</label>
          <input
            type="number"
            value={loanTerm}
            onChange={(e) => setLoanTerm(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">Monthly Payment</div>
          <div className="text-2xl font-bold text-primary">
            ${monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketTrendsWidget() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Market Trends</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="p-3 border rounded-lg">
          <div className="text-xs text-muted-foreground">Avg. Home Price</div>
          <div className="text-xl font-bold">$485,000</div>
          <div className="text-xs text-green-600 mt-1">↑ 3.2% from last month</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-xs text-muted-foreground">Days on Market</div>
          <div className="text-xl font-bold">28 days</div>
          <div className="text-xs text-red-600 mt-1">↓ 5 days from last month</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-xs text-muted-foreground">Inventory</div>
          <div className="text-xl font-bold">1,234 homes</div>
          <div className="text-xs text-green-600 mt-1">↑ 8% from last month</div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-2">
        View Full Report
      </Button>
    </div>
  );
}

// Main Dashboard Component
export default function BuyerDashboardCustomizable() {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({
    lg: [
      { i: 'saved-searches', x: 0, y: 0, w: 4, h: 2 },
      { i: 'recent-views', x: 4, y: 0, w: 4, h: 2 },
      { i: 'price-alerts', x: 8, y: 0, w: 4, h: 2 },
      { i: 'tour-schedule', x: 0, y: 2, w: 4, h: 2 },
      { i: 'offers-tracker', x: 4, y: 2, w: 4, h: 2 },
      { i: 'mortgage-calc', x: 8, y: 2, w: 4, h: 2 },
      { i: 'market-trends', x: 0, y: 4, w: 6, h: 2 },
    ],
  });

  const [isEditMode, setIsEditMode] = useState(false);

  const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    if (isEditMode) {
      setLayouts(layouts);
      // Save to localStorage
      localStorage.setItem('buyerDashboardLayout', JSON.stringify(layouts));
    }
  };

  useEffect(() => {
    // Load saved layout from localStorage
    const saved = localStorage.getItem('buyerDashboardLayout');
    if (saved) {
      try {
        setLayouts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved layout:', e);
      }
    }
  }, []);

  const resetLayout = () => {
    const defaultLayouts = {
      lg: [
        { i: 'saved-searches', x: 0, y: 0, w: 4, h: 2 },
        { i: 'recent-views', x: 4, y: 0, w: 4, h: 2 },
        { i: 'price-alerts', x: 8, y: 0, w: 4, h: 2 },
        { i: 'tour-schedule', x: 0, y: 2, w: 4, h: 2 },
        { i: 'offers-tracker', x: 4, y: 2, w: 4, h: 2 },
        { i: 'mortgage-calc', x: 8, y: 2, w: 4, h: 2 },
        { i: 'market-trends', x: 0, y: 4, w: 6, h: 2 },
      ],
    };
    setLayouts(defaultLayouts);
    localStorage.setItem('buyerDashboardLayout', JSON.stringify(defaultLayouts));
    toast.success('Layout reset to default');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Your personalized home buying command center
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <Button variant="outline" size="sm" onClick={resetLayout}>
                Reset Layout
              </Button>
            )}
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isEditMode ? 'Done Editing' : 'Customize'}
            </Button>
          </div>
        </div>

        {isEditMode && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary rounded-lg">
            <p className="text-sm">
              <strong>Edit Mode:</strong> Drag widgets to rearrange, resize by dragging corners.
              Click "Done Editing" to save your layout.
            </p>
          </div>
        )}

        {/* Grid Layout */}
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={150}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
        >
          <div key="saved-searches">
            <Card className="h-full">
              <CardContent className="p-4 h-full relative">
                {isEditMode && (
                  <div className="drag-handle absolute top-2 right-2 cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <SavedSearchesWidget />
              </CardContent>
            </Card>
          </div>

          <div key="recent-views">
            <Card className="h-full">
              <CardContent className="p-4 h-full relative">
                {isEditMode && (
                  <div className="drag-handle absolute top-2 right-2 cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <RecentlyViewedWidget />
              </CardContent>
            </Card>
          </div>

          <div key="price-alerts">
            <Card className="h-full">
              <CardContent className="p-4 h-full relative">
                {isEditMode && (
                  <div className="drag-handle absolute top-2 right-2 cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <PriceAlertsWidget />
              </CardContent>
            </Card>
          </div>

          <div key="tour-schedule">
            <Card className="h-full">
              <CardContent className="p-4 h-full relative">
                {isEditMode && (
                  <div className="drag-handle absolute top-2 right-2 cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <TourScheduleWidget />
              </CardContent>
            </Card>
          </div>

          <div key="offers-tracker">
            <Card className="h-full">
              <CardContent className="p-4 h-full relative">
                {isEditMode && (
                  <div className="drag-handle absolute top-2 right-2 cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <OffersTrackerWidget />
              </CardContent>
            </Card>
          </div>

          <div key="mortgage-calc">
            <Card className="h-full">
              <CardContent className="p-4 h-full relative">
                {isEditMode && (
                  <div className="drag-handle absolute top-2 right-2 cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <MortgageCalculatorWidget />
              </CardContent>
            </Card>
          </div>

          <div key="market-trends">
            <Card className="h-full">
              <CardContent className="p-4 h-full relative">
                {isEditMode && (
                  <div className="drag-handle absolute top-2 right-2 cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <MarketTrendsWidget />
              </CardContent>
            </Card>
          </div>
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
