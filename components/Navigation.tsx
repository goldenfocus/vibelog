'use client';

/* eslint-disable @next/next/no-img-element */

import { Menu, X, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { user, loading, signOut } = useAuth();
  const avatarUrl =
    (typeof user?.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url) ||
    (typeof user?.user_metadata?.picture === 'string' && user.user_metadata.picture) ||
    null;
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-menu-container]')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
  };

  const navLinks = [
    { href: '/about', label: t('navigation.about') },
    { href: '/faq', label: t('navigation.faq') },
    { href: '/pricing', label: t('navigation.pricing') },
    { href: '/community', label: t('navigation.community') },
    { href: '/people', label: t('navigation.people') },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            <span className="bg-gradient-electric bg-clip-text text-transparent">vibelog.io</span>
          </Link>

          {/* Desktop Navigation Links */}
          {!loading && (
            <div className="hidden items-center space-x-6 md:flex">
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
          )}

          {/* Right Side - Authentication */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher - only show when not logged in */}
            {!user && !loading && (
              <LanguageSwitcher
                currentLanguage={locale}
                onLanguageChange={setLocale}
                compact={true}
              />
            )}

            {/* Loading State */}
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : user ? (
              /* Logged In - Account menu (avatar on desktop, hamburger on mobile) */
              <div className="relative" data-menu-container>
                <button
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  className="flex items-center justify-center rounded-md px-3 py-2 md:hidden"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  aria-label={isMenuOpen ? t('navigation.closeMenu') : t('navigation.openMenu')}
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <button
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  className="hidden h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/40 bg-muted/60 md:flex"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  aria-label={t('navigation.accountMenu')}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{avatarInitial}</span>
                  )}
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card shadow-lg md:mt-3 md:w-80 md:rounded-2xl">
                    <div className="p-4">
                      <div className="mb-4 flex items-center space-x-3 border-b border-border pb-4">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/40 bg-electric/20">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-electric">
                              {avatarInitial}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      <div className="mb-4 space-y-2">
                        {navLinks.map(link => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMenuOpen(false)}
                            className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/40 ${
                              isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                            }`}
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
                          disabled={loading}
                          className="w-full"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          {t('auth.signOut')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not Logged In - Sign In Button */
              <Link href="/auth/signin">
                <Button className="bg-gradient-electric text-white hover:opacity-90">
                  {t('auth.signIn')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
