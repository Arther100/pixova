export const dynamic = 'force-dynamic'

// ============================================
// GET  /api/v1/admin/logs   — list + stats
// PATCH /api/v1/admin/logs  — resolve a log
// Auth: pixova_admin_session
// ============================================

import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { createClient } from '@supabase/supabase-js'
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from '@/lib/api-helpers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── GET ──────────────────────────────────────
export async function GET(request: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return unauthorizedResponse('Admin access required')

  const { searchParams } = request.nextUrl
  const level      = searchParams.get('level') ?? ''
  const category   = searchParams.get('category') ?? ''
  const priority   = searchParams.get('priority') ?? ''
  const search     = searchParams.get('search') ?? ''
  const from       = searchParams.get('from') ?? ''
  const to         = searchParams.get('to') ?? ''
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit      = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10))
  const offset     = (page - 1) * limit

  // Default: last 24 hours
  const defaultFrom = from || new Date(Date.now() - 86_400_000).toISOString()

  // ── Build logs query ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logsQuery = (supabaseAdmin as any)
    .from('pixova_logs')
    .select(
      'log_id, level, category, message, route, method, status_code, duration_ms, ' +
      'photographer_id, user_phone, user_role, error_code, error_type, stack_trace, ' +
      'request_body, ai_severity, ai_priority, ai_root_cause, ai_suggested_fix, ' +
      'ai_affected_users, ai_summary, ai_analysed_at, ' +
      'is_resolved, resolved_at, resolution_note, alert_sent, ' +
      'fingerprint, occurrence_count, first_seen_at, created_at',
      { count: 'exact' }
    )
    .gte('created_at', defaultFrom)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (to)       logsQuery = logsQuery.lte('created_at', to)
  if (level)    logsQuery = logsQuery.eq('level', level)
  if (category) logsQuery = logsQuery.eq('category', category)
  if (priority) logsQuery = logsQuery.eq('ai_priority', priority)
  if (search)   logsQuery = logsQuery.ilike('message', `%${search}%`)

  // ── Stats query (always last 24h) ──
  const since24h = new Date(Date.now() - 86_400_000).toISOString()

  const [logsResult, statsResult, groupsResult] = await Promise.all([
    logsQuery,
    supabaseAdmin
      .from('pixova_logs')
      .select('level, ai_priority, category')
      .gte('created_at', since24h),
    supabaseAdmin
      .from('pixova_log_groups')
      .select(
        'group_id, fingerprint, category, level, message, ai_priority, ' +
        'ai_root_cause, ai_suggested_fix, occurrence_count, affected_users, ' +
        'first_seen_at, last_seen_at, is_resolved, latest_log_id'
      )
      .eq('is_resolved', false)
      .order('occurrence_count', { ascending: false })
      .limit(20),
  ])

  // ── Build stats ──
  const allToday = (statsResult.data ?? []) as Array<{
    level: string
    ai_priority: string | null
    category: string
  }>

  const p0Count = allToday.filter(l => l.ai_priority === 'P0').length
  const p1Count = allToday.filter(l => l.ai_priority === 'P1').length
  const p2Count = allToday.filter(l => l.ai_priority === 'P2').length
  const totalToday = allToday.length
  const errorRate = allToday.filter(l => l.level === 'error').length

  const categoryMap: Record<string, number> = {}
  for (const l of allToday) {
    categoryMap[l.category] = (categoryMap[l.category] ?? 0) + 1
  }
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return successResponse({
    logs: logsResult.data ?? [],
    total: logsResult.count ?? 0,
    page,
    limit,
    has_more: (logsResult.count ?? 0) > page * limit,
    groups: groupsResult.data ?? [],
    stats: {
      p0_count: p0Count,
      p1_count: p1Count,
      p2_count: p2Count,
      total_today: totalToday,
      error_rate: errorRate,
      top_categories: topCategories,
    },
  })
}

// ─── PATCH — resolve a log ────────────────────
export async function PATCH(request: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return unauthorizedResponse('Admin access required')

  let body: { log_id?: string; resolved?: boolean; note?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON')
  }

  const { log_id, note } = body
  if (!log_id) return errorResponse('log_id required')

  // Update log
  await supabaseAdmin
    .from('pixova_logs')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: admin.email,
      resolution_note: note ?? null,
    })
    .eq('log_id', log_id)

  // Fetch fingerprint and update group
  const { data: logRow } = await supabaseAdmin
    .from('pixova_logs')
    .select('fingerprint')
    .eq('log_id', log_id)
    .single()

  if (logRow?.fingerprint) {
    await supabaseAdmin
      .from('pixova_log_groups')
      .update({ is_resolved: true })
      .eq('fingerprint', logRow.fingerprint)
  }

  return successResponse({ resolved: true })
}
