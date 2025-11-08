'use client';

import { Download, FileText, Code, FileJson, Music } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import {
  exportContent,
  downloadFile,
  getExportFileInfo,
  type ExportFormat,
  type VibelogExportData,
} from '@/lib/export';

export interface ExportButtonProps {
  content: string;
  title?: string;
  author?: string;
  authorUsername?: string;
  vibelogUrl?: string;
  createdAt?: string;
  audioUrl?: string;
  onExport?: (format: ExportFormat) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

const exportFormats: Array<{
  format: ExportFormat;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { format: 'markdown', label: 'Markdown', icon: FileText },
  { format: 'html', label: 'HTML', icon: Code },
  { format: 'text', label: 'Text', icon: FileText },
  { format: 'json', label: 'JSON', icon: FileJson },
];

export default function ExportButton({
  content,
  title,
  author,
  authorUsername,
  vibelogUrl,
  createdAt,
  audioUrl,
  onExport,
  variant = 'default',
  className = '',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleExport = (format: ExportFormat) => {
    const data: VibelogExportData = {
      title,
      content,
      author,
      authorUsername,
      vibelogUrl,
      createdAt: createdAt || new Date().toISOString(),
    };

    const exported = exportContent(data, format);
    const { extension, mimeType } = getExportFileInfo(format);
    const filename = `${title ? title.toLowerCase().replace(/\s+/g, '-') : 'vibelog'}${extension}`;

    downloadFile(exported, filename, mimeType);

    // Callback for tracking
    onExport?.(format);

    // Close dropdown
    setIsOpen(false);
  };

  const handleAudioDownload = () => {
    if (!audioUrl) {
      return;
    }

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${title ? title.toLowerCase().replace(/\s+/g, '-') : 'vibelog'}-audio.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close dropdown
    setIsOpen(false);
  };

  const isCompact = variant === 'compact';
  const buttonClass = isCompact
    ? 'flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm transition-all hover:border-electric/30 hover:bg-electric/5 active:scale-95 active:bg-electric/10 touch-manipulation'
    : 'group flex min-w-[80px] flex-col items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 p-4 transition-all duration-200 hover:scale-105 hover:bg-muted/30 active:scale-95 active:bg-muted/40 sm:min-w-[90px] sm:p-4 touch-manipulation';

  const iconClass = isCompact
    ? 'h-4 w-4'
    : 'h-5 w-5 text-foreground transition-colors group-hover:text-electric sm:h-6 sm:w-6';

  const labelClass = isCompact
    ? 'hidden sm:inline'
    : 'text-xs font-medium text-muted-foreground group-hover:text-foreground';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
        data-testid="export-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download className={iconClass} />
        <span className={labelClass}>Export</span>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded-xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-sm"
          data-testid="export-dropdown"
        >
          <div className="p-2">
            <div className="mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Export as
            </div>
            {exportFormats.map(({ format, label, icon: Icon }) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                className="flex w-full touch-manipulation items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                data-testid={`export-${format}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  .{getExportFileInfo(format).extension.replace('.', '')}
                </span>
              </button>
            ))}

            {/* Audio Download Option */}
            {audioUrl && (
              <>
                <div className="my-2 border-t border-border/30" />
                <button
                  onClick={handleAudioDownload}
                  className="flex w-full touch-manipulation items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                  data-testid="export-audio"
                >
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <span>Audio</span>
                  <span className="ml-auto text-xs text-muted-foreground">.webm</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
