import type { TokenTracker } from './TokenTracker'

export interface StudioAIMemory {
  memory_id: string | null
  studio_id: string
  communication_tone: string
  uses_emoji: boolean
  typical_reply_length: string
  language_style: string
  common_phrases: string[]
  avg_response_time_hours: number | null
  conversion_rate_pct: number | null
  avg_booking_value: number | null
  peak_booking_months: number[]
  top_event_types: string[]
  typical_client_budget_min: number | null
  typical_client_budget_max: number | null
  enquiries_received: number
  enquiries_replied: number
  bookings_converted: number
  ai_drafts_used: number
  ai_drafts_edited: number
  tokens_used_today: number
  tokens_used_month: number
  daily_token_limit: number
}

export interface ProcessedEvent {
  event_id: string
  event_type: string
  studio_id: string | null
  photographer_id: string | null
  client_id: string | null
  account_id: string | null
  payload: Record<string, unknown>
  priority: string
  context: {
    studio: Record<string, unknown> | null
    photographer: Record<string, unknown> | null
    subscription: Record<string, unknown> | null
    memory: StudioAIMemory | null
    plan: string
  }
}

export interface PipelineResult {
  success: boolean
  output: Record<string, unknown>
  agents_ran: string[]
  agents_skipped: string[]
  error?: string
}

export type PipelineHandler = (
  event: ProcessedEvent,
  tracker: TokenTracker,
  memory: StudioAIMemory | null
) => Promise<PipelineResult>
