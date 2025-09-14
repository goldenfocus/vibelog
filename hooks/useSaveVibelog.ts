// DEPRECATED: This hook has been replaced by useBulletproofSave
// @deprecated Use useBulletproofSave instead for improved reliability and error handling
// This file is kept for backward compatibility but will be removed in a future version

import { useBulletproofSave } from './useBulletproofSave';

export function useSaveVibelog() {
  console.warn('useSaveVibelog is deprecated. Use useBulletproofSave instead.');

  // Delegate to the bulletproof implementation
  const bulletproofSave = useBulletproofSave();

  return {
    saveVibelog: bulletproofSave.saveVibelog,
    isSaving: bulletproofSave.isSaving
  };
}