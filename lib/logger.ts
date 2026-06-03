// ============================================
// lib/logger.ts — Core logging library
// Writes structured logs to pixova_logs table.
// Uses service role client — never anon key.
// Compatible with both Node.js and Edge runtimes.
// ============================================

import 'server-only'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────
export interface LogEvent {
  level: 'error' | 'warn' | 'info' | 'debug'
  category:
    | 'auth'
    | 'booking'
    | 'payment'
    | 'gallery'
    | 'whatsapp'
    | 'subscription'
    | 'portal'
    | 'api'
    | 'cron'
    | 'marketplace'
    | 'admin'
    | 'system'
  message: string
  route?: string
  method?: string
  status_code?: number
  duration_ms?: number
  photographer_id?: string
  studio_id?: string
  client_id?: string
  account_id?: string
  user_phone?: string
  user_role?: string
  error?: Error | unknown
  request_body?: Record<string, unknown>
  response_body?: Record<string, unknown>
  error_code?: string
  metadata?: Record<string, unknown>
}

// ─────────────────────────────────────
// Main log function
// ─────────────────────────────────────
export async function log(event: LogEvent): Promise<string | null> {
  try {
    // 1. Extract stack trace + error type
    let stack_trace: string | undefined
    let error_type: string | undefined
    if (event.error instanceof Error) {
      stack_trace = event.error.stack
      error_type = event.error.constructor.name
    }

    // 2. Generate fingerprint for deduplication
    const fingerprint = generateFingerprint({
      category: event.category,
      message: event.message,
      route: event.route,
      error_type,
    })

    // 3. Insert log to DB
    const { data: logRow, error: dbError } = await supabaseAdmin
      .from('pixova_logs')
      .insert({
        level: event.level,
        category: event.category,
        message: event.message,
        route: event.route,
        method: event.method,
        status_code: event.status_code,
        duration_ms: event.duration_ms,
        photographer_id: event.photographer_id,
        studio_id: event.studio_id,
        client_id: event.client_id,
        account_id: event.account_id,
        user_phone: event.user_phone,
        user_role: event.user_role,
        stack_trace,
        error_type,
        error_code: event.error_code,
        request_body: sanitizeBody(event.request_body),
        fingerprint,
      })
      .select('log_id')
      .single()

    if (dbError || !logRow) return null

    const logId = logRow.log_id as string

    // 4. Upsert log group (deduplication) — fire and forget
    void upsertLogGroup(fingerprint, event, logId)

    // 5. Trigger AI analysis for errors and warnings — fire and forget
    if (event.level === 'error' || event.level === 'warn') {
      void triggerAnalysis(logId, event)
    }

    return logId
  } catch {
    // Logging must never break the app
    return null
  }
}

// ─────────────────────────────────────
// Convenience wrappers
// ─────────────────────────────────────
export const logger = {
  error: (event: Omit<LogEvent, 'level'>) =>
    log({ ...event, level: 'error' }),

  warn: (event: Omit<LogEvent, 'level'>) =>
    log({ ...event, level: 'warn' }),

  info: (event: Omit<LogEvent, 'level'>) =>
    log({ ...event, level: 'info' }),

  debug: (event: Omit<LogEvent, 'level'>) =>
    log({ ...event, level: 'debug' }),
}

// ─────────────────────────────────────
// Fingerprint generation
// Normalises dynamic values so the same error always
// maps to the same fingerprint regardless of user/ID.
// Uses a pure-JS hash (no Node crypto) so it works
// in both Node.js API routes and Edge middleware.
// ─────────────────────────────────────
function generateFingerprint(params: {
  category: string
  message: string
  route?: string
  error_type?: string
}): string {
  const normalized = params.message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{id}')
    .replace(/\d+/g, '{n}')
    .replace(/\S+@\S+/g, '{email}')
    .replace(/\+?91\d{10}/g, '{phone}')
    .toLowerCase()
    .trim()

  const key = [
    params.category,
    params.route ?? 'unknown',
    params.error_type ?? 'error',
    normalized.slice(0, 100),
  ].join('|')

  return djb2Hash(key)
}

// 64-bit-wide DJB2 variant — collision-resistant enough for log grouping
function djb2Hash(str: string): string {
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761) >>> 0
    h2 = Math.imul(h2 ^ c, 1597334677) >>> 0
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  )
}

// ─────────────────────────────────────
// Body sanitiser — redact sensitive fields
// ─────────────────────────────────────
function sanitizeBody(
  body?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!body) return undefined
  const REDACT = [
    'password',
    'otp',
    'token',
    'secret',
    'key',
    'cvv',
    'card',
    'account_number',
  ]
  const sanitized = { ...body }
  for (const field of REDACT) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }
  return sanitized
}

// ─────────────────────────────────────
// Log group upsert
// ─────────────────────────────────────
async function upsertLogGroup(
  fingerprint: string,
  event: LogEvent,
  logId: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from('pixova_log_groups')
      .upsert(
        {
          fingerprint,
          category: event.category,
          level: event.level,
          message: event.message,
          occurrence_count: 1,
          last_seen_at: new Date().toISOString(),
          latest_log_id: logId,
        },
        { onConflict: 'fingerprint' }
      )

    await supabaseAdmin.rpc('increment_log_group', {
      p_fingerprint: fingerprint,
    })
  } catch {
    // Silently fail
  }
}

// ─────────────────────────────────────
// Trigger AI analysis (fire and forget)
// ─────────────────────────────────────
async function triggerAnalysis(
  logId: string,
  _event: LogEvent
): Promise<void> {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/logs/analyse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET!,
        },
        body: JSON.stringify({ log_id: logId }),
      }
    )
  } catch {
    // Silently fail — logging must never break the app
  }
}
