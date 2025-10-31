'use client';

import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio: number; // e.g., 1 for square (avatar), 3 for header
  onCropComplete: (croppedAreaPixels: Area) => void;
  type: 'avatar' | 'header';
}

/**
 * Image crop modal with zoom and pan controls
 * Uses react-easy-crop for the cropping interface
 */
export function ImageCropModal({
  open,
  onClose,
  imageSrc,
  aspectRatio,
  onCropComplete,
  type,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels);
      onClose();
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crop {type === 'avatar' ? 'Profile Picture' : 'Header Image'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {type === 'avatar'
              ? 'Adjust the crop area to frame your profile picture. The image will be displayed as a circle.'
              : 'Adjust the crop area to frame your header image. Wide format recommended (3:1 aspect ratio).'}
          </p>
        </DialogHeader>

        {/* Crop Area */}
        <div className="relative h-[400px] w-full bg-background">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteInternal}
            cropShape={type === 'avatar' ? 'round' : 'rect'}
            showGrid={true}
            style={{
              containerStyle: {
                backgroundColor: 'hsl(0 0% 6%)',
                borderRadius: '1rem',
              },
              cropAreaStyle: {
                border: '2px solid hsl(217 92% 65%)',
                boxShadow: '0 0 20px hsl(217 92% 65% / 0.3)',
              },
            }}
          />
        </div>

        {/* Zoom Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Zoom</span>
            <span className="font-medium">{Math.round(zoom * 100)}%</span>
          </div>
          <Slider
            value={[zoom]}
            onValueChange={values => setZoom(values[0])}
            min={1}
            max={3}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Recommended Dimensions */}
        <div className="rounded-lg border border-border/50 bg-card/30 p-3 text-sm">
          <p className="font-medium text-foreground">
            {type === 'avatar' ? '📐 Square format (1:1)' : '📐 Wide format (3:1)'}
          </p>
          <p className="mt-1 text-muted-foreground">
            {type === 'avatar'
              ? 'Minimum 200x200 pixels recommended for best quality'
              : 'Minimum 1200x400 pixels recommended for best quality'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Crop & Upload</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
