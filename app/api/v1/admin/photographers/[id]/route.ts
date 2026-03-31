export const dynamic = 'force-dynamic';

// ============================================
// GET  /api/v1/admin/photographers/[id]
// PATCH /api/v1/admin/photographers/[id]
// Admin: full photographer profile
// ============================================

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api-helpers';

type RouteParams = { params: { id: string } };

export async function GET(_: NextRequest, { params }: RouteParams) {
  const admin = await getAdminSession();
  if (!admin) return unauthorizedResponse('Admin access required');

  const { id } = params;
  const supabase = createSupabaseAdmin();

  const [
    { data: photographer },
    { data: studio },
    { data: sub },
    { data: events },
    { data: bookings },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('photographers').select('*').eq('id', id).single(),
    supabase.from('studio_profiles').select('*').eq('photographer_id', id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('subscriptions').select('*, plans(*)').eq('photographer_id', id).single(),
    supabase
      .from('subscription_events')
      .select('*')
      .eq('photographer_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('bookings')
      .select('id, booking_ref, status, event_date, total_amount, created_at')
      .eq('photographer_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (!photographer) return notFoundResponse('Photographer not found');

  return successResponse({
    photographer,
    studio,
    subscription: sub,
    events,
    recent_bookings: bookings,
  });
}
