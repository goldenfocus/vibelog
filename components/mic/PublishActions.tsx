"use client";

import React, { useState } from "react";
import { Copy, Share, Save, Edit, X, LogIn } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

export interface PublishActionsProps {
  content: string;
  isLoggedIn?: boolean;
  onCopy: (content: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onShare: () => void;
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
  onCopy,
  onEdit,
  onSave,
  onShare,
  showSignature = false,
  className = ""
}: PublishActionsProps) {
  const { t } = useI18n();
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);

  const handleEditClick = () => {
    if (!isLoggedIn) {
      setShowEditPopup(true);
      return;
    }
    onEdit();
  };

  const handleSaveClick = () => {
    if (!isLoggedIn) {
      setShowSavePopup(true);
      return;
    }
    onSave();
  };

  const handleCopyClick = () => {
    let contentToCopy = content;
    if (showSignature) {
      contentToCopy = content + '\n\n---\nCreated by @vibeyang\nhttps://vibelog.io/vibeyang';
    }
    onCopy(contentToCopy);
  };

  const closeEditPopup = () => setShowEditPopup(false);
  const closeSavePopup = () => setShowSavePopup(false);

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
          onClick={handleSaveClick}
          className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-muted/20 hover:bg-muted/30 border border-border/20 rounded-2xl transition-all duration-200 hover:scale-105 min-w-[70px] sm:min-w-[80px]"
          data-testid="save-button"
        >
          <Save className="w-5 h-5 sm:w-6 sm:h-6 text-foreground group-hover:text-electric transition-colors" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{t('actions.save')}</span>
        </button>
        
        <button 
          onClick={onShare}
          className="group flex flex-col items-center gap-2 p-3 sm:p-4 bg-electric/20 hover:bg-electric/30 border border-electric/20 rounded-2xl transition-all duration-200 hover:scale-105 min-w-[70px] sm:min-w-[80px]"
          data-testid="share-button"
        >
          <Share className="w-5 h-5 sm:w-6 sm:h-6 text-electric" />
          <span className="text-xs font-medium text-electric">{t('actions.share')}</span>
        </button>
      </div>

      {/* Login Popups */}
      <LoginPopup
        type="edit"
        isOpen={showEditPopup}
        onClose={closeEditPopup}
      />
      
      <LoginPopup
        type="save"
        isOpen={showSavePopup}
        onClose={closeSavePopup}
      />
    </>
  );
}