import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Maximize2, Minimize2, Play, Pause, RotateCcw, 
  Home, Layers, Ruler, Info, Share2, Download 
} from 'lucide-react';
import { toast } from 'sonner';

interface ThreeDTourProps {
  propertyId: number;
  tourUrl?: string;
  images: string[];
  floorPlanUrl?: string;
}

export function ThreeDTour({ propertyId, tourUrl, images, floorPlanUrl }: ThreeDTourProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'tour' | 'dollhouse' | 'floorplan'>('tour');
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Simulated 3D tour data (in production, this would come from Matterport API)
  const rooms = [
    { id: 1, name: 'Living Room', area: 320, image: images[0] || '' },
    { id: 2, name: 'Master Bedroom', area: 280, image: images[1] || '' },
    { id: 3, name: 'Kitchen', area: 200, image: images[2] || '' },
    { id: 4, name: 'Bathroom', area: 120, image: images[3] || '' },
  ];

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleAutoplay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      toast.info('Auto-tour started');
    } else {
      toast.info('Auto-tour paused');
    }
  };

  const handleReset = () => {
    if (iframeRef.current) {
      // Reset iframe or reload
      iframeRef.current.src = iframeRef.current.src;
    }
    toast.success('View reset');
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/property/${propertyId}/3d-tour`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '3D Property Tour',
          text: 'Check out this immersive 3D property tour!',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Tour link copied to clipboard');
    }
  };

  const handleDownload = () => {
    toast.info('Preparing tour download...');
    // In production, this would trigger a download of tour assets
    setTimeout(() => {
      toast.success('Tour download started');
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              3D Property Tour
            </CardTitle>
            <CardDescription>
              Explore the property in immersive 3D
            </CardDescription>
          </div>
          <Badge variant="secondary">Interactive</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tour" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">3D Tour</span>
            </TabsTrigger>
            <TabsTrigger value="dollhouse" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Dollhouse</span>
            </TabsTrigger>
            <TabsTrigger value="floorplan" className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              <span className="hidden sm:inline">Floor Plan</span>
            </TabsTrigger>
          </TabsList>

          {/* 3D Tour View */}
          <TabsContent value="tour" className="mt-4">
            <div 
              ref={containerRef}
              className="relative bg-black rounded-lg overflow-hidden"
              style={{ height: isFullscreen ? '100vh' : '600px' }}
            >
              {tourUrl ? (
                <iframe
                  ref={iframeRef}
                  src={tourUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200'}
                    alt="Property view"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Home className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-semibold mb-2">Interactive 3D Tour</p>
                      <p className="text-sm opacity-80">Click and drag to explore</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Control Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAutoplay}
                  className="text-white hover:text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="text-white hover:text-white hover:bg-white/20"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  className={`text-white hover:text-white hover:bg-white/20 ${showMeasurements ? 'bg-white/20' : ''}`}
                >
                  <Ruler className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowInfo(!showInfo)}
                  className={`text-white hover:text-white hover:bg-white/20 ${showInfo ? 'bg-white/20' : ''}`}
                >
                  <Info className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFullscreen}
                  className="text-white hover:text-white hover:bg-white/20"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>

              {/* Info Overlay */}
              {showInfo && !isFullscreen && (
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-white max-w-xs">
                  <h3 className="font-semibold mb-1">Navigation Tips</h3>
                  <ul className="text-sm space-y-1 opacity-90">
                    <li>• Click and drag to look around</li>
                    <li>• Click arrows to move between rooms</li>
                    <li>• Scroll to zoom in/out</li>
                    <li>• Click hotspots for room details</li>
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Dollhouse View */}
          <TabsContent value="dollhouse" className="mt-4">
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <img
                src={images[0] || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200'}
                alt="Dollhouse view"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Layers className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-semibold mb-2">Dollhouse View</p>
                  <p className="text-sm text-muted-foreground">See the entire property layout at once</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Floor Plan View */}
          <TabsContent value="floorplan" className="mt-4">
            <div className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden border" style={{ height: '600px' }}>
              {floorPlanUrl ? (
                <img
                  src={floorPlanUrl}
                  alt="Floor plan"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Ruler className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-semibold mb-2">Interactive Floor Plan</p>
                    <p className="text-sm text-muted-foreground">Click rooms to navigate</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Room List */}
        <div>
          <h3 className="font-semibold mb-3">Room Navigator</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                className="relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all group"
              >
                <img
                  src={room.image || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400'}
                  alt={room.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
                  <p className="text-white font-semibold text-sm">{room.name}</p>
                  <p className="text-white/80 text-xs">{room.area} sq ft</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleShare} className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Share Tour
          </Button>
          <Button variant="outline" onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Features Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium mb-2">✨ Tour Features</p>
          <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>360° panoramic views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>Room measurements</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>Dollhouse view</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span>Interactive floor plan</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
