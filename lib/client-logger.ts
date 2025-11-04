/**
 * Client-Side Logger
 *
 * Browser-safe logging for React components
 * Automatically sends errors to backend for tracking
 *
 * Usage in components:
 * ```typescript
 * import { useLogger } from '@/lib/client-logger';
 *
 * function MyComponent() {
 *   const log = useLogger('MyComponent');
 *
 *   const handleClick = () => {
 *     log.info('Button clicked', { action: 'submit' });
 *   };
 * }
 * ```
 */

'use client';

import { useCallback, useMemo } from 'react';

// Re-export log levels for consistency
export enum LogLevel {
  TRACE = 0,
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  FATAL = 50,
}

interface ClientLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  component?: string;
  userAgent?: string;
  url?: string;
}

class ClientLogger {
  private component?: string;
  private context: Record<string, unknown> = {};

  constructor(component?: string) {
    this.component = component;
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: ClientLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
      component: this.component,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // Console output with appropriate method
    const consoleMethod = this.getConsoleMethod(level);
    const formattedMessage = this.formatMessage(entry);

    consoleMethod(formattedMessage, entry.context || {});

    // Send errors to backend
    if (level >= LogLevel.ERROR) {
      this.sendToBackend(entry);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    if (level >= LogLevel.ERROR) {
      return console.error;
    }
    if (level >= LogLevel.WARN) {
      return console.warn;
    }
    if (level <= LogLevel.DEBUG) {
      return console.debug;
    }
    return console.log;
  }

  private formatMessage(entry: ClientLogEntry): string {
    const levelName = LogLevel[entry.level];
    const component = entry.component ? `[${entry.component}]` : '';
    return `${levelName} ${component} ${entry.message}`;
  }

  private sendToBackend(entry: ClientLogEntry): void {
    // Send to backend logging endpoint
    // Non-blocking, fire-and-forget
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' });
      navigator.sendBeacon('/api/logs', blob);
    } else {
      // Fallback for browsers without sendBeacon
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        // Don't wait for response
        keepalive: true,
      }).catch(() => {
        // Silently fail - don't disrupt user experience
      });
    }
  }

  // Public methods
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

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            ...context,
          }
        : { error, ...context };

    this.log(LogLevel.ERROR, message, errorContext);
  }

  fatal(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            ...context,
          }
        : { error, ...context };

    this.log(LogLevel.FATAL, message, errorContext);
  }
}

/**
 * React hook for component logging
 *
 * Creates a logger instance scoped to the component
 */
export function useLogger(componentName?: string): ClientLogger {
  const logger = useMemo(() => new ClientLogger(componentName), [componentName]);

  // Memoize methods to prevent re-renders
  const trace = useCallback(
    (message: string, context?: Record<string, unknown>) => logger.trace(message, context),
    [logger]
  );
  const debug = useCallback(
    (message: string, context?: Record<string, unknown>) => logger.debug(message, context),
    [logger]
  );
  const info = useCallback(
    (message: string, context?: Record<string, unknown>) => logger.info(message, context),
    [logger]
  );
  const warn = useCallback(
    (message: string, context?: Record<string, unknown>) => logger.warn(message, context),
    [logger]
  );
  const error = useCallback(
    (message: string, err?: Error | unknown, context?: Record<string, unknown>) =>
      logger.error(message, err, context),
    [logger]
  );
  const fatal = useCallback(
    (message: string, err?: Error | unknown, context?: Record<string, unknown>) =>
      logger.fatal(message, err, context),
    [logger]
  );

  return {
    setContext: logger.setContext.bind(logger),
    trace,
    debug,
    info,
    warn,
    error,
    fatal,
  } as ClientLogger;
}

/**
 * Create a standalone client logger (for non-React code)
 */
export function createClientLogger(componentName?: string): ClientLogger {
  return new ClientLogger(componentName);
}
