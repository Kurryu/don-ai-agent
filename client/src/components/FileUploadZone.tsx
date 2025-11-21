import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, File, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FileUploadZoneProps {
  conversationId: number;
  onFilesUploaded?: (files: any[]) => void;
}

interface UploadingFile {
  tempId: string;
  name: string;
  progress: number;
  error?: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

export default function FileUploadZone({ conversationId, onFilesUploaded }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileMutation = trpc.ai.uploadFile.useMutation();

  const handleUploadSuccess = (data: any, tempId: string) => {
    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.tempId === tempId ? { ...f, progress: 100 } : f
      )
    );
    onFilesUploaded?.([data]);
    toast.success(`${data.filename} uploaded successfully`);
    setTimeout(() => {
      setUploadingFiles((prev) => prev.filter((f) => f.tempId !== tempId));
    }, 1500);
  };

  const handleUploadError = (error: any, tempId: string) => {
    console.error("Upload error:", error);
    const errorMessage = error?.message || "Upload failed";
    toast.error(errorMessage);
    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.tempId === tempId ? { ...f, error: errorMessage, progress: 0 } : f
      )
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset input so same file can be uploaded again
    e.target.value = "";
  };

  const handleFiles = (files: File[]) => {
    files.forEach((file) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 100MB)`);
        return;
      }

      const tempId = `${Date.now()}-${Math.random()}`;
      const uploadingFile: UploadingFile = {
        tempId,
        name: file.name,
        progress: 5,
      };

      setUploadingFiles((prev) => [...prev, uploadingFile]);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.tempId === tempId && f.progress < 90 && !f.error
              ? { ...f, progress: f.progress + Math.random() * 20 }
              : f
          )
        );
      }, 400);

      const reader = new FileReader();
      
      reader.onload = (e) => {
        clearInterval(progressInterval);
        try {
          const dataUrl = e.target?.result as string;
          
          // Validate base64 string
          if (!dataUrl || dataUrl.length === 0) {
            throw new Error("Failed to read file");
          }

          // Extract base64 part from data URL
          const base64Part = dataUrl.split(',')[1];
          if (!base64Part) {
            throw new Error("Invalid base64 data");
          }

          // Send base64 string directly to the server
          uploadFileMutation.mutate(
            {
              conversationId,
              filename: file.name,
              fileData: base64Part,
              mimeType: file.type || "application/octet-stream",
            },
            {
              onSuccess: (data) => handleUploadSuccess(data, tempId),
              onError: (error) => handleUploadError(error, tempId),
            }
          );
        } catch (error) {
          clearInterval(progressInterval);
          const errorMsg = error instanceof Error ? error.message : "Failed to read file";
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.tempId === tempId ? { ...f, error: errorMsg, progress: 0 } : f
            )
          );
          toast.error(errorMsg);
        }
      };

      reader.onerror = () => {
        clearInterval(progressInterval);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.tempId === tempId ? { ...f, error: "Failed to read file", progress: 0 } : f
          )
        );
        toast.error("Failed to read file");
      };

      reader.readAsDataURL(file);
    });
  };

  const removeFile = (tempId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.tempId !== tempId));
  };

  return (
    <div className="space-y-4">
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv,audio/*,video/*"
        />

        <div
          className="flex flex-col items-center justify-center gap-3"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div className="text-center">
            <p className="font-semibold">Drop files here or click to upload</p>
            <p className="text-sm text-muted-foreground">
              Supports images, documents, audio, and more (max 100MB)
            </p>
          </div>
        </div>
      </Card>

      {uploadingFiles.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Uploading Files</h3>
          {uploadingFiles.map((file) => (
            <div key={file.tempId} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                {!file.error && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {Math.round(file.progress)}%
                  </span>
                )}
                {file.error && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.tempId)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {file.error ? (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{file.error}</span>
                </div>
              ) : (
                <Progress value={file.progress} className="h-2" />
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}