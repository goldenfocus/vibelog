/**
 * Centralized Error Handling Service
 *
 * Provides consistent error handling, logging, and user-friendly error messages
 * across the entire application.
 *
 * Integrates with structured logger for production-ready error tracking.
 */

import { logger } from './logger';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  retryable?: boolean;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Standard error types
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTH_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TRANSCRIPTION_ERROR: 'TRANSCRIPTION_ERROR',
  GENERATION_ERROR: 'GENERATION_ERROR',
  SAVE_ERROR: 'SAVE_ERROR',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCodes.NETWORK_ERROR]:
    'Connection error. Please check your internet connection and try again.',
  [ErrorCodes.API_ERROR]: 'Service temporarily unavailable. Please try again in a moment.',
  [ErrorCodes.VALIDATION_ERROR]: 'Invalid input. Please check your data and try again.',
  [ErrorCodes.AUTHENTICATION_ERROR]: 'Authentication required. Please log in to continue.',
  [ErrorCodes.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment before trying again.',
  [ErrorCodes.TRANSCRIPTION_ERROR]: 'Audio transcription failed. Please try recording again.',
  [ErrorCodes.GENERATION_ERROR]: 'Content generation failed. Please try again.',
  [ErrorCodes.SAVE_ERROR]: 'Failed to save. Your data has been backed up locally.',
  [ErrorCodes.UPLOAD_ERROR]: 'File upload failed. Please try again.',
  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

// Retryable error types
const RETRYABLE_ERRORS = new Set([
  ErrorCodes.NETWORK_ERROR,
  ErrorCodes.API_ERROR,
  ErrorCodes.RATE_LIMIT_ERROR,
]);

export class ErrorHandler {
  /**
   * Creates a standardized AppError from any error type
   */
  static createError(
    error: unknown,
    context: ErrorContext = {},
    fallbackCode: string = ErrorCodes.UNKNOWN_ERROR
  ): AppError {
    let code = fallbackCode;
    let message = 'Unknown error occurred';
    let details = null;

    if (error instanceof Error) {
      message = error.message;
      details = {
        name: error.name,
        stack: error.stack,
      };

      // Classify error based on message patterns
      if (message.includes('fetch') || message.includes('network')) {
        code = ErrorCodes.NETWORK_ERROR;
      } else if (message.includes('401') || message.includes('unauthorized')) {
        code = ErrorCodes.AUTHENTICATION_ERROR;
      } else if (message.includes('429') || message.includes('rate limit')) {
        code = ErrorCodes.RATE_LIMIT_ERROR;
      } else if (message.includes('400') || message.includes('validation')) {
        code = ErrorCodes.VALIDATION_ERROR;
      }
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      // Handle API error responses
      const apiError = error as any;
      if (apiError.code) {
        code = apiError.code;
      }
      if (apiError.message) {
        message = apiError.message;
      }
      details = apiError;
    }

    const userMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCodes.UNKNOWN_ERROR];
    const retryable = RETRYABLE_ERRORS.has(code as any);

    return {
      code,
      message,
      userMessage,
      details: { ...details, context },
      retryable,
    };
  }

  /**
   * Logs error with appropriate level and context
   */
  static logError(error: AppError, context: ErrorContext = {}): void {
    // Use structured logger for consistent error tracking
    logger.error('Application error occurred', {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      context: {
        component: context.component,
        action: context.action,
        userId: context.userId,
        ...context.metadata,
      },
      details: error.details,
    });

    // Error tracking integration: logger.error() automatically sends to error tracking
    // in production (see lib/logger.ts sendToErrorTracking method)
    // For Sentry integration, add: Sentry.captureException(new Error(error.message), { extra: logData })
  }

  /**
   * Handles error with logging and optional user notification
   */
  static handleError(
    error: unknown,
    context: ErrorContext = {},
    options: {
      showToUser?: boolean;
      fallbackCode?: string;
      onError?: (appError: AppError) => void;
    } = {}
  ): AppError {
    const appError = this.createError(error, context, options.fallbackCode);

    this.logError(appError, context);

    if (options.onError) {
      options.onError(appError);
    }

    return appError;
  }

  /**
   * Helper for API call error handling
   */
  static async handleAPICall<T>(
    apiCall: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<{ data?: T; error?: AppError }> {
    try {
      const data = await apiCall();
      return { data };
    } catch (error) {
      const appError = this.handleError(error, {
        ...context,
        action: 'api_call',
      });
      return { error: appError };
    }
  }

  /**
   * Helper for validating required fields
   */
  static validateRequired(
    data: Record<string, any>,
    requiredFields: string[],
    context: ErrorContext = {}
  ): AppError | null {
    const missingFields = requiredFields.filter(
      field => data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      return this.createError(
        `Missing required fields: ${missingFields.join(', ')}`,
        context,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    return null;
  }
}

// Convenience functions
export const handleError = ErrorHandler.handleError.bind(ErrorHandler);
export const createError = ErrorHandler.createError.bind(ErrorHandler);
export const logError = ErrorHandler.logError.bind(ErrorHandler);
export const handleAPICall = ErrorHandler.handleAPICall.bind(ErrorHandler);
export const validateRequired = ErrorHandler.validateRequired.bind(ErrorHandler);
