'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { FileText, Mic, Play, Pause, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { useAudioPlayerStore } from '@/state/audio-player-store';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-12 w-full items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

interface ContentTabsProps {
  vibelogId: string;
  title: string;
  content: string;
  originalAudioUrl?: string | null;
  aiAudioUrl?: string | null;
  videoUrl?: string | null;
  author?: string;
  transcript?: string | null;
  className?: string;
  children: React.ReactNode; // The main vibelog content
}

export function ContentTabs({
  vibelogId,
  title,
  content: _content,
  originalAudioUrl,
  aiAudioUrl,
  videoUrl,
  author,
  transcript,
  className,
  children,
}: ContentTabsProps) {
  const pathname = usePathname();
  const { currentTrack, isPlaying, play, pause } = useAudioPlayerStore();
  const [loadingTrack, setLoadingTrack] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>('vibelog');

  const hasOriginalMedia = !!(originalAudioUrl || videoUrl);

  // Read hash from URL on mount and when it changes
  React.useEffect(() => {
    const updateFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'original' && hasOriginalMedia) {
        setActiveTab('original');
      } else {
        setActiveTab('vibelog');
      }
    };

    updateFromHash();
    window.addEventListener('hashchange', updateFromHash);
    return () => window.removeEventListener('hashchange', updateFromHash);
  }, [hasOriginalMedia]);

  // Handle tab change with hash navigation (avoids URL encoding issues)
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL hash without navigation/reload
    const newHash = value === 'original' ? '#original' : '#vibelog';
    window.history.replaceState(null, '', `${pathname}${newHash}`);
  };

  const handlePlayClick = async (audioUrl: string, trackType: 'vibelog' | 'original') => {
    const trackId = `vibelog-${trackType}-${vibelogId}`;

    if (currentTrack?.id === trackId && isPlaying) {
      pause();
      return;
    }

    setLoadingTrack(trackId);
    try {
      useAudioPlayerStore.getState().setTrack({
        id: trackId,
        url: audioUrl,
        title: title || 'Untitled',
        author: author,
        type: 'url',
      });
      await play();
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setLoadingTrack(null);
    }
  };

  const getPlayButtonState = (trackType: 'vibelog' | 'original') => {
    const trackId = `vibelog-${trackType}-${vibelogId}`;
    const isThisTrackPlaying = currentTrack?.id === trackId && isPlaying;
    const isThisTrackLoading = loadingTrack === trackId;

    return {
      isPlaying: isThisTrackPlaying,
      isLoading: isThisTrackLoading,
    };
  };

  const vibelogState = getPlayButtonState('vibelog');
  const originalState = getPlayButtonState('original');

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="vibelog">
            <FileText className="h-4 w-4" />
            Vibelog
          </TabsTrigger>
          <TabsTrigger value="original" disabled={!hasOriginalMedia}>
            <Mic className="h-4 w-4" />
            Original
            {!hasOriginalMedia && <span className="ml-1 text-xs">(N/A)</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vibelog" className="space-y-6">
          {/* AI Audio Player */}
          {aiAudioUrl && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Play className="h-4 w-4" />
                  <span>AI Narration</span>
                </div>
              </div>
              <button
                onClick={() => handlePlayClick(aiAudioUrl, 'vibelog')}
                disabled={vibelogState.isLoading}
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={vibelogState.isPlaying ? 'Pause AI narration' : 'Play AI narration'}
              >
                {vibelogState.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : vibelogState.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                <span>{vibelogState.isPlaying ? 'Pause' : 'Listen to Vibelog'}</span>
              </button>
            </div>
          )}

          {/* Main Content */}
          <div>{children}</div>
        </TabsContent>

        <TabsContent value="original" className="space-y-6">
          {/* Original Audio Player - only for audio vibelogs (video is already displayed at top of page) */}
          {originalAudioUrl && !videoUrl && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mic className="h-4 w-4" />
                  <span>Original Recording</span>
                </div>
              </div>

              <button
                onClick={() => handlePlayClick(originalAudioUrl, 'original')}
                disabled={originalState.isLoading}
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  originalState.isPlaying ? 'Pause original audio' : 'Play original audio'
                }
              >
                {originalState.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : originalState.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                <span>{originalState.isPlaying ? 'Pause' : 'Play Original'}</span>
              </button>
            </div>
          )}

          {/* Raw Content - show transcript (original unformatted text) */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Raw Content</h3>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-6">
              {transcript ? (
                <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground/80">
                  {transcript.split('\n\n').map((paragraph, index) => (
                    <p key={index} className={index > 0 ? 'mt-4' : ''}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No original transcript available for this vibelog.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
