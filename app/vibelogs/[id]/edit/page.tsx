'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import VibelogEditModalFull from '@/components/VibelogEditModalFull';

interface Vibelog {
  id: string;
  title: string;
  content: string;
  teaser?: string;
  cover_image_url?: string;
  cover_image_alt?: string;
}

export default function VibelogEditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const vibelogId = params.id as string;

  const [vibelog, setVibelog] = useState<Vibelog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vibelog data
  useEffect(() => {
    async function fetchVibelog() {
      try {
        const response = await fetch(`/api/get-vibelog/${vibelogId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Vibelog not found');
          } else if (response.status === 403) {
            setError('You need to sign in to edit this vibelog');
          } else {
            setError('Failed to load vibelog');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        const vibelogData = data.vibelog;

        // The API doesn't return user_id, so we'll check ownership via API response
        // If we get 403, the user doesn't own it. If we get 200, they can edit.
        // Additional check: verify user is authenticated
        if (!user) {
          setError('You need to sign in to edit vibelogs');
          setLoading(false);
          return;
        }

        setVibelog({
          id: vibelogData.id,
          title: vibelogData.title,
          content: vibelogData.content,
          teaser: vibelogData.teaser,
          cover_image_url: vibelogData.cover_image_url,
          cover_image_alt: vibelogData.title,
        });
      } catch (err) {
        console.error('Error fetching vibelog:', err);
        setError('Failed to load vibelog');
      } finally {
        setLoading(false);
      }
    }

    if (vibelogId && user) {
      fetchVibelog();
    }
  }, [vibelogId, user]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?returnTo=/vibelogs/${vibelogId}/edit`);
    }
  }, [authLoading, user, router, vibelogId]);

  const handleClose = () => {
    router.push(`/vibelogs/${vibelogId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-electric" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !vibelog) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <button
              onClick={() => router.back()}
              className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-electric"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-foreground">
                {error || 'Vibelog not found'}
              </h1>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-electric hover:underline"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <VibelogEditModalFull isOpen={true} onClose={handleClose} vibelog={vibelog} />
    </div>
  );
}
