import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Trash2, Bell, BellOff, Search, Calendar, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function SavedSearches() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: savedSearches, isLoading, refetch } = trpc.savedSearches.list.useQuery();
  const deleteMutation = trpc.savedSearches.delete.useMutation();
  const toggleAlertsMutation = trpc.savedSearches.toggleAlerts.useMutation();
  const updateFrequencyMutation = trpc.savedSearches.updateFrequency.useMutation();

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this saved search?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Saved search deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete saved search");
    }
  };

  const handleToggleAlerts = async (id: number, enabled: boolean) => {
    try {
      await toggleAlertsMutation.mutateAsync({ id, enabled });
      toast.success(enabled ? 'Email alerts enabled' : 'Email alerts disabled');
      refetch();
    } catch (error) {
      toast.error('Failed to update alert settings');
    }
  };

  const handleUpdateFrequency = async (id: number, frequency: string) => {
    try {
      await updateFrequencyMutation.mutateAsync({ id, frequency });
      toast.success('Alert frequency updated');
      refetch();
    } catch (error) {
      toast.error('Failed to update frequency');
    }
  };

  const handleApplySearch = (searchCriteria: string, category: string) => {
    try {
      const criteria = JSON.parse(searchCriteria);
      
      // Build query string from criteria
      const params = new URLSearchParams();
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
      
      // Navigate to appropriate page with filters
      const basePath = category === "properties" ? "/properties" : 
                       category === "builder-projects" ? "/builder-projects" :
                       "/short-lets";
      
      setLocation(`${basePath}?${params.toString()}`);
      toast.success("Search filters applied");
    } catch (error) {
      toast.error("Failed to apply search");
    }
  };

  const getCategoryBadge = (criteria: string) => {
    try {
      const parsed = JSON.parse(criteria);
      if (parsed.propertyType) return "Properties";
      if (parsed.constructionStatus) return "Builder Projects";
      if (parsed.checkIn || parsed.checkOut) return "Short-lets";
      return "Properties";
    } catch {
      return "Unknown";
    }
  };

  const formatCriteria = (criteria: string) => {
    try {
      const parsed = JSON.parse(criteria);
      const parts: string[] = [];
      
      if (parsed.city) parts.push(`City: ${parsed.city}`);
      if (parsed.state) parts.push(`State: ${parsed.state}`);
      if (parsed.propertyType) parts.push(`Type: ${parsed.propertyType}`);
      if (parsed.minPrice || parsed.maxPrice) {
        parts.push(`Price: ₦${(parsed.minPrice || 0).toLocaleString()} - ₦${(parsed.maxPrice || 0).toLocaleString()}`);
      }
      if (parsed.minBedrooms) parts.push(`${parsed.minBedrooms}+ beds`);
      if (parsed.minBathrooms) parts.push(`${parsed.minBathrooms}+ baths`);
      if (parsed.constructionStatus) parts.push(`Status: ${parsed.constructionStatus}`);
      if (parsed.guests) parts.push(`Guests: ${parsed.guests}`);
      
      return parts.length > 0 ? parts.join(" • ") : "No filters";
    } catch {
      return "Invalid criteria";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Saved Searches</h1>
        <p className="text-muted-foreground">
          Manage your saved property searches and get notified of new listings
        </p>
      </div>

      {!savedSearches || savedSearches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Saved Searches</h3>
            <p className="text-muted-foreground text-center mb-6">
              Save your search filters to quickly find properties that match your criteria
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/properties">Browse Properties</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/map/advanced">Advanced Map Search</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/builder-projects">Builder Projects</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/short-lets">Short-lets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedSearches.map((search) => (
            <Card key={search.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{search.name}</CardTitle>
                    <Badge variant="secondary">
                      {getCategoryBadge(search.searchCriteria)}
                    </Badge>
                  </div>
                  {search.notificationsEnabled === 1 && (
                    <Bell className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {formatCriteria(search.searchCriteria)}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Saved {new Date(search.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
              
              <CardContent className="pt-0">
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`alerts-${search.id}`} className="text-sm flex items-center gap-2">
                      {search.notificationsEnabled === 1 ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                      Email Alerts
                    </Label>
                    <Switch
                      id={`alerts-${search.id}`}
                      checked={search.notificationsEnabled === 1}
                      onCheckedChange={(enabled) => handleToggleAlerts(search.id, enabled)}
                    />
                  </div>

                  {search.notificationsEnabled === 1 && (
                    <div className="space-y-2">
                      <Label htmlFor={`frequency-${search.id}`} className="text-xs text-muted-foreground">
                        Alert Frequency
                      </Label>
                      <Select
                        defaultValue="daily"
                        onValueChange={(value) => handleUpdateFrequency(search.id, value)}
                      >
                        <SelectTrigger id={`frequency-${search.id}`} className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Instant</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => handleApplySearch(search.searchCriteria, getCategoryBadge(search.searchCriteria).toLowerCase().replace(" ", "-"))}
                >
                  Apply Search
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(search.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
