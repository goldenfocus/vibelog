'use client';

import { Edit2, ImageIcon, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RegeneratePanel } from '@/components/vibelog/RegeneratePanel';

interface VibelogEditModalFullProps {
  isOpen: boolean;
  onClose: () => void;
  vibelog: {
    id: string;
    title: string;
    content: string;
    teaser?: string;
    slug: string;
    cover_image_url?: string;
    cover_image_alt?: string;
  };
}

type EditTab = 'text' | 'image';

export default function VibelogEditModalFull({
  isOpen,
  onClose,
  vibelog,
}: VibelogEditModalFullProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EditTab>('text');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

  // Text editing state
  const [title, setTitle] = useState(vibelog.title);
  const [content, setContent] = useState(vibelog.content);
  // Only use teaser if it exists and is different from content
  // If teaser equals content, treat it as if there's no teaser
  const initialTeaser = vibelog.teaser && vibelog.teaser !== vibelog.content ? vibelog.teaser : '';
  const [teaser, setTeaser] = useState(initialTeaser);
  const [slug, setSlug] = useState(vibelog.slug);
  const [prompt, setPrompt] = useState('');

  // Image editing state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState(vibelog.cover_image_url || '');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

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
      formData.append('vibelogId', vibelog.id);

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
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
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
          title: title || vibelog.title,
          summary: teaser || content.substring(0, 200),
          tone: prompt || 'cinematic',
          postId: vibelog.id,
          username: 'user', // TODO: Get from auth
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate image');
      }

      const data = await response.json();
      if (data.success && data.url) {
        setCoverImage(data.url);
        toast.success('Image regenerated successfully!');
      } else {
        throw new Error(data.error || 'Failed to regenerate image');
      }
    } catch (error) {
      console.error('Image regeneration error:', error);
      toast.error('Failed to regenerate image');
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleRegenerationApply = async (updates: {
    title?: string;
    content?: string;
    teaser?: string;
    slug?: string;
  }) => {
    // Apply AI-generated suggestions to local state
    if (updates.title) {
      setTitle(updates.title);
    }
    if (updates.content) {
      setContent(updates.content);
    }
    if (updates.teaser) {
      setTeaser(updates.teaser);
    }
    if (updates.slug) {
      setSlug(updates.slug);
    }
    toast.success('AI suggestions applied! Click "Save Changes" to persist.');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: {
        vibelogId: string;
        title?: string;
        content: string;
        teaser?: string;
        slug?: string;
        coverImage?: {
          url: string;
          alt: string;
          width: number;
          height: number;
        };
      } = {
        vibelogId: vibelog.id,
        content,
      };

      if (title !== vibelog.title) {
        payload.title = title;
      }

      if (teaser) {
        payload.teaser = teaser;
      }

      if (slug !== vibelog.slug) {
        payload.slug = slug;
      }

      if (coverImage && coverImage !== vibelog.cover_image_url) {
        payload.coverImage = {
          url: coverImage,
          alt: vibelog.cover_image_alt || title || vibelog.title,
          width: 1920,
          height: 1080,
        };
      }

      const response = await fetch('/api/update-vibelog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update vibelog');
      }

      router.refresh();
      onClose();
      toast.success('Vibelog updated successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget && !isSaving) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-6">
          <h2 className="text-2xl font-bold text-foreground">Edit Vibelog</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
              activeTab === 'text'
                ? 'border-b-2 border-electric text-electric'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit2 className="mr-2 inline h-4 w-4" />
            Edit Text
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
              activeTab === 'image'
                ? 'border-b-2 border-electric text-electric'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ImageIcon className="mr-2 inline h-4 w-4" />
            Edit Cover Image
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'text' ? (
            <div className="space-y-6">
              {/* Manual Edit */}
              <div>
                <Label htmlFor="title" className="mb-2 block">
                  Title
                </Label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border/30 bg-background/50 px-4 py-3 text-lg font-semibold text-foreground placeholder-muted-foreground transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
                  placeholder="Enter vibelog title..."
                />
              </div>

              <div>
                <Label htmlFor="content" className="mb-2 block">
                  Content (Markdown)
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Edit your vibelog content..."
                />
              </div>

              <div>
                <Label htmlFor="teaser" className="mb-2 block">
                  Teaser (Optional)
                </Label>
                <Textarea
                  id="teaser"
                  value={teaser}
                  onChange={e => setTeaser(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Optional teaser text for previews..."
                />
              </div>

              {/* AI Regeneration - Universal Panel */}
              <RegeneratePanel
                vibelogId={vibelog.id}
                currentTitle={title}
                currentDescription={content}
                currentTeaser={teaser}
                currentSlug={slug}
                onApply={handleRegenerationApply}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Image */}
              {coverImage && (
                <div>
                  <Label className="mb-2 block">Current Cover Image</Label>
                  <img
                    src={coverImage}
                    alt={vibelog.cover_image_alt || vibelog.title}
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
                        alt="Preview"
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
                      placeholder="e.g., make it more colorful, add a sunset, cinematic style"
                      className="min-h-[80px]"
                    />
                  </div>
                  <Button
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage}
                    className="w-full"
                  >
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 border-t border-border/50 p-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
