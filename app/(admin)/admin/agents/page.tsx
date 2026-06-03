'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface PipelineStat {
  pipeline: string
  runs: number
  success_rate: number
  avg_duration_ms: number
  total_cost_usd: number
}

interface RecentEvent {
  event_id: string
  event_type: string
  priority: string
  status: string
  created_at: string
  studio_name: string
}

interface TopStudio {
  studio_id: string
  studio_name: string
  tokens_used: number
  cost_usd: number
}

interface AgentStats {
  events_today: number
  pipelines_ran: number
  tokens_used: number
  cost_usd: number
  pipeline_stats: PipelineStat[]
  recent_events: RecentEvent[]
  top_studios: TopStudio[]
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCostINR(usd: number): string {
  const inr = usd * 83 // approximate USD→INR
  if (inr < 1) return `₹${(inr * 100).toFixed(1)}p`
  return `₹${inr.toFixed(2)}`
}

function priorityBadge(p: string) {
  const cls: Record<string, string> = {
    P0: 'bg-red-900/40 text-red-300 border-red-700',
    P1: 'bg-orange-900/40 text-orange-300 border-orange-700',
    P2: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    P3: 'bg-gray-800 text-gray-400 border-gray-700',
    P4: 'bg-gray-800 text-gray-500 border-gray-700',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono border ${cls[p] ?? cls.P4}`}>
      {p}
    </span>
  )
}

function statusDot(s: string) {
  const cls: Record<string, string> = {
    COMPLETED:  'bg-green-400',
    RUNNING:    'bg-blue-400 animate-pulse',
    FAILED:     'bg-red-400',
    SKIPPED:    'bg-gray-500',
    PENDING:    'bg-yellow-400',
    PROCESSING: 'bg-blue-400 animate-pulse',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${cls[s] ?? 'bg-gray-500'}`} />
}

function AdminAgentsContent() {
  const [data,    setData]    = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/agents')
      if (res.ok) {
        const json = await res.json() as { data: AgentStats }
        setData(json.data)
      }
    } catch {
      // silently fail — stale data is shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    timerRef.current = setInterval(() => fetchStats(true), 30_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchStats])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading platform stats…</div>
      </div>
    )
  }

  const stats = data ?? {
    events_today: 0, pipelines_ran: 0,
    tokens_used: 0,  cost_usd: 0,
    pipeline_stats: [], recent_events: [], top_studios: [],
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Platform</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time AI infrastructure overview · auto-refreshes every 30s</p>
        </div>
        <button
          onClick={() => fetchStats()}
          className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Events Today',   value: stats.events_today.toLocaleString() },
          { label: 'Pipelines Ran',  value: stats.pipelines_ran.toLocaleString() },
          { label: 'Tokens Used',    value: formatTokens(stats.tokens_used) },
          { label: 'Cost Today',     value: formatCostINR(stats.cost_usd) },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline performance table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Pipeline Performance</h2>
        </div>
        {stats.pipeline_stats.length === 0 ? (
          <p className="text-gray-500 text-sm px-4 py-6">No pipeline runs today yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left px-4 py-2">Pipeline</th>
                <th className="text-right px-4 py-2">Runs</th>
                <th className="text-right px-4 py-2">Avg Duration</th>
                <th className="text-right px-4 py-2">Success</th>
                <th className="text-right px-4 py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.pipeline_stats.map(p => (
                <tr key={p.pipeline} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-2.5 font-mono text-brand-400">{p.pipeline}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300">{p.runs}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">
                    {p.avg_duration_ms >= 1000
                      ? `${(p.avg_duration_ms / 1000).toFixed(1)}s`
                      : `${p.avg_duration_ms}ms`}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={p.success_rate >= 95 ? 'text-green-400' : p.success_rate >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                      {p.success_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{formatCostINR(p.total_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent events */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Events</h2>
          <span className="text-xs text-gray-500">{stats.recent_events.length} shown</span>
        </div>
        {stats.recent_events.length === 0 ? (
          <p className="text-gray-500 text-sm px-4 py-6">No events yet.</p>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {stats.recent_events.map(e => (
              <div key={e.event_id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800/30">
                <span className="mt-0.5">{statusDot(e.status)}</span>
                <span className="font-mono text-xs text-gray-400 w-28 shrink-0">{relativeTime(e.created_at)}</span>
                <span className="font-mono text-xs text-brand-400 flex-1 truncate">{e.event_type}</span>
                <span className="text-xs text-gray-500 truncate max-w-[140px]">{e.studio_name}</span>
                {priorityBadge(e.priority)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top studios */}
      {stats.top_studios.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">Top Studios by AI Usage</h2>
          </div>
          <div className="divide-y divide-gray-800/50">
            {stats.top_studios.map(s => (
              <div key={s.studio_id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="flex-1 text-sm text-gray-300 truncate">{s.studio_name}</span>
                <span className="text-xs text-gray-400 w-20 text-right">{formatTokens(s.tokens_used)} tokens</span>
                <span className="text-xs text-gray-500 w-14 text-right">{formatCostINR(s.cost_usd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminAgentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>}>
      <AdminAgentsContent />
    </Suspense>
  )
}
