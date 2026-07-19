import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, BarChart3, DollarSign, Clock } from "lucide-react";

export default function OfferAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller">("buyer");

  const { data: metrics, isLoading: loadingMetrics } = trpc.offerAnalytics.getUserMetrics.useQuery(
    { role: selectedRole },
    { enabled: !!user }
  );

  // Get market trends for the last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: marketTrends, isLoading: loadingTrends } = trpc.offerAnalytics.getMarketTrends.useQuery({
    startDate: threeMonthsAgo.toISOString(),
    endDate: new Date().toISOString(),
    groupBy: "week",
  });

  if (authLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please log in to view offer analytics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Offer Analytics & Insights</h1>
        <p className="text-muted-foreground">
          Data-driven insights to help you make better offer decisions
        </p>
      </div>

      {/* Role Selector */}
      <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as "buyer" | "seller")} className="mb-8">
        <TabsList>
          <TabsTrigger value="buyer">As Buyer</TabsTrigger>
          <TabsTrigger value="seller">As Seller</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Metrics Cards */}
      {loadingMetrics ? (
        <div className="text-center py-12">Loading metrics...</div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalOffers}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.pendingOffers} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.acceptanceRate)}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.acceptedOffers} of {metrics.totalOffers} accepted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Offer Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.averageOfferAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Across all offers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time to Accept</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.averageTimeToAcceptance.toFixed(1)} days</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.averageNegotiationCycle.toFixed(1)} avg negotiation cycles
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Offer Status Breakdown</CardTitle>
                <CardDescription>Distribution of your offers by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Accepted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{metrics.acceptedOffers}</span>
                    <Badge variant="outline">{formatPercentage((metrics.acceptedOffers / metrics.totalOffers) * 100)}</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">Rejected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{metrics.rejectedOffers}</span>
                    <Badge variant="outline">{formatPercentage((metrics.rejectedOffers / metrics.totalOffers) * 100)}</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{metrics.pendingOffers}</span>
                    <Badge variant="outline">{formatPercentage((metrics.pendingOffers / metrics.totalOffers) * 100)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>Key metrics and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.acceptanceRate >= 75 ? (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Excellent Acceptance Rate</p>
                      <p className="text-sm text-muted-foreground">
                        Your offers are highly competitive and well-received
                      </p>
                    </div>
                  </div>
                ) : metrics.acceptanceRate >= 50 ? (
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Good Acceptance Rate</p>
                      <p className="text-sm text-muted-foreground">
                        Your offers are competitive with room for improvement
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Low Acceptance Rate</p>
                      <p className="text-sm text-muted-foreground">
                        Consider increasing offer amounts or improving terms
                      </p>
                    </div>
                  </div>
                )}

                {metrics.averageTimeToAcceptance <= 3 ? (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Fast Acceptance</p>
                      <p className="text-sm text-muted-foreground">
                        Your offers are typically accepted quickly
                      </p>
                    </div>
                  </div>
                ) : metrics.averageTimeToAcceptance <= 7 ? (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Moderate Negotiation Time</p>
                      <p className="text-sm text-muted-foreground">
                        Average time to acceptance is within normal range
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Extended Negotiation</p>
                      <p className="text-sm text-muted-foreground">
                        Consider stronger initial offers to reduce negotiation time
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              {selectedRole === "buyer" 
                ? "You haven't submitted any offers yet" 
                : "You haven't received any offers yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Market Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Market Trends</CardTitle>
          <CardDescription>Offer activity and acceptance rates over the last 3 months</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTrends ? (
            <div className="text-center py-12">Loading market trends...</div>
          ) : marketTrends && marketTrends.length > 0 ? (
            <div className="space-y-4">
              {marketTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{new Date(trend.period).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    <p className="text-sm text-muted-foreground">{trend.offerCount} offers</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(trend.averageOfferAmount)}</p>
                    <p className="text-sm text-muted-foreground">{formatPercentage(trend.acceptanceRate)} accepted</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No market trend data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
