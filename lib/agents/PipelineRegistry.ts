import 'server-only'
import type { PipelineHandler } from './types'

import { bookingPipeline }      from './pipelines/BookingPipeline'
import { galleryPipeline }      from './pipelines/GalleryPipeline'
import { paymentPipeline }      from './pipelines/PaymentPipeline'
import { subscriptionPipeline } from './pipelines/SubscriptionPipeline'
import { reviewPipeline }       from './pipelines/ReviewPipeline'
import { notificationPipeline } from './pipelines/NotificationPipeline'
import { adminPipeline }        from './pipelines/AdminPipeline'
import { marketplacePipeline }  from './pipelines/MarketplacePipeline'

export type { PipelineHandler }

// ── Registry ─────────────────────────────────────────────────
const PIPELINE_REGISTRY = new Map<string, PipelineHandler>([
  ['booking',      bookingPipeline],
  ['gallery',      galleryPipeline],
  ['payment',      paymentPipeline],
  ['subscription', subscriptionPipeline],
  ['review',       reviewPipeline],
  ['notification', notificationPipeline],
  ['admin',        adminPipeline],
  ['marketplace',  marketplacePipeline],
])

export function getPipeline(name: string): PipelineHandler | undefined {
  return PIPELINE_REGISTRY.get(name)
}

export function registerPipeline(name: string, handler: PipelineHandler): void {
  PIPELINE_REGISTRY.set(name, handler)
}

export function listPipelines(): string[] {
  return Array.from(PIPELINE_REGISTRY.keys())
}
