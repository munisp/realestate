import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Bookmark,
  BookmarkCheck,
  MoreVertical,
  Trash2,
  Share2,
  Copy,
  Eye,
  Star,
  MapPin,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Saved Map Views Component
 * 
 * Displays and manages user's saved map views
 * Features:
 * - List all saved views
 * - Load view (restore map state)
 * - Set default view
 * - Share view (generate link)
 * - Delete view
 * - Quick save current view
 */

interface SavedMapViewsProps {
  onLoadView?: (view: any) => void;
  onSaveView?: (data: {
    name: string;
    description?: string;
    centerLat: number;
    centerLng: number;
    zoom: number;
    filters?: any;
    heatmapMode?: 'density' | 'price' | 'combined' | 'none';
    heatmapIntensity?: number;
    heatmapRadius?: number;
    clusteringEnabled?: boolean;
    minClusterSize?: number;
    isDefault?: boolean;
  }) => void;
  currentMapState?: {
    center: { lat: number; lng: number };
    zoom: number;
    filters?: any;
    heatmapMode?: 'density' | 'price' | 'combined' | 'none';
    heatmapIntensity?: number;
    heatmapRadius?: number;
    clusteringEnabled?: boolean;
    minClusterSize?: number;
  };
}

export function SavedMapViews({
  onLoadView,
  onSaveView,
  currentMapState,
}: SavedMapViewsProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: savedViews, isLoading } = trpc.savedMapViews.list.useQuery();

  // Mutations
  const saveMutation = trpc.savedMapViews.save.useMutation({
    onSuccess: () => {
      toast.success('Map view saved successfully');
      utils.savedMapViews.list.invalidate();
      setSaveDialogOpen(false);
      setSaveName('');
      setSaveDescription('');
      setSetAsDefault(false);
    },
    onError: (error) => {
      toast.error(`Failed to save map view: ${error.message}`);
    },
  });

  const deleteMutation = trpc.savedMapViews.delete.useMutation({
    onSuccess: () => {
      toast.success('Map view deleted');
      utils.savedMapViews.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete map view: ${error.message}`);
    },
  });

  const setDefaultMutation = trpc.savedMapViews.setDefault.useMutation({
    onSuccess: () => {
      toast.success('Default map view set');
      utils.savedMapViews.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to set default: ${error.message}`);
    },
  });

  const generateShareTokenMutation = trpc.savedMapViews.generateShareToken.useMutation({
    onSuccess: (data) => {
      const shareUrl = `${window.location.origin}/map?share=${data.shareToken}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
      utils.savedMapViews.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to generate share link: ${error.message}`);
    },
  });

  const handleSaveCurrentView = () => {
    if (!currentMapState) {
      toast.error('No map state to save');
      return;
    }

    if (!saveName.trim()) {
      toast.error('Please enter a name for this view');
      return;
    }

    saveMutation.mutate({
      name: saveName,
      description: saveDescription || undefined,
      centerLat: currentMapState.center.lat,
      centerLng: currentMapState.center.lng,
      zoom: currentMapState.zoom,
      filters: currentMapState.filters,
      heatmapMode: currentMapState.heatmapMode || 'none',
      heatmapIntensity: currentMapState.heatmapIntensity || 100,
      heatmapRadius: currentMapState.heatmapRadius || 25,
      clusteringEnabled: currentMapState.clusteringEnabled !== false,
      minClusterSize: currentMapState.minClusterSize || 2,
      isDefault: setAsDefault,
      generateShareToken: false,
    });
  };

  const handleLoadView = (view: any) => {
    onLoadView?.(view);
    toast.success(`Loaded "${view.name}"`);
  };

  const handleDeleteView = (id: number, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate({ id });
  };

  const handleShareView = (id: number) => {
    generateShareTokenMutation.mutate({ id });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getHeatmapBadge = (mode: string) => {
    const badges = {
      density: { label: 'Density', color: 'bg-blue-500' },
      price: { label: 'Price', color: 'bg-green-500' },
      combined: { label: 'Combined', color: 'bg-purple-500' },
      none: { label: 'No Heatmap', color: 'bg-gray-500' },
    };
    const badge = badges[mode as keyof typeof badges] || badges.none;
    return (
      <Badge className={`${badge.color} text-white text-xs`}>
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Saved Views</h3>
        </div>
        
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!currentMapState}>
              <BookmarkCheck className="w-4 h-4 mr-2" />
              Save Current View
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Map View</DialogTitle>
              <DialogDescription>
                Save your current map position, zoom level, filters, and heatmap settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g., Downtown Lagos Properties"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="setDefault"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="setDefault" className="cursor-pointer">
                  Set as default view
                </Label>
              </div>

              {currentMapState && (
                <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <p><strong>Center:</strong> {currentMapState.center.lat.toFixed(4)}, {currentMapState.center.lng.toFixed(4)}</p>
                  <p><strong>Zoom:</strong> {currentMapState.zoom}</p>
                  {currentMapState.heatmapMode && currentMapState.heatmapMode !== 'none' && (
                    <p><strong>Heatmap:</strong> {currentMapState.heatmapMode}</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCurrentView} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save View'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Saved Views List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading saved views...
        </div>
      ) : savedViews && savedViews.length > 0 ? (
        <div className="space-y-2">
          {savedViews.map((view) => (
            <Card key={view.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{view.name}</h4>
                    {view.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Default
                      </Badge>
                    )}
                    {getHeatmapBadge(view.heatmapMode || 'none')}
                  </div>
                  
                  {view.description && (
                    <p className="text-sm text-muted-foreground">{view.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Zoom {view.zoom}
                    </span>
                    {view.clusteringEnabled && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Clustering
                      </span>
                    )}
                    <span>Saved {formatDate(view.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLoadView(view)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Load
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!view.isDefault && (
                        <>
                          <DropdownMenuItem onClick={() => handleSetDefault(view.id)}>
                            <Star className="w-4 h-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleShareView(view.id)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      {view.shareToken && (
                        <DropdownMenuItem
                          onClick={() => {
                            const shareUrl = `${window.location.origin}/map?share=${view.shareToken}`;
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Share link copied');
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Share Link
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteView(view.id, view.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">No Saved Views</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Save your current map view to quickly return to it later
          </p>
          <Button
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!currentMapState}
          >
            Save Current View
          </Button>
        </Card>
      )}
    </div>
  );
}
