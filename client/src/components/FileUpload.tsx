// @ts-nocheck
import { useState, useCallback } from "react";
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  file: File;
  preview?: string;
  status: "pending" | "uploading" | "success" | "error";
  progress?: number;
  error?: string;
  url?: string;
}

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
  onUpload: (file: File) => Promise<{ url: string }>;
  onRemove?: (index: number) => void;
  label?: string;
  description?: string;
  className?: string;
  showPreview?: boolean;
}

export function FileUpload({
  accept = "image/*,.pdf,.doc,.docx",
  maxSize = 10,
  maxFiles = 5,
  onUpload,
  onRemove,
  label = "Upload Files",
  description = `Drag and drop files here, or click to browse. Max ${maxSize}MB per file.`,
  className,
  showPreview = true,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      return `File size exceeds ${maxSize}MB limit`;
    }

    // Check file type
    const acceptedTypes = accept.split(",").map(t => t.trim());
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const mimeType = file.type;

    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith(".")) {
        return fileExtension === type.toLowerCase();
      }
      if (type.endsWith("/*")) {
        return mimeType.startsWith(type.replace("/*", ""));
      }
      return mimeType === type;
    });

    if (!isAccepted) {
      return `File type not accepted. Allowed: ${accept}`;
    }

    return null;
  };

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles = Array.from(fileList);

      // Check max files limit
      if (files.length + newFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      for (const file of newFiles) {
        const error = validateFile(file);

        const uploadedFile: UploadedFile = {
          file,
          status: error ? "error" : "pending",
          error,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        };

        setFiles(prev => [...prev, uploadedFile]);

        if (!error) {
          // Start upload
          const index = files.length + newFiles.indexOf(file);
          setFiles(prev =>
            prev.map((f, i) =>
              i === index ? { ...f, status: "uploading" as const } : f
            )
          );

          try {
            const { url } = await onUpload(file);
            setFiles(prev =>
              prev.map((f, i) =>
                i === index
                  ? { ...f, status: "success" as const, url }
                  : f
              )
            );
          } catch (err) {
            setFiles(prev =>
              prev.map((f, i) =>
                i === index
                  ? {
                      ...f,
                      status: "error" as const,
                      error: err instanceof Error ? err.message : "Upload failed",
                    }
                  : f
              )
            );
          }
        }
      }
    },
    [files.length, maxFiles, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    const file = files[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
    onRemove?.(index);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8" />;
    }
    return <FileText className="h-8 w-8" />;
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileInput}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="text-sm">
            <span className="font-medium text-primary">Click to upload</span> or
            drag and drop
          </div>
          <div className="text-xs text-muted-foreground">
            {accept.split(",").join(", ")} (max {maxSize}MB)
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-4">
                {showPreview && uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="h-16 w-16 object-cover rounded"
                  />
                ) : (
                  <div className="h-16 w-16 flex items-center justify-center bg-muted rounded">
                    {getFileIcon(uploadedFile.file)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    {getStatusIcon(uploadedFile.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploadedFile.error && (
                    <p className="text-xs text-red-600 mt-1">
                      {uploadedFile.error}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploadedFile.status === "uploading"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
