export const dynamic = 'force-dynamic';

import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientSession } from '@/lib/clientAuth';

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // Fetch payment records (exclude adjustments and internal fields)
    const { data: payments } = await supabase
      .from('payment_records')
      .select('amount, method, receipt_number, payment_date, created_at, status')
      .eq('booking_id', session.bookingId)
      .neq('method', 'adjustment')
      .order('created_at', { ascending: false });

    // Fetch booking totals
    const { data: booking } = await supabase
      .from('bookings')
      .select('total_amount, paid_amount, balance_amount, payment_status')
      .eq('id', session.bookingId)
      .single();

    return successResponse({
      payments: (payments || []).map((p) => ({
        amount: p.amount,
        method: p.method,
        receipt_number: p.receipt_number,
        payment_date: p.payment_date,
        status: p.status,
      })),
      summary: {
        total_amount: booking?.total_amount || 0,
        paid_amount: booking?.paid_amount || 0,
        balance_amount: booking?.balance_amount || 0,
        payment_status: booking?.payment_status || 'pending',
      },
    });
  } catch (err) {
    console.error('[portal] payments error:', err);
    return serverErrorResponse();
  }
}
