/**
 * StreamCompositor - Canvas-based video stream compositor
 *
 * Purpose: Combine screen share video + camera PiP into a single composite stream
 * (like YouTubers do!)
 *
 * Key Features:
 * - Real-time canvas composition at 30fps
 * - Camera picture-in-picture overlay (draggable/resizable)
 * - Smooth rendering using requestAnimationFrame
 * - Configurable PiP position and size
 * - Clean resource management
 *
 * @example
 * const compositor = new StreamCompositor({
 *   screenStream,
 *   cameraStream,
 *   pipPosition: 'bottom-right',
 *   pipSize: 0.25 // 25% of screen width
 * });
 * const compositeStream = compositor.start();
 * // Use compositeStream in MediaRecorder
 */

export interface CompositorOptions {
  screenStream: MediaStream;
  cameraStream?: MediaStream; // Optional camera PiP
  width?: number; // Output width, default 1920
  height?: number; // Output height, default 1080
  fps?: number; // Frames per second, default 30
  pipPosition?: PipPosition; // Where to place camera
  pipSize?: number; // PiP size as fraction of width (0.15-0.4), default 0.25
  pipPadding?: number; // Padding from edges in pixels, default 20
  pipBorderRadius?: number; // Rounded corners, default 8
  enablePipBorder?: boolean; // Show border around PiP, default true
}

export type PipPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface CompositorResult {
  stream: MediaStream;
  canvas: HTMLCanvasElement;
  updatePipPosition: (position: PipPosition) => void;
  updatePipSize: (size: number) => void;
  stop: () => void;
}

