'use client';

import { Image, Video, X, Upload, Loader2, Sparkles } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/components/providers/I18nProvider';
import { IMAGE_FILTERS, type ImageFilter } from '@/lib/image-filters';
import { cn } from '@/lib/utils';
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
  const { t } = useI18n();
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ImageFilter>(IMAGE_FILTERS[0]);
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
          toast.error(t('toasts.attachments.onlyMedia'));
          return null;
        }

        // Validate file size
        const maxSize = isImage ? maxImageSize : maxVideoSize;
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSize) {
          toast.error(
            t('toasts.attachments.fileTooLarge', { maxSize, type: isImage ? 'images' : 'videos' })
          );
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

        toast.success(t('toasts.attachments.uploaded', { type: isImage ? 'Image' : 'Video' }));
        return attachment;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(error instanceof Error ? error.message : t('toasts.attachments.uploadFailed'));
        return null;
      } finally {
        setUploading(prev => prev.filter(id => id !== fileId));
      }
    },
    [maxImageSize, maxVideoSize, t]
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const remainingSlots = maxFiles - attachments.length;
    if (files.length > remainingSlots) {
      toast.error(t('toasts.attachments.maxFiles', { max: maxFiles, remaining: remainingSlots }));
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
    toast.success(t('toasts.attachments.removed'));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const applyFilter = (index: number, filter: ImageFilter) => {
    const updated = [...attachments];
    // Store filter CSS on the attachment for client-side preview
    updated[index] = {
      ...updated[index],
      filter: filter.cssFilter,
    };
    onChange(updated);
    setSelectedFilter(filter);
    toast.success(t('toasts.attachments.filterApplied', { name: filter.name }));
  };

  const toggleEdit = (index: number) => {
    if (editingIndex === index) {
      setEditingIndex(null);
    } else {
      setEditingIndex(index);
      // Reset to current filter or Original
      setSelectedFilter(IMAGE_FILTERS[0]);
    }
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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {attachments.map((attachment, index) => (
              <div key={index} className="space-y-2">
                <div className="group relative aspect-square overflow-hidden rounded-lg">
                  {attachment.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.url}
                      alt={t('altText.attachment', { index: index + 1 })}
                      className="h-full w-full object-cover"
                      style={{ filter: (attachment as any).filter || 'none' }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay with action buttons */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {attachment.type === 'image' && (
                      <button
                        onClick={() => toggleEdit(index)}
                        className="rounded-full bg-electric p-2 text-white transition-transform hover:scale-110"
                        aria-label={t('ariaLabels.editFilters')}
                        title={t('titles.applyFilters')}
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeAttachment(index)}
                      className="rounded-full bg-red-500 p-2 text-white transition-transform hover:scale-110"
                      aria-label={t('ariaLabels.removeAttachment')}
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

                {/* Filter Selector (appears below image when editing) */}
                {attachment.type === 'image' && editingIndex === index && (
                  <div className="space-y-2 rounded-lg border border-electric/30 bg-card/50 p-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-electric">
                      <Sparkles className="h-3 w-3" />
                      <span>Choose a filter</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {IMAGE_FILTERS.map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => applyFilter(index, filter)}
                          className={cn(
                            'group/filter relative overflow-hidden rounded border transition-all',
                            selectedFilter.id === filter.id
                              ? 'border-electric shadow-sm shadow-electric/20'
                              : 'border-border/30 hover:border-electric/50'
                          )}
                        >
                          <div className="relative h-12 w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={attachment.url}
                              alt={t('altText.filter', { name: filter.name })}
                              className="h-full w-full object-cover"
                              style={{ filter: filter.cssFilter }}
                            />
                            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover/filter:opacity-100">
                              <span className="text-[9px] font-medium text-white">
                                {filter.name}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
