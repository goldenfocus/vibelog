"use client";

import React, { useState } from "react";
import { Copy, Share, Edit, X, LogIn, Play, Pause, Loader2 } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export interface PublishActionsProps {
  content: string;
  isLoggedIn?: boolean;
  isTeaserContent?: boolean;
  onCopy: (content: string) => void;
  onEdit: () => void;
  onShare: () => void;
  onUpgradePrompt?: (message: string, benefits: string[]) => void;
  showSignature?: boolean;
  className?: string;
}

interface LoginPopupProps {
  type: 'edit' | 'save';
  isOpen: boolean;
  onClose: () => void;
}

const LoginPopup: React.FC<LoginPopupProps> = ({ type, isOpen, onClose }) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  const isEditPopup = type === 'edit';
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">{t('components.micRecorder.loginRequired')}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="close-popup-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {isEditPopup 
            ? t('components.micRecorder.loginEditMessage')
            : t('components.micRecorder.loginSaveMessage')
          }
        </p>
        <div className="flex flex-col gap-3">
          <button 
            className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-2xl transition-all duration-200"
            data-testid="sign-in-button"
          >
            <LogIn className="w-5 h-5" />
            {isEditPopup 
              ? t('components.micRecorder.signInToEdit')
              : 'Sign In to Save'
            }
          </button>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-center py-2"
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
  isLoggedIn = false,
  isTeaserContent = false,
  onCopy,
  onEdit,
  onShare,
  onUpgradePrompt,
  showSignature = false,
  className = ""
}: PublishActionsProps) {
  const { t } = useI18n();
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const handleTTSEnded = () => {
    // Show sign-in prompt after teaser playback ends for non-logged users
    if (isTeaserContent && !isLoggedIn) {
      setShowSignInPrompt(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowSignInPrompt(false), 5000);
    }
  };

  const { isPlaying, isLoading, playText, stop, progress } = useTextToSpeech(onUpgradePrompt, handleTTSEnded);

  const handleEditClick = () => {
    if (!isLoggedIn) {
      setShowEditPopup(true);
      return;
    }
    onEdit();
  };

  const handlePlayClick = async () => {
    if (isPlaying) {
      stop();
    } else {
      // Strip markdown and HTML for cleaner TTS
      let cleanContent = content
        .replace(/#{1,6}\s/g, '') // Remove markdown headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/`([^`]+)`/g, '$1') // Remove code formatting
        .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
        .trim();

      // Add signup prompt for teaser content when user is not logged in
      if (isTeaserContent && !isLoggedIn) {
        cleanContent += '. Sign in with Google to listen to the full vibelog and unlock unlimited content creation.';
      }

      await playText(cleanContent, 'shimmer'); // Using shimmer voice (closest to "Juniper" feel)
    }
  };

  const handleCopyClick = () => {
    let contentToCopy = content;
    if (showSignature) {
      contentToCopy = content + '\n\n---\nCreated by @vibeyang\nhttps://vibelog.io/vibeyang';
    }
    onCopy(contentToCopy);
  };

  const closeEditPopup = () => setShowEditPopup(false);

  return (
    <>
      <div className={`flex justify-center gap-2 sm:gap-3 ${className}`} data-testid="publish-actions">
        <button
          onClick={handleEditClick}
          className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-muted/20 hover:bg-muted/30 border border-border/20 rounded-2xl transition-all duration-200 hover:scale-105 min-w-[70px] sm:min-w-[80px]"
          data-testid="edit-button"
        >
          <Edit className="w-5 h-5 sm:w-6 sm:h-6 text-foreground group-hover:text-electric transition-colors" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{t('actions.edit')}</span>
        </button>
        
        <button
          onClick={handleCopyClick}
          className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-muted/20 hover:bg-muted/30 border border-border/20 rounded-2xl transition-all duration-200 hover:scale-105 min-w-[70px] sm:min-w-[80px]"
          data-testid="copy-button"
        >
          <Copy className="w-5 h-5 sm:w-6 sm:h-6 text-foreground group-hover:text-electric transition-colors" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{t('actions.copy')}</span>
        </button>
        
        <button
          onClick={handlePlayClick}
          disabled={isLoading}
          className="group relative flex flex-col items-center gap-2 p-3 sm:p-4 bg-muted/20 hover:bg-muted/30 border border-border/20 rounded-2xl transition-all duration-200 hover:scale-105 min-w-[70px] sm:min-w-[80px] overflow-hidden"
          data-testid="play-button"
        >
          {/* Progress indicator */}
          {isPlaying && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-electric transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          )}

          <div className="relative flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-foreground animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-foreground group-hover:text-electric transition-colors" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-foreground group-hover:text-electric transition-colors" />
            )}
          </div>

          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
            {isPlaying ? 'Pause' : 'Listen'}
          </span>
        </button>
        
        <button
          onClick={onShare}
          className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-muted/20 hover:bg-muted/30 border border-border/20 rounded-2xl transition-all duration-200 hover:scale-105 min-w-[70px] sm:min-w-[80px]"
          data-testid="share-button"
        >
          <Share className="w-5 h-5 sm:w-6 sm:h-6 text-foreground group-hover:text-electric transition-colors" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{t('actions.share')}</span>
        </button>
      </div>

      {/* Login Popup */}
      <LoginPopup
        type="edit"
        isOpen={showEditPopup}
        onClose={closeEditPopup}
      />

      {/* Sign-in Prompt after teaser playback */}
      {showSignInPrompt && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-electric text-white px-6 py-3 rounded-2xl shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
          <LogIn className="w-5 h-5" />
          <span className="font-medium">
            Sign in with Google to listen to full vibelogs
          </span>
          <button
            onClick={() => setShowSignInPrompt(false)}
            className="ml-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}