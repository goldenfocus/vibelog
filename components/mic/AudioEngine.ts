/**
 * AudioEngine - Pure audio recording logic extracted from MicRecorder
 * Handles MediaRecorder, AudioContext, permissions, and real-time analysis
 */

export interface AudioEngineCallbacks {
  onPermissionChange?: (hasPermission: boolean | null) => void;
  onLevelsUpdate?: (levels: number[]) => void;
  onDataAvailable?: (blob: Blob, duration: number) => void;
  onError?: (error: string) => void;
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
  
  constructor(private callbacks: AudioEngineCallbacks) {}

  /**
   * Request microphone permission and prepare for recording
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      this.streamRef = stream;
      this.callbacks.onPermissionChange?.(true);
      
      // Set up audio analysis for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      source.connect(analyser);
      
      this.audioContextRef = audioContext;
      this.analyserRef = analyser;
      
      return true;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      this.callbacks.onPermissionChange?.(false);
      this.callbacks.onError?.('Microphone access denied. Please allow microphone access to record.');
      return false;
    }
  }

  /**
   * Start recording with real-time level monitoring
   */
  async startRecording(): Promise<boolean> {
    if (!this.streamRef || !this.audioContextRef || !this.analyserRef) {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return false;
    }

    try {
      // Create MediaRecorder with OpenAI-compatible formats
      let mimeType = 'audio/webm'; // Default
      
      // Try formats in order of preference for OpenAI Whisper
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm', 
        'audio/mp4',
        'audio/wav'
      ];
      
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(this.streamRef!, { mimeType });
      
      this.mediaRecorderRef = mediaRecorder;
      this.audioChunksRef = [];
      this.recordingStartTime = Date.now();
      this.isRecording = true;
      
      // Handle recorded data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunksRef.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const actualRecordingTime = Math.round((Date.now() - this.recordingStartTime) / 1000);
        const blob = new Blob(this.audioChunksRef, { 
          type: mediaRecorder.mimeType 
        });
        
        console.log('Recording stopped, blob size:', blob.size, 'actual recording time:', actualRecordingTime);
        this.callbacks.onDataAvailable?.(blob, actualRecordingTime);
      };
      
      // Start recording and level monitoring
      mediaRecorder.start(100); // Collect data every 100ms
      this.startLevelMonitoring();
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.callbacks.onError?.('Failed to start recording');
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
    if (!this.analyserRef || !this.isRecording) return;
    
    const analyser = this.analyserRef;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const bars = 15;
    
    const loop = () => {
      if (!this.isRecording) return;
      
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
}