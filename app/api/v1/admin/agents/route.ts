export const dynamic = 'force-dynamic'

import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabase'
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-helpers'

async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = cookies()
  const token = cookieStore.get('pixova_admin_session')?.value
  if (!token) return false
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) return unauthorizedResponse()

    const supabase = createSupabaseAdmin()
    const today    = new Date().toISOString().split('T')[0]
    const dayStart = `${today}T00:00:00.000Z`

    // ── Parallel queries ──────────────────────────────────────
    const [eventsRes, pipelineRes, tokenRes, recentRes, topStudiosRes] = await Promise.all([
      // Events today
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('agent_events') as any)
        .select('event_id', { count: 'exact', head: true })
        .gte('created_at', dayStart),

      // Pipeline runs today with per-pipeline stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('agent_pipeline_runs') as any)
        .select('pipeline_name, status, duration_ms, total_input_tokens, total_output_tokens, total_cost_usd')
        .gte('started_at', dayStart),

      // Token budget totals today
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('token_budget_registry') as any)
        .select('tokens_used, cost_usd')
        .eq('date', today),

      // Recent events (last 20)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('agent_events') as any)
        .select(`
          event_id, event_type, priority, status, created_at,
          studio_id
        `)
        .order('created_at', { ascending: false })
        .limit(20),

      // Top studios by token usage today
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('token_budget_registry') as any)
        .select('studio_id, tokens_used, cost_usd')
        .eq('date', today)
        .order('tokens_used', { ascending: false })
        .limit(10),
    ])

    // ── Aggregate pipeline stats ──────────────────────────────
    const runs  = (pipelineRes.data ?? []) as Array<{
      pipeline_name: string
      status: string
      duration_ms: number | null
      total_input_tokens: number
      total_output_tokens: number
      total_cost_usd: number
    }>

    const pipelineMap: Record<string, {
      runs: number
      completed: number
      total_duration: number
      total_cost: number
    }> = {}

    for (const run of runs) {
      if (!pipelineMap[run.pipeline_name]) {
        pipelineMap[run.pipeline_name] = { runs: 0, completed: 0, total_duration: 0, total_cost: 0 }
      }
      const p = pipelineMap[run.pipeline_name]
      p.runs++
      if (run.status === 'COMPLETED') p.completed++
      p.total_duration += run.duration_ms ?? 0
      p.total_cost     += run.total_cost_usd ?? 0
    }

    const pipeline_stats = Object.entries(pipelineMap).map(([name, s]) => ({
      pipeline:      name,
      runs:          s.runs,
      success_rate:  s.runs > 0 ? Math.round((s.completed / s.runs) * 100) : 0,
      avg_duration_ms: s.runs > 0 ? Math.round(s.total_duration / s.runs) : 0,
      total_cost_usd: s.total_cost,
    }))

    // ── Token totals ──────────────────────────────────────────
    const tokenRows = (tokenRes.data ?? []) as Array<{ tokens_used: number; cost_usd: number }>
    const tokens_used = tokenRows.reduce((s, r) => s + (r.tokens_used ?? 0), 0)
    const cost_usd    = tokenRows.reduce((s, r) => s + (r.cost_usd    ?? 0), 0)

    // ── Enrich recent events with studio names ────────────────
    const recent = (recentRes.data ?? []) as Array<{
      event_id: string
      event_type: string
      priority: string
      status: string
      created_at: string
      studio_id: string | null
    }>

    const studioIds = Array.from(new Set(recent.map(e => e.studio_id).filter(Boolean))) as string[]
    const studioNames: Record<string, string> = {}
    if (studioIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: studios } = await (supabase.from('studio_profiles') as any)
        .select('id, name')
        .in('id', studioIds)
      if (studios) {
        for (const s of studios as Array<{ id: string; name: string }>) {
          studioNames[s.id] = s.name
        }
      }
    }

    const recent_events = recent.map(e => ({
      event_id:    e.event_id,
      event_type:  e.event_type,
      priority:    e.priority,
      status:      e.status,
      created_at:  e.created_at,
      studio_name: e.studio_id ? (studioNames[e.studio_id] ?? 'Unknown') : 'System',
    }))

    // ── Top studios ───────────────────────────────────────────
    const topRows = (topStudiosRes.data ?? []) as Array<{
      studio_id: string
      tokens_used: number
      cost_usd: number
    }>
    const topStudioIds = topRows.map(r => r.studio_id)
    const topStudioNames: Record<string, string> = {}
    if (topStudioIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tStudios } = await (supabase.from('studio_profiles') as any)
        .select('id, name')
        .in('id', topStudioIds)
      if (tStudios) {
        for (const s of tStudios as Array<{ id: string; name: string }>) {
          topStudioNames[s.id] = s.name
        }
      }
    }

    const top_studios = topRows.map(r => ({
      studio_id:   r.studio_id,
      studio_name: topStudioNames[r.studio_id] ?? 'Unknown',
      tokens_used: r.tokens_used,
      cost_usd:    r.cost_usd,
    }))

    return successResponse({
      events_today:   eventsRes.count ?? 0,
      pipelines_ran:  runs.length,
      tokens_used,
      cost_usd,
      pipeline_stats,
      recent_events,
      top_studios,
    })
  } catch (err) {
    console.error('[admin/agents] GET error:', err)
    return serverErrorResponse()
  }
}
