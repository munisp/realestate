import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Sparkles, Heart, TrendingUp, MapPin, Bed, Bath, Maximize, ThumbsUp, ThumbsDown, Home, DollarSign, MapPinned } from "lucide-react";
import { RecommendationExplanation } from "@/components/RecommendationExplanation";
import { Link } from "wouter";
import { PriceDisplay } from "@/components/CurrencySelector";

export default function SmartRecommendations() {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = trpc.smartRecommendations.getPersonalizedRecommendations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const submitFeedbackMutation = trpc.recommendationFeedback.submitFeedback.useMutation();

  const { data: collaborativeRecs } = trpc.collaborativeFiltering.getCollaborativeRecommendations.useQuery(
    { limit: 6 },
    { enabled: isAuthenticated }
  );

  const handleFeedback = (propertyId: number, rating: "up" | "down") => {
    submitFeedbackMutation.mutate(
      { propertyId, rating },
      {
        onSuccess: () => {
          // Show success feedback
          console.log(`Feedback submitted: ${rating}`);
        },
      }
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view personalized property recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-8 w-8 text-primary" />
            <span>{APP_TITLE} - Smart Recommendations</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/properties" className="text-foreground hover:text-primary transition-colors">
              All Properties
            </Link>
            <Link href="/favorites" className="text-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Heart className="h-4 w-4" />
              Favorites
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Page Title */}
          <div className="flex items-center gap-3">
            <Sparkles className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Personalized for You</h1>
              <p className="text-muted-foreground mt-1">
                AI-powered recommendations based on your preferences and activity
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Analyzing your preferences...</p>
            </div>
          )}

          {/* Recommendations */}
          {!isLoading && data && data.recommendations.length > 0 && (
            <div className="space-y-6">
              {data.recommendations.map((rec, index) => {
                const property = rec.property;
                if (!property) return null;

                return (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="grid md:grid-cols-[300px_1fr] gap-6">
                      {/* Property Image */}
                      <div className="relative h-64 md:h-auto bg-muted">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                        <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {rec.matchScore}% Match
                        </Badge>
                      </div>

                      {/* Property Details */}
                      <div className="p-6 space-y-4">
                        {/* Title and Price */}
                        <div>
                          <Link href={`/property/${property.id}`}>
                            <h2 className="text-2xl font-bold hover:text-primary transition-colors">
                              {property.title}
                            </h2>
                          </Link>
                          <div className="flex items-center gap-2 mt-2">
                            <PriceDisplay amount={property.price} />
                            <Badge variant="outline">{property.propertyType}</Badge>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{property.address}, {property.city}, {property.state}</span>
                        </div>

                        {/* Features */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Bed className="h-4 w-4 text-muted-foreground" />
                            <span>{property.bedrooms} Beds</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bath className="h-4 w-4 text-muted-foreground" />
                            <span>{property.bathrooms} Baths</span>
                          </div>
                          {property.squareFeet && (
                            <div className="flex items-center gap-2">
                              <Maximize className="h-4 w-4 text-muted-foreground" />
                              <span>{property.squareFeet.toLocaleString()} sq ft</span>
                            </div>
                          )}
                        </div>

                        {/* AI Recommendation Explanation */}
                        <RecommendationExplanation
                          matchScore={rec.matchScore}
                          reason={rec.reason}
                          criteria={[
                            {
                              category: "Property Type",
                              score: Math.min(100, rec.matchScore + 5),
                              reason: `Matches your preference for ${property.propertyType} properties`,
                              icon: <Home className="h-4 w-4 text-primary" />,
                            },
                            {
                              category: "Price Range",
                              score: Math.min(100, rec.matchScore - 5),
                              reason: `Within your typical price range`,
                              icon: <DollarSign className="h-4 w-4 text-primary" />,
                            },
                            {
                              category: "Location",
                              score: rec.matchScore,
                              reason: `Similar to your favorite locations in ${property.city}`,
                              icon: <MapPinned className="h-4 w-4 text-primary" />,
                            },
                          ]}
                        />

                        {/* Actions */}
                        <div className="space-y-3 pt-2">
                          <div className="flex gap-3">
                            <Button asChild className="flex-1">
                              <Link href={`/property/${property.id}`}>View Details</Link>
                            </Button>
                            <Button variant="outline" className="flex-1">
                              <Heart className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                          </div>
                          
                          {/* Feedback Buttons */}
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm text-muted-foreground flex-1">Was this recommendation helpful?</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFeedback(property.id, "up")}
                              className="hover:bg-green-50 hover:text-green-600 hover:border-green-600"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFeedback(property.id, "down")}
                              className="hover:bg-red-50 hover:text-red-600 hover:border-red-600"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && data && data.recommendations.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start exploring properties and saving your favorites to get personalized recommendations
                </p>
                <div className="flex gap-4 justify-center">
                  <Button asChild>
                    <Link href="/properties">Browse Properties</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/favorites">View Favorites</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collaborative Recommendations */}
          {!isLoading && collaborativeRecs && collaborativeRecs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Users Like You Also Liked</h2>
                  <p className="text-muted-foreground">Based on similar user preferences</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collaborativeRecs.map((property: any) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={property.imageUrl || "/placeholder-property.jpg"}
                        alt={property.title || property.addressLine1}
                        className="w-full h-48 object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-primary">
                        {property.collaborativeScore}% Match
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">
                        {property.title || property.addressLine1}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4" />
                        {property.city}, {property.state}
                      </div>
                      <div className="text-2xl font-bold text-primary mb-3">
                        <PriceDisplay amount={property.price} />
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {property.bedrooms} beds
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {property.bathrooms} baths
                        </div>
                        {property.squareFeet && (
                          <div className="flex items-center gap-1">
                            <Maximize className="h-4 w-4" />
                            {property.squareFeet.toLocaleString()} sq ft
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Liked by {property.likedBySimilarUsers} similar users
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/property/${property.id}`}>View Details</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* How It Works */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                How Smart Recommendations Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">1. Analyze Your Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Our AI studies your favorite properties and saved searches to understand what you're looking for
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">2. Match Properties</h4>
                  <p className="text-sm text-muted-foreground">
                    We scan thousands of listings to find properties that match your unique preferences
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">3. Explain Why</h4>
                  <p className="text-sm text-muted-foreground">
                    Each recommendation comes with a personalized explanation of why it's a great match for you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
