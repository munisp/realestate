// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface PhotoGalleryManagerProps {
  projectId: number;
  existingPhotos?: string[];
  onUpdate?: () => void;
}

export function PhotoGalleryManager({ projectId, existingPhotos = [], onUpdate }: PhotoGalleryManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const uploadMutation = trpc.documents.uploadProjectPhotos.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one photo");
      return;
    }

    setUploading(true);

    try {
      // Convert files to base64 for upload
      const filePromises = selectedFiles.map(file => {
        return new Promise<{ name: string; data: string; type: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              data: reader.result as string,
              type: file.type,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const filesData = await Promise.all(filePromises);

      const result = await uploadMutation.mutateAsync({
        projectId,
        photos: filesData,
      });

      setPhotos(prev => [...prev, ...result.urls]);
      setSelectedFiles([]);
      toast.success(`${filesData.length} photo(s) uploaded successfully`);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photoUrl: string) => {
    // TODO: Implement photo deletion from S3
    setPhotos(prev => prev.filter(url => url !== photoUrl));
    toast.success("Photo removed");
    
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photo-upload">Upload Photos</Label>
              <div className="mt-2 flex items-center gap-4">
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Maximum 5MB per image. Supported formats: JPG, PNG, WebP
              </p>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div>
                <Label>Selected Files ({selectedFiles.length})</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeSelectedFile(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Photos Gallery */}
      {photos.length > 0 && (
        <div>
          <Label className="text-lg">Project Photos ({photos.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {photos.map((photoUrl, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={photoUrl}
                    alt={`Project photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removePhoto(photoUrl)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && selectedFiles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No photos uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload photos to showcase your project's progress
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
