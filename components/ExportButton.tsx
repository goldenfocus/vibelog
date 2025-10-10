'use client';

import { Download, FileText, Code, FileJson } from 'lucide-react';
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
  onExport?: (format: ExportFormat) => void;
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
  onExport,
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
      createdAt: new Date().toISOString(),
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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex min-w-[70px] flex-col items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 p-3 transition-all duration-200 hover:scale-105 hover:bg-muted/30 sm:min-w-[80px] sm:p-4"
        data-testid="export-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download className="h-5 w-5 text-foreground transition-colors group-hover:text-electric sm:h-6 sm:w-6" />
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
          Export
        </span>
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                data-testid={`export-${format}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  .{getExportFileInfo(format).extension.replace('.', '')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
