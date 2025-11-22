'use client';

import { Mic, Monitor, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FuturisticCarousel } from '@/components/home/FuturisticCarousel';
import MicRecorder from '@/components/MicRecorder';
import Navigation from '@/components/Navigation';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { ScreenCaptureZone } from '@/components/video/ScreenCaptureZone';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
  const { user, loading, isSigningOut } = useAuth();
  const { t, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const [vibelogs, setVibelogs] = useState<Array<any>>([]);
  const [loadingVibelogs, setLoadingVibelogs] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showScreenShare, setShowScreenShare] = useState(false);
  const [tempVibelogId, setTempVibelogId] = useState<string | null>(null);
  const [_error, setError] = useState<string | null>(null);

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
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // If no user, return null (useEffect will redirect)
  if (!user) {
    return null;
  }

  // Handle screen share button click
  const handleScreenShare = async () => {
    // Create a temporary vibelog to associate the screen recording
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vibelogs')
      .insert({
        user_id: user.id,
        title: 'Screen Recording',
        content: 'Processing...',
        teaser: 'Processing...',
        is_public: false, // Not public until processed
        capture_mode: 'screen',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Failed to create temporary vibelog:', error);
      setError('Failed to start screen recording. Please try again.');
      return;
    }

    setTempVibelogId(data.id);
    setShowScreenShare(true);
  };

  // Handle screen recording complete
  const handleScreenRecordingComplete = (videoUrl: string) => {
    console.log('Screen recording complete:', videoUrl);
    setShowScreenShare(false);
    setTempVibelogId(null);
    // Refresh vibelogs
    window.location.reload();
  };

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

            <Button
              onClick={handleScreenShare}
              variant="outline"
              className="flex items-center gap-2 border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20"
            >
              <Monitor className="h-4 w-4" />
              {t('dashboard.screenShare')}
            </Button>
          </div>

          {/* Main Recorder Interface */}
          <div className="mb-20 flex justify-center">
            <MicRecorder />
          </div>

          {/* Your Vibelogs Section */}
          <div className="mt-16">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">{t('dashboard.yourVibelogs')}</h2>
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
                  {t('dashboard.viewAll')}
                </Button>
              )}
            </div>

            {loadingVibelogs ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
                  <p className="text-muted-foreground">{t('dashboard.loadingVibelogs')}</p>
                </div>
              </div>
            ) : vibelogs.length === 0 ? (
              <div className="rounded-2xl border border-border/30 bg-card/30 p-12 text-center backdrop-blur-sm">
                <p className="mb-4 text-lg text-muted-foreground">
                  {t('dashboard.noVibelogsTitle')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.noVibelogsDescription')}
                </p>
              </div>
            ) : (
              <FuturisticCarousel vibelogs={vibelogs} />
            )}
          </div>
        </div>
      </main>

      {/* Onboarding Modal */}
      {user && <OnboardingModal user={user} onComplete={() => {}} />}

      {/* Screen Share Modal */}
      {showScreenShare && tempVibelogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative mx-4 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <button
              onClick={() => {
                setShowScreenShare(false);
                setTempVibelogId(null);
              }}
              className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="mb-2 text-2xl font-bold">{t('screenRecorder.modalTitle')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('screenRecorder.modalSubtitle')}
              </p>
            </div>

            <ScreenCaptureZone
              vibelogId={tempVibelogId}
              onVideoCaptured={handleScreenRecordingComplete}
              maxDurationSeconds={60}
              isPremium={false}
              enableCameraPip={true}
            />
          </div>
        </div>
      )}

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
