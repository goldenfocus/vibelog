'use client';

import { Edit, X, Check } from 'lucide-react';
import React, { useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';

export interface TranscriptionPanelProps {
  transcription: string;
  liveTranscript: string;
  isRecording: boolean;
  isComplete: boolean;
  onCopy: (content: string) => void;
  onEdit?: () => void;
  onTranscriptUpdate?: (newTranscription: string) => void;
  onLiveTranscriptEdit?: (newTranscript: string) => void;
  isLoggedIn?: boolean;
  canEditLive?: boolean; // Can edit transcript during recording (silence detected)
}

interface EditModalProps {
  content: string;
  isOpen: boolean;
  onSave: (content: string) => void;
  onCancel: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ content, isOpen, onSave, onCancel }) => {
  const [editedContent, setEditedContent] = useState(content);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(editedContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">Edit Your Transcript</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-electric px-4 py-2 font-semibold text-white transition-all duration-200 hover:opacity-90"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={onCancel}
              className="p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close transcription editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <textarea
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
            className="h-full w-full resize-none rounded-xl border border-border/30 bg-background/50 p-4 text-foreground placeholder-muted-foreground backdrop-blur-sm transition-colors focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/20"
            placeholder="Edit your transcript content..."
            data-testid="transcript-edit-textarea"
          />
        </div>
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <span>Characters: {editedContent.length}</span>
          <span>Words: {editedContent.split(/\s+/).filter(word => word.length > 0).length}</span>
        </div>
      </div>
    </div>
  );
};

export default function TranscriptionPanel({
  transcription,
  liveTranscript,
  isRecording,
  isComplete,
  onCopy: _onCopy,
  onEdit: _onEdit,
  onTranscriptUpdate,
  onLiveTranscriptEdit,
  isLoggedIn: _isLoggedIn = false,
  canEditLive = false,
}: TranscriptionPanelProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveEdit = (newContent: string) => {
    if (onTranscriptUpdate) {
      onTranscriptUpdate(newContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const getWordCount = (text: string) => {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharacterCount = (text: string) => {
    return text.length;
  };

  return (
    <>
      {/* Live transcript during recording */}
      {isRecording && liveTranscript && (
        <div
          className="mb-8 rounded-2xl border border-border/30 bg-card/50 p-6 backdrop-blur-sm"
          data-testid="live-transcript-panel"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {t('components.micRecorder.liveTranscript')}
            </h3>
            {canEditLive && (
              <div className="flex items-center gap-2 rounded-lg bg-electric/10 px-3 py-1.5 text-sm font-medium text-electric">
                <Edit className="h-4 w-4" />
                Edit Mode
              </div>
            )}
          </div>

          {canEditLive && onLiveTranscriptEdit ? (
            <textarea
              value={liveTranscript}
              onChange={e => onLiveTranscriptEdit(e.target.value)}
              className="min-h-[120px] w-full resize-none rounded-xl border-2 border-electric/30 bg-background/50 p-4 text-lg leading-relaxed text-foreground placeholder-muted-foreground backdrop-blur-sm transition-all focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/50"
              placeholder="Your transcript appears here... (editable during silence)"
              data-testid="live-transcript-edit-textarea"
            />
          ) : (
            <p className="typing-cursor text-lg leading-relaxed" data-testid="live-transcript-text">
              {liveTranscript}
            </p>
          )}

          <div className="mt-4 flex justify-between text-sm text-muted-foreground">
            <span data-testid="live-transcript-char-count">
              Characters: {getCharacterCount(liveTranscript)}
            </span>
            <span data-testid="live-transcript-word-count">
              Words: {getWordCount(liveTranscript)}
            </span>
          </div>
        </div>
      )}

      {/* Completed transcription */}
      {transcription && isComplete && (
        <div
          className="rounded-2xl border border-border/20 bg-card p-6"
          data-testid="completed-transcript-panel"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{t('recorder.originalTranscription')}</h3>
          </div>
          <p
            className="leading-relaxed text-muted-foreground"
            data-testid="completed-transcript-text"
          >
            {transcription}
          </p>
          <div className="mt-4 flex justify-between text-sm text-muted-foreground">
            <span data-testid="completed-transcript-char-count">
              Characters: {getCharacterCount(transcription)}
            </span>
            <span data-testid="completed-transcript-word-count">
              Words: {getWordCount(transcription)}
            </span>
          </div>
        </div>
      )}

      {/* Empty state when no transcription - only show after user has tried recording */}
      {!isRecording && !transcription && isComplete && (
        <div
          className="rounded-2xl border border-border/10 bg-card/30 p-8 text-center"
          data-testid="empty-transcript-panel"
        >
          <div className="text-muted-foreground/60">
            <div className="mb-3 text-4xl">📝</div>
            <p className="mb-2 text-lg font-medium">No transcription yet</p>
            <p className="text-sm">Try recording again or check your microphone</p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditModal
        content={transcription}
        isOpen={isEditing}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    </>
  );
}
