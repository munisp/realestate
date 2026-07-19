// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ThumbsUp, ThumbsDown, TrendingUp, Home, MapPin, Bed } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default function FeedbackAnalytics() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const { data: satisfactionData, isLoading: loadingSatisfaction } = trpc.feedbackAnalytics.getSatisfactionRate.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: propertyTypes, isLoading: loadingTypes } = trpc.feedbackAnalytics.getMostLikedPropertyTypes.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: accuracyTrends, isLoading: loadingTrends } = trpc.feedbackAnalytics.getAccuracyTrends.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: preferences, isLoading: loadingPreferences } = trpc.feedbackAnalytics.getPropertyPreferences.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: recentFeedback, isLoading: loadingRecent } = trpc.feedbackAnalytics.getRecentFeedback.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  // Create accuracy trend chart
  useEffect(() => {
    if (!accuracyTrends || !chartRef.current) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: accuracyTrends.map((d) => {
          const date = new Date(d.date);
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }),
        datasets: [
          {
            label: "Recommendation Accuracy (%)",
            data: accuracyTrends.map((d) => d.accuracy),
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
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
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `Accuracy: ${context.parsed.y.toFixed(1)}%`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [accuracyTrends]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your feedback analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loadingSatisfaction || loadingTypes || loadingTrends || loadingPreferences || loadingRecent;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Feedback Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Insights from your property recommendation feedback
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/smart-recommendations">View Recommendations</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Satisfaction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{satisfactionData?.totalFeedback || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                Positive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{satisfactionData?.positiveFeedback || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                Negative
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{satisfactionData?.negativeFeedback || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Satisfaction Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{satisfactionData?.satisfactionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Accuracy Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendation Accuracy Trend</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <canvas ref={chartRef}></canvas>
              </div>
            </CardContent>
          </Card>

          {/* Most Liked Property Types */}
          <Card>
            <CardHeader>
              <CardTitle>Most Liked Property Types</CardTitle>
              <CardDescription>Based on your positive feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {propertyTypes && propertyTypes.length > 0 ? (
                <div className="space-y-4">
                  {propertyTypes.map((type, index) => (
                    <div key={type.propertyType} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium capitalize">{type.propertyType.replace("_", " ")}</div>
                          <div className="text-sm text-muted-foreground">{type.likeCount} likes</div>
                        </div>
                      </div>
                      <ThumbsUp className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ThumbsUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No feedback data yet</p>
                  <p className="text-sm">Start rating recommendations to see insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Property Preferences */}
        {preferences && preferences.totalLikedProperties > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Property Preferences</CardTitle>
              <CardDescription>Based on {preferences.totalLikedProperties} liked properties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
                    <Bed className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Average Bedrooms</div>
                    <div className="text-2xl font-bold">{preferences.averageBedrooms}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-600">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Average Bathrooms</div>
                    <div className="text-2xl font-bold">{preferences.averageBathrooms}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Average Price</div>
                    <div className="text-2xl font-bold">${(preferences.averagePrice / 1000).toFixed(0)}K</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 text-orange-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Top City</div>
                    <div className="text-xl font-bold">
                      {preferences.preferredCities[0]?.city || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {preferences.preferredPropertyTypes.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Preferred Property Types</div>
                  <div className="flex flex-wrap gap-2">
                    {preferences.preferredPropertyTypes.map((type) => (
                      <div
                        key={type.type}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                      >
                        {type.type.replace("_", " ")} ({type.count})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preferences.preferredCities.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Preferred Cities</div>
                  <div className="flex flex-wrap gap-2">
                    {preferences.preferredCities.map((city) => (
                      <div
                        key={city.city}
                        className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-600 text-sm font-medium"
                      >
                        {city.city} ({city.count})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Feedback */}
        {recentFeedback && recentFeedback.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>Your latest property ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      {feedback.rating === "up" ? (
                        <ThumbsUp className="h-5 w-5 text-green-600 mt-1" />
                      ) : (
                        <ThumbsDown className="h-5 w-5 text-red-600 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{feedback.propertyAddress}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {feedback.propertyCity} • {feedback.propertyType?.replace("_", " ")} • $
                          {feedback.propertyPrice?.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/property/${feedback.propertyId}`}>View Property</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {(!recentFeedback || recentFeedback.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <ThumbsUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start rating property recommendations to see detailed analytics and insights
              </p>
              <Button asChild>
                <Link href="/smart-recommendations">View Recommendations</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
