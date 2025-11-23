'use client';

import { LogOut, Loader2, Settings, Shield } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { AppSheet } from '@/components/ui/AppSheet';
import { Button } from '@/components/ui/button';

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  renderAvatarContent: (size: 'sm' | 'lg') => React.ReactNode;
  getAvatarContainerStyle: (hasImage: boolean) => React.CSSProperties;
}

export function AccountSheet({
  open,
  onOpenChange,
  displayName,
  email,
  username,
  avatarUrl,
  renderAvatarContent,
  getAvatarContainerStyle,
}: AccountSheetProps) {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/check-admin');
        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user?.id]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
      onOpenChange(false);
    }
  };

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={t('titles.account')}>
      {/* Profile Card - Click to view public profile */}
      <div className="shrink-0 border-b border-border px-4 py-4">
        <Link
          href={username ? `/@${username}` : '/dashboard'}
          onClick={() => onOpenChange(false)}
          className="group flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-all duration-200 hover:scale-[1.02] hover:border-electric/50 hover:bg-muted/50 hover:shadow-lg active:scale-[0.98]"
        >
          <div
            className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/40 transition-all duration-200 group-hover:border-electric/50"
            style={getAvatarContainerStyle(!!avatarUrl)}
          >
            {renderAvatarContent('lg')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold transition-colors group-hover:text-electric">
              {displayName}
            </p>
            {username && (
              <p className="truncate text-sm font-medium text-electric transition-opacity group-hover:opacity-80">
                @{username}
              </p>
            )}
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          {/* Subtle indicator on hover */}
          <div className="flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <svg
              className="h-5 w-5 text-electric"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Menu Items */}
      <div className="flex-1 space-y-1 px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
          onClick={() => onOpenChange(false)}
        >
          <span className="text-xl">👤</span>
          {t('navigation.dashboard')}
        </Link>

        <Link
          href="/settings/profile"
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
          onClick={() => onOpenChange(false)}
        >
          <Settings className="h-5 w-5" />
          Profile Settings
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-violet-500/10 px-4 py-3 text-base font-medium text-purple-600 transition-colors hover:from-purple-500/20 hover:to-violet-500/20 active:from-purple-500/30 active:to-violet-500/30 dark:text-purple-400"
            onClick={() => onOpenChange(false)}
          >
            <Shield className="h-5 w-5" />
            Admin Panel
          </Link>
        )}
      </div>

      {/* Sign Out Button */}
      <div className="shrink-0 border-t border-border px-4 py-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="active:scale-98 flex h-12 w-full items-center justify-center gap-2 text-base font-medium transition-transform"
        >
          {isSigningOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          {isSigningOut ? t('auth.signingOut') : t('auth.signOut')}
        </Button>
      </div>
    </AppSheet>
  );
}
