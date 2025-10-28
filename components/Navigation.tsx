'use client';

/* eslint-disable @next/next/no-img-element */

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AccountSheet } from '@/components/AccountSheet';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';

export default function Navigation() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { user, loading } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false); // Desktop menu
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false); // Mobile hamburger menu
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false); // Mobile user menu
  const [avatarError, setAvatarError] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const navLinks = useMemo(
    () => [
      { href: '/about', label: t('navigation.about') },
      { href: '/faq', label: t('navigation.faq') },
      { href: '/pricing', label: t('navigation.pricing') },
      { href: '/community', label: t('navigation.community') },
      { href: '/people', label: t('navigation.people') },
    ],
    [t]
  );

  const isActive = (path: string) => pathname === path;

  const avatarUrl = useMemo(() => {
    if (!user) {
      return null;
    }

    // Prioritize database profile avatar (source of truth)
    if (profile?.avatar_url && typeof profile.avatar_url === 'string') {
      return profile.avatar_url;
    }

    // Fallback to OAuth provider avatars
    const avatar_url = user.user_metadata?.avatar_url;
    const picture = user.user_metadata?.picture;

    if (typeof avatar_url === 'string' && avatar_url) {
      return avatar_url;
    }
    if (typeof picture === 'string' && picture) {
      return picture;
    }
    // No avatar - will use initials
    return null;
  }, [user, profile?.avatar_url]);

  // Fetch user profile from database
  useEffect(() => {
    if (user?.id) {
      const fetchProfile = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
        }
      };
      fetchProfile();
    }
  }, [user?.id]);

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Account',
    [profile?.display_name, user?.email, user?.user_metadata?.full_name]
  );

  const username = profile?.username || null;

  const avatarInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileNavOpen(false);
    setIsMobileUserOpen(false);
    setAvatarError(false);
  }, [pathname, user?.id]);

  const renderAvatarContent = (size: 'sm' | 'lg') => {
    if (avatarUrl && !avatarError) {
      return (
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-full w-full rounded-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            console.log('Avatar image failed to load:', avatarUrl);
            setAvatarError(true);
          }}
          onLoad={() => {
            console.log('Avatar image loaded successfully:', avatarUrl);
          }}
        />
      );
    }
    const textClasses = size === 'lg' ? 'text-lg font-bold' : 'text-sm font-bold';
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center ${textClasses} text-white`}
        style={{
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
          fontWeight: '700',
        }}
      >
        {avatarInitial}
      </div>
    );
  };

  const getAvatarContainerStyle = (hasImage: boolean) => {
    if (hasImage) {
      return {
        backgroundColor: 'transparent', // Let image show through
      };
    }
    // Fallback gradient with hardcoded colors for initials
    return {
      background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
      backgroundColor: '#3B82F6', // Fallback solid blue
    };
  };

  // Mobile hamburger menu (site navigation)
  const mobileNavMenu = (
    <div data-nav-menu className="lg:hidden">
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-[100] bg-background">
          <div className="flex h-screen flex-col bg-background">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <Link
                href="/"
                onClick={() => setIsMobileNavOpen(false)}
                className="text-xl font-semibold"
              >
                <span className="bg-gradient-electric bg-clip-text text-transparent">
                  vibelog.io
                </span>
              </Link>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-primary/10 text-primary active:scale-95"
                aria-label={t('navigation.closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 space-y-2 px-5 py-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-muted/50 active:bg-muted/70 ${
                    isActive(link.href) ? 'bg-muted text-primary' : 'text-foreground'
                  }`}
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Language Switcher at bottom */}
            <div className="shrink-0 border-t border-border px-5 py-4">
              <LanguageSwitcher
                currentLanguage={locale}
                onLanguageChange={setLocale}
                compact={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="bg-gradient-electric bg-clip-text text-transparent">vibelog.io</span>
          </Link>

          <div className="hidden items-center space-x-6 lg:flex">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-primary ${
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {!user && !loading && (
              <div className="hidden lg:block">
                <LanguageSwitcher
                  currentLanguage={locale}
                  onLanguageChange={setLocale}
                  compact={true}
                />
              </div>
            )}

            {user ? (
              <>
                {/* Mobile: Hamburger menu button */}
                <button
                  onClick={e => {
                    setIsMobileNavOpen(true);
                    e.currentTarget.blur(); // Prevent aria-hidden focus warning
                  }}
                  aria-label="Open navigation menu"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-muted/60 text-foreground lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Mobile: User avatar button */}
                <button
                  onClick={e => {
                    setIsMobileUserOpen(true);
                    e.currentTarget.blur(); // Prevent aria-hidden focus warning
                  }}
                  aria-label="Open account menu"
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/40 lg:hidden"
                  style={getAvatarContainerStyle(avatarUrl && !avatarError)}
                >
                  {renderAvatarContent('sm')}
                </button>

                {/* Desktop: Avatar button */}
                <button
                  data-nav-trigger
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  aria-label={t('navigation.accountMenu')}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  className="relative hidden h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/40 transition-all duration-200 hover:ring-2 hover:ring-primary/50 lg:flex"
                  style={getAvatarContainerStyle(avatarUrl && !avatarError)}
                >
                  {renderAvatarContent('sm')}
                </button>
              </>
            ) : (
              <>
                {/* Not logged in: Show hamburger + sign in button */}
                <button
                  onClick={() => setIsMobileNavOpen(true)}
                  aria-label="Open navigation menu"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-muted/60 text-foreground lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <Button asChild className="bg-gradient-electric text-white hover:opacity-90">
                  <Link href="/auth/signin">{t('auth.signIn')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {mobileNavMenu}

      {/* Account Sheet for mobile and desktop */}
      {user && (
        <AccountSheet
          open={isMobileUserOpen || isMenuOpen}
          onOpenChange={open => {
            setIsMobileUserOpen(open);
            setIsMenuOpen(open);
          }}
          displayName={displayName}
          email={user.email || ''}
          username={username}
          avatarUrl={avatarUrl}
          renderAvatarContent={renderAvatarContent}
          getAvatarContainerStyle={getAvatarContainerStyle}
        />
      )}
    </nav>
  );
}
