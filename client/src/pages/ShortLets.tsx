import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Users, Star, ArrowLeft, Calendar, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { SaveSearchDialog } from "@/components/SaveSearchDialog";

export default function ShortLets() {
  const { isAuthenticated } = useAuth();
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500000);
  const [amenities, setAmenities] = useState<string[]>([]);

  // Fetch short-let properties
  const { data: shortLets, isLoading } = trpc.shortLets.list.useQuery({
    city: city || undefined,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    guests: guests ? parseInt(guests) : undefined,
    minPrice: minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice < 500000 ? maxPrice : undefined,
    limit: 20,
  });

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

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
            <Link href="/properties" className="text-foreground hover:text-primary transition-colors">
              Properties
            </Link>
            <Link href="/builder-projects" className="text-foreground hover:text-primary transition-colors">
              Builder Projects
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Page Header with Search */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12">
        <div className="container mx-auto px-4">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold mb-4">Short-term Rentals</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
            Find verified short-let properties for vacation stays or temporary accommodation
          </p>

          {/* Search Form */}
          <Card className="max-w-4xl">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Check-in"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Check-out"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  min="1"
                />
                <Button className="w-full">
                  Search
                </Button>
              </div>

              {/* Price Range Slider */}
              <div className="mt-6 space-y-2">
                <label className="text-sm font-medium">
                  Price per Night: ₦{minPrice.toLocaleString()} - ₦{maxPrice.toLocaleString()}
                </label>
                <Slider
                  min={0}
                  max={500000}
                  step={10000}
                  value={[minPrice, maxPrice]}
                  onValueChange={([min, max]) => {
                    setMinPrice(min);
                    setMaxPrice(max);
                  }}
                />
              </div>

              {/* Amenities Filter */}
              <div className="mt-6 space-y-2">
                <label className="text-sm font-medium">Amenities</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {['wifi', 'pool', 'gym', 'parking', 'kitchen'].map((amenity) => (
                    <label key={amenity} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={amenities.includes(amenity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAmenities([...amenities, amenity]);
                          } else {
                            setAmenities(amenities.filter(a => a !== amenity));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="capitalize">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-6 space-y-3">
                {checkIn && checkOut && (
                  <p className="text-sm text-muted-foreground">
                    {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex gap-2">
                  <SaveSearchDialog
                    searchCriteria={{
                      city,
                      checkIn,
                      checkOut,
                      guests,
                      minPrice,
                      maxPrice,
                      amenities: amenities.join(","),
                    }}
                    variant="default"
                    size="default"
                  />
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setCity("");
                      setCheckIn("");
                      setCheckOut("");
                      setGuests("");
                      setMinPrice(0);
                      setMaxPrice(500000);
                      setAmenities([]);
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Short-lets Grid */}
      <section className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : shortLets && shortLets.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shortLets.map((shortLet) => {
                const nights = calculateNights();
                const totalPrice = nights > 0 ? shortLet.nightlyRate * nights : shortLet.nightlyRate;

                return (
                  <Link key={shortLet.id} href={`/short-let/${shortLet.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <img
                          src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
                          alt="Short-let property"
                          className="w-full h-full object-cover"
                        />
                        {shortLet.instantBooking === 1 && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-green-500">Instant Book</Badge>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                          ₦{shortLet.nightlyRate.toLocaleString()}/night
                        </div>
                      </div>

                      <CardHeader>
                        <CardTitle className="line-clamp-1">
                          Luxury Apartment
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Lagos, Nigeria
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Guest Capacity */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Up to {shortLet.maxGuests} guests</span>
                        </div>

                        {/* Minimum Stay */}
                        {shortLet.minimumStay && shortLet.minimumStay > 1 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Min {shortLet.minimumStay} nights</span>
                          </div>
                        )}

                        {/* Total Price */}
                        {nights > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="font-semibold">
                              ₦{totalPrice.toLocaleString()} total
                            </span>
                          </div>
                        )}

                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">4.8</span>
                          <span className="text-sm text-muted-foreground">(24 reviews)</span>
                        </div>
                      </CardContent>

                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Properties Found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search criteria or check back later
              </p>
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

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
