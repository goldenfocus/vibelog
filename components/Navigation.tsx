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

          {/* Language Switcher & Auth Button */}
          <div className="hidden md:flex items-center space-x-3">
            <LanguageSwitcher
              currentLanguage={locale}
              onLanguageChange={setLocale}
              compact={true}
            />
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center space-x-2">
                {user.user_metadata?.full_name && (
                  <Link href="/dashboard" className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-accent">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{user.user_metadata.full_name}</span>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth/signin">
                <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20 focus:scale-105">
                  {t('auth.signIn')}
                </button>
              </Link>
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
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
            
            {/* Mobile Language Switcher */}
            <div className="pt-2 flex justify-center">
              <LanguageSwitcher
                currentLanguage={locale}
                onLanguageChange={setLocale}
                compact={true}
              />
            </div>
            
            {/* Mobile Auth Button */}
            {user ? (
              <div className="space-y-2">
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
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-electric/20 focus:scale-105">
                  {t('auth.signIn')}
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
