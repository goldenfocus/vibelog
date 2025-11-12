import { useEffect, useRef, useState } from 'react';

import { useAudioPlayerStore } from '@/state/audio-player-store';

const MAX_CACHE_ITEMS = 6;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

type CacheEntry = {
  blob: Blob;
  createdAt: number;
  lastAccess: number;
  meta: {
    cacheKey: string;
    textLength: number;
    vibelogId?: string;
    voiceCloneId?: string;
    title?: string;
    author?: string;
    voice?: string;
  };
};

type FetchRequest = {
  text: string;
  voice?: string;
  vibelogId?: string;
  voiceCloneId?: string;
  authorId?: string;
  cacheKey?: string;
  forceRefresh?: boolean;
  title?: string;
  author?: string;
};

type FetchOptions = {
  onUpgradePrompt?: (message: string, benefits: string[]) => void;
};

const ttsCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<CacheEntry>>();

export interface PlayTextParams {
  text: string;
  voice?: string;
  vibelogId?: string;
  voiceCloneId?: string;
  title?: string;
  author?: string;
  authorId?: string;
  cacheKey?: string;
  autoPlay?: boolean;
  preloadOnly?: boolean;
  forceRefresh?: boolean;
}

export interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  playText: (params: PlayTextParams) => Promise<void>;
  preloadText: (params: PlayTextParams) => Promise<void>;
  stop: () => void;
  progress: number;
  duration: number;
}

export function normalizeTextToSpeechInput(text: string): string {
  if (!text) {
    return '';
  }
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3800);
}

function hashText(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export function createTextToSpeechCacheKey(params: {
  text: string;
  voice?: string;
  vibelogId?: string;
  voiceCloneId?: string;
  authorId?: string;
}): string {
  const normalized = normalizeTextToSpeechInput(params.text);
  const hash = hashText(normalized || 'empty');
  const scope =
    params.vibelogId || params.authorId || params.voiceCloneId || params.voice || 'default';
  return ['tts', scope, hash].filter(Boolean).join(':');
}

function trimCache() {
  const now = Date.now();
  for (const [key, entry] of ttsCache) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      ttsCache.delete(key);
    }
  }
  while (ttsCache.size > MAX_CACHE_ITEMS) {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    for (const [key, entry] of ttsCache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      ttsCache.delete(oldestKey);
    } else {
      break;
    }
  }
}

async function ensureCache(request: FetchRequest, options: FetchOptions = {}): Promise<CacheEntry> {
  const normalizedText = normalizeTextToSpeechInput(request.text);
  if (!normalizedText) {
    throw new Error('Nothing to convert to speech');
  }

  const cacheKey =
    request.cacheKey ||
    createTextToSpeechCacheKey({
      text: normalizedText,
      voice: request.voice,
      vibelogId: request.vibelogId,
      voiceCloneId: request.voiceCloneId,
      authorId: request.authorId,
    });

  const now = Date.now();
  if (!request.forceRefresh) {
    const existing = ttsCache.get(cacheKey);
    if (existing && now - existing.createdAt <= CACHE_TTL_MS) {
      existing.lastAccess = now;
      return existing;
    }
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: normalizedText,
        voice: request.voice || 'shimmer',
        vibelogId: request.vibelogId,
        voiceCloneId: request.voiceCloneId,
        authorId: request.authorId,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 && options.onUpgradePrompt) {
        try {
          const errorData = await response.json();
          if (errorData.upgrade) {
            options.onUpgradePrompt(
              errorData.message ||
                'TTS limit reached. Sign in for more requests and higher quality voices.',
              errorData.upgrade.benefits || []
            );
            throw new Error(errorData.message || 'Upgrade required for more TTS requests');
          }
        } catch {
          // Ignore parsing issues
        }
      }

      let message = response.statusText || 'Failed to generate speech';
      try {
        const errorData = await response.json();
        message = errorData.error || errorData.message || message;
      } catch {
        // Ignore parsing issues
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const entry: CacheEntry = {
      blob,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      meta: {
        cacheKey,
        textLength: normalizedText.length,
        vibelogId: request.vibelogId,
        voiceCloneId: request.voiceCloneId,
        title: request.title,
        author: request.author,
        voice: request.voice || 'shimmer',
      },
    };
    ttsCache.set(cacheKey, entry);
    trimCache();
    return entry;
  })();

  pendingRequests.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

export async function prefetchTextToSpeech(
  params: PlayTextParams,
  options?: FetchOptions
): Promise<void> {
  await ensureCache(
    {
      ...params,
      text: params.text,
    },
    options
  );
}

export function useTextToSpeech(
  onUpgradePrompt?: (message: string, benefits: string[]) => void,
  onEnded?: () => void
): UseTextToSpeechReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioUrlRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const cacheKeyRef = useRef<string | null>(null);

  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    currentTime,
    duration,
    setTrack,
    play,
    pause,
  } = useAudioPlayerStore();

  const isMatchingTrack =
    !!currentTrack &&
    (currentTrack.id === trackIdRef.current ||
      (!!currentTrack.meta?.cacheKey && currentTrack.meta.cacheKey === cacheKeyRef.current));

  const isPlaying = isMatchingTrack ? globalIsPlaying : false;
  const progress = isMatchingTrack && duration > 0 ? (currentTime / duration) * 100 : 0;

  const cleanup = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    trackIdRef.current = null;
  };

  useEffect(() => {
    if (
      isMatchingTrack &&
      !globalIsPlaying &&
      currentTime > 0 &&
      duration > 0 &&
      currentTime >= duration - 0.5
    ) {
      if (onEnded) {
        onEnded();
      }
    }
  }, [isMatchingTrack, globalIsPlaying, currentTime, duration, onEnded]);

  const playText = async (params: PlayTextParams) => {
    const normalizedText = normalizeTextToSpeechInput(params.text);
    if (!normalizedText) {
      setError('Nothing to convert to speech');
      return;
    }

    const cacheKey =
      params.cacheKey ||
      createTextToSpeechCacheKey({
        text: normalizedText,
        voice: params.voice,
        vibelogId: params.vibelogId,
        voiceCloneId: params.voiceCloneId,
        authorId: params.authorId,
      });

    cacheKeyRef.current = cacheKey;

    try {
      setIsLoading(true);
      setError(null);

      const entry = await ensureCache(
        {
          ...params,
          text: normalizedText,
          cacheKey,
        },
        { onUpgradePrompt }
      );

      if (params.preloadOnly) {
        setIsLoading(false);
        return;
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(entry.blob);
      audioUrlRef.current = audioUrl;

      const trackId = `${cacheKey}-${Date.now()}`;
      trackIdRef.current = trackId;

      setTrack({
        id: trackId,
        url: audioUrl,
        title: params.title || 'Text-to-Speech',
        author: params.author || params.voice || 'voice',
        type: 'tts',
        meta: {
          cacheKey,
          vibelogId: params.vibelogId,
          voiceCloneId: params.voiceCloneId,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      if (params.autoPlay === false) {
        return;
      }

      await play();
    } catch (err) {
      console.error('TTS playback error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to play speech');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const preloadText = async (params: PlayTextParams) => {
    await playText({
      ...params,
      preloadOnly: true,
      autoPlay: false,
    });
  };

  const stop = () => {
    if (isMatchingTrack) {
      pause();
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    playText,
    preloadText,
    stop,
    progress,
    duration: isMatchingTrack ? duration : 0,
  };
}
