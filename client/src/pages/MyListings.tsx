// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, MoreVertical, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function MyListings() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: properties, isLoading } = trpc.properties.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  const updateStatusMutation = trpc.properties.updateStatus.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      toast.success("Property status updated");
    },
    onError: () => {
      toast.error("Failed to update property status");
    },
  });

  const deletePropertyMutation = trpc.properties.delete.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      toast.success("Property deleted");
    },
    onError: () => {
      toast.error("Failed to delete property");
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
              Please sign in to manage your property listings
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myProperties = properties?.filter(p => p.ownerId === user?.id) || [];

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
            <div className="flex items-center gap-4">
              <Button asChild>
                <Link href="/listings/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Property Listings</h1>
          <p className="text-muted-foreground">
            Manage your property listings, update details, and track performance
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
        ) : myProperties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Start by adding your first property listing
              </p>
              <Button asChild>
                <Link href="/listings/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Property
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="relative h-48">
                  <img
                    src={property.primaryImage || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                    alt={property.title || property.addressLine1}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant={property.status === "active" ? "default" : "secondary"}>
                      {property.status}
                    </Badge>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">
                    {property.title || property.addressLine1}
                  </CardTitle>
                  <CardDescription>
                    {property.city}, {property.state}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-semibold">
                        ₦{property.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="text-sm capitalize">
                        {property.propertyType.replace("_", " ")}
                      </span>
                    </div>
                    {property.bedrooms && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Bedrooms</span>
                        <span className="text-sm">{property.bedrooms}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/property/${property.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/listings/edit/${property.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const newStatus = property.status === "active" ? "inactive" : "active";
                          updateStatusMutation.mutate({
                            id: property.id,
                            status: newStatus,
                          });
                        }}
                      >
                        {property.status === "active" ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Mark Inactive
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Mark Active
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this property?")) {
                            deletePropertyMutation.mutate({ id: property.id });
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
