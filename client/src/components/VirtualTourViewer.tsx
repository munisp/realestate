import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Info,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Tour {
  id: string;
  title: string;
  type: '360' | 'video';
  url: string;
  thumbnail?: string;
  hotspots?: Array<{
    id: string;
    pitch: number;
    yaw: number;
    text: string;
    sceneId?: string;
  }>;
}

interface VirtualTourViewerProps {
  tours: Tour[];
  propertyTitle?: string;
}

export function VirtualTourViewer({ tours, propertyTitle }: VirtualTourViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const currentTour = tours[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : tours.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < tours.length - 1 ? prev + 1 : 0));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Tour link copied to clipboard');
  };

  if (!tours || tours.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Info className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Virtual Tour Available</h3>
          <p className="text-muted-foreground">
            This property doesn't have a virtual tour yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Viewer */}
      <Card className="overflow-hidden">
        <div className="relative bg-black aspect-video">
          {/* Tour Content */}
          {currentTour.type === '360' ? (
            <div className="w-full h-full flex items-center justify-center">
              {/* In production, this would use Pannellum or similar 360° viewer */}
              <div className="text-white text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{currentTour.title}</h3>
                  <p className="text-sm text-white/70">360° Panoramic View</p>
                  <p className="text-xs text-white/50 mt-2">
                    Drag to look around • Scroll to zoom
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {/* Video Player */}
              <div className="text-white text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                  {isPlaying ? (
                    <Pause className="w-12 h-12" />
                  ) : (
                    <Play className="w-12 h-12" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{currentTour.title}</h3>
                  <p className="text-sm text-white/70">Video Tour</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <Badge className="bg-black/50 text-white border-white/20">
              {currentIndex + 1} / {tours.length}
            </Badge>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                onClick={() => setShowInfo(!showInfo)}
              >
                <Info className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Info Overlay */}
          {showInfo && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
                <h3 className="font-semibold mb-1">{currentTour.title}</h3>
                {propertyTitle && (
                  <p className="text-sm text-white/70">{propertyTitle}</p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={handlePrevious}
              disabled={tours.length === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {currentTour.type === 'video' && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={handleNext}
              disabled={tours.length === 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Thumbnail Navigation */}
      {tours.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {tours.map((tour, index) => (
            <button
              key={tour.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-primary/50'
              }`}
            >
              <div className="w-full h-full bg-muted flex items-center justify-center">
                {tour.type === '360' ? (
                  <div className="text-center">
                    <Maximize className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">360°</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Play className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Video</span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center truncate">
                {tour.title}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tour Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About This Tour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Total Scenes</div>
              <div className="font-semibold">{tours.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">360° Views</div>
              <div className="font-semibold">
                {tours.filter((t) => t.type === '360').length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Video Tours</div>
              <div className="font-semibold">
                {tours.filter((t) => t.type === 'video').length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Hotspots</div>
              <div className="font-semibold">
                {tours.reduce((sum, t) => sum + (t.hotspots?.length || 0), 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
