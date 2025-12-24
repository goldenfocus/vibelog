import PublishActions from '@/components/mic/PublishActions';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';
import type { CoverImage } from '@/types/micRecorder';

interface ProcessedVibelogCardProps {
  t: (key: string, vars?: Record<string, unknown>) => string;
  displayParsed: { title: string | null; body: string };
  displayContent: string;
  coverImage: CoverImage | null;
  isLoggedIn: boolean;
  isTeaserContent: boolean;
  attribution: { handle: string; profileUrl: string };
  vibelogId?: string;
  shouldShowReadMore: boolean;
  onReadMore: () => void;
  onCopy: () => void;
  onShare: () => void;
  onPublish?: () => Promise<void>;
  onEditTeaser: () => void;
  onEditFull: () => void;
  onUpgradePrompt: (message: string, benefits: string[]) => void;
}

export function ProcessedVibelogCard({
  t,
  displayParsed,
  displayContent,
  coverImage,
  isLoggedIn,
  isTeaserContent,
  attribution,
  vibelogId,
  shouldShowReadMore,
  onReadMore,
  onCopy,
  onShare,
  onPublish,
  onEditTeaser,
  onEditFull,
  onUpgradePrompt,
}: ProcessedVibelogCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/20 bg-card shadow-lg">
      <div className="border-b border-border/10 bg-gradient-to-r from-electric/5 to-transparent p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{t('recorder.polishedVibelog')}</h3>
        </div>

        <PublishActions
          content={displayContent}
          title={displayParsed.title || undefined}
          author={attribution.handle}
          vibelogId={vibelogId}
          isLoggedIn={isLoggedIn}
          isTeaserContent={isTeaserContent}
          onCopy={onCopy}
          onEdit={onEditTeaser}
          onShare={onShare}
          onPublish={onPublish}
          onUpgradePrompt={onUpgradePrompt}
        />
      </div>

      <div className="p-8">
        {displayParsed.title && (
          <h1 className="mb-4 bg-gradient-electric bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl">
            {displayParsed.title}
          </h1>
        )}

        {coverImage && (
          <div className="mb-6">
            <img
              src={coverImage.url}
              alt={coverImage.alt}
              width={coverImage.width}
              height={coverImage.height}
              className="h-auto w-full rounded-2xl border border-border/10 shadow-md"
              loading="eager"
            />
          </div>
        )}

        <VibelogContentRenderer
          content={displayParsed.body || displayContent}
          isTeaser={shouldShowReadMore}
          onReadMore={onReadMore}
        />
      </div>

      <div className="border-t border-border/10 bg-muted/5">
        <div className="p-6 text-center">
          {isLoggedIn ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{t('components.micRecorder.createdBy')}</span>
              <button
                onClick={() => window.open(attribution.profileUrl, '_blank', 'noopener')}
                className="font-medium text-electric transition-colors hover:text-electric-glow"
              >
                {attribution.handle}
              </button>
              <button
                onClick={() => window.open(attribution.profileUrl, '_blank', 'noopener')}
                className="text-muted-foreground transition-colors hover:text-electric"
              >
                {attribution.profileUrl.replace(/^https?:\/\//, '')}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <button
                onClick={() => window.open('https://vibelog.io', '_blank', 'noopener')}
                className="rounded-lg border border-border/30 bg-muted/40 px-3 py-1.5 text-xs font-normal text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground"
              >
                vibelog.io
              </button>
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <PublishActions
            content={displayContent}
            title={displayParsed.title || undefined}
            author={attribution.handle}
            vibelogId={vibelogId}
            isLoggedIn={isLoggedIn}
            isTeaserContent={isTeaserContent}
            onCopy={onCopy}
            onEdit={onEditFull}
            onShare={onShare}
            onUpgradePrompt={onUpgradePrompt}
          />
        </div>
      </div>
    </div>
  );
}
