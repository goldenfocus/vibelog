'use client';

import { LogOut, Loader2 } from 'lucide-react';
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
  avatarUrl: string | null;
  renderAvatarContent: (size: 'sm' | 'lg') => React.ReactNode;
  getAvatarContainerStyle: (hasImage: boolean) => React.CSSProperties;
}

export function AccountSheet({
  open,
  onOpenChange,
  displayName,
  email,
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
      <div className="flex h-full flex-col px-4 py-4">
        {/* Profile Card */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div
            className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/40"
            style={getAvatarContainerStyle(!!avatarUrl)}
          >
            {renderAvatarContent('lg')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
            onClick={() => onOpenChange(false)}
          >
            <span className="text-xl">👤</span>
            {t('navigation.dashboard')}
          </Link>

          <Link
            href="/about"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
            onClick={() => onOpenChange(false)}
          >
            <span className="text-xl">ℹ️</span>
            vibelog.io
          </Link>

          <Link
            href="/faq"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
            onClick={() => onOpenChange(false)}
          >
            <span className="text-xl">❓</span>
            FAQ
          </Link>

          <Link
            href="/pricing"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
            onClick={() => onOpenChange(false)}
          >
            <span className="text-xl">💎</span>
            Pricing
          </Link>
        </div>

        {/* Sign Out Button */}
        <div className="mt-auto pt-4">
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
      </div>
    </AppSheet>
  );
}
