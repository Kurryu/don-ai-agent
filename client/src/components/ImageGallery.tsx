import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, Copy, Share2, Wand2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ImageGalleryProps {
  conversationId: number;
}

export default function ImageGallery({ conversationId }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: images, isLoading } = trpc.ai.getImageReferences.useQuery(
    { conversationId },
    { enabled: !!conversationId }
  );

  const generateImageMutation = trpc.ai.generateImage.useMutation({
    onSuccess: () => {
      toast.success("Image generated successfully!");
      setEditPrompt("");
      setIsEditing(false);
      setSelectedImage(null);
    },
    onError: (error) => {
      toast.error("Failed to generate image");
      console.error(error);
    },
  });

  const handleDownload = (imageUrl: string, description: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${description || "image"}.png`;
    link.click();
  };

  const handleCopyUrl = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl);
    toast.success("Image URL copied to clipboard");
  };

  const handleShare = (imageUrl: string, description: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Generated Image",
        text: description || "Check out this AI-generated image",
        url: imageUrl,
      });
    } else {
      handleCopyUrl(imageUrl);
    }
  };

  const handleEditImage = () => {
    if (!editPrompt.trim() || !selectedImage) return;
    generateImageMutation.mutate({
      conversationId,
      prompt: editPrompt,
      imageReferenceIds: [selectedImage.id],
    });
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading images...</div>;
  }

  if (!images || images.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No images generated yet. Create some with the image generation feature!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Image Gallery</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <Card
            key={image.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedImage(image)}
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={image.imageUrl}
                alt={image.description || "Generated image"}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-2">
              <p className="text-xs text-muted-foreground truncate">
                {image.description || "Untitled"}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.description || "Generated Image"}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.description}
                className="w-full rounded-lg"
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedImage.imageUrl, selectedImage.description)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyUrl(selectedImage.imageUrl)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(selectedImage.imageUrl, selectedImage.description)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit"}
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
                    onClick={handleEditImage}
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
                        Regenerate Image
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
