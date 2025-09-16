"use client";
import { useState } from "react";
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

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            <span className="bg-gradient-electric bg-clip-text text-transparent">vibelog.io</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-6">
              <Link 
                href="/about" 
                className={`hover:text-primary transition-colors ${isActive('/about') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {t('navigation.about')}
              </Link>
              <Link 
                href="/faq" 
                className={`hover:text-primary transition-colors ${isActive('/faq') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {t('navigation.faq')}
              </Link>
              <Link 
                href="/pricing" 
                className={`hover:text-primary transition-colors ${isActive('/pricing') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {t('navigation.pricing')}
              </Link>
              <Link 
                href="/community" 
                className={`hover:text-primary transition-colors ${isActive('/community') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {t('navigation.community')}
              </Link>
              <Link 
                href="/people" 
                className={`hover:text-primary transition-colors ${isActive('/people') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {t('navigation.people')}
              </Link>
            </div>
          </div>

          {/* Desktop Auth Button / User Menu */}
          <div className="hidden md:flex items-center space-x-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-accent"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.user_metadata?.full_name || 'Account'}</span>
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <LanguageSwitcher
                  currentLanguage={locale}
                  onLanguageChange={setLocale}
                  compact={true}
                />
                <Link href="/auth/signin">
                  <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20 focus:scale-105">
                    {t('auth.signIn')}
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation / User Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            {/* Show regular navigation links only on mobile when not logged in */}
            {/* On desktop when logged in, this becomes the user menu */}
            <div className="md:hidden space-y-4">
              <Link
                href="/about"
                className={`block hover:text-primary transition-colors ${isActive('/about') ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('navigation.about')}
              </Link>
              <Link
                href="/faq"
                className={`block hover:text-primary transition-colors ${isActive('/faq') ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('navigation.faq')}
              </Link>
              <Link
                href="/pricing"
                className={`block hover:text-primary transition-colors ${isActive('/pricing') ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('navigation.pricing')}
              </Link>
              <Link
                href="/community"
                className={`block hover:text-primary transition-colors ${isActive('/community') ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('navigation.community')}
              </Link>
              <Link
                href="/people"
                className={`block hover:text-primary transition-colors ${isActive('/people') ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('navigation.people')}
              </Link>
            </div>

            {/* Language Switcher - always show in mobile/user menu */}
            <div className="pt-2 border-t border-border/20">
              <div className="flex justify-center">
                <LanguageSwitcher
                  currentLanguage={locale}
                  onLanguageChange={setLocale}
                  compact={false}
                />
              </div>
            </div>

            {/* Auth Section */}
            {user ? (
              <div className="space-y-2 border-t border-border/20 pt-4">
                {user.user_metadata?.full_name && (
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-accent rounded-xl font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>{user.user_metadata.full_name}</span>
                  </Link>
                )}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await signOut();
                      setIsMenuOpen(false);
                      // Redirect to home page after sign out
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Sign out error:', error);
                      setIsMenuOpen(false);
                    }
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="border-t border-border/20 pt-4">
                <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                  <button className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20 focus:scale-105">
                    {t('auth.signIn')}
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
