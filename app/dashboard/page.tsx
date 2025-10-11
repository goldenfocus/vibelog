'use client';

import { Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import MicRecorder from '@/components/MicRecorder';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { useVibelogTransfer } from '@/hooks/useVibelogTransfer';

export default function DashboardPage() {
  const { user, loading, isSigningOut } = useAuth();
  const { t, isLoading: i18nLoading } = useI18n();
  const router = useRouter();

  // Transfer anonymous vibelogs to user account (background, non-blocking)
  const { transferred, count } = useVibelogTransfer(user?.id);

  // Show optional success message when transfer completes
  useEffect(() => {
    if (transferred && count > 0) {
      console.log(`✅ ${count} vibelogs transferred to your account`);
      // Could show a toast notification here if desired
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

          {/* Coming Soon Section */}
          <div className="mt-12 text-center">
            <div className="inline-block rounded-xl border border-border/30 bg-card/30 px-6 py-4 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">📊 {t('dashboard.comingSoon')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
