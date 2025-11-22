/**
 * Structured Logging Infrastructure
 *
 * Provides type-safe, structured logging with:
 * - Multiple log levels (trace, debug, info, warn, error, fatal)
 * - Automatic context injection (environment, timestamp, request ID)
 * - Production-ready formatting (JSON for prod, pretty for dev)
 * - Performance monitoring
 * - Error tracking integration
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User logged in', { userId: '123', method: 'google' });
 * logger.error('Payment failed', { error, orderId: '456' });
 * ```
 */

import { env, isDev, isProd } from './env';

// Log levels (ordered by severity)
export enum LogLevel {
  TRACE = 0,
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  FATAL = 50,
}

// Log level names for output
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

// ANSI color codes for pretty printing
const COLORS = {
  TRACE: '\x1b[90m', // Gray
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  FATAL: '\x1b[35m', // Magenta
  RESET: '\x1b[0m',
};

// Log entry structure
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
  requestId?: string;
  userId?: string;
  environment: string;
}

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  pretty: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
}

/**
 * Logger Class
 *
 * Provides structured logging with configurable output formats
 */
class Logger {
  private config: LoggerConfig;
  private context: Record<string, unknown> = {};

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: this.getDefaultLogLevel(),
      pretty: isDev,
      includeTimestamp: true,
      includeContext: true,
      ...config,
    };
  }

  /**
   * Get default log level based on environment
   */
  private getDefaultLogLevel(): LogLevel {
    if (isDev) {
      return LogLevel.DEBUG;
    }
    if (isProd) {
      return LogLevel.INFO;
    }
    return LogLevel.INFO;
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error | unknown
  ): void {
    // Skip if below minimum log level
    if (level < this.config.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.config.includeContext ? { ...this.context, ...context } : undefined,
      error: error instanceof Error ? this.serializeError(error) : error,
      environment: env.NODE_ENV || 'development',
    };

    // Output based on format
    if (this.config.pretty) {
      this.prettyPrint(entry);
    } else {
      this.jsonPrint(entry);
    }

    // Send to external services in production
    if (isProd && level >= LogLevel.ERROR) {
      this.sendToErrorTracking(entry);
    }
  }

  /**
   * Pretty print for development
   */
  private prettyPrint(entry: LogEntry): void {
    const levelName = LOG_LEVEL_NAMES[entry.level];
    const color = COLORS[levelName as keyof typeof COLORS];
    const timestamp = this.config.includeTimestamp
      ? `[${new Date(entry.timestamp).toLocaleTimeString()}]`
      : '';

    let output = `${color}${levelName}${COLORS.RESET} ${timestamp} ${entry.message}`;

    // Add context if present
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  ${COLORS.DEBUG}Context:${COLORS.RESET} ${JSON.stringify(entry.context, null, 2)
        .split('\n')
        .join('\n  ')}`;
    }

    // Add error details if present
    if (entry.error) {
      if (entry.error instanceof Error) {
        output += `\n  ${COLORS.ERROR}Error:${COLORS.RESET} ${entry.error.message}`;
        if (entry.error.stack) {
          output += `\n  ${COLORS.ERROR}Stack:${COLORS.RESET}\n  ${entry.error.stack
            .split('\n')
            .join('\n  ')}`;
        }
      } else {
        output += `\n  ${COLORS.ERROR}Error:${COLORS.RESET} ${JSON.stringify(entry.error)}`;
      }
    }

    console.log(output);
  }

  /**
   * JSON print for production
   */
  private jsonPrint(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  /**
   * Serialize error for logging
   */
  private serializeError(error: Error): Record<string, unknown> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as any), // Include any custom properties
    };
  }

  /**
   * Send to error tracking service (Sentry, etc.)
   *
   * To enable Sentry integration:
   * 1. Install: npm install @sentry/nextjs
   * 2. Initialize Sentry in next.config.ts or instrumentation.ts
   * 3. Uncomment the Sentry code below
   */
  private sendToErrorTracking(entry: LogEntry): void {
    if (entry.level >= LogLevel.ERROR) {
      // Sentry integration (uncomment when Sentry is installed)
      // if (typeof window === 'undefined' && typeof require !== 'undefined') {
      //   try {
      //     const Sentry = require('@sentry/nextjs');
      //     if (entry.error) {
      //       Sentry.captureException(entry.error, {
      //         level: entry.level === LogLevel.FATAL ? 'fatal' : 'error',
      //         tags: { component: entry.context?.component },
      //         extra: entry.context,
      //       });
      //     } else {
      //       Sentry.captureMessage(entry.message, {
      //         level: entry.level === LogLevel.FATAL ? 'fatal' : 'error',
      //         tags: { component: entry.context?.component },
      //         extra: entry.context,
      //       });
      //     }
      //   } catch (e) {
      //     // Sentry not available, fall through to console logging
      //   }
      // }

      // Always log to console as fallback
      if (isProd) {
        // In production, use structured JSON logging
        console.error(JSON.stringify(entry));
      } else {
        // In development, pretty print is already handled by prettyPrint()
        // This is just a safety fallback
      }
    }
  }

  // Public logging methods

  trace(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(
    message: string,
    contextOrError?: Record<string, unknown> | Error,
    errorOrContext?: Error | Record<string, unknown>
  ): void {
    // Handle multiple signatures:
    // - error(msg, error) - error only
    // - error(msg, context, error) - context and error
    // - error(msg, error, context) - error and context (for convenience)
    if (contextOrError instanceof Error) {
      // Second param is Error
      const context = errorOrContext && !(errorOrContext instanceof Error) ? errorOrContext : undefined;
      this.log(LogLevel.ERROR, message, context, contextOrError);
    } else {
      // Second param is context (or undefined)
      const error = errorOrContext instanceof Error ? errorOrContext : undefined;
      this.log(LogLevel.ERROR, message, contextOrError, error);
    }
  }

  fatal(
    message: string,
    contextOrError?: Record<string, unknown> | Error,
    errorOrContext?: Error | Record<string, unknown>
  ): void {
    // Handle multiple signatures (same as error method)
    if (contextOrError instanceof Error) {
      const context = errorOrContext && !(errorOrContext instanceof Error) ? errorOrContext : undefined;
      this.log(LogLevel.FATAL, message, context, contextOrError);
    } else {
      const error = errorOrContext instanceof Error ? errorOrContext : undefined;
      this.log(LogLevel.FATAL, message, contextOrError, error);
    }
  }

  /**
   * Measure execution time of a function
   */
  async time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, { duration: `${duration}ms` }, error as Error);
      throw error;
    }
  }

  /**
   * Log with performance metrics
   */
  perf(message: string, metrics: Record<string, number | string>): void {
    this.info(message, { metrics });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create API route logger with request context
 */
export function createApiLogger(requestId?: string, userId?: string): Logger {
  return logger.child({
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId,
    type: 'api',
  });
}

/**
 * Create component logger with component context
 */
export function createComponentLogger(componentName: string): Logger {
  return logger.child({
    component: componentName,
    type: 'client',
  });
}

/**
 * Migration helper: Replace console.log calls
 *
 * @deprecated Use logger.info() instead
 */
export function deprecatedConsoleLog(message: string, ...args: unknown[]): void {
  logger.warn('DEPRECATION: console.log() should be replaced with logger.info()', {
    message,
    args,
    stack: new Error().stack,
  });
}
