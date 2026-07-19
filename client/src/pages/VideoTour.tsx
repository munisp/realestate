// @ts-nocheck
import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { VideoCall } from '@/components/VideoCall';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export default function VideoTour() {
  const [, params] = useRoute('/video-tour/:roomName');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState<number | undefined>();
  const [propertyTitle, setPropertyTitle] = useState<string | undefined>();

  // Extract property ID from room name if format is "property-123"
  useEffect(() => {
    if (params?.roomName) {
      const match = params.roomName.match(/property-(\d+)/);
      if (match) {
        const id = parseInt(match[1]);
        setPropertyId(id);
        
        // Fetch property details
        trpc.properties.getById.query({ id }).then((property) => {
          setPropertyTitle(property.title || property.addressLine1);
        }).catch(console.error);
      }
    }
  }, [params?.roomName]);

  const handleCallEnd = () => {
    // Redirect back to property detail or home
    if (propertyId) {
      setLocation(`/properties/${propertyId}`);
    } else {
      setLocation('/');
    }
  };

  if (!params?.roomName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Room</h1>
          <Button onClick={() => setLocation('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(propertyId ? `/properties/${propertyId}` : '/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <VideoCall
          roomName={params.roomName}
          displayName={user?.name || 'Guest'}
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          onCallEnd={handleCallEnd}
        />
      </div>
    </div>
  );
}
