import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PhotoUploadProps {
  maxFiles?: number;
  maxSizeInMB?: number;
  onFilesChange: (files: File[]) => void;
  existingPhotos?: string[];
  onRemoveExisting?: (url: string) => void;
}

export function PhotoUpload({
  maxFiles = 5,
  maxSizeInMB = 5,
  onFilesChange,
  existingPhotos = [],
  onRemoveExisting,
}: PhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith("image/")) {
      return `${file.name} is not an image file`;
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `${file.name} exceeds ${maxSizeInMB}MB limit`;
    }

    return null;
  };

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError("");
      const fileArray = Array.from(newFiles);

      // Check total count
      const totalCount = files.length + existingPhotos.length + fileArray.length;
      if (totalCount > maxFiles) {
        setError(`Maximum ${maxFiles} photos allowed`);
        return;
      }

      // Validate each file
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        validFiles.push(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      }

      const updatedFiles = [...files, ...validFiles];
      const updatedPreviews = [...previews, ...newPreviews];

      setFiles(updatedFiles);
      setPreviews(updatedPreviews);
      onFilesChange(updatedFiles);
    },
    [files, previews, existingPhotos.length, maxFiles, maxSizeInMB, onFilesChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    // Revoke preview URL to free memory
    URL.revokeObjectURL(previews[index]);

    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onFilesChange(updatedFiles);
    setError("");
  };

  const removeExistingPhoto = (url: string) => {
    if (onRemoveExisting) {
      onRemoveExisting(url);
    }
  };

  const totalPhotos = files.length + existingPhotos.length;
  const canAddMore = totalPhotos < maxFiles;

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary/50"
            }
          `}
        >
          <input
            type="file"
            id="photo-upload"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Drag and drop photos here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Maximum {maxFiles} photos, up to {maxSizeInMB}MB each
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {totalPhotos} of {maxFiles} photos uploaded
            </p>
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Photo Previews */}
      {(existingPhotos.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Existing Photos */}
          {existingPhotos.map((url, index) => (
            <Card key={`existing-${index}`} className="relative group overflow-hidden">
              <img
                src={url}
                alt={`Existing photo ${index + 1}`}
                className="w-full h-32 object-cover"
              />
              {onRemoveExisting && (
                <button
                  onClick={() => removeExistingPhoto(url)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                Existing
              </div>
            </Card>
          ))}

          {/* New Photos */}
          {previews.map((preview, index) => (
            <Card key={`new-${index}`} className="relative group overflow-hidden">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                {(files[index].size / 1024 / 1024).toFixed(2)} MB
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {existingPhotos.length === 0 && previews.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos uploaded yet</p>
        </div>
      )}
    </div>
  );
}
