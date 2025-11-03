import { RecordingState } from '@/components/mic/Controls';

export interface ToastState {
  message: string;
  visible: boolean;
}

export interface UpgradePromptState {
  visible: boolean;
  message: string;
  benefits: string[];
  resetTime?: number;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  levels: number[];
}

export interface ProcessingData {
  transcriptionData: string;
  vibelogContentData: string;
}

export interface TeaserResult {
  content: string;
  isTeaser: boolean;
  fullContent?: string;
}

export interface AudioEngineCallbacks {
  onPermissionChange: (hasPermission: boolean | null) => void;
  onLevelsUpdate: (levels: number[]) => void;
  onDataAvailable: (blob: Blob, duration: number) => void;
  onError: (error: string) => void;
}

export interface SpeechRecognitionState {
  isActive: boolean;
  liveTranscript: string;
  finalTranscription: string;
}

export interface APIResponse<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  upgrade?: {
    action: string;
    benefits: string[];
  };
  reset?: number;
  data?: T;
}

export interface TranscriptionResponse extends APIResponse {
  transcription?: string;
  detectedLanguage?: string; // ISO 639-1 language code from Whisper (e.g., "fr", "en", "es")
}

export interface VibelogGenerationResponse extends APIResponse {
  vibelogTeaser?: string;
  vibelogContent?: string;
  originalLanguage?: string; // ISO 639-1 language code (e.g., "fr", "en", "es")
}

// Legacy alias for backwards compatibility during migration
export interface BlogGenerationResponse extends APIResponse {
  blogContent?: string;
  vibelogContent?: string;
}

export interface MicRecorderState {
  recordingState: RecordingState;
  transcription: string;
  liveTranscript: string;
  vibelogContent: string;
  isTeaserContent: boolean;
  isEditing: boolean;
  editedContent: string;
  isEditingTranscript: boolean;
  isLoggedIn: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  recordingTime: number;
  hasPermission: boolean | null;
  toast: ToastState;
  upgradePrompt: UpgradePromptState;
  playback: AudioPlaybackState;
}

export interface MicRecorderHandlers {
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onReset: () => void;
  onCopy: (content: string) => Promise<void>;
  onShare: () => Promise<void>;
  onSave: () => void;
  onEdit: () => void;
  onTranscriptEdit: () => void;
  onTranscriptUpdate: (newTranscription: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onPlayPause: () => Promise<void>;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export interface AudioProcessingFunctions {
  doTranscription: () => Promise<string>;
  doVibelogGeneration: () => Promise<string>;
  doCoverGeneration?: () => Promise<CoverImage>;
}

export interface CoverImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}
