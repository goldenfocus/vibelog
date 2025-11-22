'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface TextEditTabProps {
  vibelogId: string;
  initialTitle: string;
  initialContent: string;
  initialTeaser?: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onTeaserChange: (teaser: string) => void;
}

export default function TextEditTab({
  vibelogId,
  initialTitle,
  initialContent,
  initialTeaser,
  onTitleChange,
  onContentChange,
  onTeaserChange,
}: TextEditTabProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [teaser, setTeaser] = useState(initialTeaser || '');
  const [tone, setTone] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange(newTitle);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange(newContent);
  };

  const handleTeaserChange = (newTeaser: string) => {
    setTeaser(newTeaser);
    onTeaserChange(newTeaser);
  };

  const handleRegenerateText = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/regenerate-vibelog-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId,
          currentContent: content,
          tone,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate text');
      }

      const data = await response.json();
      handleContentChange(data.vibelogContent);
      if (data.vibelogTeaser) {
        handleTeaserChange(data.vibelogTeaser);
      }
      setTone('');
      setPrompt('');
      toast.success(t('toasts.vibelogs.textRegenerated'));
    } catch (error) {
      console.error('Text regeneration error:', error);
      toast.error(t('toasts.vibelogs.textRegenerateFailed'));
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Label htmlFor="title" className="mb-2 block">
          Title
        </Label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          className="w-full rounded-lg border border-border/30 bg-background/50 px-4 py-3 text-lg font-semibold text-foreground placeholder-muted-foreground transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
          placeholder={t('placeholders.vibelogTitleEdit')}
        />
      </div>

      {/* Content */}
      <div>
        <Label htmlFor="content" className="mb-2 block">
          Content (Markdown)
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
          placeholder={t('placeholders.vibelogContentEdit')}
        />
      </div>

      {/* Teaser */}
      <div>
        <Label htmlFor="teaser" className="mb-2 block">
          Teaser (Optional)
        </Label>
        <Textarea
          id="teaser"
          value={teaser}
          onChange={e => handleTeaserChange(e.target.value)}
          className="min-h-[100px]"
          placeholder={t('placeholders.teaserText')}
        />
      </div>

      {/* AI Regeneration */}
      <div className="rounded-xl border border-border/50 bg-background/50 p-4">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-electric" />
          Regenerate with AI
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="tone" className="mb-2 block">
              Tone
            </Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone">
                <SelectValue placeholder={t('placeholders.toneSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="humorous">Humorous</SelectItem>
                <SelectItem value="inspiring">Inspiring</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
                <SelectItem value="storytelling">Storytelling</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="prompt" className="mb-2 block">
              Additional Instructions (Optional)
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={t('placeholders.tonePrompt')}
              className="min-h-[80px]"
            />
          </div>
          <Button onClick={handleRegenerateText} disabled={isRegenerating} className="w-full">
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate Text
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
