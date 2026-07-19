import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, Minus, Calendar, DollarSign, Home, Bed, Bath, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import BookingCalendarWidget from "./BookingCalendarWidget";

interface ShortletProperty {
  id: number;
  name: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  images: string[];
  amenities: string[];
  availabilityStatus: "available" | "limited" | "booked";
  rating?: number;
  reviewCount?: number;
}

interface PropertyComparisonPanelProps {
  properties: ShortletProperty[];
  onRemoveProperty: (propertyId: number) => void;
  onClearAll: () => void;
  maxProperties?: number;
}

export default function PropertyComparisonPanel({
  properties,
  onRemoveProperty,
  onClearAll,
  maxProperties = 3,
}: PropertyComparisonPanelProps) {
  const [showCalendar, setShowCalendar] = useState<number | null>(null);

  if (properties.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select properties on the map to compare</p>
          <p className="text-sm mt-2">You can compare up to {maxProperties} properties</p>
        </CardContent>
      </Card>
    );
  }

  const allAmenities = Array.from(
    new Set(properties.flatMap((p) => p.amenities))
  ).sort();

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "limited":
        return "bg-yellow-500";
      case "booked":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getAvailabilityLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Available";
      case "limited":
        return "Limited";
      case "booked":
        return "Fully Booked";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Comparing {properties.length} {properties.length === 1 ? "Property" : "Properties"}
        </h3>
        <Button variant="outline" size="sm" onClick={onClearAll}>
          Clear All
        </Button>
      </div>

      {/* Property Cards Grid - Responsive */}
      <div className={cn(
        "grid gap-4",
        // Mobile: single column
        "grid-cols-1",
        // Tablet: 2 columns if 2+ properties
        properties.length >= 2 && "md:grid-cols-2",
        // Desktop: 3 columns if 3 properties
        properties.length >= 3 && "lg:grid-cols-3"
      )}>
        {properties.map((property) => (
          <Card key={property.id} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => onRemoveProperty(property.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <CardHeader className="pb-3">
              <div className="aspect-video relative rounded-md overflow-hidden mb-3">
                <img
                  src={property.images[0] || "/placeholder-property.jpg"}
                  alt={property.name}
                  className="object-cover w-full h-full"
                />
                <Badge
                  className={cn(
                    "absolute top-2 left-2",
                    getAvailabilityColor(property.availabilityStatus)
                  )}
                >
                  {getAvailabilityLabel(property.availabilityStatus)}
                </Badge>
              </div>
              <CardTitle className="text-base line-clamp-2">{property.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-1">{property.address}</p>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Price */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">${property.price}</span>
                <span className="text-sm text-muted-foreground">per night</span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <span>{property.bedrooms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4 text-muted-foreground" />
                  <span>{property.bathrooms}</span>
                </div>
                {property.squareFeet && (
                  <div className="flex items-center gap-1">
                    <Maximize className="h-4 w-4 text-muted-foreground" />
                    <span>{property.squareFeet} ft²</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              {property.rating && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">★ {property.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({property.reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Calendar Toggle */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowCalendar(showCalendar === property.id ? null : property.id)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {showCalendar === property.id ? "Hide Calendar" : "Check Availability"}
              </Button>

              {/* Calendar Widget */}
              {showCalendar === property.id && (
                <div className="mt-3">
                  <BookingCalendarWidget
                    propertyId={property.id}
                    pricePerNight={property.price}
                    cleaningFee={50}
                    serviceFee={0.12}
                    minNights={2}
                    blockedDates={[]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
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
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  {properties.map((property) => (
                    <th key={property.id} className="text-center py-3 px-4 font-medium">
                      {property.name.split(" ").slice(0, 3).join(" ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price Comparison */}
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Price per Night</td>
                  {properties.map((property) => {
                    const isLowest = property.price === Math.min(...properties.map(p => p.price));
                    return (
                      <td key={property.id} className="text-center py-3 px-4">
                        <span className={cn(isLowest && "text-green-600 font-bold")}>
                          ${property.price}
                        </span>
                        {isLowest && <Badge variant="outline" className="ml-2 text-xs">Best Value</Badge>}
                      </td>
                    );
                  })}
                </tr>

                {/* Bedrooms */}
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Bedrooms</td>
                  {properties.map((property) => {
                    const isMost = property.bedrooms === Math.max(...properties.map(p => p.bedrooms));
                    return (
                      <td key={property.id} className="text-center py-3 px-4">
                        <span className={cn(isMost && "text-green-600 font-bold")}>
                          {property.bedrooms}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Bathrooms */}
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Bathrooms</td>
                  {properties.map((property) => {
                    const isMost = property.bathrooms === Math.max(...properties.map(p => p.bathrooms));
                    return (
                      <td key={property.id} className="text-center py-3 px-4">
                        <span className={cn(isMost && "text-green-600 font-bold")}>
                          {property.bathrooms}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Square Feet */}
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Square Feet</td>
                  {properties.map((property) => {
                    const isLargest = property.squareFeet === Math.max(...properties.map(p => p.squareFeet || 0));
                    return (
                      <td key={property.id} className="text-center py-3 px-4">
                        {property.squareFeet ? (
                          <span className={cn(isLargest && "text-green-600 font-bold")}>
                            {property.squareFeet} ft²
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Availability */}
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Availability</td>
                  {properties.map((property) => (
                    <td key={property.id} className="text-center py-3 px-4">
                      <Badge className={getAvailabilityColor(property.availabilityStatus)}>
                        {getAvailabilityLabel(property.availabilityStatus)}
                      </Badge>
                    </td>
                  ))}
                </tr>

                {/* Amenities */}
                {allAmenities.map((amenity) => (
                  <tr key={amenity} className="border-b">
                    <td className="py-3 px-4">{amenity}</td>
                    {properties.map((property) => (
                      <td key={property.id} className="text-center py-3 px-4">
                        {property.amenities.includes(amenity) ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <Minus className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
