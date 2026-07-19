// @ts-nocheck
import { useParams, Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { VirtualTourViewer } from '@/components/VirtualTourViewer';
import { ArrowLeft, Home } from 'lucide-react';

export default function VirtualTourPage() {
  const params = useParams();
  const propertyId = params.id ? parseInt(params.id) : 0;

  const { data: tourData, isLoading } = trpc.virtualTours.getByProperty.useQuery({
    propertyId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading virtual tour...</p>
        </div>
      </div>
    );
  }

  if (!tourData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">No Virtual Tour Available</h2>
          <p className="text-muted-foreground mb-6">
            This property doesn't have a virtual tour yet.
          </p>
          <Link href={`/property/${propertyId}`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Property
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Convert mock data to tours format for existing VirtualTourViewer component
  const tours = tourData.scenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    type: '360' as const,
    url: scene.imageUrl,
    thumbnail: scene.imageUrl,
    hotspots: scene.hotSpots,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href={`/property/${propertyId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Property
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{tourData.title}</h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Virtual Tour Viewer */}
      <div className="container py-8">
        <VirtualTourViewer
          tours={tours}
          propertyTitle={tourData.title}
        />
      </div>
    </div>
  );
}
