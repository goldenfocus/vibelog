'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

import {
  isLocaleSupported,
  stripLocaleFromPath,
  addLocaleToPath,
  type Locale,
} from '@/lib/seo/hreflang';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, variables?: Record<string, any>) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

// Translation cache
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translationCache: Record<string, any> = {};

type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'vi' | 'zh';

async function loadTranslations(locale: SupportedLocale) {
  if (translationCache[locale]) {
    return translationCache[locale];
  }

  try {
    const translations = await import(`../../locales/${locale}.json`);
    translationCache[locale] = translations.default;
    return translations.default;
  } catch {
    console.warn(`Failed to load translations for ${locale}, falling back to English`);
    if (locale !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj) as string | undefined;
}

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale = 'en' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [translations, setTranslations] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Load translations when locale changes
  useEffect(() => {
    const loadAndSetTranslations = async () => {
      setIsLoading(true);
      try {
        const newTranslations = await loadTranslations(locale);
        setTranslations(newTranslations);
      } catch (error) {
        console.error('Failed to load translations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSetTranslations();
  }, [locale]);

  // Sync locale from URL on mount and pathname changes
  useEffect(() => {
    if (!pathname) {
      return;
    }

    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];

    // Check if first segment is a locale
    if (firstSegment && isLocaleSupported(firstSegment)) {
      if (locale !== firstSegment) {
        setLocaleState(firstSegment as SupportedLocale);
      }
    } else {
      // No locale in URL = default locale (en)
      if (locale !== 'en') {
        setLocaleState('en');
      }
    }
  }, [pathname, locale]);

  /**
   * Change locale and navigate to the new URL
   * This is the key function that makes language switching work with URLs
   */
  const setLocale = (newLocale: Locale) => {
    if (!isLocaleSupported(newLocale)) {
      console.warn(`Unsupported locale: ${newLocale}`);
      return;
    }

    // Get current path without locale prefix
    const pathWithoutLocale = stripLocaleFromPath(pathname);

    // Add new locale prefix (or keep clean if 'en')
    const newPath = addLocaleToPath(pathWithoutLocale, newLocale);

    // Set cookie for persistence FIRST (before navigation)
    // This ensures middleware sees the new locale immediately
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    // Update state immediately for instant UI feedback
    setLocaleState(newLocale as SupportedLocale);

    // Navigate to new URL and force server refresh
    // router.refresh() ensures middleware re-runs with fresh cookie state
    router.push(newPath);
    router.refresh();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (key: string, variables?: Record<string, any>): string => {
    const value = getNestedValue(translations, key);
    const template = value || key;

    if (variables && typeof template === 'string') {
      return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
        return variables[variableName] !== undefined ? String(variables[variableName]) : match;
      });
    }

    return template;
  };

  const value: I18nContextType = {
    locale,
    setLocale,
    t,
    isLoading,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
