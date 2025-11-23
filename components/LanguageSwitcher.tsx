'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🌐' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

interface LanguageSwitcherProps {
  currentLanguage?: string;
  onLanguageChange?: (language: string) => void;
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({
  currentLanguage = 'en',
  onLanguageChange,
  className = '',
  compact = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  // Set client-side flag for portal rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192, // 192px = w-48
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageSelect = (languageCode: string) => {
    setIsOpen(false);
    onLanguageChange?.(languageCode);
  };

  const renderDropdown = () => {
    if (!isOpen || !isClient) {
      return null;
    }

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed z-[200] w-48 overflow-hidden rounded-xl border border-border/50 bg-card/95 shadow-lg backdrop-blur-sm"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
        }}
      >
        <div className="py-2" role="listbox" aria-label="Language options">
          {LANGUAGES.map(language => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                language.code === currentLanguage ? 'bg-primary/10 text-primary' : 'text-foreground'
              }`}
              role="option"
              aria-selected={language.code === currentLanguage}
            >
              <span className="text-xl" role="img" aria-label={language.name}>
                {language.flag}
              </span>
              <div className="flex flex-col">
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs uppercase text-muted-foreground">{language.code}</span>
              </div>
              {language.code === currentLanguage && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Trigger Button */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center transition-colors ${
            compact
              ? 'gap-1 rounded-lg px-2 py-2 hover:bg-muted/50'
              : 'gap-2 rounded-lg border border-border/30 bg-card/50 px-3 py-2 hover:bg-card/70'
          }`}
          aria-label="Select language"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-xl" role="img" aria-label={currentLang.name}>
            {currentLang.flag}
          </span>
          <span
            className={`text-xs font-medium uppercase text-foreground ${compact ? 'text-xs' : 'text-sm'}`}
          >
            {currentLang.code}
          </span>
          {!compact && (
            <>
              <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                {currentLang.nativeName}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
          {compact && (
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>
      </div>

      {/* Dropdown Menu (Portal) */}
      {renderDropdown()}
    </>
  );
}
