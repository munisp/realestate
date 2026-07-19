import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Maximize2, ChevronLeft, ChevronRight, Play } from "lucide-react";

interface VirtualTourProps {
  photos360?: string[];
  videoUrl?: string;
}

export function VirtualTour({ photos360 = [], videoUrl }: VirtualTourProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasPhotos = photos360.length > 0;
  const hasVideo = !!videoUrl;

  if (!hasPhotos && !hasVideo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Play className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Virtual Tour Available</h3>
          <p className="text-muted-foreground text-center">
            360° photos and video tours will appear here when available
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Vimeo
    if (url.includes("vimeo.com")) {
      const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos360.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos360.length) % photos360.length);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""}>
      <Tabs defaultValue={hasPhotos ? "360" : "video"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {hasPhotos && <TabsTrigger value="360">360° Photos</TabsTrigger>}
          {hasVideo && <TabsTrigger value="video">Video Tour</TabsTrigger>}
        </TabsList>

        {hasPhotos && (
          <TabsContent value="360">
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  {/* 360° Photo Viewer */}
                  <div className="relative h-[500px] bg-black rounded-lg overflow-hidden">
                    <img
                      src={photos360[currentPhotoIndex]}
                      alt={`360° view ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-contain"
                    />

                    {/* Navigation Controls */}
                    {photos360.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-4 top-1/2 -translate-y-1/2"
                          onClick={prevPhoto}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                          onClick={nextPhoto}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        {/* Photo Counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                          {currentPhotoIndex + 1} / {photos360.length}
                        </div>
                      </>
                    )}

                    {/* Fullscreen Button */}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-4 right-4"
                      onClick={toggleFullscreen}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Thumbnail Navigation */}
                  {photos360.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto p-4">
                      {photos360.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex
                              ? "border-primary"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-4 bg-muted/50 rounded-b-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      💡 Click and drag to explore the 360° view
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasVideo && (
          <TabsContent value="video">
            <Card>
              <CardContent className="p-0">
                <div className="relative h-[500px] bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={getEmbedUrl(videoUrl)}
                    title="Property Video Tour"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullscreen
                  />
                </div>
                <div className="p-4 bg-muted/50 rounded-b-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    🎥 Watch the complete video tour of this property
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {isFullscreen && (
        <Button
          variant="secondary"
          className="fixed top-4 right-4"
          onClick={toggleFullscreen}
        >
          Exit Fullscreen
        </Button>
      )}
    </div>
  );
}
