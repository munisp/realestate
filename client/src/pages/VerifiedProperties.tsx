import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlockchainVerifiedBadge } from "@/components/BlockchainVerifiedBadge";
import { PriceDisplay } from "@/components/CurrencySelector";
import { APP_TITLE, getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Search,
  Shield,
  FileText,
  Clock,
  MapPin,
  Bed,
  Bath,
  Square,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

export default function VerifiedProperties() {
  const { user, isAuthenticated } = useAuth();
  const [searchCity, setSearchCity] = useState("");
  const [propertyType, setPropertyType] = useState("all");

  // Fetch properties (in production, filter by blockchain verification status)
  const { data: properties, isLoading } = trpc.properties.list.useQuery({
    city: searchCity || undefined,
    propertyType: propertyType !== "all" ? propertyType : undefined,
    status: "active",
    limit: 20,
  });

  const handleSearch = () => {
    // Trigger search (query will auto-refetch due to input changes)
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-600" />
                <h1 className="text-2xl font-bold">Verified Properties</h1>
              </div>
            </div>
            {!isAuthenticated && (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Blockchain-Verified Properties</h2>
            <p className="text-lg text-muted-foreground">
              Browse properties with verified ownership records, immutable title history, and transparent transaction data secured on the blockchain
            </p>
          </div>

          {/* Search Bar */}
          <Card className="max-w-4xl mx-auto p-6">
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
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="multi_family">Multi Family</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} size="lg" className="h-12 px-8">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-card">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold text-center mb-8">Why Choose Verified Properties?</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle className="text-lg">Verified Ownership</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every property has blockchain-verified ownership records that cannot be tampered with or falsified
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Clock className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle className="text-lg">Complete History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View the complete title transfer history and all past transactions stored immutably on the blockchain
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle className="text-lg">Document Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All property documents are stored on IPFS with cryptographic hashes ensuring authenticity
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Properties Listing */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">
              {isLoading ? "Loading..." : `${properties?.length || 0} Verified Properties`}
            </h3>
            <Link href="/blockchain-registry">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Blockchain Registry
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={property.primaryImage || "https://images.unsplash.com/photo-1568605114967-8130f3a36994"}
                      alt={property.title || "Property"}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <BlockchainVerifiedBadge propertyId={property.id} variant="compact" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2">
                      <h4 className="font-semibold text-lg line-clamp-1">
                        {property.title || `${property.propertyType} in ${property.city}`}
                      </h4>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {property.city}, {property.state}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <PriceDisplay amount={property.price} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
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
                      {property.squareFeet && (
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          {property.squareFeet} sq ft
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/property/${property.id}`} className="flex-1">
                        <Button className="w-full" size="sm">View Details</Button>
                      </Link>
                      <Link href={`/blockchain-registry?propertyId=prop_${property.id}`}>
                        <Button variant="outline" size="sm">
                          <Shield className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No verified properties found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 {APP_TITLE}. All rights reserved.</p>
            <p className="mt-2">Powered by Hyperledger Fabric & IPFS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
