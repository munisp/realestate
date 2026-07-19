import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { MapPin, Bed, Bath, Ruler, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { FavoriteButton } from "./FavoriteButton";

interface SimilarPropertiesProps {
  propertyId: number;
  limit?: number;
}

export function SimilarProperties({ propertyId, limit = 6 }: SimilarPropertiesProps) {
  const { data: similar, isLoading } = trpc.properties.similar.useQuery({
    propertyId,
    limit,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            You May Also Like
          </CardTitle>
          <CardDescription>Similar properties based on this listing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-40 bg-muted rounded-lg mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!similar || similar.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          You May Also Like
        </CardTitle>
        <CardDescription>
          Similar properties in the same area with comparable features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {similar.map((property) => (
            <Link key={property.id} href={`/property/${property.id}`}>
              <div className="group cursor-pointer">
                <div className="relative">
                  <img
                    src={property.primaryImage || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                    alt={property.title || property.addressLine1}
                    className="w-full h-40 object-cover rounded-lg mb-2 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute top-2 right-2">
                    <FavoriteButton propertyId={property.id} />
                  </div>
                  <Badge className="absolute bottom-2 left-2">
                    ₦{property.price.toLocaleString()}
                  </Badge>
                </div>

                <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {property.title || property.addressLine1}
                </h4>

                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" />
                  {property.city}, {property.state}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {property.bedrooms && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-3 w-3" />
                      <span>{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-3 w-3" />
                      <span>{property.bathrooms}</span>
                    </div>
                  )}
                  {property.squareFeet && (
                    <div className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      <span>{property.squareFeet.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
