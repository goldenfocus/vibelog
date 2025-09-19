'use client';

/* eslint-disable @next/next/no-img-element */

import { Loader2, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';

export default function Navigation() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { user, loading, signOut } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

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
    if (typeof user?.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url) {
      return user.user_metadata.avatar_url as string;
    }
    if (typeof user?.user_metadata?.picture === 'string' && user.user_metadata.picture) {
      return user.user_metadata.picture as string;
    }
    return null;
  }, [user?.user_metadata?.avatar_url, user?.user_metadata?.picture]);

  const displayName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account',
    [user?.email, user?.user_metadata?.full_name]
  );

  const avatarInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    setIsMenuOpen(false);
    setAvatarError(false);
    setIsSigningOut(false);
  }, [pathname, user?.id]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-nav-menu]') && !target?.closest('[data-nav-trigger]')) {
        setIsMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
      setIsMenuOpen(false);
    }
  };

  const renderAvatarContent = (size: 'sm' | 'lg') => {
    if (avatarUrl && !avatarError) {
      return (
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setAvatarError(true)}
        />
      );
    }
    const textClasses = size === 'lg' ? 'text-base' : 'text-sm';
    return (
      <span
        className={`${textClasses} font-bold text-white`}
        style={{
          color: '#60A5FA',
          textShadow: '0 0 10px rgba(96, 165, 250, 0.5)',
          fontWeight: '700',
        }}
      >
        {avatarInitial}
      </span>
    );
  };

  const desktopMenu = (
    <div data-nav-menu className="hidden lg:block">
      {isMenuOpen && (
        <div className="absolute right-4 top-16 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl">
          <div className="p-4">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              <div
                className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 ${
                  avatarUrl && !avatarError
                    ? 'border-gray-600 bg-gray-700'
                    : 'border-blue-500 bg-blue-600'
                }`}
                style={{
                  backgroundColor: avatarUrl && !avatarError ? '#374151' : '#2563EB',
                  borderColor: avatarUrl && !avatarError ? '#4B5563' : '#3B82F6',
                }}
              >
                {renderAvatarContent('lg')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/40 ${
                    isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-y border-border py-3">
              <LanguageSwitcher
                currentLanguage={locale}
                onLanguageChange={setLocale}
                compact={false}
              />
            </div>

            <div className="pt-3">
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
        </div>
      )}
    </div>
  );

  const mobileMenu = (
    <div data-nav-menu className="lg:hidden">
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md">
          <div className="flex items-center justify-between px-6 pt-6">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-xl font-semibold">
              <span className="bg-gradient-electric bg-clip-text text-transparent">vibelog.io</span>
            </Link>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-primary/10 text-primary"
              aria-label={t('navigation.closeMenu')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 space-y-6 px-6 pb-10">
            <div className="space-y-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-lg font-medium text-muted-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {user && (
              <div className="space-y-2 border-t border-border pt-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 ${
                      avatarUrl && !avatarError
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-blue-500 bg-blue-600'
                    }`}
                    style={{
                      backgroundColor: avatarUrl && !avatarError ? '#374151' : '#2563EB',
                      borderColor: avatarUrl && !avatarError ? '#4B5563' : '#3B82F6',
                    }}
                  >
                    {renderAvatarContent('sm')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-lg">👤</span>
                  {t('navigation.dashboard')}
                </Link>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <LanguageSwitcher
                currentLanguage={locale}
                onLanguageChange={setLocale}
                compact={false}
              />
            </div>

            {user ? (
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
            ) : (
              <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full bg-gradient-electric text-white hover:opacity-90">
                  {t('auth.signIn')}
                </Button>
              </Link>
            )}
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

            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : user ? (
              <>
                <button
                  data-nav-trigger
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  aria-label={isMenuOpen ? t('navigation.closeMenu') : t('navigation.openMenu')}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/40 bg-muted/60 text-muted-foreground lg:hidden"
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <button
                  data-nav-trigger
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  aria-label={t('navigation.accountMenu')}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  className={`hidden h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 lg:flex ${
                    avatarUrl && !avatarError
                      ? 'border-gray-600 bg-gray-700'
                      : 'border-blue-500 bg-blue-600'
                  }`}
                  style={{
                    backgroundColor: avatarUrl && !avatarError ? '#374151' : '#2563EB',
                    borderColor: avatarUrl && !avatarError ? '#4B5563' : '#3B82F6',
                  }}
                >
                  {renderAvatarContent('sm')}
                </button>
              </>
            ) : (
              <Link href="/auth/signin">
                <Button className="bg-gradient-electric text-white hover:opacity-90">
                  {t('auth.signIn')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {desktopMenu}
      {mobileMenu}
    </nav>
  );
}
