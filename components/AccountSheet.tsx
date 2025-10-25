'use client';

import { LogOut, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    <AppSheet open={open} onOpenChange={onOpenChange} title="Account">
      {/* Profile Card */}
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div
            className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/40"
            style={getAvatarContainerStyle(!!avatarUrl)}
          >
            {renderAvatarContent('lg')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{displayName}</p>
            {username && <p className="truncate text-sm font-medium text-electric">@{username}</p>}
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
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
