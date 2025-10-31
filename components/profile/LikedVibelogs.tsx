'use client';

import { Heart, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import VibelogCard from '@/components/VibelogCard';

interface Vibelog {
  id: string;
  title: string;
  slug: string;
  teaser?: string;
  content: string;
  cover_image_url: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;
  user_id?: string;
  author: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface LikedVibelogsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function LikedVibelogs({ userId, isOwnProfile = false }: LikedVibelogsProps) {
  const [likedVibelogs, setLikedVibelogs] = useState<Vibelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLikedVibelogs() {
      try {
        setLoading(true);
        const response = await fetch(`/api/get-liked-vibelogs?user_id=${userId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch liked vibelogs');
        }

        const data = await response.json();
        setLikedVibelogs(data.vibelogs || []);
      } catch (err) {
        console.error('Error fetching liked vibelogs:', err);
        setError('Failed to load liked vibelogs');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchLikedVibelogs();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-electric" />
        <p className="mt-4 text-muted-foreground">Loading liked vibelogs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (likedVibelogs.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-muted/50 p-4">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-semibold">No liked vibelogs yet</h3>
        <p className="text-muted-foreground">
          {isOwnProfile
            ? "You haven't liked any vibelogs yet. Start exploring!"
            : "This user hasn't liked any vibelogs yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Liked Vibelogs{' '}
          <span className="text-muted-foreground">({likedVibelogs.length})</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isOwnProfile
            ? "Vibelogs you've liked"
            : 'Vibelogs liked by this user'}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {likedVibelogs.map((vibelog, index) => (
          <div
            key={vibelog.id}
            className="animate-in fade-in-50 slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
          >
            <VibelogCard
              vibelog={{
                ...vibelog,
                teaser: vibelog.teaser || vibelog.content,
                cover_image_url: vibelog.cover_image_url ?? null,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

