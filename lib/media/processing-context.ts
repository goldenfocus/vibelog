/**
 * Media Processing Context with Rollback Support
 *
 * Provides transaction-like behavior for multi-step media processing operations.
 * If any step fails, registered cleanup tasks are executed in reverse order
 * to prevent orphaned files and inconsistent state.
 *
 * Features:
 * - Register cleanup tasks for each successful step
 * - Automatic rollback on failure
 * - Progress tracking
 * - Resource management (temp files, uploads)
 * - Timeout handling
 *
 * @example
 * const context = new MediaProcessingContext('upload-music');
 *
 * try {
 *   // Step 1: Upload file
 *   const { path } = await uploadFile(file);
 *   context.registerCleanup(() => deleteFile(path), 'uploaded-file');
 *
 *   // Step 2: Transcribe
 *   const transcription = await transcribe(path);
 *   context.addMetadata('transcription', transcription);
 *
 *   // Step 3: Generate content
 *   const content = await generateContent(transcription);
 *
 *   // Step 4: Save to database
 *   const vibelog = await saveVibelog(content);
 *
 *   // Success! Clear cleanups (we want to keep the file)
 *   context.clearCleanups();
 *   return vibelog;
 *
 * } catch (error) {
 *   // Rollback all registered cleanups
 *   await context.rollback();
 *   throw error;
 * }
 */

// =============================================================================
// Types
// =============================================================================

export type CleanupTask = () => Promise<void>;

export interface CleanupRegistration {
  id: string;
  task: CleanupTask;
  description: string;
  registeredAt: number;
}

export interface ProcessingStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface ProcessingContextOptions {
  /** Operation name for logging */
  operationName?: string;

  /** Maximum time for entire operation in ms */
  timeout?: number;

  /** User ID for logging/tracking */
  userId?: string | null;

  /** Vibelog ID if updating existing */
  vibelogId?: string;

  /** Enable verbose logging */
  verbose?: boolean;
}

// =============================================================================
// Processing Context Class
// =============================================================================

export class MediaProcessingContext {
  private cleanupTasks: CleanupRegistration[] = [];
  private steps: ProcessingStep[] = [];
  private metadata: Map<string, unknown> = new Map();
  private startTime: number;
  private aborted: boolean = false;
  private rolledBack: boolean = false;

  public readonly operationName: string;
  public readonly userId: string | null;
  public readonly vibelogId: string | null;
  public readonly timeout: number | null;
  public readonly verbose: boolean;

  constructor(options: ProcessingContextOptions = {}) {
    this.operationName = options.operationName || 'media-processing';
    this.userId = options.userId || null;
    this.vibelogId = options.vibelogId || null;
    this.timeout = options.timeout || null;
    this.verbose = options.verbose ?? false;
    this.startTime = Date.now();

    this.log('Context created');
  }

  // ===========================================================================
  // Cleanup Task Management
  // ===========================================================================

