'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';

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
 * Mobile: Current flag button → Smooth expanding pill with all flags
 * Desktop: Horizontal row of subtle flag links
 *
 * Design Philosophy:
 * - Show current language flag (familiar, personal)
 * - Tap to expand into horizontal flag row (no jarring modal)
 * - Smooth CSS transitions (no mount/unmount flicker)
 * - Auto-close when tapping outside or selecting
 *
 * SEO Benefits:
 * - Real <a href> links (crawlable by Googlebot)
 * - hrefLang attribute on each link
 * - Reinforces hreflang meta tags
 */
export function FlagLinks({ currentLocale, className, size = 'md' }: FlagLinksProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get path without locale prefix for generating links
  const pathWithoutLocale = stripLocaleFromPath(pathname);

  // Generate localized path for each language
  const getLocalizedPath = useCallback(
    (locale: string) => `/${locale}${pathWithoutLocale}`,
    [pathWithoutLocale]
  );

  // Get current language info
  const currentLang = LANGUAGES.find(l => l.code === currentLocale) || LANGUAGES[0];

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    // Use touchstart for mobile (faster response)
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Close on escape key
  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  // Size configurations - all maintain 44px touch target
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
      */}

      {/* Mobile: Current flag → Expanding pill with all flags */}
      <div ref={containerRef} className={cn('relative lg:hidden', className)}>
        {/* Expanding pill container */}
        <div
          className={cn(
            'flex items-center overflow-hidden rounded-full border',
            'transition-all duration-300 ease-out',
            isExpanded
              ? 'border-primary/30 bg-background/95 shadow-lg backdrop-blur-md'
              : 'border-border/40 bg-muted/60'
          )}
        >
          {/* Current flag button (always visible) */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex h-10 w-10 items-center justify-center',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isExpanded && 'scale-110'
            )}
            aria-label={`Language: ${currentLang.nativeName}. Tap to ${isExpanded ? 'close' : 'change'}.`}
            aria-expanded={isExpanded}
          >
            <span className="text-xl" role="img" aria-hidden="true">
              {currentLang.flag}
            </span>
          </button>

          {/* Other flags (expand from right) */}
          <div
            className={cn(
              'flex items-center gap-1 overflow-hidden',
              'transition-all duration-300 ease-out',
              isExpanded ? 'max-w-[200px] pr-2 opacity-100' : 'max-w-0 opacity-0'
            )}
          >
            {LANGUAGES.filter(l => l.code !== currentLocale).map((lang, index) => (
              <Link
                key={lang.code}
                href={getLocalizedPath(lang.code)}
                hrefLang={lang.code}
                onClick={() => setIsExpanded(false)}
                aria-label={`Switch to ${lang.name} (${lang.nativeName})`}
                title={lang.nativeName}
                prefetch={false}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  'transition-all duration-200 ease-out',
                  'hover:scale-110 hover:bg-primary/10',
                  'active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                )}
                style={{
                  // Staggered entrance animation
                  transitionDelay: isExpanded ? `${index * 30}ms` : '0ms',
                  transform: isExpanded ? 'scale(1)' : 'scale(0.8)',
                  opacity: isExpanded ? 1 : 0,
                }}
              >
                <span className="text-lg" role="img" aria-hidden="true">
                  {lang.flag}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

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
    </>
  );
}

export default FlagLinks;
