'use client';

import { useRouter } from 'next/navigation';

import { ProfileVibelogs } from './ProfileVibelogs';

interface Vibelog {
  id: string;
  title: string;
  slug: string;
  content: string;
  teaser?: string;
  audio_url?: string;
  audio_duration?: number;
  cover_image_url?: string | null;
  video_url?: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  comment_count: number;
  read_time: number;
  word_count: number;
  tags?: string[];
  // Translation fields
  original_language?: string | null;
  available_languages?: string[] | null;
  translations?: Record<string, { title?: string; teaser?: string; content?: string }> | null;
}

export function ProfileVibelogsWrapper({
  vibelogs,
  username,
  displayName,
  avatarUrl,
}: {
  vibelogs: Vibelog[];
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();

  return (
    <ProfileVibelogs
      vibelogs={vibelogs}
      username={username}
      displayName={displayName}
      avatarUrl={avatarUrl}
      onRefresh={() => router.refresh()}
    />
  );
}
