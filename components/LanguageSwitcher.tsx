"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🌐" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
];

interface LanguageSwitcherProps {
  currentLanguage?: string;
  onLanguageChange?: (language: string) => void;
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({ 
  currentLanguage = "en", 
  onLanguageChange,
  className = "",
  compact = false
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageSelect = (languageCode: string) => {
    setIsOpen(false);
    onLanguageChange?.(languageCode);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center transition-colors ${
          compact 
            ? "gap-1 px-2 py-2 rounded-lg hover:bg-muted/50" 
            : "gap-2 px-3 py-2 rounded-lg bg-card/50 hover:bg-card/70 border border-border/30"
        }`}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {compact ? (
          <span className="text-sm font-semibold text-foreground">
            {currentLang.code.toUpperCase()}
          </span>
        ) : (
          <span className="text-xl" role="img" aria-label={currentLang.name}>
            {currentLang.flag}
          </span>
        )}
        {!compact && (
          <>
            <span className="hidden sm:inline text-sm font-medium text-foreground">
              {currentLang.nativeName}
            </span>
            <ChevronDown 
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`} 
            />
          </>
        )}
        {compact && (
          <ChevronDown 
            className={`w-3 h-3 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`} 
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="py-2" role="listbox" aria-label="Language options">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageSelect(language.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  language.code === currentLanguage 
                    ? "bg-primary/10 text-primary" 
                    : "text-foreground"
                }`}
                role="option"
                aria-selected={language.code === currentLanguage}
              >
                <span className="text-xl" role="img" aria-label={language.name}>
                  {language.flag}
                </span>
                <span className="font-medium">
                  {language.nativeName}
                </span>
                {language.code === currentLanguage && (
                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}