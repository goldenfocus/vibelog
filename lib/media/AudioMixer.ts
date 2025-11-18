/**
 * AudioMixer - Web Audio API based audio stream mixer
 *
 * Purpose: Mix multiple audio sources (screen system audio + microphone)
 * into a single audio track for screen-share recordings.
 *
 * Key Features:
 * - Mix screen audio + microphone audio
 * - Adjustable volume levels per source
 * - Auto-ducking (lower system audio when user speaks)
 * - Clean resource management
 *
 * @example
 * const mixer = new AudioMixer();
 * const mixed = await mixer.mixStreams({
 *   screen: screenStream,
 *   microphone: micStream
 * });
 * // Use mixed.stream in MediaRecorder
 */

export interface AudioMixerOptions {
  screenVolume?: number; // 0.0 to 1.0, default 0.7
  microphoneVolume?: number; // 0.0 to 1.0, default 1.0
  enableAutoDucking?: boolean; // Lower screen audio when mic active
}

export interface MixerStreams {
  screen?: MediaStream; // System audio from screen share
  microphone?: MediaStream; // User voice from microphone
}

export interface MixedAudioResult {
  stream: MediaStream;
  cleanup: () => void;
}

export class AudioMixer {
  private audioContext: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private sources: MediaStreamAudioSourceNode[] = [];
  private gainNodes: GainNode[] = [];

  constructor(private options: AudioMixerOptions = {}) {
    // Set defaults
    this.options.screenVolume = options.screenVolume ?? 0.7;
    this.options.microphoneVolume = options.microphoneVolume ?? 1.0;
    this.options.enableAutoDucking = options.enableAutoDucking ?? false;
  }

  /**
   * Mix multiple audio streams into a single output stream
   *
   * @param streams - Object containing screen and/or microphone streams
   * @returns Mixed audio stream ready for MediaRecorder
   */
  async mixStreams(streams: MixerStreams): Promise<MixedAudioResult> {
    // Create fresh audio context
    this.audioContext = new AudioContext();
    this.destination = this.audioContext.createMediaStreamDestination();

    // Connect screen audio if available
    if (streams.screen && this.hasAudioTrack(streams.screen)) {
      await this.connectStream(
        streams.screen,
        this.options.screenVolume!,
        'screen'
      );
    }

    // Connect microphone audio if available
    if (streams.microphone && this.hasAudioTrack(streams.microphone)) {
      await this.connectStream(
        streams.microphone,
        this.options.microphoneVolume!,
        'microphone'
      );
    }

    // Setup auto-ducking if enabled
    if (this.options.enableAutoDucking && streams.microphone && streams.screen) {
      this.setupAutoDucking();
    }

    return {
      stream: this.destination.stream,
      cleanup: () => this.cleanup()
    };
  }

  /**
   * Check if a MediaStream has audio tracks
   */
  private hasAudioTrack(stream: MediaStream): boolean {
    return stream.getAudioTracks().length > 0;
  }

  /**
   * Connect a single audio stream to the mixer
   */
  private async connectStream(
    stream: MediaStream,
    volume: number,
    label: string
  ): Promise<void> {
    if (!this.audioContext || !this.destination) {
      throw new Error('AudioContext not initialized');
    }

    // Create source from stream
    const source = this.audioContext.createMediaStreamSource(stream);

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    // Connect: source → gain → destination
    source.connect(gainNode);
    gainNode.connect(this.destination);

    // Store references for cleanup
    this.sources.push(source);
    this.gainNodes.push(gainNode);

    console.log(`[AudioMixer] Connected ${label} audio at volume ${volume}`);
  }

  /**
   * Setup auto-ducking: lower screen audio when microphone is active
   * Uses Web Audio API's dynamics compression
   */
  private setupAutoDucking(): void {
    if (!this.audioContext || this.gainNodes.length < 2) {return;}

    // Get screen gain node (first)
    const screenGain = this.gainNodes[0];

    // Create analyzer for mic level detection
    const micAnalyzer = this.audioContext.createAnalyser();
    micAnalyzer.fftSize = 256;
    const micDataArray = new Uint8Array(micAnalyzer.frequencyBinCount);

    // Connect mic to analyzer
    this.sources[1].connect(micAnalyzer);

    // Check mic levels every 100ms
    const checkMicLevel = () => {
      micAnalyzer.getByteFrequencyData(micDataArray);

      // Calculate average mic level
      const average = micDataArray.reduce((a, b) => a + b) / micDataArray.length;
      const micActive = average > 30; // Threshold for "speaking"

      // Duck screen audio when mic is active
      const targetVolume = micActive ? 0.3 : 0.7;
      const currentVolume = screenGain.gain.value;

      // Smooth transition (avoid clicks)
      if (Math.abs(currentVolume - targetVolume) > 0.05) {
        screenGain.gain.linearRampToValueAtTime(
          targetVolume,
          this.audioContext!.currentTime + 0.1
        );
      }
    };

    // Start monitoring (check every 100ms)
    const interval = setInterval(checkMicLevel, 100);

    // Store interval for cleanup
    (this as Record<string, NodeJS.Timeout>)._duckingInterval = interval;

    console.log('[AudioMixer] Auto-ducking enabled');
  }

  /**
   * Update volume for a specific source
   */
  setVolume(source: 'screen' | 'microphone', volume: number): void {
    if (!this.gainNodes.length) {return;}

    const index = source === 'screen' ? 0 : 1;
    if (this.gainNodes[index]) {
      this.gainNodes[index].gain.value = Math.max(0, Math.min(1, volume));
      console.log(`[AudioMixer] Set ${source} volume to ${volume}`);
    }
  }

  /**
   * Get current volume levels
   */
  getVolumes(): { screen: number; microphone: number } {
    return {
      screen: this.gainNodes[0]?.gain.value ?? 0,
      microphone: this.gainNodes[1]?.gain.value ?? 0
    };
  }

  /**
   * Clean up all audio resources
   */
  cleanup(): void {
    console.log('[AudioMixer] Cleaning up audio mixer...');

    // Stop ducking interval
    if ((this as Record<string, NodeJS.Timeout>)._duckingInterval) {
      clearInterval((this as Record<string, NodeJS.Timeout>)._duckingInterval);
      (this as Record<string, NodeJS.Timeout | null>)._duckingInterval = null;
    }

    // Disconnect all sources and gain nodes
    this.sources.forEach(source => {
      try {
        source.disconnect();
      } catch {
        // Ignore errors if already disconnected
      }
    });

    this.gainNodes.forEach(gain => {
      try {
        gain.disconnect();
      } catch {
        // Ignore errors if already disconnected
      }
    });

    // Close audio context
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
    }

    // Clear references
    this.sources = [];
    this.gainNodes = [];
    this.audioContext = null;
    this.destination = null;

    console.log('[AudioMixer] Cleanup complete');
  }
}

/**
 * Helper function to create a quick mixed stream
 *
 * @example
 * const { stream, cleanup } = await createMixedAudioStream({
 *   screen: screenStream,
 *   microphone: micStream
 * });
 */
export async function createMixedAudioStream(
  streams: MixerStreams,
  options?: AudioMixerOptions
): Promise<MixedAudioResult> {
  const mixer = new AudioMixer(options);
  return mixer.mixStreams(streams);
}
