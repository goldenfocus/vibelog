'use client';

import { Check, X } from 'lucide-react';
import React, { useEffect } from 'react';

interface VibelogEditModalProps {
  isVisible: boolean;
  editedContent: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function VibelogEditModal({
  isVisible,
  editedContent,
  onContentChange,
  onSave,
  onCancel,
}: VibelogEditModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">Edit Your Vibelog</h3>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-electric px-4 py-2 font-semibold text-white transition-all duration-200 hover:opacity-90"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={onCancel}
              className="p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <textarea
            value={editedContent}
            onChange={e => onContentChange(e.target.value)}
            className="min-h-[300px] w-full resize-none rounded-xl border border-border/30 bg-background/50 p-4 text-foreground placeholder-muted-foreground backdrop-blur-sm transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
            placeholder="Edit your vibelog content..."
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
