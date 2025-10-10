/**
 * AudioEngine - Pure audio recording logic extracted from MicRecorder
 * Handles MediaRecorder, AudioContext, permissions, and real-time analysis
 */

export interface AudioEngineCallbacks {
  onPermissionChange?: (hasPermission: boolean | null) => void;
  onLevelsUpdate?: (levels: number[]) => void;
  onDataAvailable?: (blob: Blob, duration: number) => void;
  onError?: (error: string, code?: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onQualityChange?: (quality: 'low' | 'medium' | 'high') => void;
}

export interface AudioQuality {
  sampleRate: number;
  bitRate: number;
  channels: number;
}

export class AudioEngine {
  // Core audio refs
  private mediaRecorderRef: MediaRecorder | null = null;
  private streamRef: MediaStream | null = null;
  private audioContextRef: AudioContext | null = null;
  private analyserRef: AnalyserNode | null = null;
  private audioChunksRef: Blob[] = [];
  private recordingTimer: number | null = null;
  private rafRef: number | null = null;

  // State
  private isRecording = false;
  private recordingStartTime = 0;
  private levelsRef: number[] = Array.from({ length: 15 }, () => 0.1);
  private isCleanedUp = false;
  private currentQuality: 'low' | 'medium' | 'high' = 'medium';
  private retryCount = 0;
  private maxRetries = 3;

  // Quality presets
  private qualityPresets: Record<'low' | 'medium' | 'high', AudioQuality> = {
    low: { sampleRate: 22050, bitRate: 64000, channels: 1 },
    medium: { sampleRate: 44100, bitRate: 128000, channels: 1 },
    high: { sampleRate: 48000, bitRate: 256000, channels: 1 },
  };

  constructor(private callbacks: AudioEngineCallbacks) {}

  /**
   * Request microphone permission and prepare for recording
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.callbacks.onError?.(
          'Microphone access not supported in this browser',
          'UNSUPPORTED_BROWSER'
        );
        return false;
      }

      // Get current quality settings
      const quality = this.qualityPresets[this.currentQuality];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: quality.sampleRate,
          channelCount: quality.channels,
          latency: 0.01, // Low latency for real-time feedback
        },
      });

      this.streamRef = stream;
      this.callbacks.onPermissionChange?.(true);

      // Set up audio analysis for visualization
      const audioContext = new (window.AudioContext ||
        (window as Record<string, unknown>).webkitAudioContext)();

      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      // Optimize analyser settings for voice
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      source.connect(analyser);

      this.audioContextRef = audioContext;
      this.analyserRef = analyser;

      // Reset retry count on success
      this.retryCount = 0;

      return true;
    } catch (error: unknown) {
      console.error('Error requesting microphone permission:', error);
      this.callbacks.onPermissionChange?.(false);

      // Handle specific error types
      let errorMessage = 'Microphone access denied. Please allow microphone access to record.';
      let errorCode = 'PERMISSION_DENIED';

      if (error.name === 'NotAllowedError') {
        errorMessage =
          'Microphone access denied. Please allow microphone access in your browser settings.';
        errorCode = 'PERMISSION_DENIED';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
        errorCode = 'NO_MICROPHONE';
      } else if (error.name === 'NotReadableError') {
        errorMessage =
          'Microphone is being used by another application. Please close other applications and try again.';
        errorCode = 'MICROPHONE_IN_USE';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage =
          'Microphone settings are not supported. Trying with lower quality settings...';
        errorCode = 'CONSTRAINTS_ERROR';

        // Try with lower quality if constraints fail
        if (this.currentQuality !== 'low') {
          this.setQuality('low');
          return this.requestPermission();
        }
      }

      this.callbacks.onError?.(errorMessage, errorCode);
      return false;
    }
  }

  /**
   * Set audio quality
   */
  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.currentQuality = quality;
    this.callbacks.onQualityChange?.(quality);
  }

  /**
   * Get current quality
   */
  getQuality(): 'low' | 'medium' | 'high' {
    return this.currentQuality;
  }

  /**
   * Start recording with real-time level monitoring
   */
  async startRecording(): Promise<boolean> {
    if (!this.streamRef || !this.audioContextRef || !this.analyserRef) {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return false;
      }
    }

    try {
      // Create MediaRecorder with OpenAI-compatible formats
      let mimeType = 'audio/webm'; // Default
      let options: MediaRecorderOptions = {};

      // Try formats in order of preference for OpenAI Whisper
      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];

      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      // Add quality-based options
      const quality = this.qualityPresets[this.currentQuality];
      if (mimeType.includes('webm')) {
        options = {
          mimeType,
          audioBitsPerSecond: quality.bitRate,
        };
      }

      const mediaRecorder = new MediaRecorder(this.streamRef!, options);

      this.mediaRecorderRef = mediaRecorder;
      this.audioChunksRef = [];
      this.recordingStartTime = Date.now();
      this.isRecording = true;

      // Handle recorded data
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunksRef.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const actualRecordingTime = Math.round((Date.now() - this.recordingStartTime) / 1000);
        const blob = new Blob(this.audioChunksRef, {
          type: mediaRecorder.mimeType,
        });

