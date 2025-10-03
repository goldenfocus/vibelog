'use client';

import { LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { AppSheet } from '@/components/ui/AppSheet';
import { Button } from '@/components/ui/button';

type TabType = 'profile' | 'dashboard' | 'about' | 'faq' | 'pricing';

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
  const [activeTab, setActiveTab] = useState<TabType>('profile');
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

  const navItems: { id: TabType; label: string; icon: string; href?: string }[] = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'dashboard', label: t('navigation.dashboard'), icon: '📊', href: '/dashboard' },
    { id: 'about', label: 'vibelog.io', icon: 'ℹ️', href: '/about' },
    { id: 'faq', label: 'FAQ', icon: '❓', href: '/faq' },
    { id: 'pricing', label: 'Pricing', icon: '💎', href: '/pricing' },
  ];

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if (item.href) {
      // For items with href, close sheet and navigate
      onOpenChange(false);
    } else {
      // For internal tabs, update active tab
      setActiveTab(item.id);
    }
  };

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title="Account">
      <div className="flex h-full flex-col md:flex-row">
        {/* Desktop Left Nav - Hidden on mobile */}
        <nav className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
          <div className="overflow-y-auto">
            {/* Profile section at top */}
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div
                  className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/40"
                  style={getAvatarContainerStyle(!!avatarUrl)}
                >
                  {renderAvatarContent('lg')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <ul className="space-y-1 p-2">
              {navItems.map(item =>
                item.href ? (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 active:bg-muted/70"
                      onClick={() => handleNavClick(item)}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/50 ${
                        activeTab === item.id ? 'bg-muted text-primary' : ''
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </button>
                  </li>
                )
              )}
            </ul>

            {/* Sign out at bottom */}
            <div className="mt-auto border-t border-border p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center justify-center gap-2"
              >
                {isSigningOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {isSigningOut ? t('auth.signingOut') : t('auth.signOut')}
              </Button>
            </div>
          </div>
        </nav>

        {/* Mobile Tab Bar - Visible only on mobile */}
        <div className="flex shrink-0 border-b border-border md:hidden">
          <div className="no-scrollbar flex w-full overflow-x-auto">
            {navItems.map(item =>
              item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="p-4">
              <div className="mb-6 flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/30 p-6">
                <div
                  className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border/40"
                  style={getAvatarContainerStyle(!!avatarUrl)}
                >
                  {renderAvatarContent('lg')}
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>

              {/* Mobile sign out */}
              <div className="md:hidden">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex w-full items-center justify-center gap-2"
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
          )}
        </main>
      </div>
    </AppSheet>
  );
}
