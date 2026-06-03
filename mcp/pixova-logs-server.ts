#!/usr/bin/env node
// ============================================
// mcp/pixova-logs-server.ts
// MCP server for querying Pixova logs from Claude Desktop
// Usage: npx tsx mcp/pixova-logs-server.ts
// ============================================

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase client ──────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tool definitions ─────────────────────────
const tools: Tool[] = [
  {
    name: 'get_recent_errors',
    description: 'Get recent errors from Pixova logs',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of logs to return (default 20)' },
        level: { type: 'string', enum: ['error', 'warn', 'info', 'debug'], description: 'Filter by log level' },
        category: { type: 'string', description: 'Filter by category (auth, booking, payment, gallery, whatsapp, etc.)' },
        hours: { type: 'number', description: 'Lookback window in hours (default 24)' },
      },
    },
  },
  {
    name: 'get_error_by_id',
    description: 'Get full details of a specific log entry',
    inputSchema: {
      type: 'object',
      properties: {
        log_id: { type: 'string', description: 'UUID of the log entry' },
      },
      required: ['log_id'],
    },
  },
  {
    name: 'search_errors',
    description: 'Search log entries by message text or route',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for in log messages' },
        from_date: { type: 'string', description: 'ISO date string start (optional)' },
        to_date: { type: 'string', description: 'ISO date string end (optional)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_user_errors',
    description: 'Get all errors for a specific user (photographer)',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'User phone number' },
        photographer_id: { type: 'string', description: 'Photographer UUID' },
        hours: { type: 'number', description: 'Lookback window in hours (default 24)' },
      },
    },
  },
  {
    name: 'get_error_stats',
    description: 'Get error statistics, trends, and top issues',
    inputSchema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Lookback window in hours (default 24)' },
      },
    },
  },
  {
    name: 'resolve_error',
    description: 'Mark a log entry as resolved',
    inputSchema: {
      type: 'object',
      properties: {
        log_id: { type: 'string', description: 'UUID of the log entry to resolve' },
        resolution_note: { type: 'string', description: 'Note explaining the resolution' },
      },
      required: ['log_id', 'resolution_note'],
    },
  },
]

// ─── Server setup ─────────────────────────────
const server = new Server(
  { name: 'pixova-logs', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input = (args ?? {}) as Record<string, any>

  try {
    switch (name) {
      case 'get_recent_errors': {
        const limit = input.limit ?? 20
        const hours = input.hours ?? 24
        const since = new Date(Date.now() - hours * 3_600_000).toISOString()

        let query = supabase
          .from('pixova_logs')
          .select('log_id, level, category, message, route, status_code, ai_priority, ai_summary, ai_root_cause, ai_suggested_fix, photographer_id, user_phone, created_at, is_resolved')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (input.level) query = query.eq('level', input.level)
        if (input.category) query = query.eq('category', input.category)

        const { data, error } = await query
        if (error) throw error
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
      }

      case 'get_error_by_id': {
        const { data, error } = await supabase
          .from('pixova_logs')
          .select('*')
          .eq('log_id', input.log_id)
          .single()
        if (error) throw error
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
      }

      case 'search_errors': {
        let query = supabase
          .from('pixova_logs')
          .select('log_id, level, category, message, route, status_code, ai_priority, ai_summary, created_at, is_resolved')
          .ilike('message', `%${input.query}%`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (input.from_date) query = query.gte('created_at', input.from_date)
        if (input.to_date) query = query.lte('created_at', input.to_date)

        const { data, error } = await query
        if (error) throw error
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
      }

      case 'get_user_errors': {
        const hours = input.hours ?? 24
        const since = new Date(Date.now() - hours * 3_600_000).toISOString()

        let query = supabase
          .from('pixova_logs')
          .select('log_id, level, category, message, route, status_code, ai_priority, ai_summary, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(100)

        if (input.phone) query = query.eq('user_phone', input.phone)
        if (input.photographer_id) query = query.eq('photographer_id', input.photographer_id)

        const { data, error } = await query
        if (error) throw error
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
      }

      case 'get_error_stats': {
        const hours = input.hours ?? 24
        const since = new Date(Date.now() - hours * 3_600_000).toISOString()

        const [
          { data: allLogs },
          { data: groups },
          { data: unresolvedCritical },
        ] = await Promise.all([
          supabase
            .from('pixova_logs')
            .select('level, category, ai_priority, created_at')
            .gte('created_at', since),
          supabase
            .from('pixova_log_groups')
            .select('fingerprint, category, level, message, ai_priority, occurrence_count, affected_users, is_resolved')
            .eq('is_resolved', false)
            .order('occurrence_count', { ascending: false })
            .limit(5),
          supabase
            .from('pixova_logs')
            .select('log_id, ai_priority', { count: 'exact', head: false })
            .in('ai_priority', ['P0', 'P1'])
            .eq('is_resolved', false),
        ])

        const byCategory: Record<string, number> = {}
        const byPriority: Record<string, number> = {}
        let totalErrors = 0
        let totalWarns = 0

        for (const log of allLogs ?? []) {
          if (log.level === 'error') totalErrors++
          if (log.level === 'warn') totalWarns++
          byCategory[log.category] = (byCategory[log.category] ?? 0) + 1
          if (log.ai_priority) byPriority[log.ai_priority] = (byPriority[log.ai_priority] ?? 0) + 1
        }

        const stats = {
          period_hours: hours,
          total_logs: (allLogs ?? []).length,
          total_errors: totalErrors,
          total_warns: totalWarns,
          by_category: byCategory,
          by_priority: byPriority,
          unresolved_critical: (unresolvedCritical ?? []).length,
          top_groups: groups ?? [],
        }

        return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] }
      }

      case 'resolve_error': {
        const { error } = await supabase
          .from('pixova_logs')
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_note: input.resolution_note,
          })
          .eq('log_id', input.log_id)

        if (error) throw error
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }
  }
})

// ─── Start ────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[pixova-logs MCP] Server running on stdio')
}

main().catch((err) => {
  console.error('[pixova-logs MCP] Fatal error:', err)
  process.exit(1)
})