        console.log(
          'Recording stopped, blob size:',
          blob.size,
          'actual recording time:',
          actualRecordingTime
        );
        this.callbacks.onDataAvailable?.(blob, actualRecordingTime);
        this.callbacks.onRecordingStop?.();
      };

      // Handle recording errors
      mediaRecorder.onerror = event => {
        console.error('MediaRecorder error:', event);
        this.callbacks.onError?.('Recording failed', 'RECORDING_ERROR');
      };

      // Start recording and level monitoring
      mediaRecorder.start(100); // Collect data every 100ms
      this.startLevelMonitoring();
      this.callbacks.onRecordingStart?.();

      return true;
    } catch (error: unknown) {
      console.error('Error starting recording:', error);
      this.callbacks.onError?.('Failed to start recording', 'START_RECORDING_ERROR');
      return false;
    }
  }

  /**
   * Stop recording and clean up
   */
  stopRecording(): void {
    this.isRecording = false;

    // Stop MediaRecorder
    if (this.mediaRecorderRef && this.mediaRecorderRef.state === 'recording') {
      this.mediaRecorderRef.stop();
    }

    // Stop level monitoring
    this.stopLevelMonitoring();

    // Clean up timer
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Stop recording and fully release microphone (removes browser indicator)
   */
  stopRecordingAndRelease(): void {
    this.stopRecording();

    // Stop MediaStream tracks to remove browser recording indicator
    if (this.streamRef) {
      this.streamRef.getTracks().forEach(track => track.stop());
      this.streamRef = null;
    }

    // Close AudioContext
    if (this.audioContextRef) {
      this.audioContextRef.close();
      this.audioContextRef = null;
      this.analyserRef = null;
    }
  }

  /**
   * Start real-time level monitoring for waveform visualization
   */
  private startLevelMonitoring(): void {
    if (!this.analyserRef || !this.isRecording) {
      return;
    }

    const analyser = this.analyserRef;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const bars = 15;

    const loop = () => {
      if (!this.isRecording) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // Map frequency data to our bars with logarithmic distribution
      for (let i = 0; i < bars; i++) {
        const minFreq = 0;
        const maxFreq = bufferLength * 0.7; // Focus on lower-mid frequencies for voice
        const freq = minFreq + (maxFreq - minFreq) * Math.pow(i / (bars - 1), 1.5);

        const start = Math.floor(freq);
        const end = Math.min(start + Math.floor(bufferLength / bars) + 1, bufferLength);
        let sum = 0;
        let count = 0;

        for (let j = start; j < end && j < bufferLength; j++) {
          sum += dataArray[j];
          count++;
        }

        const average = count > 0 ? sum / count : 0;
        // Super sensitive normalization - amplify quiet sounds
        let normalized = (average / 255) * 3; // 3x amplification for better dynamic range
        normalized = Math.pow(normalized, 0.5); // Square root for better sensitivity curve
        normalized = Math.max(0.15, Math.min(1, normalized)); // Higher minimum for always-visible movement

        // Smooth the transition
        this.levelsRef[i] += (normalized - this.levelsRef[i]) * 0.4;
      }

      // Notify callback with current levels
      if (!this.isCleanedUp) {
        this.callbacks.onLevelsUpdate?.([...this.levelsRef]);
      }
      this.rafRef = requestAnimationFrame(loop);
    };

    this.rafRef = requestAnimationFrame(loop);
  }

  /**
   * Stop level monitoring
   */
  private stopLevelMonitoring(): void {
    if (this.rafRef) {
      cancelAnimationFrame(this.rafRef);
      this.rafRef = null;
    }

    // Fade bars to minimum when not recording
    if (!this.isCleanedUp) {
      for (let i = 0; i < this.levelsRef.length; i++) {
        this.levelsRef[i] = 0.15;
      }
      this.callbacks.onLevelsUpdate?.([...this.levelsRef]);
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    this.isCleanedUp = true;
    this.stopRecording();

    if (this.streamRef) {
      this.streamRef.getTracks().forEach(track => track.stop());
      this.streamRef = null;
    }

    if (this.audioContextRef) {
      this.audioContextRef.close();
      this.audioContextRef = null;
      this.analyserRef = null;
    }

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Get current recording state
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current levels for external access
   */
  getCurrentLevels(): number[] {
    return [...this.levelsRef];
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    const formats = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav',
      'audio/ogg;codecs=opus',
      'audio/mpeg',
    ];

    return formats.filter(format => MediaRecorder.isTypeSupported(format));
  }

  /**
   * Get current recording state
   */
  getRecordingState(): {
    isRecording: boolean;
    quality: 'low' | 'medium' | 'high';
    supportedFormats: string[];
    hasPermission: boolean;
  } {
    return {
      isRecording: this.isRecording,
      quality: this.currentQuality,
      supportedFormats: this.getSupportedFormats(),
      hasPermission: this.streamRef !== null,
    };
  }

  /**
   * Retry recording with exponential backoff
   */
  async retryRecording(): Promise<boolean> {
    if (this.retryCount >= this.maxRetries) {
      this.callbacks.onError?.('Maximum retry attempts reached', 'MAX_RETRIES_EXCEEDED');
      return false;
    }

    this.retryCount++;
    const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff

    await new Promise(resolve => setTimeout(resolve, delay));

    return this.startRecording();
  }
}
