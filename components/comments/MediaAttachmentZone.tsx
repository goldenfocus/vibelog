'use client';

import { Image, Video, X, Upload, Loader2 } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import type { MediaAttachment } from '@/types/comments';

interface MediaAttachmentZoneProps {
  attachments: MediaAttachment[];
  onChange: (attachments: MediaAttachment[]) => void;
  maxFiles?: number;
  maxImageSize?: number; // MB
  maxVideoSize?: number; // MB
}

export default function MediaAttachmentZone({
  attachments,
  onChange,
  maxFiles = 5,
  maxImageSize = 10,
  maxVideoSize = 100,
}: MediaAttachmentZoneProps) {
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<MediaAttachment | null> => {
      const fileId = `${Date.now()}-${file.name}`;
      setUploading(prev => [...prev, fileId]);

      try {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          toast.error('Only images and videos are allowed');
          return null;
        }

        // Validate file size
        const maxSize = isImage ? maxImageSize : maxVideoSize;
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSize) {
          toast.error(`File too large. Max ${maxSize}MB for ${isImage ? 'images' : 'videos'}`);
          return null;
        }

        // Upload to storage
        const formData = new FormData();
        formData.append(isImage ? 'image' : 'video', file);

        const response = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const { url } = await response.json();

        // Create media attachment object
        const attachment: MediaAttachment = {
          type: isImage ? 'image' : 'video',
          url,
          thumbnail_url: null, // TODO: Generate thumbnails in future
          width: null,
          height: null,
        };

        // Get image dimensions for images
        if (isImage) {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              attachment.width = img.naturalWidth;
              attachment.height = img.naturalHeight;
              URL.revokeObjectURL(img.src);
              resolve();
            };
            img.onerror = reject;
          });
        }

        toast.success(`${isImage ? 'Image' : 'Video'} uploaded successfully!`);
        return attachment;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(error instanceof Error ? error.message : 'Upload failed');
        return null;
      } finally {
        setUploading(prev => prev.filter(id => id !== fileId));
      }
    },
    [maxImageSize, maxVideoSize]
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const remainingSlots = maxFiles - attachments.length;
    if (files.length > remainingSlots) {
      toast.error(`Maximum ${maxFiles} files allowed. You can add ${remainingSlots} more.`);
      return;
    }

    const filesArray = Array.from(files);
    const uploadedAttachments: MediaAttachment[] = [];

    for (const file of filesArray) {
      const attachment = await uploadFile(file);
      if (attachment) {
        uploadedAttachments.push(attachment);
      }
    }

    if (uploadedAttachments.length > 0) {
      onChange([...attachments, ...uploadedAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index));
    toast.success('Attachment removed');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      {attachments.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed transition-all ${
            dragActive
              ? 'border-electric bg-electric/5'
              : 'border-border/30 bg-muted/30 hover:border-border/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={e => handleFiles(e.target.files)}
            className="sr-only"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading.length > 0}
            className="w-full p-6 text-center transition-opacity disabled:opacity-50"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-electric/10">
              {uploading.length > 0 ? (
                <Loader2 className="h-6 w-6 animate-spin text-electric" />
              ) : (
                <Upload className="h-6 w-6 text-electric" />
              )}
            </div>

            <p className="text-sm font-medium text-foreground">
              {uploading.length > 0 ? 'Uploading...' : 'Add photos or videos'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag & drop or click to browse • {maxFiles - attachments.length} slots remaining
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Images up to {maxImageSize}MB • Videos up to {maxVideoSize}MB
            </p>
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((attachment, index) => (
            <div key={index} className="group relative aspect-square overflow-hidden rounded-lg">
              {attachment.type === 'image' ? (
                <img
                  src={attachment.url}
                  alt={`Attachment ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Overlay with delete button */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => removeAttachment(index)}
                  className="rounded-full bg-red-500 p-2 text-white transition-transform hover:scale-110"
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Type badge */}
              <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1">
                {attachment.type === 'image' ? (
                  <Image className="h-3 w-3 text-white" />
                ) : (
                  <Video className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-electric/5 px-4 py-3 text-sm text-electric">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading {uploading.length} file{uploading.length > 1 ? 's' : ''}...
        </div>
      )}
    </div>
  );
}
