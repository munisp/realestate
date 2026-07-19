import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Building2, Eye, Video } from "lucide-react";
import { Link, useParams } from "wouter";

export default function VirtualTour() {
  const { propertyId } = useParams<{ propertyId: string }>();

  const { data: property, isLoading: propertyLoading } = trpc.properties.getById.useQuery(
    { id: parseInt(propertyId!) },
    { enabled: !!propertyId }
  );

  const { data: tours, isLoading: toursLoading } = trpc.virtualTours.getByProperty.useQuery(
    { propertyId: parseInt(propertyId!) },
    { enabled: !!propertyId }
  );

  if (propertyLoading || toursLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Property Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/properties">Back to Properties</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tour360 = tours?.filter(t => t.tourType === '360_image') || [];
  const tour3D = tours?.filter(t => t.tourType === '3d_model') || [];
  const tourVideos = tours?.filter(t => t.tourType === 'video') || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <Button variant="outline" asChild>
            <Link href={`/property/${propertyId}`}>Back to Property</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Virtual Tour</h1>
          <p className="text-muted-foreground">
            {property.title || property.addressLine1}
          </p>
        </div>

        {!tours || tours.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Eye className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No virtual tours available for this property</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="360">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="360">360° Views ({tour360.length})</TabsTrigger>
              <TabsTrigger value="3d">3D Models ({tour3D.length})</TabsTrigger>
              <TabsTrigger value="video">Videos ({tourVideos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="360" className="mt-6">
              {tour360.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No 360° tours available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {tour360.map(tour => (
                    <Card key={tour.id}>
                      <CardHeader>
                        <CardTitle>{tour.title || '360° View'}</CardTitle>
                        {tour.description && (
                          <CardDescription>{tour.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="relative w-full h-[500px] bg-muted rounded-lg overflow-hidden">
                          <img
                            src={tour.mediaUrl}
                            alt={tour.title || '360° View'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="text-center text-white">
                              <Eye className="h-16 w-16 mx-auto mb-4" />
                              <p className="text-lg font-medium">Click and drag to explore</p>
                              <p className="text-sm text-white/70">360° panoramic view</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="3d" className="mt-6">
              {tour3D.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No 3D models available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {tour3D.map(tour => (
                    <Card key={tour.id}>
                      <CardHeader>
                        <CardTitle>{tour.title || '3D Model'}</CardTitle>
                        {tour.description && (
                          <CardDescription>{tour.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="relative w-full h-[600px] bg-muted rounded-lg overflow-hidden">
                          <iframe
                            src={tour.mediaUrl}
                            className="w-full h-full"
                            allow="xr-spatial-tracking"
                            title={tour.title || '3D Model'}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="video" className="mt-6">
              {tourVideos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No video tours available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {tourVideos.map(tour => (
                    <Card key={tour.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5" />
                          {tour.title || 'Video Tour'}
                        </CardTitle>
                        {tour.description && (
                          <CardDescription>{tour.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                          <video
                            src={tour.mediaUrl}
                            controls
                            className="w-full h-full"
                            poster={tour.thumbnailUrl || undefined}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
