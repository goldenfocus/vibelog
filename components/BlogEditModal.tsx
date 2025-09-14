"use client";

import React from "react";
import { Check, X } from "lucide-react";

interface BlogEditModalProps {
  isVisible: boolean;
  editedContent: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function BlogEditModal({
  isVisible,
  editedContent,
  onContentChange,
  onSave,
  onCancel,
}: BlogEditModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Edit Your Vibelog</h3>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <textarea
            value={editedContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-full resize-none bg-background/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric/20 focus:border-electric transition-colors"
            placeholder="Edit your vibelog content..."
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}