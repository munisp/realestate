import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, ArrowLeft, Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function VirtualStaging() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const propertyId = parseInt(id || '0');

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [stagedImageUrl, setStagedImageUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: property, isLoading: propertyLoading } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 }
  );

  const { data: roomTypes } = trpc.virtualStaging.getRoomTypes.useQuery();
  const { data: styles } = trpc.virtualStaging.getStyles.useQuery();

  const generateStagingMutation = trpc.virtualStaging.generateStaging.useMutation();

  const propertyImages = property?.images ? JSON.parse(property.images) : [];

  const handleGenerateStaging = async () => {
    if (!selectedImage || !selectedRoomType || !selectedStyle) {
      toast.error('Please select an image, room type, and style');
      return;
    }

    setIsGenerating(true);
    setStagedImageUrl('');

    try {
      const result = await generateStagingMutation.mutateAsync({
        propertyId,
        roomType: selectedRoomType as any,
        style: selectedStyle as any,
        originalImageUrl: selectedImage,
      });

      if (result.success && result.stagedImageUrl) {
        setStagedImageUrl(result.stagedImageUrl);
        toast.success('Virtual staging generated successfully!');
      } else {
        toast.error(result.error || 'Failed to generate virtual staging');
      }
    } catch (error) {
      console.error('Virtual staging error:', error);
      toast.error('Failed to generate virtual staging');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Property Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The property you're looking for could not be found.
            </p>
            <Button onClick={() => setLocation('/properties')}>
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation(`/property/${propertyId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wand2 className="h-8 w-8 text-primary" />
              Virtual Staging
            </h1>
            <p className="text-muted-foreground mt-1">
              {property.title || property.addressLine1}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Staging Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Image to Stage
                </label>
                {propertyImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {propertyImages.map((img: string, index: number) => (
                      <div
                        key={index}
                        onClick={() => setSelectedImage(img)}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === img
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Property ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        {selectedImage === img && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary">Selected</Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No images available for this property</p>
                  </div>
                )}
              </div>

              {/* Room Type Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Room Type
                </label>
                <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes?.map((room) => (
                      <SelectItem key={room.value} value={room.value}>
                        {room.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Style Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Staging Style
                </label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staging style" />
                  </SelectTrigger>
                  <SelectContent>
                    {styles?.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        <div>
                          <div className="font-medium">{style.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {style.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateStaging}
                disabled={!selectedImage || !selectedRoomType || !selectedStyle || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 mr-2" />
                    Generate Virtual Staging
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="bg-muted p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Select an empty room image</li>
                  <li>Choose the room type</li>
                  <li>Pick a staging style</li>
                  <li>Generate AI-powered virtual staging</li>
                  <li>Download and share the staged image</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Original Image */}
              {selectedImage && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Original</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedImage, 'original.jpg')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  <img
                    src={selectedImage}
                    alt="Original"
                    className="w-full rounded-lg border"
                  />
                </div>
              )}

              {/* Staged Image */}
              {stagedImageUrl && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-primary" />
                      Virtually Staged
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(stagedImageUrl, 'staged.jpg')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  <img
                    src={stagedImageUrl}
                    alt="Staged"
                    className="w-full rounded-lg border"
                  />
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">
                      {roomTypes?.find(r => r.value === selectedRoomType)?.label}
                    </Badge>
                    <Badge variant="secondary">
                      {styles?.find(s => s.value === selectedStyle)?.label}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Placeholder */}
              {!selectedImage && !stagedImageUrl && (
                <div className="text-center py-16 text-muted-foreground">
                  <Wand2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Preview Available</p>
                  <p className="text-sm">
                    Select an image and configure staging options to generate a preview
                  </p>
                </div>
              )}

              {/* Loading State */}
              {isGenerating && (
                <div className="text-center py-16">
                  <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-lg font-medium mb-2">Generating Virtual Staging...</p>
                  <p className="text-sm text-muted-foreground">
                    This may take 10-20 seconds
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
