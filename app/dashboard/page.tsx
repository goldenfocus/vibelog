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
import { useVibelogTransfer } from '@/hooks/useVibelogTransfer';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
  const { user, loading, isSigningOut } = useAuth();
  const { t, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const [vibelogs, setVibelogs] = useState<Array<any>>([]);
  const [loadingVibelogs, setLoadingVibelogs] = useState(true);
  const [showClaimToast, setShowClaimToast] = useState(false);

  // Transfer anonymous vibelogs to user account (background, non-blocking)
  const { transferred, count } = useVibelogTransfer(user?.id);

  // Fetch user's vibelogs
  useEffect(() => {
    async function fetchVibelogs() {
      if (!user?.id) {
        return;
      }

      const supabase = createClient();

      // Fetch vibelogs
      const { data: vibelogsData, error } = await supabase
        .from('vibelogs')
        .select(
          `
          id,
          title,
          slug,
          teaser,
          content,
          cover_image_url,
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', user.id)
        .single();

      // Transform data to match VibelogCard interface
      const transformedData = vibelogsData.map(v => ({
        ...v,
        author: profile || {
          username: user.user_metadata?.username || 'user',
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
        },
      }));

      setVibelogs(transformedData);
      setLoadingVibelogs(false);
    }

    fetchVibelogs();
  }, [user?.id, user?.email, user?.user_metadata, transferred]); // Refetch when vibelogs are transferred

  // Show success message when transfer completes
  useEffect(() => {
    if (transferred && count > 0) {
      console.log(`✅ ${count} vibelogs transferred to your account`);
      setShowClaimToast(true);

      // Auto-hide toast after 5 seconds
      const timer = setTimeout(() => {
        setShowClaimToast(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [transferred, count]);

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
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Welcome Section */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
              {t('dashboard.welcome')}{' '}
              <span className="bg-gradient-electric bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
            <p className="mb-6 text-lg text-muted-foreground">{t('dashboard.subtitle')}</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-12 flex justify-center gap-4">
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
                  onClick={() => router.push(`/${user.user_metadata?.username || 'profile'}`)}
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

      {/* Claim Success Toast */}
      {showClaimToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[toastSlideUp_0.4s_ease-out]">
          <div className="max-w-md rounded-xl border border-electric/30 bg-card/95 px-6 py-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-electric/10">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {count} {count === 1 ? 'Vibelog' : 'Vibelogs'} Claimed!
                </p>
                <p className="text-sm text-muted-foreground">
                  Your anonymous content is now linked to your account
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {user && (
        <OnboardingModal user={user} onComplete={() => setShowOnboarding(false)} />
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
