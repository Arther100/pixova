// ============================================
// GET /api/v1/cron/send-reminders — Event reminder cron
// Auth: x-cron-secret header (not photographer JWT)
// Vercel Cron: 0 3 * * * (3 AM UTC = 8:30 AM IST)
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { notifyEventReminder } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Calculate tomorrow's date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const tomorrow = new Date(istNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Find bookings happening tomorrow
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_ref,
        event_type,
        event_date,
        venue,
        city,
        balance_amount,
        photographer_id,
        client_id
      `)
      .eq('event_date', tomorrowDate)
      .in('status', ['confirmed', 'in_progress']);

    if (bErr) {
      console.error('[cron/reminders] query error:', bErr);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    const results = { processed: 0, sent: 0, skipped: 0, failed: 0 };

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: true, ...results });
    }

    // Get event reminder campaign name
    const reminderCampaign = process.env.AISENSY_CAMPAIGN_EVENT_REMINDER_CLIENT
      || process.env.AISENSY_CAMPAIGN_EVENT_REMINDER
      || 'event_reminder_client';

    for (const booking of bookings) {
      results.processed++;

      // Get studio profile
      const { data: studio } = await supabase
        .from('studio_profiles')
        .select('id, name, phone')
        .eq('photographer_id', booking.photographer_id)
        .single();

      if (!studio) {
        results.failed++;
        continue;
      }

      // Check if reminder already sent in last 23 hours (idempotency)
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('whatsapp_notifications')
        .select('notification_id')
        .eq('booking_id', booking.id)
        .eq('campaign_name', reminderCampaign)
        .gte('created_at', twentyThreeHoursAgo)
        .limit(1)
        .maybeSingle();

      if (existing) {
        results.skipped++;
        continue;
      }

      // Get client details
      const { data: client } = await supabase
        .from('clients')
        .select('name, phone')
        .eq('id', booking.client_id)
        .single();

      if (!client) {
        results.failed++;
        continue;
      }

      try {
        await notifyEventReminder({
          studioId: studio.id,
          bookingId: booking.id,
          bookingRef: booking.booking_ref || booking.id.slice(0, 8).toUpperCase(),
          eventType: booking.event_type || 'Event',
          eventDate: booking.event_date || new Date().toISOString(),
          venueName: booking.venue || null,
          venueCity: booking.city || null,
          clientName: client.name,
          clientMobile: client.phone,
          photographerMobile: studio.phone,
          balanceAmount: booking.balance_amount ?? 0,
        });
        results.sent++;
      } catch (err) {
        console.error(`[cron/reminders] Failed for booking ${booking.id}:`, err);
        results.failed++;
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    console.error('[cron/reminders] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
