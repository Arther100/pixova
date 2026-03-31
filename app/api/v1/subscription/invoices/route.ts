export const dynamic = 'force-dynamic';

// ============================================
// GET /api/v1/subscription/invoices
// Auth: Photographer JWT
// Returns billing history
// ============================================

import { getSessionFromCookie } from '@/lib/session';
import { createSupabaseAdmin } from '@/lib/supabase';
import { successResponse, unauthorizedResponse } from '@/lib/api-helpers';

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return unauthorizedResponse();

  const supabase = createSupabaseAdmin();

  // Get subscription events with payment amounts
  const { data: events } = await supabase
    .from('subscription_events')
    .select('event_id, event_type, new_plan, amount_paise, razorpay_sub_id, created_at')
    .eq('photographer_id', session.photographerId)
    .in('event_type', ['SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_RENEWED', 'PLAN_CHANGED_BY_ADMIN'])
    .order('created_at', { ascending: false })
    .limit(50);

  const invoices = (events ?? []).map((e) => ({
    date: e.created_at,
    plan_name: e.new_plan ?? 'Unknown',
    amount_rupees: e.amount_paise ? e.amount_paise / 100 : 0,
    status: 'paid',
    razorpay_payment_id: e.razorpay_sub_id ?? null,
  }));

  return successResponse({ invoices });
}
