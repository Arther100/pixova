export const dynamic = 'force-dynamic';

// ============================================
// POST /api/v1/subscription/cancel
// Auth: Photographer JWT
// Cancels active Razorpay subscription
// ============================================

import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { logSubscriptionEvent } from '@/lib/adminAuth';
import Razorpay from 'razorpay';

export async function POST() {
  const session = await getSessionFromCookie();
  if (!session) return unauthorizedResponse();

  const supabase = createSupabaseAdmin();

  // Get active razorpay subscription
  const { data: rzpSub } = await supabase
    .from('razorpay_subscriptions')
    .select('id, razorpay_sub_id, current_end, amount_paise')
    .eq('photographer_id', session.photographerId)
    .in('status', ['active', 'authenticated'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rzpSub) {
    return errorResponse('No active subscription found', 404);
  }

  const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  try {
    // Cancel at end of billing period (cancel_at_cycle_end = 1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (rzp.subscriptions as any).cancel(rzpSub.razorpay_sub_id, true);
  } catch (err) {
    console.error('[subscription/cancel] Razorpay error:', err);
    return serverErrorResponse('Failed to cancel subscription with Razorpay');
  }

  // Update razorpay_subscriptions
  await supabase
    .from('razorpay_subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', rzpSub.id);

  // Update subscriptions table
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('id, status, current_period_end')
    .eq('photographer_id', session.photographerId)
    .single();

  await supabase
    .from('subscriptions')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('photographer_id', session.photographerId);

  // Get studio for logging
  const { data: studio } = await supabase
    .from('studio_profiles')
    .select('id')
    .eq('photographer_id', session.photographerId)
    .single();

  await logSubscriptionEvent({
    photographerId: session.photographerId,
    studioId: studio?.id,
    eventType: 'SUBSCRIPTION_CANCELLED',
    oldStatus: subData?.status,
    newStatus: 'CANCELLED',
    razorpaySubId: rzpSub.razorpay_sub_id,
  });

  return successResponse({
    cancelled: true,
    access_until: rzpSub.current_end ?? subData?.current_period_end ?? null,
  });
}

// Allow GET to check cancellation status
export async function GET() {
  return NextResponse.json({ message: 'POST to cancel subscription' });
}
