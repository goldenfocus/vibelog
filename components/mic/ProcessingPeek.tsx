'use client';

import { BookOpen, ImageIcon, Mic2 } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';

import type { CoverImage } from '@/types/micRecorder';

type ProcessingPeekProps = {
  transcription: string;
  vibelogContent: string;
  coverImage: CoverImage | null;
  isVisible: boolean;
};

function ProcessingPeekComponent({
  transcription,
  vibelogContent,
  coverImage,
  isVisible,
}: ProcessingPeekProps) {
  const hasAnyContent = Boolean(transcription || vibelogContent || coverImage);

  if (!isVisible || !hasAnyContent) {
    return null;
  }

  const snippet = (text: string, len = 220) => {
    if (!text) {
      return '';
    }
    return text.length > len ? `${text.slice(0, len)}…` : text;
  };

  return (
    <div className="mb-6 rounded-3xl border border-border/40 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
        Sneak peek
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {transcription ? (
          <article className="rounded-2xl border border-border/20 bg-muted/30 p-4 shadow-inner">
            <header className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Mic2 className="h-4 w-4 text-electric" />
              Transcript
            </header>
            <p className="text-sm text-foreground/90">{snippet(transcription)}</p>
          </article>
        ) : (
          <article className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-4 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <Mic2 className="h-4 w-4" />
              Listening
            </div>
            We&apos;re finishing the transcript…
          </article>
        )}

        {vibelogContent ? (
          <article className="rounded-2xl border border-border/20 bg-muted/30 p-4 shadow-inner">
            <header className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4 text-electric" />
              Story draft
            </header>
            <p className="text-sm text-foreground/90">{snippet(vibelogContent)}</p>
          </article>
        ) : (
          <article className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-4 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <BookOpen className="h-4 w-4" />
              Writing
            </div>
            Turning your words into a polished story…
          </article>
        )}
      </div>

      {coverImage ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border/20">
          <Image
            src={coverImage.url}
            alt={coverImage.alt || 'Cover preview'}
            width={coverImage.width}
            height={coverImage.height}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border/40 p-4 text-sm text-muted-foreground">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <ImageIcon className="h-4 w-4" />
            Cover art
          </div>
          Painting your cover in the background…
        </div>
      )}
    </div>
  );
}

const ProcessingPeek = memo(ProcessingPeekComponent);
ProcessingPeek.displayName = 'ProcessingPeek';

export default ProcessingPeek;
