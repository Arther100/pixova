'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// ─── Types ────────────────────────────────────
interface PixovaLog {
  log_id: string
  level: string
  category: string
  message: string
  route: string | null
  method: string | null
  status_code: number | null
  duration_ms: number | null
  photographer_id: string | null
  user_phone: string | null
  user_role: string | null
  error_code: string | null
  error_type: string | null
  stack_trace: string | null
  request_body: Record<string, unknown> | null
  ai_severity: number | null
  ai_priority: string | null
  ai_root_cause: string | null
  ai_suggested_fix: string | null
  ai_affected_users: number | null
  ai_summary: string | null
  ai_analysed_at: string | null
  is_resolved: boolean
  resolved_at: string | null
  resolution_note: string | null
  alert_sent: boolean
  fingerprint: string | null
  occurrence_count: number
  first_seen_at: string
  created_at: string
}

interface LogGroup {
  group_id: string
  fingerprint: string | null
  category: string | null
  level: string | null
  message: string | null
  ai_priority: string | null
  ai_root_cause: string | null
  ai_suggested_fix: string | null
  occurrence_count: number
  affected_users: number
  first_seen_at: string
  last_seen_at: string
  is_resolved: boolean
  latest_log_id: string | null
}

interface Stats {
  p0_count: number
  p1_count: number
  p2_count: number
  total_today: number
  error_rate: number
  top_categories: Array<{ name: string; count: number }>
}

interface ApiResponse {
  logs: PixovaLog[]
  total: number
  groups: LogGroup[]
  stats: Stats
  has_more: boolean
}

// ─── Constants ────────────────────────────────
const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  P1: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  P2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  P3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  P4: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

const LEVEL_STYLES: Record<string, string> = {
  error: 'text-red-600 dark:text-red-400 font-semibold',
  warn:  'text-orange-600 dark:text-orange-400 font-semibold',
  info:  'text-blue-600 dark:text-blue-400',
  debug: 'text-gray-500 dark:text-gray-500',
}

function maskPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 12) return digits.slice(0, 5) + ' ****' + digits.slice(-2)
  if (digits.length >= 10) return digits.slice(0, 5) + '*****'
  return phone
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} d ago`
}

// ─── Log detail modal ─────────────────────────
function LogDetailModal({
  log,
  onClose,
  onResolved,
}: {
  log: PixovaLog
  onClose: () => void
  onResolved: () => void
}) {
  const [note, setNote] = useState('')
  const [resolving, setResolving] = useState(false)
  const [stackOpen, setStackOpen] = useState(false)

  const handleResolve = async () => {
    setResolving(true)
    await fetch('/api/v1/admin/logs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: log.log_id, resolved: true, note }),
    })
    setResolving(false)
    onResolved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Log Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${LEVEL_STYLES[log.level]}`}>
              {log.level.toUpperCase()}
            </span>
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
              {log.category}
            </span>
            {log.ai_priority && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${PRIORITY_STYLES[log.ai_priority]}`}>
                {log.ai_priority}
              </span>
            )}
            <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('en-IN')}</span>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-800 dark:text-gray-200 font-mono break-words">{log.message}</p>

          {/* Route + status */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            {log.route && <span>Route: <code className="text-gray-700 dark:text-gray-300">{log.method} {log.route}</code></span>}
            {log.status_code && <span>Status: <code>{log.status_code}</code></span>}
            {log.duration_ms != null && <span>Duration: {log.duration_ms}ms</span>}
          </div>

          {/* AI analysis */}
          {log.ai_priority && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">AI Analysis</p>
              <p className="text-sm text-gray-800 dark:text-gray-200"><strong>Summary:</strong> {log.ai_summary}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Root cause:</strong> {log.ai_root_cause}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Fix:</strong> {log.ai_suggested_fix}</p>
              {log.ai_affected_users != null && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Affected users: {log.ai_affected_users}</p>
              )}
            </div>
          )}

          {/* User context */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>Phone: {maskPhone(log.user_phone)}</div>
            <div>Role: {log.user_role ?? '—'}</div>
            {log.error_code && <div className="col-span-2">Error code: <code>{log.error_code}</code></div>}
          </div>

          {/* Stack trace */}
          {log.stack_trace && (
            <div>
              <button
                onClick={() => setStackOpen(o => !o)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {stackOpen ? '▼ Hide' : '▶ Show'} stack trace
              </button>
              {stackOpen && (
                <pre className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
                  {log.stack_trace}
                </pre>
              )}
            </div>
          )}

          {/* Request body */}
          {log.request_body && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Request body (sanitised)</p>
              <pre className="text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded p-3 overflow-x-auto">
                {JSON.stringify(log.request_body, null, 2)}
              </pre>
            </div>
          )}

          {/* Occurrences */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Occurrences: {log.occurrence_count} · First seen: {relativeTime(log.first_seen_at)}
          </p>

          {/* Resolve */}
          {!log.is_resolved && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Resolution note (optional)..."
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                rows={2}
              />
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium"
              >
                {resolving ? 'Resolving...' : 'Mark Resolved'}
              </button>
            </div>
          )}
          {log.is_resolved && (
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <span>✓ Resolved</span>
              {log.resolved_at && <span>· {relativeTime(log.resolved_at)}</span>}
              {log.resolution_note && <span>· {log.resolution_note}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────
export default function AdminLogsPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<PixovaLog | null>(null)

  // Filters
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const params = new URLSearchParams()
    if (level)    params.set('level', level)
    if (category) params.set('category', category)
    if (priority) params.set('priority', priority)
    if (search)   params.set('search', search)
    params.set('page', String(page))
    params.set('limit', '50')

    const res = await fetch(`/api/v1/admin/logs?${params}`)
    const json = await res.json()
    if (json.success) setData(json.data)
    if (!silent) setLoading(false)
  }, [level, category, priority, search, page])

  // Initial fetch + auto-open log from URL param
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Open log from URL ?id=xxx
  useEffect(() => {
    const id = searchParams.get('id')
    if (id && data?.logs) {
      const found = data.logs.find(l => l.log_id === id)
      if (found) setSelectedLog(found)
    }
  }, [searchParams, data])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshTimer.current = setInterval(() => fetchLogs(true), 30_000)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [fetchLogs])

  const stats = data?.stats

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pixova Logs</h1>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          Live · refreshes every 30s
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="🔴 P0 Critical" value={stats?.p0_count ?? 0} urgent={!!stats?.p0_count} />
        <StatCard label="🟠 P1 High"     value={stats?.p1_count ?? 0} urgent={!!stats?.p1_count} />
        <StatCard label="🟡 P2 Medium"   value={stats?.p2_count ?? 0} />
        <StatCard label="📊 Total today" value={stats?.total_today ?? 0} />
      </div>

      {/* Active issues (unresolved groups) */}
      {(data?.groups ?? []).length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Active Issues
          </h2>
          <div className="space-y-3">
            {data!.groups.slice(0, 5).map(group => (
              <div
                key={group.group_id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                onClick={() => {
                  if (group.latest_log_id) {
                    const log = data?.logs.find(l => l.log_id === group.latest_log_id)
                    if (log) setSelectedLog(log)
                  }
                }}
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {group.ai_priority && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${PRIORITY_STYLES[group.ai_priority]}`}>
                      {group.ai_priority}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                    {group.category}
                  </span>
                  <span className="text-xs text-gray-400">{relativeTime(group.last_seen_at)}</span>
                  <span className="text-xs text-gray-400 ml-auto">{group.occurrence_count}x · {group.affected_users} user(s)</span>
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{group.message}</p>
                {group.ai_root_cause && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Root cause: {group.ai_root_cause}</p>
                )}
                {group.ai_suggested_fix && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fix: {group.ai_suggested_fix}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={level}
            onChange={e => { setLevel(e.target.value); setPage(1) }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All levels</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All categories</option>
            {['auth','booking','payment','gallery','whatsapp','subscription','portal','api','cron','marketplace','admin','system'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1) }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All priorities</option>
            {['P0','P1','P2','P3','P4'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search messages..."
            className="flex-1 min-w-48 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            All Logs {data ? `(${data.total} total)` : ''}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : (data?.logs ?? []).length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No logs found</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data!.logs.map(log => (
              <div
                key={log.log_id}
                onClick={() => setSelectedLog(log)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              >
                <span className="text-xs font-mono text-gray-400 w-16 shrink-0 mt-0.5">
                  {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`text-xs w-12 shrink-0 ${LEVEL_STYLES[log.level]}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded w-24 shrink-0 truncate">
                  {log.category}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                  {log.message}
                </span>
                {log.ai_priority && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${PRIORITY_STYLES[log.ai_priority]}`}>
                    {log.ai_priority}
                  </span>
                )}
                {log.is_resolved && (
                  <span className="text-xs text-green-600 dark:text-green-400 shrink-0">✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 50 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-gray-500 dark:text-gray-400">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data.has_more}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onResolved={fetchLogs}
        />
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────
function StatCard({
  label,
  value,
  urgent = false,
}: {
  label: string
  value: number
  urgent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 bg-white dark:bg-gray-900 ${urgent ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${urgent ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  )
}
