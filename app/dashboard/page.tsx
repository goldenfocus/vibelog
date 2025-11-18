'use client';

import { Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import MicRecorder from '@/components/MicRecorder';
import Navigation from '@/components/Navigation';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import VibelogCard from '@/components/VibelogCard';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
  const { user, loading, isSigningOut } = useAuth();
  const { t, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const [vibelogs, setVibelogs] = useState<Array<any>>([]);
  const [loadingVibelogs, setLoadingVibelogs] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Fetch user's profile
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    }
    fetchProfile();
  }, [user?.id]);

  // Fetch user's vibelogs
  useEffect(() => {
    async function fetchVibelogs() {
      if (!user?.id) {
        return;
      }

      const supabase = createClient();

      // Fetch vibelogs (include user_id for Edit/Remix logic + video fields)
      const { data: vibelogsData, error } = await supabase
        .from('vibelogs')
        .select(
          `
          id,
          title,
          slug,
          public_slug,
          teaser,
          content,
          cover_image_url,
          audio_url,
          video_url,
          created_at,
          published_at,
          view_count,
          like_count,
          share_count,
          read_time,
          user_id
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching vibelogs:', error);
        setLoadingVibelogs(false);
        return;
      }

      if (!vibelogsData || vibelogsData.length === 0) {
        setVibelogs([]);
        setLoadingVibelogs(false);
        return;
      }

      // Fetch user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', user.id)
        .single();

      // Transform data to match VibelogCard interface
      // ALWAYS use database profile as source of truth for avatar
      const transformedData = vibelogsData.map(v => ({
        ...v,
        author: {
          username: profileData?.username || user.user_metadata?.username || 'user',
          display_name:
            profileData?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'User',
          avatar_url: profileData?.avatar_url || null, // Database is source of truth
        },
      }));

      setVibelogs(transformedData);
      setLoadingVibelogs(false);
    }

    fetchVibelogs();
  }, [user?.id, user?.email, user?.user_metadata]);

  // Redirect to sign in if not authenticated (but NOT during sign out!)
  useEffect(() => {
    if (!loading && !user && !isSigningOut) {
      router.replace('/auth/signin');
    }
  }, [loading, user, isSigningOut, router]);

  // Show loading state only if still loading and no cached user
  if (loading || i18nLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, return null (useEffect will redirect)
  if (!user) {
    return null;
  }

  // Render dashboard immediately for authenticated users
  const displayName =
    profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Welcome Section */}
          <div className="mb-12 text-center">
            <h1 className="mb-6 text-3xl font-bold sm:text-4xl md:text-5xl">
              {t('dashboard.welcome')}{' '}
              <span className="bg-gradient-electric bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
          </div>

          {/* Quick Actions */}
          <div className="mb-12 flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Mic className="h-4 w-4" />
              {t('dashboard.newVibelog')}
            </Button>
          </div>

          {/* Main Recorder Interface */}
          <div className="mb-20 flex justify-center">
            <MicRecorder />
          </div>

          {/* Your Vibelogs Section */}
          <div className="mt-16">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Your Vibelogs</h2>
              {vibelogs.length > 0 && (
                <Button
                  onClick={() =>
                    router.push(
                      `/@${profile?.username || user.user_metadata?.username || 'profile'}`
                    )
                  }
                  variant="outline"
                  size="sm"
                >
                  View All
                </Button>
              )}
            </div>

            {loadingVibelogs ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
                  <p className="text-muted-foreground">Loading your vibelogs...</p>
                </div>
              </div>
            ) : vibelogs.length === 0 ? (
              <div className="rounded-2xl border border-border/30 bg-card/30 p-12 text-center backdrop-blur-sm">
                <p className="mb-4 text-lg text-muted-foreground">
                  You haven&apos;t created any vibelogs yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Click &quot;New Vibelog&quot; above to start recording your first one! 🎤
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {vibelogs.map(vibelog => (
                  <VibelogCard key={vibelog.id} vibelog={vibelog} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Onboarding Modal */}
      {user && <OnboardingModal user={user} onComplete={() => {}} />}

      <style jsx>{`
        @keyframes toastSlideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
