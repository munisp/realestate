// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Heart, MapPin, Bed, Bath, Ruler, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Favorites() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: favorites, isLoading } = trpc.favorites.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const removeFavorite = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.list.invalidate();
      toast.success("Removed from favorites");
    },
    onError: () => {
      toast.error("Failed to remove from favorites");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your favorite properties
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-8 w-8 text-primary" />
              <span>{APP_TITLE}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 fill-primary text-primary" />
            My Favorites
          </h1>
          <p className="text-muted-foreground">
            Properties you've saved for later viewing
          </p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Start browsing properties and save your favorites
              </p>
              <Button asChild>
                <Link href="/properties">Browse Properties</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {favorites.length} {favorites.length === 1 ? "property" : "properties"} saved
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite) => {
                const property = favorite.property;
                if (!property) return null;

                return (
                  <Card key={favorite.id} className="group hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={property.primaryImage || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"}
                        alt={property.title || property.addressLine1}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFavorite.mutate({ propertyId: property.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Badge className="absolute bottom-2 left-2">
                        ₦{property.price.toLocaleString()}
                      </Badge>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-1">
                        {property.title || property.addressLine1}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.city}, {property.state}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Property Details */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {property.bedrooms && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            <span>{property.bedrooms}</span>
                          </div>
                        )}
                        {property.bathrooms && (
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            <span>{property.bathrooms}</span>
                          </div>
                        )}
                        {property.squareFeet && (
                          <div className="flex items-center gap-1">
                            <Ruler className="h-4 w-4" />
                            <span>{property.squareFeet.toLocaleString()} sqft</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {favorite.notes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm italic text-muted-foreground">
                            "{favorite.notes}"
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button variant="default" className="flex-1" asChild>
                          <Link href={`/property/${property.id}`}>
                            View Details
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeFavorite.mutate({ propertyId: property.id })}
                        >
                          <Heart className="h-4 w-4 fill-primary text-primary" />
                        </Button>
                      </div>

                      {/* Saved Date */}
                      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                        Saved {new Date(favorite.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