export class StreamCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement;
  private cameraVideo: HTMLVideoElement | null = null;
  private animationFrame: number | null = null;
  private isRunning = false;

  // Configuration
  private width: number;
  private height: number;
  private fps: number;
  private pipPosition: PipPosition;
  private pipSize: number;
  private pipPadding: number;
  private pipBorderRadius: number;
  private enablePipBorder: boolean;

  // Calculated PiP dimensions
  private pipWidth = 0;
  private pipHeight = 0;
  private pipX = 0;
  private pipY = 0;

  private constructor(options: CompositorOptions) {
    // Set defaults
    this.width = options.width ?? 1920;
    this.height = options.height ?? 1080;
    this.fps = options.fps ?? 30;
    this.pipPosition = options.pipPosition ?? 'bottom-right';
    this.pipSize = Math.max(0.15, Math.min(0.4, options.pipSize ?? 0.25));
    this.pipPadding = options.pipPadding ?? 20;
    this.pipBorderRadius = options.pipBorderRadius ?? 8;
    this.enablePipBorder = options.enablePipBorder ?? true;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const ctx = this.canvas.getContext('2d', {
      alpha: false, // No transparency needed, improves performance
      desynchronized: true, // Better performance for animations
    });

    if (!ctx) {
      throw new Error('Failed to create 2D canvas context');
    }
    this.ctx = ctx;

    // Placeholder video elements (will be initialized in init())
    this.screenVideo = document.createElement('video');
  }

  /**
   * Initialize video elements asynchronously
   * Must be called before start()
   */
  static async create(options: CompositorOptions): Promise<StreamCompositor> {
    const compositor = new StreamCompositor(options);

    // Create and wait for video elements to be ready
    compositor.screenVideo = await compositor.createVideoElement(options.screenStream);

    if (options.cameraStream) {
      compositor.cameraVideo = await compositor.createVideoElement(options.cameraStream);
    }

    // Calculate PiP dimensions
    compositor.calculatePipDimensions();

    console.log('[StreamCompositor] Initialized with:', {
      resolution: `${compositor.width}x${compositor.height}`,
      fps: compositor.fps,
      hasCamera: !!compositor.cameraVideo,
      pipPosition: compositor.pipPosition,
      pipSize: `${Math.round(compositor.pipSize * 100)}%`,
    });

    return compositor;
  }

  /**
   * Create video element from MediaStream
   */
  private async createVideoElement(stream: MediaStream): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // Mute to avoid echo (audio handled separately)

    // Wait for video to be ready and playing
    try {
      await video.play();
      console.log('[StreamCompositor] Video element ready and playing');
    } catch (err) {
      console.error('[StreamCompositor] Failed to play video:', err);
      throw err;
    }

    return video;
  }

  /**
   * Calculate PiP dimensions and position based on configuration
   */
  private calculatePipDimensions(): void {
    if (!this.cameraVideo) {
      return;
    }

    // Calculate PiP width (percentage of canvas width)
    this.pipWidth = Math.round(this.width * this.pipSize);

    // Calculate PiP height (maintain 16:9 aspect ratio)
    this.pipHeight = Math.round(this.pipWidth * (9 / 16));

    // Calculate position based on pipPosition
    switch (this.pipPosition) {
      case 'bottom-right':
        this.pipX = this.width - this.pipWidth - this.pipPadding;
        this.pipY = this.height - this.pipHeight - this.pipPadding;
        break;
      case 'bottom-left':
        this.pipX = this.pipPadding;
        this.pipY = this.height - this.pipHeight - this.pipPadding;
        break;
      case 'top-right':
        this.pipX = this.width - this.pipWidth - this.pipPadding;
        this.pipY = this.pipPadding;
        break;
      case 'top-left':
        this.pipX = this.pipPadding;
        this.pipY = this.pipPadding;
        break;
    }

    console.log('[StreamCompositor] PiP calculated:', {
      position: this.pipPosition,
      dimensions: `${this.pipWidth}x${this.pipHeight}`,
      coordinates: `(${this.pipX}, ${this.pipY})`,
    });
  }

  /**
   * Start compositing - returns the composite MediaStream
   */
  start(): MediaStream {
    if (this.isRunning) {
      console.warn('[StreamCompositor] Already running');
      return this.canvas.captureStream(this.fps);
    }

    this.isRunning = true;

    // Start render loop
    this.renderFrame();

    // Capture canvas as stream
    const stream = this.canvas.captureStream(this.fps);

    console.log('[StreamCompositor] Started compositing at', this.fps, 'fps');

    return stream;
  }

  /**
   * Render a single frame (called by requestAnimationFrame)
   */
  private renderFrame = (): void => {
    if (!this.isRunning) {
      return;
    }

    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw screen video (full canvas)
    if (this.screenVideo.readyState >= 2) {
      // HAVE_CURRENT_DATA
      this.ctx.drawImage(this.screenVideo, 0, 0, this.width, this.height);
    }

    // Draw camera PiP overlay (if enabled)
    if (this.cameraVideo && this.cameraVideo.readyState >= 2) {
      this.drawPip();
    }

    // Schedule next frame
    this.animationFrame = requestAnimationFrame(this.renderFrame);
  };

  /**
   * Draw camera picture-in-picture with rounded corners and border
   */
  private drawPip(): void {
    if (!this.cameraVideo) {
      return;
    }

    this.ctx.save();

    // Create rounded rectangle path for clipping
    this.ctx.beginPath();
    this.roundRect(this.pipX, this.pipY, this.pipWidth, this.pipHeight, this.pipBorderRadius);
    this.ctx.clip();

    // Draw camera video inside rounded rectangle
    this.ctx.drawImage(this.cameraVideo, this.pipX, this.pipY, this.pipWidth, this.pipHeight);

    this.ctx.restore();

    // Draw border around PiP
    if (this.enablePipBorder) {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.roundRect(this.pipX, this.pipY, this.pipWidth, this.pipHeight, this.pipBorderRadius);
      this.ctx.stroke();
    }
  }

  /**
   * Helper to draw rounded rectangle
   * (Canvas 2D doesn't have native roundRect in all browsers)
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Update PiP position dynamically
   */
  updatePipPosition(position: PipPosition): void {
    this.pipPosition = position;
    this.calculatePipDimensions();
    console.log('[StreamCompositor] PiP position updated to', position);
  }

  /**
   * Update PiP size dynamically
   */
  updatePipSize(size: number): void {
    this.pipSize = Math.max(0.15, Math.min(0.4, size));
    this.calculatePipDimensions();
    console.log('[StreamCompositor] PiP size updated to', Math.round(this.pipSize * 100) + '%');
  }

  /**
   * Stop compositing and clean up resources
   */
  stop(): void {
    console.log('[StreamCompositor] Stopping compositor...');

    this.isRunning = false;

    // Cancel animation frame
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Stop video elements
    if (this.screenVideo.srcObject) {
      const stream = this.screenVideo.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.screenVideo.srcObject = null;
    }

    if (this.cameraVideo?.srcObject) {
      const stream = this.cameraVideo.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.cameraVideo.srcObject = null;
    }

    console.log('[StreamCompositor] Stopped');
  }

  /**
   * Get current canvas for preview purposes
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

/**
 * Helper function to create a quick composite stream
 *
 * @example
 * const result = await createCompositeStream({
 *   screenStream,
 *   cameraStream,
 *   pipPosition: 'bottom-right'
 * });
 */
export async function createCompositeStream(options: CompositorOptions): Promise<CompositorResult> {
  const compositor = await StreamCompositor.create(options);
  const stream = compositor.start();

  return {
    stream,
    canvas: compositor.getCanvas(),
    updatePipPosition: pos => compositor.updatePipPosition(pos),
    updatePipSize: size => compositor.updatePipSize(size),
    stop: () => compositor.stop(),
  };
}
