'use client';

import { Code, FileJson, FileText, Music } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Export format configuration
 * Icons from lucide-react (already used in codebase)
 */
const EXPORT_FORMATS = [
  { format: 'markdown', label: '.md', icon: FileText, title: 'Markdown' },
  { format: 'html', label: '.html', icon: Code, title: 'HTML' },
  { format: 'text', label: '.txt', icon: FileText, title: 'Plain Text' },
  { format: 'json', label: '.json', icon: FileJson, title: 'JSON-LD' },
] as const;

interface ExportLinksProps {
  vibelogId: string;
  vibelogSlug?: string;
  audioUrl?: string | null;
  className?: string;
  showHeader?: boolean;
}

/**
 * ExportLinks - Permanent row of subtle export format links
 *
 * Design:
 * - Subtle: 40% opacity + grayscale when inactive
 * - Premium: Color reveals on hover
 * - SEO-friendly: Real <a href> links (crawlable by AI/bots)
 * - Dual behavior: Click downloads, URL without ?download shows content inline
 *
 * AI agents can:
 * 1. See these links in the HTML
 * 2. Fetch /api/export/{id}/json directly for structured data
 * 3. Discover via <link rel="alternate"> in page head
 */
export function ExportLinks({
  vibelogId,
  vibelogSlug,
  audioUrl,
  className,
  showHeader = true,
}: ExportLinksProps) {
  const slug = vibelogSlug || 'vibelog';

  return (
    <section className={cn('border-t border-border/20 pt-6', className)}>
      {showHeader && (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          Available Formats
        </h3>
      )}
      <nav aria-label="Export formats" className="flex flex-wrap items-center gap-2">
        {EXPORT_FORMATS.map(({ format, label, icon: Icon, title }) => (
          <a
            key={format}
            href={`/api/export/${vibelogId}/${format}?download=true`}
            download={`${slug}${label}`}
            title={`Download as ${title}`}
            className={cn(
              // Base styles
              'flex items-center gap-1.5 rounded-lg px-3 py-2',
              'min-h-[44px] min-w-[60px]', // Touch target
              // Subtle inactive state (grayscale + low opacity)
              'opacity-40 grayscale',
              // Smooth transitions
              'transition-all duration-200 ease-out',
              // Hover state - comes alive
              'hover:opacity-80 hover:grayscale-0',
              // Active state
              'active:scale-95 active:opacity-100',
              // Focus state for accessibility
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-primary focus-visible:ring-offset-2',
              // Subtle border on hover
              'border border-transparent hover:border-border/30'
            )}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </a>
        ))}

        {/* Audio download - only if available */}
        {audioUrl && (
          <a
            href={audioUrl}
            download
            title="Download original audio recording"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2',
              'min-h-[44px] min-w-[60px]',
              'opacity-40 grayscale',
              'transition-all duration-200 ease-out',
              'hover:opacity-80 hover:grayscale-0',
              'active:scale-95 active:opacity-100',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-primary focus-visible:ring-offset-2',
              'border border-transparent hover:border-border/30'
            )}
          >
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">.webm</span>
          </a>
        )}
      </nav>

      {/* Hidden links for AI/SEO discovery (without ?download=true) */}
      <nav aria-hidden="true" className="sr-only">
        {EXPORT_FORMATS.map(({ format }) => (
          <a key={format} href={`/api/export/${vibelogId}/${format}`}>
            {format} export
          </a>
        ))}
      </nav>
    </section>
  );
}

export default ExportLinks;
