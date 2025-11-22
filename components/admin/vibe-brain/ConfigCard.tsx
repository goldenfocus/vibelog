'use client';

import { Check, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ConfigCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSave: () => Promise<void>;
  isDirty: boolean;
  lastUpdated?: string;
}

export function ConfigCard({
  title,
  description,
  icon,
  children,
  onSave,
  isDirty,
  lastUpdated,
}: ConfigCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  // Auto-save with debounce
  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await onSave();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, onSave]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-2.5 text-purple-500">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          {saved && !saving && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <Check className="h-4 w-4" />
              Saved
            </div>
          )}
          {isDirty && !saving && !saved && (
            <div className="flex items-center gap-2 text-sm text-amber-500">
              <RotateCcw className="h-3 w-3" />
              Unsaved
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">{children}</div>

      {/* Footer */}
      {lastUpdated && (
        <div className="border-t border-border/50 bg-muted/20 px-6 py-2">
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
