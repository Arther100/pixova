import 'server-only'

// ── Event type constants ──────────────────────────────────────
export const AGENT_EVENTS = {
  // Enquiry
  ENQUIRY_RECEIVED:        'enquiry.received',
  ENQUIRY_REPLIED:         'enquiry.replied',
  ENQUIRY_ACCEPTED:        'enquiry.accepted',
  ENQUIRY_DECLINED:        'enquiry.declined',
  // Booking
  BOOKING_CREATED:         'booking.created',
  BOOKING_CONFIRMED:       'booking.confirmed',
  BOOKING_APPROACHING:     'booking.approaching',
  BOOKING_COMPLETED:       'booking.completed',
  BOOKING_CANCELLED:       'booking.cancelled',
  BOOKING_STATUS_CHANGED:  'booking.status_changed',
  // Payment
  PAYMENT_RECEIVED:        'payment.received',
  PAYMENT_OVERDUE:         'payment.overdue',
  PAYMENT_FAILED:          'payment.failed',
  PAYMENT_LINK_CREATED:    'payment.link_created',
  // Gallery
  GALLERY_PHOTOS_UPLOADED: 'gallery.photos_uploaded',
  GALLERY_PUBLISHED:       'gallery.published',
  GALLERY_VIEWED:          'gallery.viewed',
  // Agreement
  AGREEMENT_GENERATED:     'agreement.generated',
  AGREEMENT_VIEWED:        'agreement.viewed',
  // Review
  REVIEW_SUBMITTED:        'review.submitted',
  REVIEW_REPLIED:          'review.replied',
  // Subscription
  TRIAL_ENDING:            'subscription.trial_ending',
  SUBSCRIPTION_EXPIRED:    'subscription.expired',
  SUBSCRIPTION_ACTIVATED:  'subscription.activated',
  CHURN_RISK_DETECTED:     'subscription.churn_risk',
  // Marketplace
  PROFILE_VIEWED:          'marketplace.profile_viewed',
  SEARCH_PERFORMED:        'marketplace.search_performed',
  STUDIO_SAVED:            'marketplace.studio_saved',
  // System
  ERROR_P0:                'system.error_p0',
  ERROR_P1:                'system.error_p1',
  PHOTOGRAPHER_INACTIVE:   'system.photographer_inactive',
} as const

export type AgentEventType = typeof AGENT_EVENTS[keyof typeof AGENT_EVENTS]

// ── Pipeline names ────────────────────────────────────────────
export const PIPELINES = {
  BOOKING:      'booking',
  GALLERY:      'gallery',
  PAYMENT:      'payment',
  SUBSCRIPTION: 'subscription',
  MARKETPLACE:  'marketplace',
  REVIEW:       'review',
  NOTIFICATION: 'notification',
  ADMIN:        'admin',
} as const

// ── Event → Pipeline routing map ──────────────────────────────
export const EVENT_PIPELINE_MAP: Partial<Record<
  AgentEventType,
  Array<{ pipeline: string; priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4'; async: boolean }>
>> = {
  'enquiry.received': [
    { pipeline: 'booking',      priority: 'P1', async: true },
    { pipeline: 'notification', priority: 'P1', async: true },
  ],
  'booking.confirmed': [
    { pipeline: 'booking',      priority: 'P1', async: true },
    { pipeline: 'notification', priority: 'P1', async: true },
  ],
  'booking.approaching': [
    { pipeline: 'booking',      priority: 'P2', async: true },
    { pipeline: 'notification', priority: 'P2', async: true },
  ],
  'gallery.photos_uploaded': [
    { pipeline: 'gallery', priority: 'P2', async: true },
  ],
  'gallery.published': [
    { pipeline: 'gallery',      priority: 'P2', async: true },
    { pipeline: 'notification', priority: 'P2', async: true },
  ],
  'payment.received': [
    { pipeline: 'payment',      priority: 'P1', async: true },
    { pipeline: 'notification', priority: 'P1', async: true },
  ],
  'payment.overdue': [
    { pipeline: 'payment', priority: 'P1', async: true },
  ],
  'review.submitted': [
    { pipeline: 'review', priority: 'P2', async: true },
  ],
  'subscription.trial_ending': [
    { pipeline: 'subscription', priority: 'P1', async: true },
  ],
  'subscription.churn_risk': [
    { pipeline: 'subscription', priority: 'P1', async: true },
  ],
  'marketplace.profile_viewed': [
    { pipeline: 'marketplace', priority: 'P3', async: true },
  ],
  'system.error_p0': [
    { pipeline: 'admin', priority: 'P0', async: false },
  ],
  'system.error_p1': [
    { pipeline: 'admin', priority: 'P1', async: true },
  ],
}

// ── Model configuration ───────────────────────────────────────
export const MODELS = {
  ORCHESTRATOR: 'claude-sonnet-4-20250514',
  WRITER:       'claude-sonnet-4-20250514',
  ANALYST:      'claude-sonnet-4-20250514',
  EXTRACTOR:    'claude-haiku-4-5-20251001',
  CLASSIFIER:   'claude-haiku-4-5-20251001',
  CRITIC:       'claude-haiku-4-5-20251001',
  ROUTER:       'claude-haiku-4-5-20251001',
} as const

export const MODEL_PRICING_USD: Record<string, { input_per_1m: number; output_per_1m: number }> = {
  'claude-sonnet-4-20250514':   { input_per_1m: 3.00,  output_per_1m: 15.00 },
  'claude-haiku-4-5-20251001':  { input_per_1m: 0.80,  output_per_1m: 4.00  },
}

export const AGENT_TOKEN_BUDGETS: Record<string, { input: number; output: number; temp: number }> = {
  orchestrator: { input: 1000, output: 400, temp: 0.2 },
  context:      { input: 600,  output: 250, temp: 0.1 },
  strategy:     { input: 700,  output: 300, temp: 0.3 },
  tone:         { input: 500,  output: 200, temp: 0.4 },
  writer:       { input: 900,  output: 450, temp: 0.7 },
  critic:       { input: 600,  output: 200, temp: 0.1 },
  classifier:   { input: 400,  output: 150, temp: 0.1 },
  sentiment:    { input: 400,  output: 150, temp: 0.1 },
  extractor:    { input: 500,  output: 200, temp: 0.1 },
  router:       { input: 300,  output: 150, temp: 0.1 },
  analyst:      { input: 800,  output: 350, temp: 0.3 },
  ranker:       { input: 600,  output: 250, temp: 0.2 },
}

export const PIPELINE_TOKEN_BUDGETS: Record<string, { max_input: number; max_output: number }> = {
  booking:      { max_input: 5000, max_output: 2000 },
  gallery:      { max_input: 8000, max_output: 3000 },
  payment:      { max_input: 3000, max_output: 1000 },
  subscription: { max_input: 4000, max_output: 1500 },
  marketplace:  { max_input: 4000, max_output: 1500 },
  review:       { max_input: 2000, max_output: 800  },
  notification: { max_input: 1000, max_output: 400  },
  admin:        { max_input: 2000, max_output: 800  },
}

export const STUDIO_DAILY_LIMITS: Record<string, number> = {
  trial:        50_000,
  starter:      75_000,
  professional: 200_000,
  studio:       500_000,
}

export const PLATFORM_DAILY_LIMIT = 10_000_000
