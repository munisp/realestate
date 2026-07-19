import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import ARPropertyViewer from '@/components/ARPropertyViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, AlertCircle, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ARPropertyView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showAR, setShowAR] = useState(false);

  const propertyId = parseInt(id || '0');

  const { data: property, isLoading, error } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 }
  );

  // Check if device supports AR features
  const isARSupported = () => {
    return (
      'mediaDevices' in navigator &&
      'getUserMedia' in navigator.mediaDevices
    );
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
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

  if (showAR) {
    return (
      <ARPropertyViewer
        propertyId={propertyId}
        propertyData={{
          title: property.title || property.addressLine1,
          price: property.price,
          bedrooms: property.bedrooms || undefined,
          bathrooms: property.bathrooms || undefined,
          squareFeet: property.squareFeet || undefined,
          images: property.images ? JSON.parse(property.images) : [],
        }}
        onClose={() => setShowAR(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-6 h-6" />
              AR Property Visualization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property Preview */}
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {property.title || property.addressLine1}
              </h2>
              <p className="text-3xl font-bold text-primary mb-4">
                ₦{property.price.toLocaleString()}
              </p>
              
              {property.primaryImage && (
                <img
                  src={property.primaryImage}
                  alt={property.title || property.addressLine1}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}

              <div className="grid grid-cols-3 gap-4 text-center">
                {property.bedrooms && (
                  <div>
                    <p className="text-2xl font-bold">{property.bedrooms}</p>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                  </div>
                )}
                {property.bathrooms && (
                  <div>
                    <p className="text-2xl font-bold">{property.bathrooms}</p>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                  </div>
                )}
                {property.squareFeet && (
                  <div>
                    <p className="text-2xl font-bold">{property.squareFeet.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Sq Ft</p>
                  </div>
                )}
              </div>
            </div>

            {/* AR Features */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">AR Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>View property information overlaid on your camera feed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Measure distances and dimensions in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Capture screenshots with AR overlays</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Visualize property data in your environment</span>
                </li>
              </ul>
            </div>

            {/* System Requirements */}
            {!isARSupported() && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your device doesn't support AR features. Camera access is required.
                </AlertDescription>
              </Alert>
            )}

            {!isMobile() && (
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  For the best AR experience, use a mobile device with a camera.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => setShowAR(true)}
                disabled={!isARSupported()}
                className="flex-1"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Launch AR View
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(`/property/${propertyId}`)}
                size="lg"
              >
                Back to Property
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">How to use AR View:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Grant camera permission when prompted</li>
                <li>Point your camera at a flat surface or open space</li>
                <li>Use the measurement tool to measure distances</li>
                <li>Take screenshots to save AR views</li>
                <li>Toggle info overlay to show/hide property details</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
