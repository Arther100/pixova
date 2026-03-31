// ============================================
// GET /api/v1/cron/send-reminders — Event reminder cron
// Auth: x-cron-secret header (not photographer JWT)
// Vercel Cron: 0 3 * * * (3 AM UTC = 8:30 AM IST)
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { notifyEventReminder } from '@/lib/notifications';
import { logSubscriptionEvent } from '@/lib/adminAuth';
import { sendAndLog } from '@/lib/notifications';
import { formatMobileForWhatsApp } from '@/lib/aisensy';

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

    // Process subscription expiry on each cron run
    await processSubscriptionExpiry(supabase);

    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    console.error('[cron/reminders] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── Separate cron endpoint for subscription expiry ───
export async function PUT(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdmin();

  // Also process subscription expiry every time the event reminder cron runs
  const subResults = await processSubscriptionExpiry(supabase);
  return NextResponse.json({ success: true, ...subResults });
}

// ─── Helper: process trial/grace expiry ───────
async function processSubscriptionExpiry(supabase: ReturnType<typeof createSupabaseAdmin>) {
  const now = new Date().toISOString();

  // Expired trials → start grace period
  const { data: expiredTrials } = await supabase
    .from('subscriptions')
    .select('id, photographer_id')
    .eq('status', 'TRIAL')
    .lt('current_period_end', now);

  for (const sub of expiredTrials ?? []) {
    const graceEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('subscriptions')
      .update({ status: 'GRACE', grace_period_ends_at: graceEnd, updated_at: now })
      .eq('id', sub.id);

    await logSubscriptionEvent({
      photographerId: sub.photographer_id,
      eventType: 'TRIAL_EXPIRED',
      oldStatus: 'TRIAL',
      newStatus: 'GRACE',
    });

    // WhatsApp notification
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id, phone, name')
      .eq('photographer_id', sub.photographer_id)
      .single();

    if (studio?.phone) {
      sendAndLog({
        studioId: studio.id,
        recipientMobile: formatMobileForWhatsApp(studio.phone),
        recipientType: 'PHOTOGRAPHER',
        campaignName: 'trial_expired_grace',
        userName: studio.name,
        templateParams: [studio.name, '7', `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`],
      }).catch(console.error);
    }
  }

  // Expired grace periods → hard block
  const { data: expiredGrace } = await supabase
    .from('subscriptions')
    .select('id, photographer_id')
    .eq('status', 'GRACE')
    .lt('grace_period_ends_at', now);

  for (const sub of expiredGrace ?? []) {
    await supabase
      .from('subscriptions')
      .update({ status: 'EXPIRED', updated_at: now })
      .eq('id', sub.id);

    await logSubscriptionEvent({
      photographerId: sub.photographer_id,
      eventType: 'GRACE_PERIOD_EXPIRED',
      oldStatus: 'GRACE',
      newStatus: 'EXPIRED',
    });

    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id, phone, name')
      .eq('photographer_id', sub.photographer_id)
      .single();

    if (studio?.phone) {
      sendAndLog({
        studioId: studio.id,
        recipientMobile: formatMobileForWhatsApp(studio.phone),
        recipientType: 'PHOTOGRAPHER',
        campaignName: 'access_expired',
        userName: studio.name,
        templateParams: [studio.name, `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`],
      }).catch(console.error);
    }
  }

  return {
    trials_expired: expiredTrials?.length ?? 0,
    grace_expired: expiredGrace?.length ?? 0,
  };
}
