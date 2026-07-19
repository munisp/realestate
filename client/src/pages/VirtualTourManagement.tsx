import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Upload,
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
  Map,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';

export default function VirtualTourManagement() {
  const { user, isAuthenticated } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tourTitle, setTourTitle] = useState('');
  const [scenes, setScenes] = useState<Array<{ id: string; title: string; imageUrl: string }>>([
    { id: 'scene1', title: 'Living Room', imageUrl: '' },
  ]);

  // In a real implementation, this would fetch user's properties
  const mockProperties = [
    { id: 1, title: 'Luxury Villa in Victoria Island', hasTour: false },
    { id: 2, title: 'Modern Apartment in Lekki', hasTour: true },
    { id: 3, title: 'Townhouse in Ikoyi', hasTour: false },
  ];

  const createTourMutation = trpc.virtualTours.create.useMutation({
    onSuccess: () => {
      toast.success('Virtual tour created successfully!');
      setShowCreateDialog(false);
      setTourTitle('');
      setScenes([{ id: 'scene1', title: 'Living Room', imageUrl: '' }]);
    },
    onError: () => {
      toast.error('Failed to create virtual tour');
    },
  });

  const handleAddScene = () => {
    const newSceneId = `scene${scenes.length + 1}`;
    setScenes([...scenes, { id: newSceneId, title: `Room ${scenes.length + 1}`, imageUrl: '' }]);
  };

  const handleRemoveScene = (index: number) => {
    if (scenes.length > 1) {
      setScenes(scenes.filter((_, i) => i !== index));
    } else {
      toast.error('You must have at least one scene');
    }
  };

  const handleSceneChange = (index: number, field: 'title' | 'imageUrl', value: string) => {
    const newScenes = [...scenes];
    newScenes[index][field] = value;
    setScenes(newScenes);
  };

  const handleCreateTour = () => {
    if (!selectedProperty) {
      toast.error('Please select a property');
      return;
    }

    if (!tourTitle) {
      toast.error('Please enter a tour title');
      return;
    }

    if (scenes.some((s) => !s.title || !s.imageUrl)) {
      toast.error('Please complete all scene details');
      return;
    }

    createTourMutation.mutate({
      propertyId: selectedProperty,
      title: tourTitle,
      scenes: scenes.map((scene) => ({
        ...scene,
        hotSpots: [],
      })),
    });
  };

  const handleImageUpload = async (index: number, file: File) => {
    // In a real implementation, this would upload to S3
    // For now, we'll create a local URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      handleSceneChange(index, 'imageUrl', imageUrl);
      toast.success('Image uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please log in to manage virtual tours.
            </p>
            <Button className="w-full">Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Virtual Tour Management</h1>
              <p className="text-muted-foreground">
                Create and manage 360° virtual tours for your properties
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tour
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Virtual Tour</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Property Selection */}
                  <div>
                    <Label>Select Property</Label>
                    <select
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                      value={selectedProperty || ''}
                      onChange={(e) => setSelectedProperty(Number(e.target.value))}
                    >
                      <option value="">Choose a property...</option>
                      {mockProperties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.title}
                          {property.hasTour ? ' (Has Tour)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tour Title */}
                  <div>
                    <Label>Tour Title</Label>
                    <Input
                      placeholder="e.g., Complete Property Tour"
                      value={tourTitle}
                      onChange={(e) => setTourTitle(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  {/* Scenes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Scenes (Rooms)</Label>
                      <Button size="sm" variant="outline" onClick={handleAddScene}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Scene
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {scenes.map((scene, index) => (
                        <Card key={scene.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 space-y-3">
                                <div>
                                  <Label className="text-xs">Scene Title</Label>
                                  <Input
                                    placeholder="e.g., Living Room"
                                    value={scene.title}
                                    onChange={(e) =>
                                      handleSceneChange(index, 'title', e.target.value)
                                    }
                                    className="mt-1"
                                  />
                                </div>

                                <div>
                                  <Label className="text-xs">360° Image</Label>
                                  <div className="mt-1 flex items-center gap-2">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleImageUpload(index, file);
                                        }
                                      }}
                                      className="flex-1"
                                    />
                                    {scene.imageUrl && (
                                      <Badge variant="default">
                                        <ImageIcon className="h-3 w-3 mr-1" />
                                        Uploaded
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Upload a 360° equirectangular panorama image
                                  </p>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveScene(index)}
                                disabled={scenes.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTour} disabled={createTourMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {createTourMutation.isPending ? 'Creating...' : 'Create Tour'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Properties List */}
      <div className="container py-8">
        <div className="grid gap-4">
          {mockProperties.map((property) => (
            <Card key={property.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{property.title}</h3>
                    <div className="flex items-center gap-2">
                      {property.hasTour ? (
                        <Badge variant="default">Has Virtual Tour</Badge>
                      ) : (
                        <Badge variant="secondary">No Virtual Tour</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {property.hasTour ? (
                      <>
                        <Link href={`/property/${property.id}/virtual-tour`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Tour
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProperty(property.id);
                          setShowCreateDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Tour
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Creating Great Virtual Tours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  360° Photography Tips
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Use a 360° camera or smartphone with panorama mode</li>
                  <li>• Ensure good lighting in all rooms</li>
                  <li>• Keep the camera at eye level (5-6 feet)</li>
                  <li>• Remove clutter and stage rooms nicely</li>
                  <li>• Take photos from room centers for best views</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Map className="h-4 w-4 text-primary" />
                  Tour Best Practices
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Start with the most impressive room</li>
                  <li>• Create logical navigation flow between rooms</li>
                  <li>• Add informative hotspots for key features</li>
                  <li>• Include all major rooms and outdoor spaces</li>
                  <li>• Test the tour before publishing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
