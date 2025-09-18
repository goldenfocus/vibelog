"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/components/providers/AuthProvider";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { user, loading, signOut } = useAuth();

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
    try {
      setIsMenuOpen(false);
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  const navLinks = [
    { href: "/about", label: t('navigation.about') },
    { href: "/faq", label: t('navigation.faq') },
    { href: "/pricing", label: t('navigation.pricing') },
    { href: "/community", label: t('navigation.community') },
    { href: "/people", label: t('navigation.people') },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            <span className="bg-gradient-electric bg-clip-text text-transparent">
              vibelog.io
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-primary transition-colors ${
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Switcher for non-logged users */}
            {!user && !loading && (
              <LanguageSwitcher
                currentLanguage={locale}
                onLanguageChange={setLocale}
                compact={true}
              />
            )}

            {/* Auth State */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              /* Logged In User - Desktop Dropdown */
              <div className="relative" data-menu-container>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 bg-electric/20 rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-electric" />
                  </div>
                  <span className="text-sm max-w-[100px] truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>

                {/* Desktop User Dropdown */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      {/* User Info */}
                      <div className="flex items-center space-x-3 pb-3 border-b border-border">
                        <div className="w-10 h-10 bg-electric/20 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-electric" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.user_metadata?.full_name || 'Account'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <div className="py-3 space-y-1">
                        {navLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={closeMenu}
                            className={`block px-2 py-2 text-sm rounded hover:bg-muted transition-colors ${
                              isActive(link.href) ? 'text-primary bg-muted' : ''
                            }`}
                          >
                            {link.label}
                          </Link>
                        ))}
                        <hr className="my-2 border-border" />
                        <Link
                          href="/dashboard"
                          onClick={closeMenu}
                          className="flex items-center space-x-2 px-2 py-2 text-sm rounded hover:bg-muted transition-colors"
                        >
                          <User className="h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </div>

                      {/* Language Switcher */}
                      <div className="pt-3 border-t border-border">
                        <LanguageSwitcher
                          currentLanguage={locale}
                          onLanguageChange={setLocale}
                          compact={false}
                        />
                      </div>

                      {/* Sign Out */}
                      <div className="pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSignOut}
                          disabled={loading}
                          className="w-full"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          {loading ? 'Signing out...' : t('auth.signOut')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not Logged In - Sign In Button */
              <Link href="/auth/signin">
                <Button className="bg-gradient-electric hover:opacity-90 text-white">
                  {t('auth.signIn')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile/Tablet Menu Button */}
          <div className="lg:hidden" data-menu-container>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile/Tablet Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <div className="px-4 py-4 space-y-4">
              {/* Navigation Links */}
              <div className="space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`block py-2 text-base ${
                      isActive(link.href)
                        ? 'text-primary font-medium'
                        : 'text-foreground hover:text-primary transition-colors'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* User Section */}
              {user && (
                <>
                  <hr className="border-border" />
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-electric/20 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-electric" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.user_metadata?.full_name || 'Account'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className="flex items-center space-x-2 py-2 text-sm hover:text-primary transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </div>
                </>
              )}

              {/* Language Switcher */}
              <hr className="border-border" />
              <div>
                <LanguageSwitcher
                  currentLanguage={locale}
                  onLanguageChange={setLocale}
                  compact={false}
                />
              </div>

              {/* Auth Action */}
              <hr className="border-border" />
              <div>
                {user ? (
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    disabled={loading}
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {loading ? 'Signing out...' : t('auth.signOut')}
                  </Button>
                ) : (
                  <Link href="/auth/signin" onClick={closeMenu}>
                    <Button className="w-full bg-gradient-electric hover:opacity-90 text-white">
                      {t('auth.signIn')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;