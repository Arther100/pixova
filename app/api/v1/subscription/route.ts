export const dynamic = 'force-dynamic';

// ============================================
// GET /api/v1/subscription
// Auth: Photographer JWT
// Returns full subscription details + usage
// ============================================

import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { createSupabaseAdmin } from '@/lib/supabase';
import { successResponse, unauthorizedResponse } from '@/lib/api-helpers';

const GB = 1024 * 1024 * 1024;

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return unauthorizedResponse();

  const supabase = createSupabaseAdmin();

  // Fetch subscription + plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase as any)
    .from('subscriptions')
    .select(`
      id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end,
      trial_ends_at,
      grace_period_ends_at,
      bookings_this_cycle,
      razorpay_subscription_id,
      cancelled_at,
      plan_id,
      plans (
        id,
        name,
        slug,
        price_monthly,
        booking_limit,
        overage_enabled,
        overage_price,
        max_storage_bytes
      )
    `)
    .eq('photographer_id', session.photographerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    return NextResponse.json({ success: false, error: 'No subscription found' }, { status: 404 });
  }

  const plan = sub.plans as {
    id: string; name: string; slug: string;
    price_monthly: number; booking_limit: number;
    overage_enabled: boolean; overage_price: number;
    max_storage_bytes: number;
  } | null;

  const now = new Date();
  const periodEnd = new Date(sub.current_period_end);
  const graceEnd = sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : null;

  // Compute grace days left
  let graceDaysLeft: number | null = null;
  if (sub.status === 'GRACE' && graceEnd && now < graceEnd) {
    graceDaysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Compute trial days left
  let trialDaysLeft: number | null = null;
  if (sub.status === 'TRIAL' && now < periodEnd) {
    trialDaysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Fetch storage usage
  const { data: studio } = await supabase
    .from('studio_profiles')
    .select('storage_used_bytes')
    .eq('photographer_id', session.photographerId)
    .single();

  const storageUsed = studio?.storage_used_bytes ?? 0;
  const storageLimit = plan?.max_storage_bytes ?? 5 * GB;
  const bookingsLimit = plan?.booking_limit ?? 5;
  const bookingsUsed = sub.bookings_this_cycle ?? 0;

  // Fetch active razorpay sub
  const { data: rzpSub } = await supabase
    .from('razorpay_subscriptions')
    .select('razorpay_sub_id, current_end, amount_paise')
    .eq('photographer_id', session.photographerId)
    .in('status', ['active', 'authenticated', 'created'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return successResponse({
    subscription: {
      status: sub.status,
      plan_name: plan?.name ?? 'TRIAL',
      plan_slug: plan?.slug ?? 'trial',
      current_period_end: sub.current_period_end,
      grace_period_ends_at: sub.grace_period_ends_at,
      grace_days_left: graceDaysLeft,
      trial_days_left: trialDaysLeft,
      bookings_this_cycle: bookingsUsed,
      booking_limit: bookingsLimit === -1 ? null : bookingsLimit,
      overage_enabled: plan?.overage_enabled ?? false,
      overage_price_paise: plan?.overage_price ?? 0,
    },
    usage: {
      bookings_used: bookingsUsed,
      bookings_limit: bookingsLimit === -1 ? null : bookingsLimit,
      bookings_percent: bookingsLimit > 0 && bookingsLimit !== -1
        ? Math.min(100, Math.round((bookingsUsed / bookingsLimit) * 100))
        : 0,
      storage_used_bytes: storageUsed,
      storage_limit_bytes: storageLimit,
      storage_percent: storageLimit > 0
        ? Math.min(100, Math.round((storageUsed / storageLimit) * 100))
        : 0,
      storage_used_gb: parseFloat((storageUsed / GB).toFixed(2)),
      storage_limit_gb: parseFloat((storageLimit / GB).toFixed(2)),
    },
    billing: {
      razorpay_sub_id: rzpSub?.razorpay_sub_id ?? null,
      next_billing_date: rzpSub?.current_end ?? null,
      amount_paise: rzpSub?.amount_paise ?? plan?.price_monthly ?? null,
    },
  });
}
