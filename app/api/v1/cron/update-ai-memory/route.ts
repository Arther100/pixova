export const dynamic = 'force-dynamic'

// ============================================
// GET /api/v1/cron/update-ai-memory
// Auth: x-cron-secret header
// Schedule: 0 2 * * * (2 AM UTC = 7:30 AM IST)
//
// Nightly update of studio_ai_memory and platform_ai_memory
// from real usage patterns across all active studios.
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  const today    = new Date().toISOString().split('T')[0]

  const results = { studios_updated: 0, platform_updated: false, errors: 0 }

  try {
    // ── 1. Get all active studios ─────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studios } = await (supabase.from('studio_profiles') as any)
      .select('id, photographer_id, name')
      .eq('is_listed', true)

    if (!studios || studios.length === 0) {
      return NextResponse.json({ success: true, ...results })
    }

    // ── 2. Update each studio's AI memory ─────────────────────
    for (const studio of studios as Array<{ id: string; photographer_id: string; name: string }>) {
      try {
        await updateStudioMemory(supabase, studio.id, studio.photographer_id, today)
        results.studios_updated++
      } catch (err) {
        console.error(`[update-ai-memory] studio ${studio.id} error:`, err)
        results.errors++
      }
    }

    // ── 3. Update platform-level AI memory ────────────────────
    await updatePlatformMemory(supabase)
    results.platform_updated = true

    console.log(`[update-ai-memory] Done: ${results.studios_updated} studios updated`)
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error('[update-ai-memory] fatal error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── Per-studio memory update ──────────────────────────────────
async function updateStudioMemory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  studioId: string,
  photographerId: string,
  today: string
): Promise<void> {
  const sixMonthsAgo   = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch key metrics in parallel
  const [enquiriesRes, bookingsRes] = await Promise.all([
    // Enquiry stats (last 6 months)
    supabase
      .from('enquiry_studios')
      .select('id, status, created_at')
      .eq('studio_id', studioId)
      .gte('created_at', sixMonthsAgo),

    // Booking stats (last 12 months)
    supabase
      .from('bookings')
      .select('id, total_amount, event_type, event_date, status')
      .eq('photographer_id', photographerId)
      .in('status', ['confirmed', 'completed', 'in_progress', 'delivered'])
      .gte('created_at', twelveMonthsAgo),
  ])

  const enquiries = enquiriesRes.data ?? []
  const bookings  = bookingsRes.data  ?? []

  // Calculate metrics
  const totalEnquiries   = enquiries.length
  const repliedEnquiries = enquiries.filter((e: { status: string }) =>
    ['ACCEPTED', 'DECLINED', 'REPLIED'].includes(e.status)
  ).length

  const conversionRate = totalEnquiries > 0
    ? Math.round((bookings.length / totalEnquiries) * 10000) / 100
    : null

  const avgBookingValue = bookings.length > 0
    ? Math.round(
        bookings.reduce((s: number, b: { total_amount: number }) => s + (b.total_amount ?? 0), 0)
        / bookings.length
      )
    : null

  // Peak booking months
  const monthCounts: Record<number, number> = {}
  for (const b of bookings as Array<{ event_date: string }>) {
    if (!b.event_date) continue
    const month = new Date(b.event_date).getMonth() + 1
    monthCounts[month] = (monthCounts[month] ?? 0) + 1
  }
  const peakMonths = Object.entries(monthCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([m]) => parseInt(m))

  // Top event types
  const typeCounts: Record<string, number> = {}
  for (const b of bookings as Array<{ event_type: string | null }>) {
    if (!b.event_type) continue
    typeCounts[b.event_type] = (typeCounts[b.event_type] ?? 0) + 1
  }
  const topEventTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([t]) => t)

  // Upsert studio_ai_memory
  await supabase
    .from('studio_ai_memory')
    .upsert({
      studio_id:            studioId,
      enquiries_received:   totalEnquiries,
      enquiries_replied:    repliedEnquiries,
      bookings_converted:   bookings.length,
      conversion_rate_pct:  conversionRate,
      avg_booking_value:    avgBookingValue,
      peak_booking_months:  peakMonths,
      top_event_types:      topEventTypes,
      tokens_used_today:    0,          // reset daily counter
      tokens_reset_date:    today,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'studio_id' })
}

// ── Platform-level memory update ─────────────────────────────
async function updatePlatformMemory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<void> {
  const now = new Date().toISOString()

  // Avg response time benchmark across all studios
  const { data: memData } = await supabase
    .from('studio_ai_memory')
    .select('avg_response_time_hours')
    .not('avg_response_time_hours', 'is', null)

  const allTimes = ((memData ?? []) as Array<{ avg_response_time_hours: number }>)
    .map(m => m.avg_response_time_hours)
    .filter(t => t != null && t > 0)

  const platformAvgResponse = allTimes.length > 0
    ? Math.round((allTimes.reduce((s, t) => s + t, 0) / allTimes.length) * 10) / 10
    : 4

  await supabase
    .from('platform_ai_memory')
    .upsert([
      { key: 'avg_response_time_benchmark', value: { hours: platformAvgResponse }, updated_at: now },
    ], { onConflict: 'key' })
}
