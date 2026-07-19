import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Heart, MapPin, Search, TrendingUp, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { NotificationCenter } from "@/components/NotificationCenter";
import { AdminNav } from "@/components/AdminNav";
import { PushNotificationPrompt, PushNotificationBanner } from "@/components/PushNotificationPrompt";
import { CurrencySelector, PriceDisplay } from "@/components/CurrencySelector";
import { UserMenu } from "@/components/UserMenu";
import { BlockchainVerifiedBadge } from "@/components/BlockchainVerifiedBadge";
import { LivePropertyFeed } from "@/components/LivePropertyFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [searchCity, setSearchCity] = useState("");
  const [propertyType, setPropertyType] = useState("single_family");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Fetch featured properties
  const { data: properties, isLoading } = trpc.properties.list.useQuery({
    status: "active",
    limit: 6,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchCity) params.set("city", searchCity);
    if (propertyType) params.set("type", propertyType);
    window.location.href = `/properties?${params.toString()}`;
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
          <nav className="flex items-center gap-4">
            <Link href="/properties" className="text-foreground hover:text-primary transition-colors">
              Properties
            </Link>
            <Link href="/map" className="text-foreground hover:text-primary transition-colors">
              Map View
            </Link>
            <Link href="/blockchain-registry" className="text-foreground hover:text-primary transition-colors">
              Registry
            </Link>
            <Link href="/verified-properties" className="text-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Verified
            </Link>
            <Link href="/smart-recommendations" className="text-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              For You
            </Link>
            <Link href="/market-trends" className="text-foreground hover:text-primary transition-colors flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Market Trends
            </Link>
            {!isAuthenticated && <CurrencySelector className="w-[140px]" />}
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && <AdminNav />}
                <NotificationCenter />
                <UserMenu />
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl font-bold tracking-tight">
              Find Your Dream Home
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover properties with AI-powered valuations, real-time market insights, and seamless transactions
            </p>

            {/* Search Bar */}
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Enter city or zip code..."
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="w-full md:w-[200px] h-12">
                    <SelectValue placeholder="Property Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_family">Single Family</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="multi_family">Multi Family</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Shield className="h-4 w-4 text-green-600" />
                      Verified Only
                    </span>
                  </label>
                </div>
                <Button onClick={handleSearch} size="lg" className="h-12 px-8">
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Platform</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI-Powered Valuations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get accurate property valuations using advanced machine learning algorithms and market data
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <MapPin className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Geospatial Search</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Find properties near you with our advanced geospatial search and interactive map views
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Heart className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Save & Track</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Save your favorite properties and get real-time notifications on price changes and new listings
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Properties & Live Feed */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="featured" className="w-full">
            <div className="flex items-center justify-between mb-8">
              <TabsList>
                <TabsTrigger value="featured">Featured Properties</TabsTrigger>
                <TabsTrigger value="live">Live Feed 🔥</TabsTrigger>
              </TabsList>
              <Button variant="outline" asChild>
                <Link href="/properties">View All</Link>
              </Button>
            </div>

            <TabsContent value="featured">
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
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties?.map((property) => {
                    const images = property.images ? JSON.parse(property.images) : [];
                    const primaryImage = property.primaryImage || images[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800";

                    return (
                      <Link key={property.id} href={`/property/${property.id}`}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                          <div className="relative h-48 overflow-hidden rounded-t-lg">
                            <img
                              src={primaryImage}
                              alt={property.title || property.addressLine1}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 left-4">
                              <BlockchainVerifiedBadge propertyId={property.id} variant="compact" />
                            </div>
                            <div className="absolute top-4 right-4">
                              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-lg">
                                <PriceDisplay
                                  amount={property.price}
                                  originalCurrency="USD"
                                  className="text-primary-foreground"
                                />
                              </div>
                            </div>
                          </div>
                          <CardHeader>
                            <CardTitle className="line-clamp-1">
                              {property.title || property.addressLine1}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {property.city}, {property.state}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              {property.bedrooms && <span>{property.bedrooms} beds</span>}
                              {property.bathrooms && <span>{property.bathrooms} baths</span>}
                              {property.squareFeet && <span>{property.squareFeet.toLocaleString()} sq ft</span>}
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
              )}
            </TabsContent>

            <TabsContent value="live">
              <LivePropertyFeed maxItems={10} showFilters={true} autoScroll={false} />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">About</h3>
              <p className="text-sm text-muted-foreground">
                Next-generation real estate platform with AI-powered valuations and seamless transactions.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/properties" className="text-muted-foreground hover:text-foreground">Browse Properties</Link></li>
                <li><Link href="/map" className="text-muted-foreground hover:text-foreground">Map View</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 {APP_TITLE}. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Push Notification Prompt */}
      {isAuthenticated && <PushNotificationPrompt />}
    </div>
  );
}
