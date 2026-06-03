// ============================================
// lib/withLogging.ts
// HOF that wraps any API route handler and
// automatically logs 4xx/5xx responses and
// unhandled exceptions.
// ============================================

import 'server-only'
import type { NextRequest } from 'next/server'
import { logger, type LogEvent } from '@/lib/logger'

export function withLogging(
  handler: (req: NextRequest) => Promise<Response>,
  options: {
    category: LogEvent['category']
    route: string
    extractContext?: (req: NextRequest) => Partial<LogEvent>
  }
): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest): Promise<Response> => {
    const startTime = Date.now()
    let response: Response
    let statusCode = 200

    try {
      response = await handler(req)
      statusCode = response.status

      // Log warnings for 4xx client errors
      if (statusCode >= 400 && statusCode < 500) {
        const body = await response.clone().json().catch(() => ({}))
        await logger.warn({
          category: options.category,
          message: `${req.method} ${options.route} → ${statusCode}: ${
            (body as Record<string, string>).error ||
            (body as Record<string, string>).message ||
            'Client error'
          }`,
          route: options.route,
          method: req.method,
          status_code: statusCode,
          duration_ms: Date.now() - startTime,
          ...options.extractContext?.(req),
        })
      }

      // Log errors for 5xx server errors
      if (statusCode >= 500) {
        const body = await response.clone().json().catch(() => ({}))
        await logger.error({
          category: options.category,
          message: `${req.method} ${options.route} → ${statusCode}: ${
            (body as Record<string, string>).error || 'Server error'
          }`,
          route: options.route,
          method: req.method,
          status_code: statusCode,
          duration_ms: Date.now() - startTime,
          ...options.extractContext?.(req),
        })
      }
    } catch (err) {
      statusCode = 500
      await logger.error({
        category: options.category,
        message: `Unhandled exception in ${req.method} ${options.route}: ${
          err instanceof Error ? err.message : 'Unknown'
        }`,
        route: options.route,
        method: req.method,
        status_code: 500,
        duration_ms: Date.now() - startTime,
        error: err,
        ...options.extractContext?.(req),
      })
      response = Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    return response
  }
}
