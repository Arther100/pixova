import 'server-only'
import { createSupabaseAdmin } from '@/lib/supabase'
import { AGENT_EVENTS, EVENT_PIPELINE_MAP, type AgentEventType } from './config'
import { processPipeline } from './PipelineProcessor'

export interface AgentEvent<T = Record<string, unknown>> {
  event_type:      AgentEventType
  studio_id?:      string
  photographer_id?: string
  client_id?:      string
  account_id?:     string
  payload:         T
  priority?:       'P0' | 'P1' | 'P2' | 'P3' | 'P4'
}

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4'] as const

export async function emitEvent<T = Record<string, unknown>>(
  event: AgentEvent<T>
): Promise<string | null> {
  try {
    const pipelines = EVENT_PIPELINE_MAP[event.event_type] ?? []

    const derivedPriority = pipelines.reduce<string>((highest, p) => {
      return PRIORITY_ORDER.indexOf(p.priority) < PRIORITY_ORDER.indexOf(highest as typeof PRIORITY_ORDER[number])
        ? p.priority
        : highest
    }, 'P4')

    const priority = event.priority ?? (derivedPriority as 'P0' | 'P1' | 'P2' | 'P3' | 'P4')

    const supabaseAdmin = createSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.from('agent_events') as any)
      .insert({
        event_type:          event.event_type,
        studio_id:           event.studio_id      ?? null,
        photographer_id:     event.photographer_id ?? null,
        client_id:           event.client_id       ?? null,
        account_id:          event.account_id      ?? null,
        payload:             event.payload as Record<string, unknown>,
        priority,
        pipelines_triggered: pipelines.map(p => p.pipeline),
      })
      .select('event_id')
      .single()

    if (error || !data) return null

    const syncPipelines  = pipelines.filter(p => !p.async)
    const asyncPipelines = pipelines.filter(p => p.async)

    // Sync execution blocks (P0 only)
    for (const p of syncPipelines) {
      await processPipeline(data.event_id, p.pipeline)
    }

    // Async fire-and-forget
    if (asyncPipelines.length > 0) {
      void fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/agents/process`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'x-agent-secret': process.env.CRON_SECRET!,
          },
          body: JSON.stringify({
            event_id:  data.event_id,
            pipelines: asyncPipelines.map(p => p.pipeline),
          }),
        }
      )
    }

    return data.event_id as string
  } catch {
    // EventBus NEVER throws — silently fail to never break the app
    return null
  }
}

// ── Convenience emitters ──────────────────────────────────────
export const emit = {
  enquiryReceived: (params: {
    studioId: string
    photographerId: string
    enquiryId: string
    enquiryStudioId: string
    clientName: string
    eventType: string
    eventDate: string
    eventCity: string
    budgetMin?: number
    budgetMax?: number
    message?: string
  }) => emitEvent({
    event_type:      AGENT_EVENTS.ENQUIRY_RECEIVED,
    studio_id:       params.studioId,
    photographer_id: params.photographerId,
    payload:         params as unknown as Record<string, unknown>,
    priority:        'P1',
  }),

  bookingConfirmed: (params: {
    studioId: string
    photographerId: string
    bookingId: string
    bookingRef: string
    clientName: string
    clientPhone: string
    eventType: string
    eventDate: string
    totalAmount: number
  }) => emitEvent({
    event_type:      AGENT_EVENTS.BOOKING_CONFIRMED,
    studio_id:       params.studioId,
    photographer_id: params.photographerId,
    payload:         params as unknown as Record<string, unknown>,
    priority:        'P1',
  }),

  photosUploaded: (params: {
    studioId: string
    photographerId: string
    bookingId: string
    galleryId: string
    photoCount: number
    totalSizeBytes: number
    photoIds: string[]
  }) => emitEvent({
    event_type:      AGENT_EVENTS.GALLERY_PHOTOS_UPLOADED,
    studio_id:       params.studioId,
    photographer_id: params.photographerId,
    payload:         params as unknown as Record<string, unknown>,
    priority:        'P2',
  }),

  paymentReceived: (params: {
    studioId: string
    photographerId: string
    bookingId: string
    amount: number
    balanceRemaining: number
    receiptNumber: string
  }) => emitEvent({
    event_type:      AGENT_EVENTS.PAYMENT_RECEIVED,
    studio_id:       params.studioId,
    photographer_id: params.photographerId,
    payload:         params as unknown as Record<string, unknown>,
    priority:        'P1',
  }),

  reviewSubmitted: (params: {
    studioId: string
    photographerId?: string
    bookingId: string
    rating: number
    reviewText?: string
    eventType?: string
  }) => emitEvent({
    event_type:      AGENT_EVENTS.REVIEW_SUBMITTED,
    studio_id:       params.studioId,
    photographer_id: params.photographerId,
    payload:         params as unknown as Record<string, unknown>,
    priority:        'P2',
  }),

  trialEnding: (params: {
    studioId: string
    photographerId: string
    daysLeft: number
    bookingsCreated: number
    galleriesCreated: number
  }) => emitEvent({
    event_type:      AGENT_EVENTS.TRIAL_ENDING,
    studio_id:       params.studioId,
    photographer_id: params.photographerId,
    payload:         params as unknown as Record<string, unknown>,
    priority:        'P1',
  }),

  profileViewed: (params: {
    studioId: string
    viewerAccountId?: string
    viewerCity?: string
    referrer?: string
  }) => emitEvent({
    event_type: AGENT_EVENTS.PROFILE_VIEWED,
    studio_id:  params.studioId,
    payload:    params as unknown as Record<string, unknown>,
    priority:   'P3',
  }),
}
