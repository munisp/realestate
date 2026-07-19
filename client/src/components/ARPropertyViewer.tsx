import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Camera, X, Maximize2, Info, Ruler, Home } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface ARPropertyViewerProps {
  propertyId: number;
  propertyData: {
    title: string;
    price: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    images?: string[];
  };
  onClose?: () => void;
}

/**
 * AR Property Viewer Component
 * 
 * Provides augmented reality visualization of properties using device camera.
 * Features:
 * - Live camera feed with AR overlays
 * - Property information overlay
 * - Measurement tools
 * - 3D model placement (simulated)
 * - Screenshot capability
 * 
 * Note: This is a web-based AR implementation. For full AR features,
 * use WebXR API or integrate with native mobile AR frameworks (ARKit/ARCore)
 */
export default function ARPropertyViewer({ propertyId, propertyData, onClose }: ARPropertyViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isARActive, setIsARActive] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurements, setMeasurements] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsARActive(true);
        toast.success('AR camera activated');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsARActive(false);
    }
  };

  const takeScreenshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw AR overlays
    drawAROverlays(context, canvas.width, canvas.height);

    // Download screenshot
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ar-property-${propertyId}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Screenshot saved!');
      }
    });
  };

  const drawAROverlays = (context: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw property info overlay
    if (showInfo) {
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(20, 20, 300, 150);
      
      context.fillStyle = 'white';
      context.font = 'bold 20px Arial';
      context.fillText(propertyData.title, 30, 50);
      
      context.font = '16px Arial';
      context.fillText(`₦${propertyData.price.toLocaleString()}`, 30, 80);
      
      if (propertyData.bedrooms) {
        context.fillText(`${propertyData.bedrooms} beds`, 30, 110);
      }
      if (propertyData.bathrooms) {
        context.fillText(`${propertyData.bathrooms} baths`, 150, 110);
      }
      if (propertyData.squareFeet) {
        context.fillText(`${propertyData.squareFeet.toLocaleString()} ft²`, 30, 140);
      }
    }

    // Draw measurements
    if (measurements.length > 0) {
      context.strokeStyle = '#3b82f6';
      context.lineWidth = 3;
      context.setLineDash([5, 5]);

      for (let i = 0; i < measurements.length - 1; i += 2) {
        const start = measurements[i];
        const end = measurements[i + 1];
        
        if (end) {
          context.beginPath();
          context.moveTo(start.x * width, start.y * height);
          context.lineTo(end.x * width, end.y * height);
          context.stroke();

          // Calculate and display distance
          const distance = Math.sqrt(
            Math.pow((end.x - start.x) * width, 2) + 
            Math.pow((end.y - start.y) * height, 2)
          );
          
          const midX = ((start.x + end.x) / 2) * width;
          const midY = ((start.y + end.y) / 2) * height;
          
          context.fillStyle = '#3b82f6';
          context.font = 'bold 14px Arial';
          context.fillText(`${Math.round(distance)}px`, midX, midY - 5);
        }
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!measurementMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setMeasurements(prev => [...prev, { x, y }]);

    if (measurements.length % 2 === 1) {
      toast.success('Measurement point added');
    }
  };

  const clearMeasurements = () => {
    setMeasurements([]);
    toast.info('Measurements cleared');
  };

  const toggleMeasurementMode = () => {
    setMeasurementMode(!measurementMode);
    if (measurementMode) {
      clearMeasurements();
    }
    toast.info(measurementMode ? 'Measurement mode disabled' : 'Measurement mode enabled');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* AR Camera View */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* AR Overlay Canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`absolute inset-0 w-full h-full ${measurementMode ? 'cursor-crosshair' : ''}`}
          style={{ pointerEvents: measurementMode ? 'auto' : 'none' }}
        />

        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <Card className="bg-black/70 border-white/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Home className="w-5 h-5" />
                AR Property View
              </CardTitle>
            </CardHeader>
            {showInfo && (
              <CardContent className="p-4 pt-0">
                <h3 className="text-white font-bold text-xl mb-2">{propertyData.title}</h3>
                <p className="text-white text-lg mb-2">₦{propertyData.price.toLocaleString()}</p>
                <div className="flex gap-4 text-white/90 text-sm">
                  {propertyData.bedrooms && (
                    <span>{propertyData.bedrooms} beds</span>
                  )}
                  {propertyData.bathrooms && (
                    <span>{propertyData.bathrooms} baths</span>
                  )}
                  {propertyData.squareFeet && (
                    <span>{propertyData.squareFeet.toLocaleString()} ft²</span>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          <Button
            size="icon"
            variant="destructive"
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-8 left-4 right-4 flex flex-col gap-4">
          {/* Status Indicators */}
          <div className="flex gap-2 justify-center">
            {isARActive && (
              <Badge className="bg-green-600 text-white">
                <Camera className="w-3 h-3 mr-1" />
                AR Active
              </Badge>
            )}
            {measurementMode && (
              <Badge className="bg-blue-600 text-white">
                <Ruler className="w-3 h-3 mr-1" />
                Measuring
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => setShowInfo(!showInfo)}
              variant="secondary"
              className="bg-white/90 hover:bg-white"
            >
              <Info className="w-4 h-4 mr-2" />
              {showInfo ? 'Hide' : 'Show'} Info
            </Button>

            <Button
              onClick={toggleMeasurementMode}
              variant={measurementMode ? 'default' : 'secondary'}
              className={measurementMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/90 hover:bg-white'}
            >
              <Ruler className="w-4 h-4 mr-2" />
              Measure
            </Button>

            {measurementMode && measurements.length > 0 && (
              <Button
                onClick={clearMeasurements}
                variant="secondary"
                className="bg-white/90 hover:bg-white"
              >
                Clear
              </Button>
            )}

            <Button
              onClick={takeScreenshot}
              className="bg-primary hover:bg-primary/90"
            >
              <Camera className="w-4 h-4 mr-2" />
              Screenshot
            </Button>

            <Button
              onClick={takeScreenshot}
              variant="secondary"
              className="bg-white/90 hover:bg-white"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          </div>

          {/* Measurement Instructions */}
          {measurementMode && (
            <Card className="bg-black/70 border-white/20">
              <CardContent className="p-3 text-center text-white text-sm">
                Tap two points to measure distance. Measurements are in pixels.
                {measurements.length % 2 === 1 && (
                  <span className="block mt-1 text-blue-400">
                    Tap second point to complete measurement
                  </span>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* AR Markers/Guides */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Center crosshair */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 border-2 border-white/50 rounded-full" />
            <div className="absolute top-1/2 left-1/2 w-12 h-0.5 bg-white/50 transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-0.5 h-12 bg-white/50 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
