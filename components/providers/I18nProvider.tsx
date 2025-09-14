"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, variables?: Record<string, any>) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

// Translation cache
const translationCache: Record<string, any> = {};

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'vi', 'zh'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

async function loadTranslations(locale: SupportedLocale) {
  if (translationCache[locale]) {
    return translationCache[locale];
  }

  try {
    const translations = await import(`../../locales/${locale}.json`);
    translationCache[locale] = translations.default;
    return translations.default;
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}, falling back to English`);
    if (locale !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [translations, setTranslations] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);

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

  // Load saved locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('vibelog-locale');
    if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale as SupportedLocale)) {
      setLocaleState(savedLocale as SupportedLocale);
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0];
      if ((SUPPORTED_LOCALES as readonly string[]).includes(browserLang)) {
        setLocaleState(browserLang as SupportedLocale);
      }
    }
  }, []);

  const setLocale = (newLocale: string) => {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(newLocale)) {
      setLocaleState(newLocale as SupportedLocale);
      localStorage.setItem('vibelog-locale', newLocale);
    }
  };

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

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
