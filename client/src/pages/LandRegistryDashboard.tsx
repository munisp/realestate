import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  FileText, 
  Shield, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Link as LinkIcon,
  History,
  TrendingUp
} from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function LandRegistryDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("my-lands");

  // Fetch user's land records
  const { data: myLandRecords, isLoading: loadingMyLands } = trpc.landRecords.getMyLandRecords.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch land records statistics
  const { data: stats, isLoading: loadingStats } = trpc.landRecords.getStats.useQuery();

  // Search land records
  const { data: searchResults, isLoading: searching } = trpc.landRecords.search.useQuery(
    {
      query: searchQuery,
      limit: 20,
    },
    { enabled: searchQuery.length > 2 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab("search");
    }
  };

  const formatLandSize = (size: string | null, unit: string | null) => {
    if (!size) return "N/A";
    return `${parseFloat(size).toLocaleString()} ${unit || "sqm"}`;
  };

  const getVerificationBadge = (isVerified: boolean, isOnBlockchain: boolean) => {
    if (isVerified && isOnBlockchain) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <Shield className="w-3 h-3 mr-1" />
          Verified & On-Chain
        </Badge>
      );
    } else if (isVerified) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (isOnBlockchain) {
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600">
          <LinkIcon className="w-3 h-3 mr-1" />
          On Blockchain
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <AlertCircle className="w-3 h-3 mr-1" />
          Unverified
        </Badge>
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Land Registry</h1>
              <p className="text-muted-foreground mt-1">
                Manage land records, verify C of O, and track ownership history
              </p>
            </div>
            <Button onClick={() => navigate("/land-registry/verify")}>
              <Shield className="w-4 h-4 mr-2" />
              Verify C of O
            </Button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by parcel ID, C of O number, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={searchQuery.length < 3}>
              Search
            </Button>
          </form>
        </div>
      </div>

      <div className="container py-8">
        {/* Statistics Cards */}
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Land Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Verified Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.verified.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? ((stats.verified / stats.total) * 100).toFixed(1) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  On Blockchain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.onBlockchain.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? ((stats.onBlockchain / stats.total) * 100).toFixed(1) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  States Covered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(stats.byState).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across Nigeria
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="my-lands">My Land Records</TabsTrigger>
            <TabsTrigger value="search">Search Results</TabsTrigger>
            <TabsTrigger value="verification">Verification Requests</TabsTrigger>
          </TabsList>

          {/* My Land Records Tab */}
          <TabsContent value="my-lands">
            {!isAuthenticated ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Please log in to view your land records
                  </p>
                  <Button onClick={() => navigate("/login")}>Log In</Button>
                </CardContent>
              </Card>
            ) : loadingMyLands ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="py-6">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : myLandRecords && myLandRecords.length > 0 ? (
              <div className="space-y-4">
                {myLandRecords.map((land) => (
                  <Card key={land.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/land-registry/land/${land.id}`)}>
                    <CardContent className="py-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{land.parcelId}</h3>
                            {getVerificationBadge(land.isVerified || false, land.isOnBlockchain || false)}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{land.address}, {land.city}, {land.state}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>{formatLandSize(land.landSize, land.landSizeUnit)} • {land.landUseType}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    You don't have any land records yet
                  </p>
                  <Button onClick={() => navigate("/land-registry/add")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Land Record
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Search Results Tab */}
          <TabsContent value="search">
            {searchQuery.length < 3 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Enter at least 3 characters to search
                  </p>
                </CardContent>
              </Card>
            ) : searching ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="py-6">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((land) => (
                  <Card key={land.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/land-registry/land/${land.id}`)}>
                    <CardContent className="py-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{land.parcelId}</h3>
                            {getVerificationBadge(land.isVerified || false, land.isOnBlockchain || false)}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{land.address}, {land.city}, {land.state}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>{formatLandSize(land.landSize, land.landSizeUnit)} • {land.landUseType}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No land records found matching "{searchQuery}"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Verification Requests Tab */}
          <TabsContent value="verification">
            {!isAuthenticated ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Please log in to view your verification requests
                  </p>
                  <Button onClick={() => navigate("/login")}>Log In</Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Verification requests will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
