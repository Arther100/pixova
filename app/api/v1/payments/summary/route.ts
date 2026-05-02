// ============================================
// GET /api/v1/payments/summary — Aggregated payment stats
// Auth: Photographer JWT
// Query: from_date?, to_date?, status?
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const statusFilter = searchParams.get('status');

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('bookings')
      .select('id, total_amount, paid_amount, balance_amount, payment_status, status')
      .eq('photographer_id', session.photographerId)
      .neq('status', 'cancelled');

    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);
    if (statusFilter) query = query.eq('payment_status', statusFilter);

    const { data: bookings, error } = await query;

    if (error) {
      console.error('[payments/summary] error:', error);
      return serverErrorResponse();
    }

    const rows = bookings || [];

    const gross_revenue = rows.reduce((sum, b) => sum + (b.total_amount ?? 0), 0);
    const collected = rows.reduce((sum, b) => sum + (b.paid_amount ?? 0), 0);
    const outstanding = rows.reduce((sum, b) => sum + (b.balance_amount ?? 0), 0);
    const total_bookings = rows.length;

    const fully_paid = rows.filter((b) => b.payment_status === 'PAID').length;
    const partial = rows.filter((b) => b.payment_status === 'PARTIAL').length;
    const pending = rows.filter((b) => b.payment_status === 'PENDING').length;
    const overpaid = rows.filter((b) => b.payment_status === 'OVERPAID').length;

    return successResponse({
      total_bookings,
      gross_revenue,
      collected,
      outstanding,
      fully_paid,
      partial,
      pending,
      overpaid,
    });
  } catch (err) {
    console.error('[payments/summary] GET error:', err);
    return serverErrorResponse();
  }
}
