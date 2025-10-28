/**
 * Analytics Events and Tracking Utilities
 *
 * Centralized event definitions for tracking user interactions
 * across the VibeLog application.
 */

// Event Names
export const EVENTS = {
  // Recording Events
  RECORDING_STARTED: 'recording_started',
  RECORDING_STOPPED: 'recording_stopped',
  RECORDING_FAILED: 'recording_failed',
  RECORDING_DISCARDED: 'recording_discarded',

  // Transcription Events
  TRANSCRIPTION_STARTED: 'transcription_started',
  TRANSCRIPTION_COMPLETED: 'transcription_completed',
  TRANSCRIPTION_FAILED: 'transcription_failed',
  TRANSCRIPT_EDITED: 'transcript_edited',
  TRANSCRIPT_VIEWED: 'transcript_viewed',

  // Vibelog Generation Events
  VIBELOG_GENERATION_STARTED: 'vibelog_generation_started',
  VIBELOG_GENERATED: 'vibelog_generated',
  VIBELOG_GENERATION_FAILED: 'vibelog_generation_failed',
  VIBELOG_REGENERATED: 'vibelog_regenerated',

  // Cover Image Events
  COVER_IMAGE_STARTED: 'cover_image_started',
  COVER_IMAGE_GENERATED: 'cover_image_generated',
  COVER_IMAGE_FAILED: 'cover_image_failed',
  COVER_IMAGE_CHANGED: 'cover_image_changed',

  // Vibelog Actions
  VIBELOG_SAVED: 'vibelog_saved',
  VIBELOG_SAVE_STARTED: 'vibelog_save_started',
  VIBELOG_SAVE_FAILED: 'vibelog_save_failed',
  VIBELOG_EDITED: 'vibelog_edited',
  VIBELOG_DELETED: 'vibelog_deleted',
  VIBELOG_COPIED: 'vibelog_copied',
  VIBELOG_SHARED: 'vibelog_shared',
  VIBELOG_EXPORTED: 'vibelog_exported',
  VIBELOG_VIEWED: 'vibelog_viewed',

  // Publishing Events
  PUBLISH_STARTED: 'publish_started',
  PUBLISH_COMPLETED: 'publish_completed',
  PUBLISH_FAILED: 'publish_failed',
  PLATFORM_CONNECTED: 'platform_connected',
  PLATFORM_DISCONNECTED: 'platform_disconnected',

  // User Actions
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_VIEWED: 'profile_viewed',

  // Upgrade & Monetization
  UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown',
  UPGRADE_CLICKED: 'upgrade_clicked',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Navigation & Engagement
  PAGE_VIEWED: 'page_viewed',
  FEATURE_DISCOVERED: 'feature_discovered',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Errors & Issues
  ERROR_OCCURRED: 'error_occurred',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  API_ERROR: 'api_error',
} as const;

// Event Property Types
export interface RecordingStartedProps {
  isAnonymous: boolean;
  remixMode?: boolean;
}

export interface RecordingStoppedProps {
  duration: number;
  isAnonymous: boolean;
}

export interface RecordingFailedProps {
  error: string;
  errorType: 'permission_denied' | 'device_not_found' | 'unknown';
}

export interface TranscriptionStartedProps {
  audioDuration: number;
  isAnonymous: boolean;
}

export interface TranscriptionCompletedProps {
  audioDuration: number;
  transcriptionLength: number;
  processingTime: number;
  isAnonymous: boolean;
}

export interface TranscriptionFailedProps {
  error: string;
  audioDuration: number;
}

export interface TranscriptEditedProps {
  originalLength: number;
  newLength: number;
}

export interface VibelogGenerationStartedProps {
  transcriptionLength: number;
  isAnonymous: boolean;
}

export interface VibelogGeneratedProps {
  wordCount: number;
  hasImage: boolean;
  processingTime: number;
  isTeaser?: boolean;
  isAnonymous: boolean;
}

export interface VibelogGenerationFailedProps {
  error: string;
  transcriptionLength: number;
}

export interface CoverImageStartedProps {
  vibelogWordCount: number;
}

export interface CoverImageGeneratedProps {
  processingTime: number;
  provider: 'gemini' | 'dalle' | 'stable-diffusion';
}

export interface CoverImageFailedProps {
  error: string;
  provider: 'gemini' | 'dalle' | 'stable-diffusion';
}

export interface VibelogSavedProps {
  vibelogId: string;
  isAnonymous: boolean;
  saveTime: number;
  retryCount: number;
}

export interface VibelogSaveStartedProps {
  isAnonymous: boolean;
  hasAudio: boolean;
  hasImage: boolean;
}

export interface VibelogSaveFailedProps {
  error: string;
  retryCount: number;
  isAnonymous: boolean;
}

export interface VibelogEditedProps {
  vibelogId: string;
  editType: 'content' | 'title' | 'image' | 'settings';
}

export interface VibelogCopiedProps {
  vibelogId: string;
}

export interface VibelogSharedProps {
  vibelogId: string;
  shareMethod: 'native_share' | 'link' | 'twitter' | 'facebook';
}

export interface VibelogExportedProps {
  vibelogId: string;
  format: 'markdown' | 'html' | 'txt' | 'json';
}

export interface PublishStartedProps {
  platforms: string[];
  vibelogId: string;
}

export interface PublishCompletedProps {
  platforms: string[];
  vibelogId: string;
  totalTime: number;
}

export interface PublishFailedProps {
  platform: string;
  error: string;
  vibelogId: string;
}

export interface UpgradePromptShownProps {
  trigger: 'recording_limit' | 'transcript_view' | 'export' | 'publishing' | 'history_access';
  location: string;
}

export interface ErrorOccurredProps {
  errorMessage: string;
  errorCode?: string;
  componentName?: string;
  stackTrace?: string;
}

// Union type of all event properties
export type EventProperties =
  | RecordingStartedProps
  | RecordingStoppedProps
  | RecordingFailedProps
  | TranscriptionStartedProps
  | TranscriptionCompletedProps
  | TranscriptionFailedProps
  | TranscriptEditedProps
  | VibelogGenerationStartedProps
  | VibelogGeneratedProps
  | VibelogGenerationFailedProps
  | CoverImageStartedProps
  | CoverImageGeneratedProps
  | CoverImageFailedProps
  | VibelogSavedProps
  | VibelogSaveStartedProps
  | VibelogSaveFailedProps
  | VibelogEditedProps
  | VibelogCopiedProps
  | VibelogSharedProps
  | VibelogExportedProps
  | PublishStartedProps
  | PublishCompletedProps
  | PublishFailedProps
  | UpgradePromptShownProps
  | ErrorOccurredProps
  | Record<string, unknown>;

// Export event names type
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// Helper function to create type-safe event tracking
export function createEvent<T extends EventProperties>(eventName: EventName, properties?: T) {
  return {
    eventName,
    properties: properties || {},
    timestamp: new Date().toISOString(),
  };
}

// Event validation helper
export function isValidEvent(eventName: string): eventName is EventName {
  return Object.values(EVENTS).includes(eventName as EventName);
}
