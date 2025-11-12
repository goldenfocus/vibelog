'use client';

import { BookOpen, ImageIcon, Mic2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { memo, useEffect, useMemo, useRef } from 'react';

import type { CoverImage } from '@/types/micRecorder';

type ProcessingStage = 'transcribe' | 'story' | 'cover' | 'voice';

interface ProcessingRailProps {
  isVisible: boolean;
  transcription: string;
  liveTranscript: string;
  vibelogContent: string;
  coverImage: CoverImage | null;
  voiceCloneId?: string;
  voiceStatus: 'idle' | 'warming' | 'ready' | 'error';
  onVoiceAction?: () => void;
  activeStage: ProcessingStage;
}

const stageOrder: ProcessingStage[] = ['transcribe', 'story', 'cover', 'voice'];

function getStageStatus(stage: ProcessingStage, activeStage: ProcessingStage) {
  const stageIndex = stageOrder.indexOf(stage);
  const activeIndex = stageOrder.indexOf(activeStage);
  if (stageIndex < activeIndex) {
    return 'done';
  }
  if (stageIndex === activeIndex) {
    return 'active';
  }
  return 'pending';
}

const statusCopy: Record<'pending' | 'active' | 'done', string> = {
  pending: 'Queued',
  active: 'In progress',
  done: 'Done',
};

function ProcessingRailComponent({
  isVisible,
  transcription,
  liveTranscript,
  vibelogContent,
  coverImage,
  voiceCloneId,
  voiceStatus,
  onVoiceAction,
  activeStage,
}: ProcessingRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const activeIndex = stageOrder.indexOf(activeStage);

  const transcriptPreview = transcription || liveTranscript;
  const storyPreview = vibelogContent;

  const cards = useMemo(() => {
    const voiceCopy = {
      idle: {
        title: 'Awaiting voice clone',
        description: 'Enable voice cloning to narrate with your real voice.',
        cta: voiceCloneId ? 'Voice detected' : 'Clone voice',
      },
      warming: {
        title: 'Your voice is warming up',
        description: 'We are syncing your clone so playback is instant.',
        cta: 'Preparing…',
      },
      ready: {
        title: 'Voice ready',
        description: 'We will autoplay as soon as audio lands.',
        cta: 'Manage voice',
      },
      error: {
        title: 'Voice needs attention',
        description: 'We could not render audio. Try cloning again.',
        cta: 'Fix voice',
      },
    } as const;

    const voiceState = voiceCopy[voiceStatus];

    return [
      {
        id: 'transcribe' as const,
        title: 'Transcribing',
        icon: <Mic2 className="h-4 w-4" />,
        status: getStageStatus('transcribe', activeStage),
        body: transcriptPreview
          ? `${transcriptPreview.slice(0, 220)}${transcriptPreview.length > 220 ? '…' : ''}`
          : 'Capturing every word from your riff…',
      },
      {
        id: 'story' as const,
        title: 'Story draft',
        icon: <BookOpen className="h-4 w-4" />,
        status: getStageStatus('story', activeStage),
        body: storyPreview
          ? `${storyPreview.slice(0, 220)}${storyPreview.length > 220 ? '…' : ''}`
          : 'Remixing your ideas into a full VibeLog…',
      },
      {
        id: 'cover' as const,
        title: 'Cover art',
        icon: <ImageIcon className="h-4 w-4" />,
        status: getStageStatus('cover', activeStage),
        body: coverImage
          ? 'Swipe to peek at your art direction.'
          : 'Painting your vibe with DALL·E 3…',
      },
      {
        id: 'voice' as const,
        title: 'Voice clone',
        icon: <Sparkles className="h-4 w-4" />,
        status: getStageStatus('voice', activeStage),
        body: voiceState.description,
        cta: voiceState.cta,
      },
    ];
  }, [activeStage, coverImage, storyPreview, transcriptPreview, voiceCloneId, voiceStatus]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const node = cardRefs.current[activeIndex];
    if (node && trackRef.current) {
      node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeIndex, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <section
      ref={trackRef}
      className="relative mb-6 rounded-3xl border border-border/40 bg-card/70 p-4 shadow-xl backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
            Processing rail
          </p>
          <p className="text-sm text-muted-foreground">
            {cards[activeIndex]?.title || 'Finalizing'}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-electric">
          <span className="h-2 w-2 animate-pulse rounded-full bg-electric" />
          <span>{statusCopy[cards[activeIndex]?.status || 'pending']}</span>
        </div>
      </div>

      <div
        className="scrollbar-none flex gap-4 overflow-x-auto scroll-smooth pb-2"
        data-testid="processing-rail"
      >
        {cards.map((card, index) => {
          const status = card.status;
          return (
            <article
              key={card.id}
              ref={el => {
                cardRefs.current[index] = el;
              }}
              className="scroll-snap-align-start min-w-[260px] max-w-[320px] flex-shrink-0 scroll-mx-4 rounded-2xl border border-border/30 bg-muted/20 p-4 shadow-inner"
              data-stage={card.id}
            >
              <header className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${status === 'done' ? 'bg-green-500/10 text-green-300' : status === 'active' ? 'bg-electric/10 text-electric' : 'bg-border/40 text-muted-foreground'}`}
                  >
                    {card.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="text-xs text-muted-foreground">{statusCopy[status]}</p>
                  </div>
                </div>
              </header>
              <p className="text-sm text-foreground/90">{card.body}</p>

              {card.id === 'cover' && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border/20 bg-background/30">
                  {coverImage ? (
                    <Image
                      src={coverImage.url}
                      alt={coverImage.alt || 'Generated cover art'}
                      width={coverImage.width}
                      height={coverImage.height}
                      className="h-auto w-full object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      Generating artwork…
                    </div>
                  )}
                </div>
              )}

              {card.id === 'voice' && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onVoiceAction}
                    className="w-full rounded-2xl border border-border/40 bg-background/40 px-3 py-2 text-xs font-semibold text-foreground transition hover:border-electric hover:text-electric"
                  >
                    {card.cta}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const ProcessingRail = memo(ProcessingRailComponent);
ProcessingRail.displayName = 'ProcessingRail';

export default ProcessingRail;
