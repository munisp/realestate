import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_TITLE, getLoginUrl } from "@/const";
import { 
  Building2, MapPin, Users, Bed, Bath, Wifi, Car, 
  CheckCircle2, Star, ChevronLeft, ChevronRight, Calendar,
  Loader2, AlertCircle, Check
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { PropertyReviews } from "@/components/PropertyReviews";

export default function ShortLetDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  const { data: property, isLoading } = trpc.shortLets.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  // Check availability when dates change
  const { data: availability, isLoading: checkingAvailability } = trpc.shortLetAvailability.checkAvailability.useQuery(
    {
      propertyId: Number(id),
      checkIn,
      checkOut,
    },
    { enabled: !!checkIn && !!checkOut && !!id }
  );

  // Calculate pricing when dates change
  const { data: pricing, isLoading: calculatingPrice } = trpc.shortLetAvailability.calculatePrice.useQuery(
    {
      propertyId: Number(id),
      checkIn,
      checkOut,
      numberOfGuests: guests,
    },
    { enabled: !!checkIn && !!checkOut && !!id }
  );

  const nextImage = () => {
    if (!property?.property?.images) return;
    const images = JSON.parse(property.property.images);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (!property?.property?.images) return;
    const images = JSON.parse(property.property.images);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!availability?.available) {
      toast.error("Selected dates are not available");
      return;
    }

    if (!pricing) {
      toast.error("Unable to calculate pricing");
      return;
    }

    // Navigate to checkout with booking details
    setLocation(`/checkout?type=shortlet&propertyId=${id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&total=${pricing.totalPrice}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Property Not Found</CardTitle>
            <CardDescription>The property you're looking for doesn't exist</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/short-lets">Back to Short-lets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = property.property?.images ? JSON.parse(property.property.images) : [];
  const amenities = property.amenities ? JSON.parse(property.amenities) : [];

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/short-lets" className="text-foreground hover:text-primary transition-colors">
              Back to Short-lets
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Property Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={images[currentImageIndex]}
                    alt={property.property?.title || "Property"}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Property Info */}
              <div>
                <h1 className="text-3xl font-bold mb-2">{property.property?.title || "Property"}</h1>
                <div className="flex items-center gap-4 text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {property.property?.city || ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property.property?.bedrooms || 0} Bedrooms
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {property.property?.bathrooms || 0} Bathrooms
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Up to {property.maxGuests} Guests
                  </span>
                </div>
                <p className="text-lg">{property.property?.description || "No description available"}</p>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Amenities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {amenities.map((amenity: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    ₦{property.nightlyRate.toLocaleString()}{" "}
                    <span className="text-base font-normal text-muted-foreground">/ night</span>
                  </CardTitle>
                  {property.minimumStay && property.minimumStay > 1 && (
                    <CardDescription>
                      Minimum stay: {property.minimumStay} nights
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBooking} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="checkIn">Check-in</Label>
                        <Input
                          id="checkIn"
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          min={today}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkOut">Check-out</Label>
                        <Input
                          id="checkOut"
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          min={checkIn || today}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="guests">Guests</Label>
                      <Input
                        id="guests"
                        type="number"
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        min={1}
                        max={property.maxGuests}
                        required
                      />
                    </div>

                    {/* Availability Status */}
                    {checkIn && checkOut && (
                      <div>
                        {checkingAvailability ? (
                          <Alert>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <AlertDescription>Checking availability...</AlertDescription>
                          </Alert>
                        ) : availability?.available ? (
                          <Alert className="border-green-600 bg-green-50">
                            <Check className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-600">
                              Available for selected dates
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Not available for selected dates
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* Price Breakdown */}
                    {pricing && (
                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                          <span>₦{property.nightlyRate.toLocaleString()} × {pricing.nights} nights</span>
                          <span>₦{pricing.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Cleaning fee</span>
                          <span>₦{pricing.cleaningFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Service fee</span>
                          <span>₦{pricing.serviceFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Total</span>
                          <span>₦{pricing.totalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!availability?.available || checkingAvailability || calculatingPrice}
                    >
                      {calculatingPrice ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        "Reserve"
                      )}
                    </Button>

                    {!isAuthenticated && (
                      <p className="text-sm text-center text-muted-foreground">
                        You'll be asked to login to complete booking
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <PropertyReviews propertyId={Number(id)} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 {APP_TITLE}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
