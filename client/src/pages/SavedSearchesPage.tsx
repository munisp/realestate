import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Bell,
  Plus,
  Trash2,
  Edit,
  Mail,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Saved Searches & Alerts Manager
 * 
 * Allows users to save search criteria and receive notifications
 * when new matching properties are listed
 */
export default function SavedSearchesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [newSearchFrequency, setNewSearchFrequency] = useState<'instant' | 'daily' | 'weekly'>('daily');
  
  const utils = trpc.useUtils();
  const { data: savedSearches, isLoading } = trpc.recommendations.getSavedSearches.useQuery();
  
  const createSearch = trpc.recommendations.createSavedSearch.useMutation({
    onSuccess: () => {
      toast.success('Saved search created! You\'ll receive alerts for matching properties.');
      setIsCreateDialogOpen(false);
      setNewSearchName('');
      utils.recommendations.getSavedSearches.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to create saved search: ' + error.message);
    },
  });
  
  const updateSearch = trpc.recommendations.updateSavedSearch.useMutation({
    onSuccess: () => {
      toast.success('Saved search updated');
      utils.recommendations.getSavedSearches.invalidate();
    },
  });
  
  const deleteSearch = trpc.recommendations.deleteSavedSearch.useMutation({
    onSuccess: () => {
      toast.success('Saved search deleted');
      utils.recommendations.getSavedSearches.invalidate();
    },
  });
  
  const handleCreateSearch = () => {
    if (!newSearchName.trim()) {
      toast.error('Please enter a search name');
      return;
    }
    
    // Mock criteria - in production, this would come from actual search filters
    const mockCriteria = JSON.stringify({
      priceMin: 50000000,
      priceMax: 200000000,
      bedrooms: [3, 4],
      propertyTypes: ['single_family', 'condo'],
      locations: ['Ikoyi', 'Victoria Island'],
    });
    
    createSearch.mutate({
      name: newSearchName,
      criteria: mockCriteria,
      frequency: newSearchFrequency,
      enabled: true,
    });
  };
  
  const toggleSearchEnabled = (searchId: number, currentlyEnabled: boolean) => {
    updateSearch.mutate({
      searchId,
      enabled: !currentlyEnabled,
    });
  };
  
  const handleDeleteSearch = (searchId: number) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      deleteSearch.mutate({ searchId });
    }
  };
  
  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      instant: 'bg-red-500',
      daily: 'bg-blue-500',
      weekly: 'bg-green-500',
    };
    return colors[frequency as keyof typeof colors] || 'bg-gray-500';
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Search className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Saved Searches & Alerts</h1>
              </div>
              <p className="text-muted-foreground">
                Get notified when new properties match your criteria
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Saved Search</DialogTitle>
                  <DialogDescription>
                    Save your search criteria and get notified about new matching properties
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-name">Search Name</Label>
                    <Input
                      id="search-name"
                      placeholder="e.g., 3BR Apartments in Ikoyi"
                      value={newSearchName}
                      onChange={(e) => setNewSearchName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Notification Frequency</Label>
                    <Select
                      value={newSearchFrequency}
                      onValueChange={(value: any) => setNewSearchFrequency(value)}
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instant (as soon as listed)</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> This will save your current search filters. 
                      You can modify them later from the search page.
                    </p>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSearch} disabled={createSearch.isPending}>
                    {createSearch.isPending ? 'Creating...' : 'Create Search'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      
      <div className="container py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading saved searches...</p>
          </div>
        ) : savedSearches && savedSearches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSearches.map((search) => {
              const criteria = search.criteria ? JSON.parse(search.criteria) : {};
              const isActive = search.isActive === 1;
              
              return (
                <Card key={search.id} className={!isActive ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{search.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          {search.frequency || 'daily'} alerts
                        </CardDescription>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleSearchEnabled(search.id, isActive)}
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Search Criteria Summary */}
                    <div className="space-y-2 text-sm">
                      {criteria.priceMin && criteria.priceMax && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price Range:</span>
                          <span className="font-medium">
                            ₦{(criteria.priceMin / 1000000).toFixed(0)}M - ₦{(criteria.priceMax / 1000000).toFixed(0)}M
                          </span>
                        </div>
                      )}
                      
                      {criteria.bedrooms && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bedrooms:</span>
                          <span className="font-medium">{criteria.bedrooms.join(', ')}</span>
                        </div>
                      )}
                      
                      {criteria.locations && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Locations:</span>
                          <span className="font-medium">{criteria.locations.join(', ')}</span>
                        </div>
                      )}
                      
                      {criteria.propertyTypes && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {criteria.propertyTypes.map((type: string) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Last Notified */}
                    {search.lastNotified && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Last notified: {new Date(search.lastNotified).toLocaleDateString()}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSearch(search.id)}
                        disabled={deleteSearch.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Saved Searches Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a saved search to get notified about new properties that match your criteria
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Search
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Info Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              How Alerts Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Instant Alerts:</strong> Receive an email immediately when a new property matches your criteria
            </p>
            <p>
              <strong>Daily Digest:</strong> Get a summary email once per day with all new matching properties
            </p>
            <p>
              <strong>Weekly Summary:</strong> Receive a weekly roundup of all new matching properties
            </p>
            <p className="text-muted-foreground">
              You can toggle alerts on/off anytime without deleting your saved searches.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
