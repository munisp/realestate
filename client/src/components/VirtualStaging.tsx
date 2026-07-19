import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Sparkles, Download, Share2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface VirtualStagingProps {
  propertyId: number;
  images: string[];
}

export function VirtualStaging({ propertyId, images }: VirtualStagingProps) {
  const [selectedImage, setSelectedImage] = useState<string>(images[0] || '');
  const [stagingStyle, setStagingStyle] = useState<string>('modern');
  const [roomType, setRoomType] = useState<string>('living_room');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stagedImages, setStagedImages] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<'before' | 'after' | 'split'>('split');

  const generateStagingMutation = trpc.virtualStaging.generate.useMutation();

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateStagingMutation.mutateAsync({
        propertyId,
        imageUrl: selectedImage,
        style: stagingStyle,
        roomType,
      });

      setStagedImages(prev => ({
        ...prev,
        [selectedImage]: result.stagedImageUrl,
      }));

      toast.success('Virtual staging complete!');
    } catch (error) {
      toast.error('Failed to generate virtual staging');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staged-property-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const handleShare = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Virtually Staged Property',
          text: 'Check out this virtually staged property!',
          url: imageUrl,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(imageUrl);
      toast.success('Link copied to clipboard');
    }
  };

  const stagedImageUrl = stagedImages[selectedImage];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Virtual Staging
        </CardTitle>
        <CardDescription>
          Transform empty spaces with AI-powered furniture and decor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Selection */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Select Image</Label>
          <div className="grid grid-cols-4 gap-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(image)}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === image
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/20'
                }`}
              >
                <img
                  src={image}
                  alt={`Property ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {stagedImages[image] && (
                  <Badge className="absolute top-1 right-1 text-xs">
                    Staged
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Staging Options */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="room-type" className="text-sm font-medium mb-2 block">
              Room Type
            </Label>
            <Select value={roomType} onValueChange={setRoomType}>
              <SelectTrigger id="room-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="living_room">Living Room</SelectItem>
                <SelectItem value="bedroom">Bedroom</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="dining_room">Dining Room</SelectItem>
                <SelectItem value="office">Home Office</SelectItem>
                <SelectItem value="bathroom">Bathroom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="style" className="text-sm font-medium mb-2 block">
              Staging Style
            </Label>
            <Select value={stagingStyle} onValueChange={setStagingStyle}>
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="contemporary">Contemporary</SelectItem>
                <SelectItem value="traditional">Traditional</SelectItem>
                <SelectItem value="minimalist">Minimalist</SelectItem>
                <SelectItem value="scandinavian">Scandinavian</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="bohemian">Bohemian</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedImage}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating Virtual Staging...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Virtual Staging
            </>
          )}
        </Button>

        {/* Before/After Comparison */}
        {stagedImageUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Preview</h3>
              <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)}>
                <TabsList>
                  <TabsTrigger value="before">Before</TabsTrigger>
                  <TabsTrigger value="split">Compare</TabsTrigger>
                  <TabsTrigger value="after">After</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Image Comparison */}
            {activeView === 'before' && (
              <div className="relative aspect-video rounded-lg overflow-hidden border">
                <img
                  src={selectedImage}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4">Original</Badge>
              </div>
            )}

            {activeView === 'after' && (
              <div className="relative aspect-video rounded-lg overflow-hidden border">
                <img
                  src={stagedImageUrl}
                  alt="Staged"
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-primary">
                  Virtually Staged
                </Badge>
              </div>
            )}

            {activeView === 'split' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <img
                    src={selectedImage}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-4 left-4">Before</Badge>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <img
                    src={stagedImageUrl}
                    alt="Staged"
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-4 left-4 bg-primary">After</Badge>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleDownload(stagedImageUrl)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShare(stagedImageUrl)}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-muted-foreground">
            <strong>💡 Pro Tip:</strong> Virtual staging helps buyers visualize the potential of empty spaces,
            increasing engagement by up to 40% and reducing time on market by 30%.
          </p>
        </div>

        {/* Gallery of Staged Images */}
        {Object.keys(stagedImages).length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Staged Images Gallery</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(stagedImages).map(([original, staged], index) => (
                <div
                  key={index}
                  className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer group"
                  onClick={() => {
                    setSelectedImage(original);
                    setActiveView('after');
                  }}
                >
                  <img
                    src={staged}
                    alt={`Staged ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  );
}
