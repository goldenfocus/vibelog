'use client';

import { Globe } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';

import { stripLocaleFromPath, type Locale } from '@/lib/seo/hreflang';
import { cn } from '@/lib/utils';

/**
 * Language configuration with flags
 * Using actual country flags for all languages (UK for English)
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
] as const;

interface FlagLinksProps {
  currentLocale: Locale;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * FlagLinks - Responsive language selector
 *
 * Mobile: Single compact button → Bottom sheet with all languages
 * Desktop: Horizontal row of subtle flag links
 *
 * Design:
 * - Inactive: 50% opacity + grayscale (subtle, premium feel)
 * - Active: Full color + slight scale (clear indication)
 * - Hover: Restores color and opacity (inviting interaction)
 *
 * SEO Benefits:
 * - Real <a href> links (crawlable by Googlebot)
 * - hrefLang attribute on each link
 * - Reinforces hreflang meta tags
 */
export function FlagLinks({ currentLocale, className, size = 'md' }: FlagLinksProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Get path without locale prefix for generating links
  const pathWithoutLocale = stripLocaleFromPath(pathname);

  // Generate localized path for each language
  const getLocalizedPath = useCallback(
    (locale: string) => `/${locale}${pathWithoutLocale}`,
    [pathWithoutLocale]
  );

  // Get current language info
  const currentLang = LANGUAGES.find(l => l.code === currentLocale) || LANGUAGES[0];

  // Size configurations - all maintain 44px touch target via padding
  const sizeClasses = {
    sm: 'text-base min-h-[44px] min-w-[32px] px-1',
    md: 'text-lg min-h-[44px] min-w-[36px] px-1',
    lg: 'text-xl min-h-[44px] min-w-[40px] px-1.5',
  };

  return (
    <>
      {/*
        SEO Strategy: hreflang is handled in <head> via Next.js metadata.alternates.languages
        (see app/[locale]/layout.tsx). In-page links here are for USER navigation only.

        - Mobile: Globe button → bottom sheet with language options
        - Desktop: Horizontal flag row
      */}

      {/* Mobile: Compact globe button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center justify-center rounded-lg lg:hidden',
          'h-10 w-10 border border-border/40 bg-muted/60',
          'transition-all duration-200 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className
        )}
        aria-label={`Language: ${currentLang.nativeName}. Tap to change.`}
      >
        <Globe className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Desktop: Horizontal row of flags (visible + crawlable) */}
      <nav
        aria-label="Language selection"
        className={cn('hidden items-center gap-0.5 lg:flex', className)}
      >
        {LANGUAGES.map(lang => {
          const isActive = lang.code === currentLocale;
          const href = getLocalizedPath(lang.code);

          return (
            <Link
              key={lang.code}
              href={href}
              hrefLang={lang.code}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Switch to ${lang.name} (${lang.nativeName})`}
              title={lang.nativeName}
              prefetch={false}
              className={cn(
                // Base styles
                'flex items-center justify-center rounded-full',
                'transition-all duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                sizeClasses[size],
                // Active vs inactive states
                isActive
                  ? 'scale-110 opacity-100'
                  : 'opacity-40 grayscale hover:opacity-80 hover:grayscale-0 active:scale-95'
              )}
            >
              <span role="img" aria-hidden="true">
                {lang.flag}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Bottom Sheet (user interaction) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Select language"
        >
          {/* Backdrop with fade animation */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom Sheet with slide-up animation */}
          <div className="absolute inset-x-0 bottom-0 animate-in slide-in-from-bottom duration-300 ease-out">
            <div className="rounded-t-3xl bg-background px-4 pb-8 pt-4 shadow-2xl">
              {/* Handle bar */}
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border/60" />

              {/* Header */}
              <div className="mb-4 text-center">
                <h2 className="text-lg font-semibold text-foreground">Choose Language</h2>
                <p className="text-sm text-muted-foreground">Select your preferred language</p>
              </div>

              {/* Language Grid - Using real Links for SEO within the sheet too */}
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(lang => {
                  const isActive = lang.code === currentLocale;
                  return (
                    <Link
                      key={lang.code}
                      href={getLocalizedPath(lang.code)}
                      hrefLang={lang.code}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3',
                        'transition-all duration-200 active:scale-[0.98]',
                        isActive
                          ? 'bg-primary/10 ring-2 ring-primary'
                          : 'bg-muted/50 hover:bg-muted'
                      )}
                    >
                      <span className="text-2xl" role="img" aria-hidden="true">
                        {lang.flag}
                      </span>
                      <div className="text-left">
                        <div
                          className={cn(
                            'text-sm font-medium',
                            isActive ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {lang.nativeName}
                        </div>
                        <div className="text-xs text-muted-foreground">{lang.name}</div>
                      </div>
                      {isActive && (
                        <div className="ml-auto">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Cancel button */}
              <button
                onClick={() => setIsOpen(false)}
                className="mt-4 w-full rounded-xl bg-muted py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FlagLinks;
