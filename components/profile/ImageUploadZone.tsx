'use client';

import { Upload, X, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useRef } from 'react';
import { Area } from 'react-easy-crop';

import { ImageCropModal } from '@/components/profile/ImageCropModal';
import { Button } from '@/components/ui/button';
import { getOrientedImageUrl } from '@/lib/image-orientation';
import { cn } from '@/lib/utils';

interface ImageUploadZoneProps {
  onUploadComplete: (url: string) => void;
  currentImage?: string;
  type: 'avatar' | 'header';
  className?: string;
}

/**
 * Ultra-modern image upload component with drag & drop
 * Features:
 * - Smooth drag & drop with visual feedback
 * - File picker fallback
 * - Real-time preview
 * - Upload progress
 * - Buttery animations
 */
export function ImageUploadZone({
  onUploadComplete,
  currentImage,
  type,
  className,
}: ImageUploadZoneProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');

  const handleFile = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be less than 10MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create properly oriented image URL for cropper (handles EXIF orientation)
    getOrientedImageUrl(file)
      .then(url => {
        setImageSrc(url);
        setShowCropModal(true);
      })
      .catch(err => {
        console.error('Failed to load image:', err);
        setError('Failed to load image');
      });
  }, []);

  const handleCropComplete = useCallback(
    async (croppedAreaPixels: Area, filterId: string) => {
      if (!selectedFile) {
        return;
      }

      setUploading(true);
      setUploadSuccess(false);

      try {
        // Upload to API with crop data and filter
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('type', type);
        formData.append('cropData', JSON.stringify(croppedAreaPixels));
        formData.append('filterId', filterId);

        const response = await fetch('/api/profile/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Upload failed');
        }

        const data = await response.json();

        // Success! Show preview
        setPreview(data.url);
        setUploadSuccess(true);
        onUploadComplete(data.url);

        // Force refresh to invalidate caches and update Navigation avatar
        router.refresh();

        // Clear success indicator after animation
        setTimeout(() => {
          setUploadSuccess(false);
        }, 2000);
      } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        setPreview(currentImage || null);
      } finally {
        setUploading(false);
        setSelectedFile(null);
        // Clean up blob URL to prevent memory leak
        if (imageSrc && imageSrc.startsWith('blob:')) {
          URL.revokeObjectURL(imageSrc);
        }
        setImageSrc('');
      }
    },
    [selectedFile, type, onUploadComplete, currentImage, router, imageSrc]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview(null);
      onUploadComplete('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onUploadComplete]
  );

  const isAvatar = type === 'avatar';
  const hasImage = preview || currentImage;

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300',
          isDragging
            ? 'scale-[1.02] border-electric bg-electric/10'
            : 'border-border/50 hover:border-electric/50 hover:bg-muted/30',
          uploading && 'pointer-events-none',
          isAvatar ? 'aspect-square' : 'aspect-[3/1]'
        )}
      >
        {/* Current/Preview Image */}
        {hasImage && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview || currentImage}
              alt={type}
              className={cn(
                'h-full w-full object-cover transition-transform duration-300 will-change-transform group-hover:scale-105',
                uploading && 'opacity-50'
              )}
              style={{ transform: 'translateZ(0)' }}
            />
            <div
              className="will-change-opacity absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ transform: 'translateZ(0)' }}
            />
          </div>
        )}

        {/* Upload UI */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center transition-opacity duration-300',
            hasImage && !uploading && !isDragging && 'opacity-0 group-hover:opacity-100'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-electric" />
              <p className="text-sm font-medium text-foreground">Uploading...</p>
            </>
          ) : uploadSuccess ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 animate-in zoom-in-50">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-sm font-medium text-green-500">Upload complete!</p>
            </>
          ) : (
            <>
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full bg-electric/10 transition-all duration-300',
                  isDragging && 'scale-110 bg-electric/20'
                )}
              >
                <Upload className={cn('h-6 w-6 text-electric', isDragging && 'animate-bounce')} />
              </div>
              <div>
                <p className={cn('text-sm font-medium text-foreground', hasImage && 'text-white')}>
                  {isDragging ? 'Drop it!' : hasImage ? 'Change image' : `Upload ${type} image`}
                </p>
                <p
                  className={cn('mt-1 text-xs text-muted-foreground', hasImage && 'text-white/70')}
                >
                  {isDragging ? 'Release to upload' : 'Click or drag & drop'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Remove Button */}
        {hasImage && !uploading && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Upload Success Ring */}
        {uploadSuccess && (
          <div className="pointer-events-none absolute inset-0 duration-300 animate-in fade-in">
            <div className="absolute inset-0 animate-pulse rounded-2xl ring-4 ring-green-500/50 ring-offset-4 ring-offset-background" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500 animate-in slide-in-from-top-1">
          {error}
        </div>
      )}

      {/* Helper Text */}
      {!error && !uploading && (
        <p className="mt-2 text-xs text-muted-foreground">
          JPG, PNG, WebP or GIF. Max 10MB. {isAvatar ? 'Square' : 'Wide format'} recommended.
        </p>
      )}

      {/* Crop Modal */}
      <ImageCropModal
        open={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedFile(null);
          // Clean up blob URL to prevent memory leak
          if (imageSrc && imageSrc.startsWith('blob:')) {
            URL.revokeObjectURL(imageSrc);
          }
          setImageSrc('');
        }}
        imageSrc={imageSrc}
        aspectRatio={type === 'avatar' ? 1 : 3}
        onCropComplete={handleCropComplete}
        type={type}
      />
    </div>
  );
}
