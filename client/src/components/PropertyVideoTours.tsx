import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Upload, Youtube, Video } from "lucide-react";

interface PropertyVideoToursProps {
  propertyId: number;
}

export function PropertyVideoTours({ propertyId }: PropertyVideoToursProps) {
  const videos = [
    {
      id: 1,
      title: "Full Property Walkthrough",
      description: "Complete tour of all rooms",
      type: "youtube",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      duration: "5:32",
      views: 1247,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Video Tours</h2>
        <Button><Upload className="w-4 h-4 mr-2" />Upload</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {videos.map((video) => (
          <Card key={video.id}>
            <CardContent className="p-0">
              <div className="aspect-video">
                <iframe src={video.url} className="w-full h-full rounded-t-lg" allowFullScreen />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{video.title}</h3>
                <p className="text-sm text-muted-foreground">{video.description}</p>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{video.duration}</Badge>
                  <span>{video.views} views</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
