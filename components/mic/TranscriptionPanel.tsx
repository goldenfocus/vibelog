"use client";

import React, { useState } from "react";
import { Copy, Edit, X, Check } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

export interface TranscriptionPanelProps {
  transcription: string;
  liveTranscript: string;
  isRecording: boolean;
  isComplete: boolean;
  onCopy: (content: string) => void;
  onEdit?: () => void;
  onTranscriptUpdate?: (newTranscription: string) => void;
  isLoggedIn?: boolean;
}

interface EditModalProps {
  content: string;
  isOpen: boolean;
  onSave: (content: string) => void;
  onCancel: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ content, isOpen, onSave, onCancel }) => {
  const [editedContent, setEditedContent] = useState(content);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedContent);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Edit Your Transcript</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
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
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full resize-none bg-background/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric/20 focus:border-electric transition-colors"
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
  onCopy,
  onEdit,
  onTranscriptUpdate,
  isLoggedIn = false
}: TranscriptionPanelProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    if (!isLoggedIn && onEdit) {
      onEdit(); // This will show login popup in parent
      return;
    }
    setIsEditing(true);
  };

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
          className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 mb-8"
          data-testid="live-transcript-panel"
        >
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-foreground">
              {t('components.micRecorder.liveTranscript')}
            </h3>
          </div>
          <p 
            className="text-lg leading-relaxed typing-cursor"
            data-testid="live-transcript-text"
          >
            {liveTranscript}
          </p>
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
          className="bg-card rounded-2xl border border-border/20 p-6"
          data-testid="completed-transcript-panel"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('recorder.originalTranscription')}</h3>
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                data-testid="edit-transcript-button"
              >
                <Edit className="w-4 h-4" />
                {t('actions.edit')}
              </button>
              <button
                onClick={() => onCopy(transcription)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                data-testid="copy-transcript-button"
              >
                <Copy className="w-4 h-4" />
                {t('actions.copy')}
              </button>
            </div>
          </div>
          <p 
            className="text-muted-foreground leading-relaxed"
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
          className="bg-card/30 rounded-2xl border border-border/10 p-8 text-center"
          data-testid="empty-transcript-panel"
        >
          <div className="text-muted-foreground/60">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-lg font-medium mb-2">No transcription yet</p>
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