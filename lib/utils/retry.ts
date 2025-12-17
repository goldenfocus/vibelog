/**
 * Retry Utility with Exponential Backoff
 *
 * Provides robust retry logic for transient failures in:
 * - OpenAI API calls (rate limits, network issues)
 * - Supabase storage operations
 * - Any async operation that can fail transiently
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Timeout support
 * - Detailed logging
 * - Circuit breaker integration (optional)
 */

// =============================================================================
// Types
// =============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;

  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;

  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;

  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;

  /** Maximum jitter in milliseconds (default: 1000) */
  maxJitter?: number;

  /** Total timeout for all attempts in milliseconds (default: none) */
  timeout?: number;

  /** Function to determine if error is retryable (default: checks common patterns) */
  retryIf?: (error: unknown, attempt: number) => boolean;

  /** Callback on each retry attempt */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;

  /** Operation name for logging */
  operationName?: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

// =============================================================================
// Default Retry Conditions
// =============================================================================

/**
 * Common retryable error patterns
 */
const RETRYABLE_PATTERNS = [
  // Network errors
  /network/i,
  /timeout/i,
  /timed out/i,
  /econnreset/i,
  /econnrefused/i,
  /enotfound/i,
  /socket hang up/i,
  /connection reset/i,

  // Rate limiting
  /rate limit/i,
  /too many requests/i,
  /429/,

  // Temporary server errors
  /502/,
  /503/,
  /504/,
  /bad gateway/i,
  /service unavailable/i,
  /gateway timeout/i,

  // OpenAI specific
  /overloaded/i,
  /server_error/i,
  /insufficient_quota/i, // Sometimes temporary
];

/**
 * Non-retryable error patterns (should fail immediately)
 */
const NON_RETRYABLE_PATTERNS = [
  /invalid.*api.*key/i,
  /unauthorized/i,
  /forbidden/i,
  /not found/i,
  /bad request/i,
  /invalid.*request/i,
  /malformed/i,
  /401/,
  /403/,
  /404/,
  /400/,
];

/**
 * Default retry condition - checks if error is likely transient
 */
export function isRetryableError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const statusCode = getStatusCode(error);

  // Check non-retryable patterns first
  for (const pattern of NON_RETRYABLE_PATTERNS) {
    if (pattern.test(message) || (statusCode && pattern.test(String(statusCode)))) {
      return false;
    }
  }

  // Check retryable patterns
  for (const pattern of RETRYABLE_PATTERNS) {
    if (pattern.test(message) || (statusCode && pattern.test(String(statusCode)))) {
      return true;
    }
  }

  // Default: don't retry unknown errors
  return false;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function getStatusCode(error: unknown): number | null {
  if (error && typeof error === 'object') {
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      return (error as { status: number }).status;
    }
    if (
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
    ) {
      return (error as { statusCode: number }).statusCode;
    }
    if ('code' in error && typeof (error as { code: unknown }).code === 'number') {
      return (error as { code: number }).code;
    }
  }
  return null;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean,
  maxJitter: number
): number {
  // Exponential backoff: baseDelay * (multiplier ^ attempt)
  let delay = baseDelay * Math.pow(backoffMultiplier, attempt);

  // Cap at maxDelay
  delay = Math.min(delay, maxDelay);

  // Add jitter to prevent thundering herd
  if (jitter) {
    const jitterAmount = Math.random() * maxJitter;
    delay += jitterAmount;
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Main Retry Function
// =============================================================================

/**
 * Execute an async function with retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Promise with result or throws after all retries exhausted
 *
 * @example
 * // Basic usage
 * const result = await withRetry(
 *   () => openai.audio.transcriptions.create({ file, model: 'whisper-1' }),
 *   { maxRetries: 3, operationName: 'whisper-transcription' }
 * );
 *
 * @example
 * // Custom retry condition
 * const result = await withRetry(
 *   () => fetchFromAPI(),
 *   {
 *     maxRetries: 5,
 *     retryIf: (error) => error.status === 503,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms`);
 *     }
 *   }
 * );
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    jitter = true,
    maxJitter = 1000,
    timeout,
    retryIf = isRetryableError,
    onRetry,
    operationName = 'operation',
  } = options;

  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check timeout
      if (timeout && Date.now() - startTime > timeout) {
        throw new RetryTimeoutError(
          `${operationName} timed out after ${timeout}ms (${attempt} attempts)`,
          lastError
        );
      }

      // Execute the function
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxRetries) {
        // No more retries
        break;
      }

      if (!retryIf(error, attempt)) {
        // Error is not retryable
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(
        attempt,
        baseDelay,
        maxDelay,
        backoffMultiplier,
        jitter,
        maxJitter
      );

      // Log retry
      console.warn(
        `⚠️ [RETRY] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
          `retrying in ${delay}ms: ${getErrorMessage(error)}`
      );

      // Callback
      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw new RetryExhaustedError(
    `${operationName} failed after ${maxRetries + 1} attempts`,
    lastError,
    maxRetries + 1
  );
}

/**
 * Execute with retry and return detailed result (doesn't throw)
 */
export async function withRetryResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  const wrappedFn = async () => {
    attempts++;
    return fn();
  };

  try {
    const data = await withRetry(wrappedFn, options);
    return {
      success: true,
      data,
      attempts,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error,
      attempts,
      totalTime: Date.now() - startTime,
    };
  }
}

// =============================================================================
// Preset Configurations
// =============================================================================

/**
 * Preset for OpenAI API calls
 * - Higher retry count for rate limits
 * - Longer delays to respect rate limits
 */
export const OPENAI_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  jitter: true,
  maxJitter: 2000,
  operationName: 'openai-api',
  retryIf: error => {
    const message = getErrorMessage(error);
    const statusCode = getStatusCode(error);

    // Always retry rate limits
    if (statusCode === 429 || /rate limit/i.test(message)) {
      return true;
    }

    // Retry server errors
    if (statusCode && statusCode >= 500) {
      return true;
    }

    // Don't retry auth errors
    if (statusCode === 401 || statusCode === 403) {
      return false;
    }

    return isRetryableError(error);
  },
};

/**
 * Preset for Supabase storage operations
 * - Moderate retry count
 * - Shorter delays (storage is usually fast)
 */
export const STORAGE_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  maxJitter: 500,
  operationName: 'storage',
};

/**
 * Preset for quick operations that should fail fast
 */
export const FAST_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  baseDelay: 200,
  maxDelay: 2000,
  backoffMultiplier: 2,
  jitter: true,
  maxJitter: 200,
  operationName: 'quick-op',
};

// =============================================================================
// Custom Errors
// =============================================================================

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly lastError: unknown,
    public readonly attempts: number
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}

export class RetryTimeoutError extends Error {
  constructor(
    message: string,
    public readonly lastError: unknown
  ) {
    super(message);
    this.name = 'RetryTimeoutError';
  }
}

// =============================================================================
// Utility: Retry with Timeout Race
// =============================================================================

/**
 * Execute function with both retry logic AND a hard timeout
 * Useful for operations that might hang indefinitely
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  options: RetryOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new RetryTimeoutError(`Operation timed out after ${timeoutMs}ms`, null));
    }, timeoutMs);

    withRetry(fn, options)
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
