'use client';

import { Copy, Share, Edit, X, LogIn, Send } from 'lucide-react';
import React, { useState } from 'react';

import ExportButton from '@/components/ExportButton';
import { useI18n } from '@/components/providers/I18nProvider';
import type { ExportFormat } from '@/lib/export';

export interface PublishActionsProps {
  content: string;
  title?: string;
  author?: string;
  vibelogId?: string;
  isLoggedIn?: boolean;
  isTeaserContent?: boolean;
  onCopy: (content: string) => Promise<void> | void;
  onEdit: () => void;
  onShare: () => void;
  onPublish?: () => Promise<void>;
  onUpgradePrompt?: (message: string, benefits: string[]) => void;
  onExport?: (format: ExportFormat) => void;
  className?: string;
}

interface LoginPopupProps {
  type: 'edit' | 'save';
  isOpen: boolean;
  onClose: () => void;
}

const LoginPopup: React.FC<LoginPopupProps> = ({ type, isOpen, onClose }) => {
  const { t } = useI18n();

  if (!isOpen) {
    return null;
  }

  const isEditPopup = type === 'edit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">
            {t('components.micRecorder.loginRequired')}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            data-testid="close-popup-button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-6 leading-relaxed text-muted-foreground">
          {isEditPopup
            ? t('components.micRecorder.loginEditMessage')
            : t('components.micRecorder.loginSaveMessage')}
        </p>
        <div className="flex flex-col gap-3">
          <button
            className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-electric px-6 py-3 font-semibold text-white transition-all duration-200 hover:opacity-90"
            data-testid="sign-in-button"
          >
            <LogIn className="h-5 w-5" />
            {isEditPopup ? t('components.micRecorder.signInToEdit') : 'Sign In to Save'}
          </button>
          <button
            onClick={onClose}
            className="py-2 text-center text-muted-foreground transition-colors hover:text-foreground"
            data-testid="maybe-later-button"
          >
            {t('components.micRecorder.maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PublishActions({
  content,
  title,
  author,
  vibelogId: _vibelogId,
  isLoggedIn = false,
  isTeaserContent: _isTeaserContent = false,
  onCopy,
  onEdit,
  onShare,
  onPublish,
  onUpgradePrompt: _onUpgradePrompt,
  onExport,
  className = '',
}: PublishActionsProps) {
  const DEBUG_MODE = process.env.NODE_ENV !== 'production';
  const { t } = useI18n();
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // TTS preview removed - use only original audio

  const handleEditClick = () => {
    if (!isLoggedIn) {
      setShowEditPopup(true);
      return;
    }
    onEdit();
  };

  const handleCopyClick = async () => {
    try {
      await onCopy(content);
    } catch (error) {
      if (DEBUG_MODE) {
        console.error('Copy failed', error);
      }
    }
  };

  const handlePublishClick = async () => {
    if (!onPublish) {
      return;
    }

    setIsPublishing(true);
    try {
      await onPublish();
    } catch (error) {
      if (DEBUG_MODE) {
        console.error('Publish failed', error);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const closeEditPopup = () => setShowEditPopup(false);

  return (
    <>
      {/* Prominent Publish Button */}
      {onPublish && isLoggedIn && (
        <div className="mb-4 flex justify-center">
          <button
            onClick={handlePublishClick}
            disabled={isPublishing}
            className="flex items-center gap-3 rounded-2xl bg-gradient-electric px-8 py-4 font-semibold text-white transition-all duration-200 hover:scale-105 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="publish-button"
          >
            <Send className="h-5 w-5" />
            {isPublishing ? 'Publishing...' : 'Publish to Community'}
          </button>
        </div>
      )}

      <div
        className={`flex justify-center gap-2 sm:gap-3 ${className}`}
        data-testid="publish-actions"
      >
        <button
          onClick={handleEditClick}
          className="group flex min-w-[70px] flex-col items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 p-3 transition-all duration-200 hover:scale-105 hover:bg-muted/30 sm:min-w-[80px] sm:p-4"
          data-testid="edit-button"
        >
          <Edit className="h-5 w-5 text-foreground transition-colors group-hover:text-electric sm:h-6 sm:w-6" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
            {t('actions.edit')}
          </span>
        </button>

        <button
          onClick={handleCopyClick}
          className="group flex min-w-[70px] flex-col items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 p-3 transition-all duration-200 hover:scale-105 hover:bg-muted/30 sm:min-w-[80px] sm:p-4"
          data-testid="copy-button"
        >
          <Copy className="h-5 w-5 text-foreground transition-colors group-hover:text-electric sm:h-6 sm:w-6" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
            {t('actions.copy')}
          </span>
        </button>

        {/* TTS Preview removed - use only original audio */}

        <button
          onClick={onShare}
          className="group flex min-w-[70px] flex-col items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 p-3 transition-all duration-200 hover:scale-105 hover:bg-muted/30 sm:min-w-[80px] sm:p-4"
          data-testid="share-button"
        >
          <Share className="h-5 w-5 text-foreground transition-colors group-hover:text-electric sm:h-6 sm:w-6" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
            {t('actions.share')}
          </span>
        </button>

        <ExportButton content={content} title={title} author={author} onExport={onExport} />
      </div>

      <LoginPopup type="edit" isOpen={showEditPopup} onClose={closeEditPopup} />
    </>
  );
}
