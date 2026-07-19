import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  MapPin,
  Bell,
  BellOff,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  Map as MapIcon,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { format } from 'date-fns';

export default function SavedMapSearches() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: savedSearches, isLoading } = trpc.shortlet.getSavedMapSearches.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const deleteSearchMutation = trpc.shortlet.deleteSavedMapSearch.useMutation({
    onSuccess: () => {
      toast.success('Saved search deleted');
      utils.shortlet.getSavedMapSearches.invalidate();
    },
    onError: () => {
      toast.error('Failed to delete saved search');
    },
  });

  const toggleAlertMutation = trpc.shortlet.toggleSearchAlert.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`Alerts ${variables.enabled ? 'enabled' : 'disabled'}`);
      utils.shortlet.getSavedMapSearches.invalidate();
    },
    onError: () => {
      toast.error('Failed to update alert settings');
    },
  });

  const handleDelete = (searchId: number) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      deleteSearchMutation.mutate({ searchId });
    }
  };

  const handleToggleAlert = (searchId: number, enabled: boolean) => {
    toggleAlertMutation.mutate({ searchId, enabled });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in to view your saved map searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-4">Saved Map Searches</h1>
          <p className="text-lg opacity-90">
            Manage your saved searches and get alerts for new properties
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {savedSearches?.length || 0} Saved Searches
            </h2>
            <p className="text-muted-foreground">
              Get notified when new properties match your criteria
            </p>
          </div>
          <Button asChild>
            <Link href="/shortlet/map">
              <MapIcon className="h-4 w-4 mr-2" />
              Go to Map
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : savedSearches && savedSearches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Saved Searches</h3>
              <p className="text-muted-foreground mb-4">
                Save your map searches to get alerts for new properties
              </p>
              <Button asChild>
                <Link href="/shortlet/map">Browse Map</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSearches?.map((search) => (
              <Card key={search.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{search.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {search.city || 'All locations'}
                      </CardDescription>
                    </div>
                    <Badge variant={search.alertEnabled ? 'default' : 'secondary'}>
                      {search.alertEnabled ? (
                        <>
                          <Bell className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <BellOff className="h-3 w-3 mr-1" />
                          Paused
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Search Criteria */}
                    <div className="space-y-2 text-sm">
                      {search.checkIn && search.checkOut && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(search.checkIn), 'MMM d')} -{' '}
                            {format(new Date(search.checkOut), 'MMM d')}
                          </span>
                        </div>
                      )}
                      {search.guests && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{search.guests} guests</span>
                        </div>
                      )}
                      {(search.minPrice || search.maxPrice) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            ₦{search.minPrice?.toLocaleString() || '0'} - ₦
                            {search.maxPrice?.toLocaleString() || '∞'}
                          </span>
                        </div>
                      )}
                      {search.amenities && search.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {search.amenities.map((amenity: string) => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={search.alertEnabled}
                          onCheckedChange={(checked) =>
                            handleToggleAlert(search.id, checked)
                          }
                          disabled={toggleAlertMutation.isPending}
                        />
                        <span className="text-sm text-muted-foreground">Alerts</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(search.id)}
                          disabled={deleteSearchMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/shortlet/map?searchId=${search.id}`}
                          >
                            <MapIcon className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {search.lastAlertSent && (
                      <p className="text-xs text-muted-foreground pt-2">
                        Last alert: {format(new Date(search.lastAlertSent), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