  /**
   * Register a cleanup task to be executed on rollback
   *
   * @param task - Async function to execute on rollback
   * @param description - Human-readable description for logging
   * @returns Cleanup ID for removal
   */
  registerCleanup(task: CleanupTask, description: string): string {
    const id = `cleanup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.cleanupTasks.push({
      id,
      task,
      description,
      registeredAt: Date.now(),
    });

    this.log(`Registered cleanup: ${description} (${id})`);
    return id;
  }

  /**
   * Remove a specific cleanup task (e.g., when you want to keep a resource)
   */
  removeCleanup(id: string): boolean {
    const index = this.cleanupTasks.findIndex(c => c.id === id);
    if (index >= 0) {
      const removed = this.cleanupTasks.splice(index, 1)[0];
      this.log(`Removed cleanup: ${removed.description}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all cleanup tasks (call on success when you want to keep all resources)
   */
  clearCleanups(): void {
    const count = this.cleanupTasks.length;
    this.cleanupTasks = [];
    this.log(`Cleared ${count} cleanup tasks`);
  }

  /**
   * Execute all cleanup tasks in reverse order (LIFO)
   * Called automatically on failure, or manually if needed
   */
  async rollback(): Promise<{ success: boolean; errors: string[] }> {
    if (this.rolledBack) {
      this.log('Already rolled back, skipping');
      return { success: true, errors: [] };
    }

    this.rolledBack = true;
    const errors: string[] = [];

    this.log(`Rolling back ${this.cleanupTasks.length} tasks...`);

    // Execute in reverse order (LIFO)
    const tasks = [...this.cleanupTasks].reverse();

    for (const registration of tasks) {
      try {
        this.log(`Executing cleanup: ${registration.description}`);
        await registration.task();
        this.log(`✓ Cleanup succeeded: ${registration.description}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${registration.description}: ${errorMsg}`);
        console.error(`✗ Cleanup failed: ${registration.description}:`, error);
      }
    }

    this.cleanupTasks = [];

    const success = errors.length === 0;
    this.log(
      `Rollback ${success ? 'completed successfully' : `completed with ${errors.length} errors`}`
    );

    return { success, errors };
  }

  // ===========================================================================
  // Step Tracking
  // ===========================================================================

  /**
   * Start tracking a processing step
   */
  startStep(name: string): void {
    this.checkAborted();

    const step: ProcessingStep = {
      name,
      status: 'running',
      startTime: Date.now(),
    };

    this.steps.push(step);
    this.log(`Step started: ${name}`);
  }

  /**
   * Mark current step as completed
   */
  completeStep(name: string): void {
    const step = this.steps.find(s => s.name === name && s.status === 'running');
    if (step) {
      step.status = 'completed';
      step.endTime = Date.now();
      this.log(`Step completed: ${name} (${step.endTime - (step.startTime || 0)}ms)`);
    }
  }

  /**
   * Mark current step as failed
   */
  failStep(name: string, error: string): void {
    const step = this.steps.find(s => s.name === name && s.status === 'running');
    if (step) {
      step.status = 'failed';
      step.endTime = Date.now();
      step.error = error;
      this.log(`Step failed: ${name} - ${error}`);
    }
  }

  /**
   * Skip a step (e.g., when condition not met)
   */
  skipStep(name: string): void {
    this.steps.push({
      name,
      status: 'skipped',
    });
    this.log(`Step skipped: ${name}`);
  }

  /**
   * Get all steps with their status
   */
  getSteps(): ProcessingStep[] {
    return [...this.steps];
  }

  // ===========================================================================
  // Metadata Storage
  // ===========================================================================

  /**
   * Store metadata that can be used across steps
   */
  addMetadata<T>(key: string, value: T): void {
    this.metadata.set(key, value);
  }

  /**
   * Retrieve stored metadata
   */
  getMetadata<T>(key: string): T | undefined {
    return this.metadata.get(key) as T | undefined;
  }

  /**
   * Check if metadata key exists
   */
  hasMetadata(key: string): boolean {
    return this.metadata.has(key);
  }

  /**
   * Get all metadata as object
   */
  getAllMetadata(): Record<string, unknown> {
    return Object.fromEntries(this.metadata);
  }

  // ===========================================================================
  // Timeout & Abort
  // ===========================================================================

  /**
   * Check if operation has been aborted
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * Check if timeout has been exceeded
   */
  isTimedOut(): boolean {
    if (!this.timeout) {
      return false;
    }
    return Date.now() - this.startTime > this.timeout;
  }

  /**
   * Abort the operation
   */
  abort(reason?: string): void {
    this.aborted = true;
    this.log(`Operation aborted: ${reason || 'No reason provided'}`);
  }

  /**
   * Check if aborted and throw if so
   */
  checkAborted(): void {
    if (this.aborted) {
      throw new ProcessingAbortedError('Operation was aborted');
    }
    if (this.isTimedOut()) {
      this.aborted = true;
      throw new ProcessingTimeoutError(`Operation timed out after ${this.timeout}ms`);
    }
  }

  // ===========================================================================
  // Timing
  // ===========================================================================

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get remaining time before timeout (or null if no timeout)
   */
  getRemainingTime(): number | null {
    if (!this.timeout) {
      return null;
    }
    return Math.max(0, this.timeout - this.getElapsedTime());
  }

  // ===========================================================================
  // Logging
  // ===========================================================================

  private log(message: string): void {
    if (this.verbose) {
      const elapsed = this.getElapsedTime();
      console.log(`[${this.operationName}] [${elapsed}ms] ${message}`);
    }
  }

  // ===========================================================================
  // Summary
  // ===========================================================================

  /**
   * Get a summary of the processing context
   */
  getSummary(): {
    operationName: string;
    userId: string | null;
    vibelogId: string | null;
    elapsedTime: number;
    steps: ProcessingStep[];
    cleanupCount: number;
    aborted: boolean;
    rolledBack: boolean;
    metadata: Record<string, unknown>;
  } {
    return {
      operationName: this.operationName,
      userId: this.userId,
      vibelogId: this.vibelogId,
      elapsedTime: this.getElapsedTime(),
      steps: this.getSteps(),
      cleanupCount: this.cleanupTasks.length,
      aborted: this.aborted,
      rolledBack: this.rolledBack,
      metadata: this.getAllMetadata(),
    };
  }
}

// =============================================================================
// Helper: Execute with Context
// =============================================================================

/**
 * Execute an async function with automatic context management
 *
 * @example
 * const result = await withProcessingContext(
 *   { operationName: 'upload-music', userId: user.id },
 *   async (ctx) => {
 *     const { path } = await uploadFile(file);
 *     ctx.registerCleanup(() => deleteFile(path), 'uploaded-file');
 *
 *     const transcription = await transcribe(path);
 *     const content = await generateContent(transcription);
 *     const vibelog = await saveVibelog(content);
 *
 *     // Success - clear cleanups to keep the file
 *     ctx.clearCleanups();
 *     return vibelog;
 *   }
 * );
 */
export async function withProcessingContext<T>(
  options: ProcessingContextOptions,
  fn: (context: MediaProcessingContext) => Promise<T>
): Promise<T> {
  const context = new MediaProcessingContext(options);

  try {
    const result = await fn(context);
    return result;
  } catch (error) {
    // Auto-rollback on error
    await context.rollback();
    throw error;
  }
}

// =============================================================================
// Custom Errors
// =============================================================================

export class ProcessingAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessingAbortedError';
  }
}

export class ProcessingTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessingTimeoutError';
  }
}

// =============================================================================
// Re-export
// =============================================================================

export { MediaProcessingContext as ProcessingContext };
