'use client';

import { Loader2, Sparkles, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ImageEditTabProps {
  vibelogId: string;
  currentImage?: string;
  currentTitle: string;
  onImageChange: (url: string) => void;
}

export default function ImageEditTab({
  vibelogId,
  currentImage,
  currentTitle,
  onImageChange,
}: ImageEditTabProps) {
  const { t } = useI18n();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState(currentImage || '');
  const [prompt, setPrompt] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImage) {
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('vibelogId', vibelogId);

      const response = await fetch('/api/vibelog/upload-cover', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      if (data.success && data.url) {
        setCoverImage(data.url);
        setSelectedImage(null);
        setImagePreview(null);
        onImageChange(data.url);
        toast.success(t('toasts.vibelogs.imageUploaded'));
      } else {
        throw new Error(data.error || t('toasts.vibelogs.imageUploadFailed'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(t('toasts.vibelogs.imageUploadFailed'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRegenerateImage = async () => {
    setIsRegeneratingImage(true);
    try {
      const response = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          summary: prompt || '',
          tone: prompt || 'cinematic',
          postId: vibelogId,
          username: 'user', // TODO: Get from auth
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit errors with user-friendly message
        if (response.status === 429) {
          const message = data.message || 'Rate limit reached. Try again later.';
          console.warn('Cover generation rate limited:', message);
          toast.error(message, { duration: 5000 });
          return;
        }
        // Handle service unavailable (daily limit)
        if (response.status === 503) {
          const message = data.message || 'AI service temporarily unavailable.';
          console.warn('Cover generation unavailable:', message);
          toast.error(message, { duration: 5000 });
          return;
        }
        throw new Error(data.error || 'Failed to regenerate image');
      }

      if (data.success && data.url) {
        setCoverImage(data.url);
        onImageChange(data.url);
        toast.success(t('toasts.vibelogs.imageRegenerated'));
      } else {
        throw new Error(data.error || t('toasts.vibelogs.imageRegenerateFailed'));
      }
    } catch (error) {
      console.error('Image regeneration error:', error);
      toast.error(t('toasts.vibelogs.imageRegenerateFailed'));
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Image */}
      {coverImage && (
        <div>
          <Label className="mb-2 block">Current Cover Image</Label>
          <img
            src={coverImage}
            alt={currentTitle}
            className="max-h-[300px] w-full rounded-xl object-cover"
          />
        </div>
      )}

      {/* Upload New Image */}
      <div className="rounded-xl border border-border/50 bg-background/50 p-4">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Upload className="h-4 w-4 text-electric" />
          Upload New Image
        </h3>
        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-electric file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
          />
          {imagePreview && (
            <div>
              <Label className="mb-2 block">Preview</Label>
              <img
                src={imagePreview}
                alt={t('altText.preview')}
                className="max-h-[200px] w-full rounded-xl object-cover"
              />
            </div>
          )}
          <Button
            onClick={handleUploadImage}
            disabled={!selectedImage || isUploadingImage}
            className="w-full"
          >
            {isUploadingImage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Regenerate with AI */}
      <div className="rounded-xl border border-border/50 bg-background/50 p-4">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-electric" />
          Regenerate with AI
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="image-prompt" className="mb-2 block">
              Custom Prompt (Optional)
            </Label>
            <Textarea
              id="image-prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={t('placeholders.imagePrompt')}
              className="min-h-[80px]"
            />
          </div>
          <Button onClick={handleRegenerateImage} disabled={isRegeneratingImage} className="w-full">
            {isRegeneratingImage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate Image
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
