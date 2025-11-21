import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Trash2, Wand2, Loader2, File } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FileListProps {
  conversationId: number;
}

export default function FileList({ conversationId }: FileListProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: files, isLoading, refetch } = trpc.ai.getFiles.useQuery(
    { conversationId },
    { enabled: !!conversationId }
  );

  const generateImageMutation = trpc.ai.generateImage.useMutation({
    onSuccess: () => {
      toast.success("Image generated from file successfully!");
      setEditPrompt("");
      setIsEditing(false);
      setSelectedFile(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to generate image from file");
      console.error(error);
    },
  });

  const deleteFileMutation = trpc.ai.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("File deleted successfully");
      setSelectedFile(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Failed to delete file");
      console.error(error);
    },
  });

  const handleDownload = (fileUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    link.click();
  };

  const handleCopyUrl = (fileUrl: string) => {
    navigator.clipboard.writeText(fileUrl);
    toast.success("File URL copied to clipboard");
  };

  const handleDeleteFile = () => {
    if (!selectedFile) return;
    if (confirm("Are you sure you want to delete this file?")) {
      deleteFileMutation.mutate({ fileId: selectedFile.id });
    }
  };

  const handleEditFile = () => {
    if (!editPrompt.trim() || !selectedFile) return;
    generateImageMutation.mutate({
      conversationId,
      prompt: editPrompt,
      originalImages: [
        {
          url: selectedFile.url,
          mimeType: selectedFile.mimeType || "image/jpeg",
        },
      ],
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  };

  const isEditableFile = selectedFile && 
    selectedFile.mimeType && 
    selectedFile.mimeType.startsWith("image/");

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading files...</div>;
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No files uploaded yet. Upload files to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Uploaded Files</h2>
      <div className="space-y-2">
        {files.map((file) => (
          <Card
            key={file.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedFile(file)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <File className="w-5 h-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                  </p>
                </div>
              </div>
              {file.mimeType?.startsWith("image/") && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  🎨 Editable
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile?.filename}
              {isEditableFile && (
                <Badge variant="secondary" className="text-xs">
                  🎨 Editable
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              {selectedFile.mimeType?.startsWith("image/") && (
                <img
                  src={selectedFile.url}
                  alt={selectedFile.filename}
                  className="w-full rounded-lg max-h-96 object-cover"
                />
              )}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">File Name:</span>
                  <p className="text-muted-foreground">{selectedFile.filename}</p>
                </div>
                <div>
                  <span className="font-medium">File Size:</span>
                  <p className="text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span>
                  <p className="text-muted-foreground">{formatDate(selectedFile.createdAt)}</p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="text-muted-foreground">{selectedFile.mimeType || "Unknown"}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedFile.url, selectedFile.filename)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyUrl(selectedFile.url)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                {isEditableFile && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteFile}
                  disabled={deleteFileMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
              {isEditing && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <label className="text-sm font-medium">Edit prompt</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Describe how you want to modify this image
                    </p>
                    <Input
                      placeholder="e.g., Add a sunset, change colors to blue, add more details..."
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      disabled={generateImageMutation.isPending}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleEditFile}
                    disabled={!editPrompt.trim() || generateImageMutation.isPending}
                  >
                    {generateImageMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Variation
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
