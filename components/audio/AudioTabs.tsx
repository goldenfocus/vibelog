"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioPlayerStore } from "@/state/audio-player-store";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
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
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
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
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

interface AudioTabsProps {
  vibelogId: string;
  originalAudioUrl?: string | null;
  aiAudioUrl?: string | null;
  title?: string;
  author?: string;
  className?: string;
}

export function AudioTabs({
  vibelogId,
  originalAudioUrl,
  aiAudioUrl,
  title,
  author,
  className,
}: AudioTabsProps) {
  const { currentTrack, isPlaying, play, pause } = useAudioPlayerStore();
  const [loadingTrack, setLoadingTrack] = React.useState<string | null>(null);

  const hasOriginal = !!originalAudioUrl && originalAudioUrl.trim() !== "";
  const hasAi = !!aiAudioUrl && aiAudioUrl.trim() !== "";

  // If neither audio exists, don't render anything
  if (!hasOriginal && !hasAi) {
    return null;
  }

  const handlePlayClick = async (audioUrl: string, trackType: "original" | "ai") => {
    const trackId = `vibelog-${trackType}-${vibelogId}`;

    // If this exact track is playing, pause it
    if (currentTrack?.id === trackId && isPlaying) {
      pause();
      return;
    }

    // If it's a different track or paused, play it
    setLoadingTrack(trackId);
    try {
      await play({
        id: trackId,
        url: audioUrl,
        title: title || "Untitled",
        author: author,
        type: "url",
      });
    } catch (error) {
      console.error("Error playing audio:", error);
    } finally {
      setLoadingTrack(null);
    }
  };

  const getPlayButtonState = (trackType: "original" | "ai") => {
    const trackId = `vibelog-${trackType}-${vibelogId}`;
    const isThisTrackPlaying = currentTrack?.id === trackId && isPlaying;
    const isThisTrackLoading = loadingTrack === trackId;

    return {
      isPlaying: isThisTrackPlaying,
      isLoading: isThisTrackLoading,
    };
  };

  // If only one type exists, show a simpler single-button UI
  if (hasOriginal && !hasAi) {
    const { isPlaying: playing, isLoading } = getPlayButtonState("original");
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          onClick={() => handlePlayClick(originalAudioUrl!, "original")}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={playing ? "Pause original audio" : "Play original audio"}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          <span>{playing ? "Pause" : "Listen"}</span>
        </button>
      </div>
    );
  }

  if (!hasOriginal && hasAi) {
    const { isPlaying: playing, isLoading } = getPlayButtonState("ai");
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          onClick={() => handlePlayClick(aiAudioUrl!, "ai")}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={playing ? "Pause AI narration" : "Play AI narration"}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          <span>{playing ? "Pause AI" : "Listen AI"}</span>
        </button>
      </div>
    );
  }

  // Both exist - show tabs
  const originalState = getPlayButtonState("original");
  const aiState = getPlayButtonState("ai");

  return (
    <div className={cn("w-full", className)}>
      <Tabs defaultValue="original" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="original">Original</TabsTrigger>
          <TabsTrigger value="ai">AI Narration</TabsTrigger>
        </TabsList>

        <TabsContent value="original" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Listen to the original voice recording
          </p>
          <button
            onClick={() => handlePlayClick(originalAudioUrl!, "original")}
            disabled={originalState.isLoading}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={originalState.isPlaying ? "Pause original audio" : "Play original audio"}
          >
            {originalState.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : originalState.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            <span>{originalState.isPlaying ? "Pause" : "Play Original"}</span>
          </button>
        </TabsContent>

        <TabsContent value="ai" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Listen to the AI-generated narration
          </p>
          <button
            onClick={() => handlePlayClick(aiAudioUrl!, "ai")}
            disabled={aiState.isLoading}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={aiState.isPlaying ? "Pause AI narration" : "Play AI narration"}
          >
            {aiState.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : aiState.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            <span>{aiState.isPlaying ? "Pause" : "Play AI"}</span>
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
