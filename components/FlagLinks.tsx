'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
 * FlagLinks - Permanent horizontal row of subtle flag links
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

  // Get path without locale prefix for generating links
  const pathWithoutLocale = stripLocaleFromPath(pathname);

  // Generate localized path for each language
  const getLocalizedPath = (locale: string) => {
    return `/${locale}${pathWithoutLocale}`;
  };

  // Size configurations - all maintain 44px touch target via padding
  const sizeClasses = {
    sm: 'text-base min-h-[44px] min-w-[32px] px-1',
    md: 'text-lg min-h-[44px] min-w-[36px] px-1',
    lg: 'text-xl min-h-[44px] min-w-[40px] px-1.5',
  };

  return (
    <nav aria-label="Language selection" className={cn('flex items-center gap-0.5', className)}>
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
  );
}

export default FlagLinks;
