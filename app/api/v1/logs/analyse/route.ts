// ============================================
// POST /api/v1/logs/analyse
// AI Analysis Agent — called by logger.ts
// after every error/warn log.
// Auth: x-cron-secret header (internal only)
// ============================================

export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDirectWhatsApp } from '@/lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Types ────────────────────────────────────
interface PixovaLog {
  log_id: string
  level: string
  category: string
  message: string
  route: string | null
  status_code: number | null
  error_type: string | null
  stack_trace: string | null
  duration_ms: number | null
  user_role: string | null
  user_phone: string | null
  fingerprint: string | null
  first_seen_at: string
  occurrence_count: number
  photographer_id: string | null
}

interface AnalysisResult {
  severity: number
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
  root_cause: string
  suggested_fix: string
  summary: string
}

// ─── Handler ──────────────────────────────────
export async function POST(req: NextRequest) {
  // Verify internal call
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let log_id: string
  try {
    const body = await req.json()
    log_id = body.log_id
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!log_id) {
    return Response.json({ error: 'log_id required' }, { status: 400 })
  }

  // Fetch full log entry
  const { data: logEntry } = await supabaseAdmin
    .from('pixova_logs')
    .select('*')
    .eq('log_id', log_id)
    .single()

  if (!logEntry) {
    return Response.json({ error: 'Log not found' }, { status: 404 })
  }

  // Fetch recent similar logs (last 24h) for occurrence context
  const { data: similarLogs } = await supabaseAdmin
    .from('pixova_logs')
    .select('log_id, message, status_code, created_at, photographer_id')
    .eq('fingerprint', logEntry.fingerprint)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  const affectedUsers = new Set(
    (similarLogs ?? [])
      .map((l: { photographer_id: string | null }) => l.photographer_id)
      .filter(Boolean)
  ).size

  // Call Claude for analysis
  const analysis = await analyseWithClaude(
    logEntry as PixovaLog,
    ((similarLogs ?? []) as unknown[]) as PixovaLog[],
    affectedUsers
  )

  // Update log with AI analysis
  await supabaseAdmin
    .from('pixova_logs')
    .update({
      ai_severity: analysis.severity,
      ai_priority: analysis.priority,
      ai_root_cause: analysis.root_cause,
      ai_suggested_fix: analysis.suggested_fix,
      ai_affected_users: affectedUsers,
      ai_summary: analysis.summary,
      ai_analysed_at: new Date().toISOString(),
    })
    .eq('log_id', log_id)

  // Update log group with latest AI analysis
  if (logEntry.fingerprint) {
    await supabaseAdmin
      .from('pixova_log_groups')
      .update({
        ai_priority: analysis.priority,
        ai_root_cause: analysis.root_cause,
        ai_suggested_fix: analysis.suggested_fix,
        affected_users: affectedUsers,
      })
      .eq('fingerprint', logEntry.fingerprint)
  }

  // Trigger alert for P0 and P1
  if (analysis.priority === 'P0' || analysis.priority === 'P1') {
    await triggerAlert(logEntry as PixovaLog, analysis, affectedUsers)
  }

  return Response.json({ success: true, analysis })
}

// ─── Claude analysis ──────────────────────────
async function analyseWithClaude(
  logEntry: PixovaLog,
  similarLogs: PixovaLog[],
  affectedUsers: number
): Promise<AnalysisResult> {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) {
    return defaultAnalysis(logEntry)
  }

  const prompt = `You are a senior engineer analysing errors in Pixova — a photography SaaS platform in India.

Pixova has these user types:
- Photographers (pay ₹699/month subscription)
- Clients (free, book photographers)
- Admins (Pixova team)

Analyse this error and respond with JSON only.

ERROR DETAILS:
Level: ${logEntry.level}
Category: ${logEntry.category}
Message: ${logEntry.message}
Route: ${logEntry.route ?? 'unknown'}
Status Code: ${logEntry.status_code ?? 'none'}
Error Type: ${logEntry.error_type ?? 'none'}
Stack Trace: ${logEntry.stack_trace?.slice(0, 500) ?? 'none'}
Duration: ${logEntry.duration_ms ?? 'unknown'}ms

OCCURRENCE DATA:
Times seen in last 24 hours: ${similarLogs.length || 1}
Affected users: ${affectedUsers}
First seen: ${logEntry.first_seen_at}

CONTEXT:
User role: ${logEntry.user_role ?? 'unknown'}
User phone: ${logEntry.user_phone ? 'present' : 'anonymous'}

PRIORITY GUIDE:
P0 - Payment broken, all users locked out, data loss
P1 - Core feature broken for many users
P2 - Feature broken for some users
P3 - Minor issue, workaround exists
P4 - Cosmetic or logging issue

Respond with ONLY this JSON (no markdown):
{
  "severity": <1-10 integer>,
  "priority": "<P0|P1|P2|P3|P4>",
  "root_cause": "<one sentence, technical>",
  "suggested_fix": "<one sentence, actionable>",
  "summary": "<plain English for non-technical founder>"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return defaultAnalysis(logEntry)
    }

    const data = await response.json()
    const text = (data?.content?.[0]?.text ?? '').trim()
    const parsed = JSON.parse(text) as AnalysisResult
    return parsed
  } catch {
    return defaultAnalysis(logEntry)
  }
}

function defaultAnalysis(logEntry: PixovaLog): AnalysisResult {
  return {
    severity: 5,
    priority: 'P2',
    root_cause: 'Could not analyse automatically',
    suggested_fix: 'Review logs manually',
    summary: logEntry.message,
  }
}

// ─── Alert agent (P0/P1 only) ─────────────────
async function triggerAlert(
  logEntry: PixovaLog,
  analysis: AnalysisResult,
  affectedUsers: number
): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE
  if (!adminPhone) return

  // Rate-limit: one alert per fingerprint per hour
  const { data: recentAlert } = await supabaseAdmin
    .from('pixova_log_alerts')
    .select('alert_id')
    .eq('group_id', logEntry.fingerprint ?? logEntry.log_id)
    .gte('sent_at', new Date(Date.now() - 3_600_000).toISOString())
    .maybeSingle()

  if (recentAlert) return

  const priorityLabel: Record<string, string> = {
    P0: '🔴 CRITICAL',
    P1: '🟠 HIGH',
  }

  const message = [
    `${priorityLabel[analysis.priority] ?? analysis.priority} Pixova Error Alert`,
    '',
    analysis.summary,
    '',
    `Category: ${logEntry.category}`,
    `Route: ${logEntry.route ?? 'unknown'}`,
    `Affected: ${affectedUsers} user(s)`,
    `Occurrences: ${logEntry.occurrence_count}x`,
    '',
    `Root cause: ${analysis.root_cause}`,
    '',
    `Fix: ${analysis.suggested_fix}`,
    '',
    `View: ${process.env.NEXT_PUBLIC_APP_URL}/admin/logs?id=${logEntry.log_id}`,
  ].join('\n')

  // Send WhatsApp to admin
  await sendDirectWhatsApp({ to: adminPhone, message })

  // Record alert
  await supabaseAdmin.from('pixova_log_alerts').insert({
    log_id: logEntry.log_id,
    group_id: logEntry.fingerprint ?? logEntry.log_id,
    alert_type: analysis.priority,
    channel: 'whatsapp',
    message,
  })

  // Mark log: alert_sent = true
  await supabaseAdmin
    .from('pixova_logs')
    .update({ alert_sent: true })
    .eq('log_id', logEntry.log_id)
}
