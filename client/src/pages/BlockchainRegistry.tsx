import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Shield, Search, CheckCircle2, XCircle, Clock, ArrowRight, FileText, Link as LinkIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";

export default function BlockchainRegistry() {
  const { isAuthenticated } = useAuth();
  const [searchPropertyId, setSearchPropertyId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  // Check for propertyId in URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get('propertyId');
    if (propertyId) {
      setSelectedPropertyId(propertyId);
      setSearchPropertyId(propertyId);
    }
  }, []);

  const { data: statusData } = trpc.blockchainRegistry.isAvailable.useQuery();
  const { data: allPropertiesData } = trpc.blockchainRegistry.getAllProperties.useQuery();
  const { data: propertyData } = trpc.blockchainRegistry.getProperty.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );
  const { data: historyData } = trpc.blockchainRegistry.getHistory.useQuery(
    { propertyId: selectedPropertyId! },
    { enabled: !!selectedPropertyId }
  );

  const handleSearch = () => {
    if (searchPropertyId.trim()) {
      setSelectedPropertyId(searchPropertyId.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-8 w-8 text-primary" />
            <span>{APP_TITLE} - Blockchain Registry</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            {!isAuthenticated && (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Status Banner */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Blockchain Property Registry
                </CardTitle>
                <CardDescription>
                  Powered by Hyperledger Fabric - Immutable property ownership records
                </CardDescription>
              </div>
              <Badge variant={statusData?.available ? "default" : "secondary"}>
                {statusData?.available ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Demo Mode
                  </span>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {statusData?.message}
              {!statusData?.available && " Showing sample data for demonstration purposes."}
            </p>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Property</CardTitle>
            <CardDescription>Enter a property ID to view its blockchain record</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="propertyId">Property ID</Label>
                <Input
                  id="propertyId"
                  value={searchPropertyId}
                  onChange={(e) => setSearchPropertyId(e.target.value)}
                  placeholder="e.g., prop_001"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        {propertyData && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Property Details
                </CardTitle>
                {propertyData.isMockData && (
                  <Badge variant="outline" className="w-fit">Demo Data</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Property ID</Label>
                  <p className="font-mono text-sm">{propertyData.propertyId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p>{propertyData.address}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Owner</Label>
                  <p className="font-semibold">{propertyData.owner}</p>
                </div>
                {propertyData.previousOwner && (
                  <div>
                    <Label className="text-muted-foreground">Previous Owner</Label>
                    <p>{propertyData.previousOwner}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Price</Label>
                    <p className="font-semibold">${propertyData.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Square Feet</Label>
                    <p>{propertyData.squareFeet.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bedrooms</Label>
                    <p>{propertyData.bedrooms}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bathrooms</Label>
                    <p>{propertyData.bathrooms}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Year Built</Label>
                    <p>{propertyData.yearBuilt}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p>{propertyData.propertyType}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Title Hash (SHA-256)</Label>
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                    {propertyData.titleHash}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={propertyData.status === 'Active' ? 'default' : 'secondary'}>
                    {propertyData.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Transfer Count</Label>
                  <p>{propertyData.transferCount} transfers</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>Immutable ownership transfer records</CardDescription>
              </CardHeader>
              <CardContent>
                {historyData && historyData.transactions.length > 0 ? (
                  <div className="space-y-4">
                    {historyData.transactions.map((tx, index) => (
                      <div key={tx.transactionId} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="text-sm font-medium">{tx.txType}</span>
                          </div>
                          <Badge variant={tx.status === 'Completed' ? 'default' : 'secondary'}>
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">From:</span>
                            <span className="font-medium">{tx.fromOwner}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">To:</span>
                            <span className="font-medium">{tx.toOwner}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-semibold">${tx.price.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">TX ID:</span>
                            <p className="font-mono text-xs break-all text-muted-foreground">
                              {tx.transactionId}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {historyData.isMockData && (
                      <p className="text-xs text-muted-foreground text-center">
                        Demo data - Connect Hyperledger Fabric for live transactions
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No transaction history available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Properties List */}
        {!selectedPropertyId && allPropertiesData && (
          <Card>
            <CardHeader>
              <CardTitle>Registered Properties</CardTitle>
              <CardDescription>
                {allPropertiesData.properties.length} properties on blockchain
                {allPropertiesData.isMockData && " (Demo Data)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allPropertiesData.properties.map((property) => (
                  <Card
                    key={property.propertyId}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedPropertyId(property.propertyId)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{property.address}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {property.propertyId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Owner:</span>
                        <span className="text-sm font-medium">{property.owner}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price:</span>
                        <span className="text-sm font-semibold">${property.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Transfers:</span>
                        <Badge variant="outline">{property.transferCount}</Badge>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
