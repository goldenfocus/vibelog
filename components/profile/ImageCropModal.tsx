'use client';

import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { IMAGE_FILTERS, type ImageFilter } from '@/lib/image-filters';
import { cn } from '@/lib/utils';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio: number; // e.g., 1 for square (avatar), 3 for header
  onCropComplete: (croppedAreaPixels: Area, filterId: string) => void;
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
  const [selectedFilter, setSelectedFilter] = useState<ImageFilter>(IMAGE_FILTERS[0]);

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
      onCropComplete(croppedAreaPixels, selectedFilter.id);
      onClose();
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSelectedFilter(IMAGE_FILTERS[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop {type === 'avatar' ? 'Profile Picture' : 'Header Image'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {type === 'avatar'
              ? 'Adjust the crop area to frame your profile picture. The image will be displayed as a circle.'
              : 'Adjust the crop area to frame your header image. Wide format recommended (3:1 aspect ratio).'}
          </p>
        </DialogHeader>

        {/* Crop Area */}
        <div className="relative h-[250px] w-full bg-background sm:h-[400px]">
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
              mediaStyle: {
                filter: selectedFilter.cssFilter,
                transition: 'filter 0.3s ease',
              },
            }}
          />
        </div>

        {/* Filter Picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Filter</span>
            <span className="font-medium">{selectedFilter.name}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {IMAGE_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter)}
                className={cn(
                  'group relative overflow-hidden rounded-lg border-2 transition-all',
                  selectedFilter.id === filter.id
                    ? 'border-electric shadow-lg shadow-electric/20'
                    : 'border-border/50 hover:border-electric/50'
                )}
              >
                {/* Filter thumbnail preview */}
                <div className="relative h-16 w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt={filter.name}
                    className="h-full w-full object-cover"
                    style={{ filter: filter.cssFilter }}
                  />
                  {/* Overlay with filter name */}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-[10px] font-medium text-white">{filter.name}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
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
