import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
  aspect?: number;
}

// Create a cropped image from the canvas
const createCroppedImage = async (
  imageSrc: string,
  croppedAreaPixels: Area
): Promise<{ file: File; previewUrl: string }> => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  
  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not create blob'));
            return;
          }
          
          const file = new File([blob], 'cropped-card.jpg', { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);
          resolve({ file, previewUrl });
        },
        'image/jpeg',
        0.95
      );
    };
    
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = imageSrc;
  });
};

export function ImageCropper({ 
  open, 
  imageSrc, 
  onClose, 
  onCropComplete,
  aspect = 2.5 / 3.5 // Standard trading card aspect ratio
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const onCropAreaComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    
    setIsProcessing(true);
    try {
      const { file, previewUrl } = await createCroppedImage(imageSrc, croppedAreaPixels);
      onCropComplete(file, previewUrl);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg">Crop Your Card</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Position the card in the frame for best grading results
          </p>
        </DialogHeader>
        
        {/* Cropper area */}
        <div className="relative w-full h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropAreaComplete}
            onZoomChange={setZoom}
            cropShape="rect"
            showGrid
            style={{
              containerStyle: { 
                backgroundColor: '#000' 
              },
              cropAreaStyle: {
                border: '2px solid hsl(var(--primary))',
              }
            }}
          />
        </div>
        
        {/* Controls */}
        <div className="p-4 space-y-4 border-t">
          {/* Zoom control */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={([value]) => setZoom(value)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* Rotate button */}
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="gap-2"
            >
              <RotateCw className="w-4 h-4" />
              Rotate 90°
            </Button>
          </div>
        </div>
        
        <DialogFooter className="p-4 pt-0 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Apply Crop
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
