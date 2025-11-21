import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Upload, 
  Copy, 
  Download, 
  Trash2, 
  Loader2,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Layer {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  width: number;
  height: number;
}

interface ImageComposerProps {
  conversationId: number;
  onCompose?: (data: {
    layers: Layer[];
    instructions: string;
  }) => void;
}

export default function ImageComposer({ 
  conversationId, 
  onCompose 
}: ImageComposerProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleAddLayer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newLayer: Layer = {
          id: Math.random().toString(36).substr(2, 9),
          imageUrl,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          zIndex: layers.length,
          width: img.width,
          height: img.height,
        };
        setLayers([...layers, newLayer]);
        setSelectedLayerId(newLayer.id);
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(layers.length > 1 ? layers[0].id : null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedLayer || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setIsDragging(true);
    setDragOffset({
      x: startX - selectedLayer.x,
      y: startY - selectedLayer.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectedLayer || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const newX = currentX - dragOffset.x;
    const newY = currentY - dragOffset.y;

    setLayers(layers.map(l =>
      l.id === selectedLayerId
        ? { ...l, x: newX, y: newY }
        : l
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateLayer = (updates: Partial<Layer>) => {
    setLayers(layers.map(l =>
      l.id === selectedLayerId
        ? { ...l, ...updates }
        : l
    ));
  };

  const handleResetPosition = () => {
    if (!selectedLayer) return;
    updateLayer({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
  };

  const handleExportComposition = async () => {
    if (layers.length === 0) {
      toast.error("Add images to compose");
      return;
    }

    if (onCompose) {
      onCompose({ layers, instructions });
      toast.success("Composition ready for AI processing!");
      return;
    }

    // Fallback: Create a composite canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let loadedCount = 0;
    const images: { img: HTMLImageElement; layer: Layer }[] = [];

    layers.forEach((layer) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        images.push({ img, layer });
        loadedCount++;

        if (loadedCount === layers.length) {
          images.sort((a, b) => a.layer.zIndex - b.layer.zIndex);
          
          images.forEach(({ img, layer }) => {
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.translate(layer.x + (layer.width * layer.scale) / 2, layer.y + (layer.height * layer.scale) / 2);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            ctx.scale(layer.scale, layer.scale);
            ctx.drawImage(img, -(layer.width / 2), -(layer.height / 2), layer.width, layer.height);
            ctx.restore();
          });

          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = `composition-${Date.now()}.png`;
          link.click();
          toast.success("Composition exported!");
        }
      };
      img.src = layer.imageUrl;
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Image Composer</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas Area */}
        <Card className="lg:col-span-2 p-4 space-y-4">
          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden cursor-move"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              maxWidth: "100%",
            }}
          >
            {layers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <p className="text-center">
                  Add images to start composing
                </p>
              </div>
            )}

            {/* Canvas Layers */}
            {layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={cn(
                  "absolute cursor-grab active:cursor-grabbing transition-all",
                  selectedLayerId === layer.id && "ring-2 ring-primary"
                )}
                style={{
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  zIndex: layer.zIndex,
                  transform: `rotate(${layer.rotation}deg) scale(${layer.scale})`,
                  opacity: layer.opacity,
                  transformOrigin: "center",
                }}
              >
                <img
                  src={layer.imageUrl}
                  alt="Layer"
                  className="pointer-events-none select-none"
                  style={{
                    width: `${layer.width}px`,
                    height: `${layer.height}px`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <label className="flex-1">
              <Button className="w-full" variant="outline" asChild>
                <div>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Image Layer
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddLayer}
                    className="hidden"
                  />
                </div>
              </Button>
            </label>
          </div>
        </Card>

        {/* Controls Sidebar */}
        <Card className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Layers</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={cn(
                    "p-2 rounded border cursor-pointer transition-colors",
                    selectedLayerId === layer.id
                      ? "bg-primary/10 border-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Layer {index + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayer(layer.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <img
                    src={layer.imageUrl}
                    alt="Layer thumbnail"
                    className="w-full h-16 object-cover rounded mt-2"
                  />
                </div>
              ))}
            </div>
          </div>

          {selectedLayer && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm">Layer Properties</h4>

              <div>
                <label className="text-xs font-medium">Position X</label>
                <Input
                  type="number"
                  value={Math.round(selectedLayer.x)}
                  onChange={(e) => updateLayer({ x: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Position Y</label>
                <Input
                  type="number"
                  value={Math.round(selectedLayer.y)}
                  onChange={(e) => updateLayer({ y: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Scale</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={selectedLayer.scale}
                    onChange={(e) => updateLayer({ scale: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs min-w-fit">{selectedLayer.scale.toFixed(1)}x</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Rotation</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={selectedLayer.rotation}
                    onChange={(e) => updateLayer({ rotation: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs min-w-fit">{selectedLayer.rotation}°</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Opacity</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedLayer.opacity}
                    onChange={(e) => updateLayer({ opacity: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs min-w-fit">{Math.round(selectedLayer.opacity * 100)}%</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Z-Index</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateLayer({ zIndex: Math.max(0, selectedLayer.zIndex - 1) })}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateLayer({ zIndex: selectedLayer.zIndex + 1 })}
                  >
                    ↑
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleResetPosition}
              >
                <RotateCcw className="w-3 h-3 mr-2" />
                Reset
              </Button>
            </div>
          )}

          {layers.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="text-xs font-medium">Editing Instructions</label>
                <Textarea
                  placeholder="Describe what you want (e.g., 'make this man look like he's sleeping in the forest')"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-1 min-h-24 resize-none"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleExportComposition}
              >
                <Download className="w-4 h-4 mr-2" />
                Save Composition
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
