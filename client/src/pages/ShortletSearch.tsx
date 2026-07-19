import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Users, Star, Bed, Bath } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { toast } from 'sonner';

export default function ShortletSearch() {
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();

  const { data, isLoading } = trpc.shortlet.getListings.useQuery({
    city: city || undefined,
    checkIn: checkIn?.toISOString(),
    checkOut: checkOut?.toISOString(),
    guests,
    minPrice,
    maxPrice,
  });

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }
    // Query will auto-refresh with new params
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-4">Find Your Perfect Shortlet</h1>
          <p className="text-lg opacity-90">Book short-term rentals across Nigeria and the USA</p>
        </div>
      </div>

      {/* Search Filters */}
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
            <CardDescription>Find the perfect property for your stay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* City */}
              <div>
                <label className="text-sm font-medium mb-2 block">City</label>
                <Input
                  placeholder="Lagos, Abuja, New York..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {/* Check-in Date */}
              <div>
                <label className="text-sm font-medium mb-2 block">Check-in</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={checkIn}
                      onSelect={setCheckIn}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Check-out Date */}
              <div>
                <label className="text-sm font-medium mb-2 block">Check-out</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => !checkIn || date <= checkIn}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Guests */}
              <div>
                <label className="text-sm font-medium mb-2 block">Guests</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Min Price/Night</label>
                <Input
                  type="number"
                  placeholder="₦0"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(parseInt(e.target.value) || undefined)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Max Price/Night</label>
                <Input
                  type="number"
                  placeholder="₦100,000"
                  value={maxPrice || ''}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value) || undefined)}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleSearch} className="w-full">
                  Search Properties
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {data?.total || 0} Properties Available
            </h2>
            <Link href="/shortlet/map">
              <Button variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                View Map
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : data?.properties.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No properties found matching your criteria</p>
                <Button variant="link" onClick={() => {
                  setCity('');
                  setCheckIn(undefined);
                  setCheckOut(undefined);
                  setMinPrice(undefined);
                  setMaxPrice(undefined);
                }}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.properties.map((property) => (
                <Link key={property.id} href={`/shortlet/${property.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images[0]}
                          alt={property.title || 'Property'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <MapPin className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                        ₦{property.pricePerNight?.toLocaleString()}/night
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {property.title || `${property.addressLine1}, ${property.city}`}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.city}, {property.state}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {property.bedrooms && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {property.bedrooms} beds
                          </div>
                        )}
                        {property.bathrooms && (
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {property.bathrooms} baths
                          </div>
                        )}
                        {property.maxGuests && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {property.maxGuests} guests
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">4.8</span>
                        <span className="text-sm text-muted-foreground">(24 reviews)</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">View Details</Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
