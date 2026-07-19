// @ts-nocheck
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Building2, Plus, Folder, Heart, Tag, Share2, Trash2, 
  Edit2, Eye, MapPin, DollarSign, Bed, Bath, Ruler 
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PropertyCollections() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [propertyNotes, setPropertyNotes] = useState("");
  const [propertyTags, setPropertyTags] = useState("");

  const { data: collections, isLoading } = trpc.collections.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createFolderMutation = trpc.collections.createFolder.useMutation({
    onSuccess: () => {
      utils.collections.list.invalidate();
      setIsCreateFolderOpen(false);
      setFolderName("");
      setFolderDescription("");
      toast.success("Folder created successfully");
    },
  });

  const deleteFolderMutation = trpc.collections.deleteFolder.useMutation({
    onSuccess: () => {
      utils.collections.list.invalidate();
      toast.success("Folder deleted");
    },
  });

  const addPropertyMutation = trpc.collections.addProperty.useMutation({
    onSuccess: () => {
      utils.collections.list.invalidate();
      setIsAddPropertyOpen(false);
      setPropertyId("");
      setPropertyNotes("");
      setPropertyTags("");
      toast.success("Property added to collection");
    },
  });

  const removePropertyMutation = trpc.collections.removeProperty.useMutation({
    onSuccess: () => {
      utils.collections.list.invalidate();
      toast.success("Property removed from collection");
    },
  });

  const shareCollectionMutation = trpc.collections.share.useMutation({
    onSuccess: (data) => {
      const shareUrl = `${window.location.origin}/collections/shared/${(data as any).shareId}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    },
  });

  const handleCreateFolder = async () => {
    if (!folderName) {
      toast.error("Please enter a folder name");
      return;
    }

    try {
      await createFolderMutation.mutateAsync({
        name: folderName,
        description: folderDescription,
      });
    } catch (error) {
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (confirm("Are you sure you want to delete this folder? All properties will be moved to favorites.")) {
      try {
        await deleteFolderMutation.mutateAsync({ folderId });
      } catch (error) {
        toast.error("Failed to delete folder");
      }
    }
  };

  const handleAddProperty = async () => {
    if (!propertyId || !selectedFolder) {
      toast.error("Please enter a property ID and select a folder");
      return;
    }

    try {
      await addPropertyMutation.mutateAsync({
        folderId: selectedFolder.id,
        propertyId: parseInt(propertyId),
        notes: propertyNotes,
        tags: propertyTags.split(',').map((t: any) => t.trim()).filter(Boolean),
      });
    } catch (error) {
      toast.error("Failed to add property");
    }
  };

  const handleRemoveProperty = async (folderId: number, propertyId: number) => {
    if (confirm("Remove this property from the collection?")) {
      try {
        await removePropertyMutation.mutateAsync({ folderId, propertyId });
      } catch (error) {
        toast.error("Failed to remove property");
      }
    }
  };

  const handleShareFolder = async (folderId: number) => {
    try {
      await shareCollectionMutation.mutateAsync({ folderId });
    } catch (error) {
      toast.error("Failed to generate share link");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to manage your property collections
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>{APP_TITLE}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <span className="text-sm text-muted-foreground">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Property Collections</h1>
            <p className="text-muted-foreground">
              Organize your favorite properties into custom folders
            </p>
          </div>
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Organize your properties into custom collections
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="folderName">Folder Name</Label>
                  <Input
                    id="folderName"
                    placeholder="e.g., Downtown Condos, Investment Properties"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="folderDescription">Description (Optional)</Label>
                  <Textarea
                    id="folderDescription"
                    placeholder="Add a description for this collection..."
                    value={folderDescription}
                    onChange={(e) => setFolderDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreateFolder}
                  disabled={createFolderMutation.isPending}
                  className="w-full"
                >
                  {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Folders</p>
                  <p className="text-2xl font-bold">{(collections as any)?.length || 0}</p>
                </div>
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saved Properties</p>
                  <p className="text-2xl font-bold">
                    {(collections as any)?.reduce((acc: number, c: any) => acc + c.properties.length, 0) || 0}
                  </p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shared Collections</p>
                  <p className="text-2xl font-bold">
                    {(collections as any)?.filter((c: any) => c.isShared).length || 0}
                  </p>
                </div>
                <Share2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tags</p>
                  <p className="text-2xl font-bold">
                    {new Set((collections as any)?.flatMap((c: any) => c.properties.flatMap((p: any) => p.tags || []))).size || 0}
                  </p>
                </div>
                <Tag className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Folders Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (collections as any)?.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first folder to start organizing properties
              </p>
              <Button onClick={() => setIsCreateFolderOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Folder
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(collections as any)?.map((folder: any) => (
              <Card key={folder.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Folder className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{folder.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {folder.properties.length} properties
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {folder.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {folder.description}
                    </p>
                  )}

                  {/* Property Previews */}
                  {folder.properties.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {folder.properties.slice(0, 3).map((property: any) => (
                        <div
                          key={property.id}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <img
                            src={property.image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'}
                            alt={property.address}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{property.address}</p>
                            <p className="text-xs text-muted-foreground">
                              ${property.price.toLocaleString()}
                            </p>
                            {property.tags && property.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {property.tags.slice(0, 2).map((tag: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProperty(folder.id, property.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {folder.properties.length > 3 && (
                        <p className="text-sm text-center text-muted-foreground">
                          +{folder.properties.length - 3} more properties
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 mb-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">No properties yet</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedFolder(folder);
                        setIsAddPropertyOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleShareFolder(folder.id)}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFolder(folder.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Property Dialog */}
        <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Property to {selectedFolder?.name}</DialogTitle>
              <DialogDescription>
                Add a property with notes and tags
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="propertyId">Property ID</Label>
                <Input
                  id="propertyId"
                  type="number"
                  placeholder="Enter property ID"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="propertyNotes">Notes (Optional)</Label>
                <Textarea
                  id="propertyNotes"
                  placeholder="Add your notes about this property..."
                  value={propertyNotes}
                  onChange={(e) => setPropertyNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="propertyTags">Tags (Optional)</Label>
                <Input
                  id="propertyTags"
                  placeholder="e.g., good-location, needs-renovation (comma-separated)"
                  value={propertyTags}
                  onChange={(e) => setPropertyTags(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAddProperty}
                disabled={addPropertyMutation.isPending}
                className="w-full"
              >
                {addPropertyMutation.isPending ? "Adding..." : "Add Property"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
