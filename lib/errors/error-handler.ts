/**
 * Centralized error handling for Mother's Almanac
 * Provides consistent error responses and logging
 */

import { NextResponse } from 'next/server'

/**
 * Error types in the application
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  GENERATION = 'GENERATION_ERROR',
  CACHE = 'CACHE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * Application error class with structured data
 */
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode: number = 500,
    public details?: unknown,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    message: string
    type: string
    statusCode: number
    details?: unknown
    retryable?: boolean
    timestamp: string
    requestId?: string
  }
}

/**
 * Format error for API response
 *
 * @param error - Error object
 * @param requestId - Optional request ID for tracking
 * @returns Formatted error response
 */
export function formatErrorResponse(
  error: Error | AppError,
  requestId?: string
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        type: error.type,
        statusCode: error.statusCode,
        ...(error.details ? { details: error.details } : {}),
        ...(error.retryable ? { retryable: true } : {}),
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
      },
    }
  }

  // Generic error
  return {
    error: {
      message: error.message || 'An unexpected error occurred',
      type: ErrorType.INTERNAL,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    },
  }
}

/**
 * Create error response with appropriate status code
 *
 * @param error - Error object
 * @param requestId - Optional request ID
 * @returns Next.js response
 */
export function createErrorResponse(
  error: Error | AppError,
  requestId?: string
): NextResponse<ErrorResponse> {
  const errorResponse = formatErrorResponse(error, requestId)
  const statusCode = errorResponse.error.statusCode

  // Log error (you can integrate with your logging service here)
  logError(error, requestId)

  return NextResponse.json(errorResponse, { status: statusCode })
}

/**
 * Log error with context
 *
 * @param error - Error object
 * @param requestId - Optional request ID
 */
export function logError(error: Error | AppError, requestId?: string): void {
  const context = {
    timestamp: new Date().toISOString(),
    requestId,
    ...(error instanceof AppError && {
      type: error.type,
      statusCode: error.statusCode,
      retryable: error.retryable,
      details: error.details,
    }),
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error.message, context, error.stack)
  } else {
    // In production, send to error tracking service (e.g., Sentry)
    console.error(JSON.stringify({ error: error.message, ...context }))

    // TODO: Integrate with Sentry or other error tracking
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error, { contexts: { custom: context } })
    // }
  }
}

/**
 * Retry utility with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param baseDelay - Base delay in milliseconds
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxAttempts) {
        break
      }

      // Check if error is retryable
      if (error instanceof AppError && !error.retryable) {
        throw error
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt - 1)
      const jitter = Math.random() * 1000
      await new Promise((resolve) => setTimeout(resolve, delay + jitter))

      logError(
        new Error(`Retry attempt ${attempt}/${maxAttempts}: ${lastError.message}`)
      )
    }
  }

  throw new AppError(
    `Failed after ${maxAttempts} attempts: ${lastError!.message}`,
    ErrorType.EXTERNAL_API,
    503,
    { lastError: lastError!.message },
    false
  )
}

/**
 * Common error creators
 */
export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError(message, ErrorType.VALIDATION, 400, details),

  authentication: (message: string = 'Authentication required') =>
    new AppError(message, ErrorType.AUTHENTICATION, 401),

  authorization: (message: string = 'Insufficient permissions') =>
    new AppError(message, ErrorType.AUTHORIZATION, 403),

  notFound: (resource: string = 'Resource') =>
    new AppError(`${resource} not found`, ErrorType.NOT_FOUND, 404),

  rateLimit: (message: string = 'Rate limit exceeded') =>
    new AppError(message, ErrorType.RATE_LIMIT, 429, undefined, true),

  database: (message: string, details?: unknown) =>
    new AppError(message, ErrorType.DATABASE, 500, details, true),

  externalApi: (message: string, details?: unknown) =>
    new AppError(message, ErrorType.EXTERNAL_API, 502, details, true),

  generation: (message: string, details?: unknown) =>
    new AppError(message, ErrorType.GENERATION, 500, details, true),

  cache: (message: string, details?: unknown) =>
    new AppError(message, ErrorType.CACHE, 500, details, true),

  internal: (message: string = 'Internal server error', details?: unknown) =>
    new AppError(message, ErrorType.INTERNAL, 500, details),
} as const

/**
 * Error boundary for catching and handling errors
 *
 * @param fn - Async function to wrap
 * @returns Wrapped function with error handling
 */
export function withErrorHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw Errors.internal(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}
