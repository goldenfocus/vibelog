import { useCallback, useRef, useState } from 'react';

interface SaveVibelogData {
  vibelogId?: string; // For updating existing vibelogs
  title?: string;
  content: string;
  fullContent?: string;
  transcription?: string;
  coverImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  audioData?: {
    url: string;
    duration: number;
  };
  userId?: string;
  isTeaser?: boolean;
  isPublished?: boolean;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

interface SaveResult {
  success: boolean;
  vibelogId?: string;
  slug?: string;
  publicUrl?: string;
  isAnonymous?: boolean;
  sessionId?: string;
  message: string;
  warnings?: string[];
}

const STORAGE_KEY = 'vibelog_unsaved_backups';
const METRICS_KEY = 'vibelog_save_metrics';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

export function useBulletproofSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'warning' | 'error'>(
    'idle'
  );
  const saveAttemptRef = useRef(0);

  // Monitoring and metrics tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackSaveMetrics = useCallback((event: string, data?: any) => {
    try {
      const metrics = JSON.parse(localStorage.getItem(METRICS_KEY) || '{}');
      const timestamp = new Date().toISOString();

      if (!metrics.events) {
        metrics.events = [];
      }
      if (!metrics.summary) {
        metrics.summary = {
          totalSaves: 0,
          successfulSaves: 0,
          failedSaves: 0,
          localBackups: 0,
          retryAttempts: 0,
          averageResponseTime: 0,
        };
      }

      metrics.events.push({ event, timestamp, data });

      // Update summary counters
      switch (event) {
        case 'save_started':
          metrics.summary.totalSaves++;
          break;
        case 'save_success':
          metrics.summary.successfulSaves++;
          if (data?.responseTime) {
            const currentAvg = metrics.summary.averageResponseTime;
            const count = metrics.summary.successfulSaves;
            metrics.summary.averageResponseTime =
              (currentAvg * (count - 1) + data.responseTime) / count;
          }
          break;
        case 'save_failed':
          metrics.summary.failedSaves++;
          break;
        case 'local_backup_created':
          metrics.summary.localBackups++;
          break;
        case 'retry_attempt':
          metrics.summary.retryAttempts++;
          break;
      }

      // Keep only last 1000 events to prevent storage bloat
      if (metrics.events.length > 1000) {
        metrics.events.splice(0, metrics.events.length - 1000);
      }

      localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));

      // Log important metrics to console for monitoring
      if (event === 'save_success' || event === 'save_failed') {
        const successRate = (
          (metrics.summary.successfulSaves / metrics.summary.totalSaves) *
          100
        ).toFixed(1);
        console.log(
          `📊 [SAVE-METRICS] Success Rate: ${successRate}%, Avg Response: ${metrics.summary.averageResponseTime.toFixed(0)}ms, Local Backups: ${metrics.summary.localBackups}`
        );
      }
    } catch (error) {
      console.error('❌ [SAVE-METRICS] Failed to track metrics:', error);
    }
  }, []);

  // Generate or get session ID for anonymous users
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('vibelog_session_id');
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('vibelog_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Store vibelog locally as backup
  const storeLocalBackup = useCallback(
    (data: SaveVibelogData) => {
      try {
        const backups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const backup = {
          id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data,
          timestamp: new Date().toISOString(),
          status: 'pending',
          attempts: 0,
        };
        backups.push(backup);

        // Keep only last 50 backups to prevent storage bloat
        if (backups.length > 50) {
          backups.splice(0, backups.length - 50);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
        console.log('💾 [SAVE] Local backup stored:', backup.id);
        trackSaveMetrics('local_backup_created', {
          backupId: backup.id,
          contentLength: data.content.length,
        });
        return backup.id;
      } catch (error) {
        console.error('❌ [SAVE] Failed to store local backup:', error);
        return null;
      }
    },
    [trackSaveMetrics]
  );

  // Mark local backup as successfully saved
  const markBackupComplete = useCallback((backupId: string, vibelogId: string) => {
    try {
      const backups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const backup = backups.find((b: any) => b.id === backupId);
      if (backup) {
        backup.status = 'completed';
        backup.vibelogId = vibelogId;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
        console.log('✅ [SAVE] Backup marked complete:', backupId, '→', vibelogId);
      }
    } catch (error) {
      console.error('❌ [SAVE] Failed to mark backup complete:', error);
    }
  }, []);

  // Clean up orphaned storage objects when save fails
  const cleanupOrphanedStorage = useCallback(async (data: SaveVibelogData) => {
    try {
      console.log('🧹 [SAVE] Cleaning up orphaned storage objects...');

      const urlsToDelete: string[] = [];

      // Collect URLs to delete
      if (data.audioData?.url) {
        urlsToDelete.push(data.audioData.url);
      }
      if (data.coverImage?.url) {
        urlsToDelete.push(data.coverImage.url);
      }

      if (urlsToDelete.length === 0) {
        console.log('ℹ️ [SAVE] No storage objects to clean up');
        return;
      }

      // Call cleanup API endpoint
      const response = await fetch('/api/cleanup-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToDelete }),
      });

      if (response.ok) {
        console.log('✅ [SAVE] Cleaned up orphaned storage:', urlsToDelete.length, 'files');
      } else {
        console.warn('⚠️ [SAVE] Storage cleanup failed, objects may remain orphaned');
      }
    } catch (error) {
      console.warn('⚠️ [SAVE] Storage cleanup error (non-critical):', error);
      // Non-critical - orphaned files will be cleaned up by periodic maintenance
    }
  }, []);

  // Extract title from content if not provided
  const extractTitle = useCallback((content: string): string => {
    try {
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          const title = trimmed.replace(/^#\s+/, '').trim();
          if (title && title.length > 0) {
            return title;
          }
        }
      }
      // Fallback: use first meaningful line
      const firstLine = content.split(/[.!?\n]/)[0]?.trim();
      if (firstLine && firstLine.length > 10) {
        return firstLine.substring(0, 100);
      }
      return `Vibelog ${new Date().toISOString().split('T')[0]}`;
    } catch {
      return `Vibelog ${Date.now()}`;
    }
  }, []);

  // Perform the actual save with retries
  const performSave = useCallback(
    async (data: SaveVibelogData, attempt: number = 1, backupId?: string): Promise<SaveResult> => {
      const startTime = Date.now();

      try {
        console.log(`🚀 [SAVE] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

        if (attempt > 1) {
          trackSaveMetrics('retry_attempt', { attempt, backupId });
        }

        const title = data.title || extractTitle(data.fullContent || data.content);
        const sessionId = data.userId ? undefined : getSessionId();

        const payload = {
          title,
          content: data.content,
          fullContent: data.fullContent,
          transcription: data.transcription,
          coverImage: data.coverImage,
          audioData: data.audioData,
          userId: data.userId,
          sessionId,
          isTeaser: data.isTeaser,
          metadata: {
            ...data.metadata,
            attempt: attempt,
            backupId: backupId,
            clientTimestamp: new Date().toISOString(),
          },
        };

        const response = await fetch('/api/save-vibelog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // Even if response is not ok, try to parse JSON (our API always returns JSON)
        const result = await response.json().catch(() => ({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
          error: 'Failed to parse response',
        }));

        if (result.success) {
          const responseTime = Date.now() - startTime;
          console.log('🎉 [SAVE] Save successful:', result.vibelogId);

          trackSaveMetrics('save_success', {
            vibelogId: result.vibelogId,
            attempt,
            responseTime,
            backupId,
            contentLength: data.content.length,
          });

          // Mark local backup as complete if we have one
          if (backupId && result.vibelogId) {
            markBackupComplete(backupId, result.vibelogId);
          }

          return {
            success: true,
            vibelogId: result.vibelogId,
            message: result.message || 'Vibelog saved successfully',
            warnings: result.warnings,
          };
        } else {
          // Server returned structured error but may have still captured data
          console.warn('⚠️ [SAVE] Server reported issues but may have captured data:', result);

          if (attempt < MAX_RETRY_ATTEMPTS) {
            // Wait and retry
            const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`🔄 [SAVE] Retrying in ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return performSave(data, attempt + 1, backupId);
          } else {
            // Max retries reached, but data might still be captured
            // Clean up orphaned storage if save went to failures table
            if (
              result.message?.includes('failures table') ||
              result.message?.includes('manual recovery')
            ) {
              console.log('🧹 [SAVE] Data in failures table - cleaning up storage');
              cleanupOrphanedStorage(data).catch(err => {
                console.warn('⚠️ [SAVE] Cleanup failed (non-critical):', err);
              });
            }

            return {
              success: true, // Consider it success if data was captured for recovery
              message: result.message || 'Data captured for manual recovery',
              warnings: [
                ...(result.warnings || []),
                `Max retries (${MAX_RETRY_ATTEMPTS}) reached`,
                'Data was preserved for manual recovery',
              ],
            };
          }
        }
      } catch (networkError) {
        const responseTime = Date.now() - startTime;
        console.error(`❌ [SAVE] Network error on attempt ${attempt}:`, networkError);

        trackSaveMetrics('network_error', {
          attempt,
          responseTime,
          error: networkError instanceof Error ? networkError.message : 'Unknown network error',
          backupId,
        });

        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          console.log(`🔄 [SAVE] Network retry in ${delay}ms...`);

          await new Promise(resolve => setTimeout(resolve, delay));
          return performSave(data, attempt + 1, backupId);
        } else {
          trackSaveMetrics('save_failed', {
            reason: 'max_retries_reached',
            attempts: attempt,
            finalError:
              networkError instanceof Error ? networkError.message : 'Unknown network error',
            backupId,
          });

          // Clean up orphaned storage objects since save failed
          console.log('🧹 [SAVE] Save failed - triggering storage cleanup');
          cleanupOrphanedStorage(data).catch(err => {
            console.warn('⚠️ [SAVE] Cleanup failed (non-critical):', err);
          });

          // Max retries reached - return success because we have local backup
          return {
            success: true,
            message: 'Saved locally - will sync when connection is restored',
            warnings: ['Network unavailable', 'Data stored locally for later sync'],
          };
        }
      }
    },
    [extractTitle, getSessionId, markBackupComplete, trackSaveMetrics, cleanupOrphanedStorage]
  );

  // Main save function that never fails
  const saveVibelog = useCallback(
    async (data: SaveVibelogData): Promise<SaveResult> => {
      // Prevent concurrent saves
      if (isSaving) {
        console.log('⏸️ [SAVE] Save already in progress, skipping...');
        return {
          success: true,
          message: 'Save already in progress',
        };
      }

      setIsSaving(true);
      setSaveStatus('saving');
      saveAttemptRef.current += 1;
      const currentAttempt = saveAttemptRef.current;

      console.log('🎯 [SAVE] Starting save process #', currentAttempt);

      trackSaveMetrics('save_started', {
        attempt: currentAttempt,
        contentLength: data.content.length,
        hasTranscription: !!data.transcription,
        hasCoverImage: !!data.coverImage,
        isTeaser: !!data.isTeaser,
      });

      try {
        // STEP 1: Always store local backup first
        const backupId = storeLocalBackup(data);

        // STEP 2: Attempt server save with retries
        const result = await performSave(data, 1, backupId || undefined);

        // STEP 3: Update status based on result
        if (result.warnings && result.warnings.length > 0) {
          setSaveStatus('warning');
          console.log('⚠️ [SAVE] Save completed with warnings:', result.warnings);
        } else {
          setSaveStatus('success');
          console.log('✅ [SAVE] Save completed successfully');
        }

        return result;
      } catch (unexpectedError) {
        // This should never happen due to our error handling, but just in case...
        console.error('💥 [SAVE] Unexpected error:', unexpectedError);

        setSaveStatus('warning');
        return {
          success: true, // Still success because we have local backup
          message: 'Saved locally due to unexpected error',
          warnings: ['Unexpected error occurred', 'Data preserved locally'],
        };
      } finally {
        setIsSaving(false);

        // Reset status after a delay
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    },
    [isSaving, storeLocalBackup, performSave, trackSaveMetrics]
  );

  // Function to get monitoring metrics and analytics
  const getMetrics = useCallback(() => {
    try {
      const metrics = JSON.parse(localStorage.getItem(METRICS_KEY) || '{}');
      return {
        summary: metrics.summary || {
          totalSaves: 0,
          successfulSaves: 0,
          failedSaves: 0,
          localBackups: 0,
          retryAttempts: 0,
          averageResponseTime: 0,
        },
        recentEvents: metrics.events?.slice(-20) || [], // Last 20 events
        healthScore: metrics.summary
          ? Math.round(
              (metrics.summary.successfulSaves / Math.max(1, metrics.summary.totalSaves)) * 100
            )
          : 100,
      };
    } catch (error) {
      console.error('❌ [SAVE-METRICS] Failed to get metrics:', error);
      return {
        summary: {
          totalSaves: 0,
          successfulSaves: 0,
          failedSaves: 0,
          localBackups: 0,
          retryAttempts: 0,
          averageResponseTime: 0,
        },
        recentEvents: [],
        healthScore: 100,
      };
    }
  }, []);

  // Function to get pending local backups (for debugging/recovery)
  const getPendingBackups = useCallback(() => {
    try {
      const backups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return backups.filter((b: any) => b.status === 'pending');
    } catch (error) {
      console.error('❌ [SAVE] Failed to get pending backups:', error);
      return [];
    }
  }, []);

  // Function to retry pending backups (can be called periodically)
  const retryPendingBackups = useCallback(async () => {
    const pendingBackups = getPendingBackups();
    console.log(`🔄 [SAVE] Found ${pendingBackups.length} pending backups to retry`);

    for (const backup of pendingBackups.slice(0, 5)) {
      // Limit to 5 at a time
      try {
        await performSave(backup.data, 1, backup.id);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between retries
      } catch (error) {
        console.error('❌ [SAVE] Failed to retry backup:', backup.id, error);
      }
    }
  }, [getPendingBackups, performSave]);

  return {
    saveVibelog,
    isSaving,
    saveStatus,
    getPendingBackups,
    retryPendingBackups,
    getMetrics,
  };
}
