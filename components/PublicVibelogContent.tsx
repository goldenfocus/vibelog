'use client';

import { useRouter } from 'next/navigation';

import VibelogActions from '@/components/VibelogActions';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';
import type { ExportFormat } from '@/lib/export';

interface PublicVibelogContentProps {
  vibelog: {
    id: string;
    title: string;
    content: string;
    user_id: string | null;
    public_slug: string;
  };
}

export default function PublicVibelogContent({ vibelog }: PublicVibelogContentProps) {
  const router = useRouter();

  const handleRemix = () => {
    // Redirect to homepage with remix content
    const remixUrl = `/?remix=${encodeURIComponent(vibelog.content)}`;
    router.push(remixUrl);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/v/${vibelog.public_slug}`;
    const shareData = {
      title: vibelog.title,
      text: `Check out "${vibelog.title}" on VibeLog`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // URL copied to clipboard
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleExport = (format: ExportFormat) => {
    console.log('Export format:', format);
    // Export handled by ExportButton component
  };

  return (
    <div>
      {/* Content with beautiful formatting */}
      <VibelogContentRenderer content={vibelog.content} />

      {/* Action Buttons */}
      <div className="mt-12 border-t border-border/40 pt-8">
        <VibelogActions
          vibelogId={vibelog.id}
          content={vibelog.content}
          title={vibelog.title}
          authorId={vibelog.user_id || undefined}
          onRemix={handleRemix}
          onShare={handleShare}
          onExport={handleExport}
          variant="default"
        />
      </div>
    </div>
  );
}
