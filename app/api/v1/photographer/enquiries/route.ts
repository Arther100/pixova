// ============================================
// GET /api/v1/photographer/enquiries
// Auth: Photographer JWT
// List all enquiries for photographer's studio
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse, unauthorizedResponse, serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page   = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit  = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    const supabase = createSupabaseAdmin();

    // Get studio
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return successResponse({ enquiries: [], total: 0, page, limit });

    // Fetch enquiry_studios for this studio
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let esQuery = (supabase.from('enquiry_studios') as any)
      .select('id, enquiry_id, status, quote_amount, quote_note, replied_at, seen_at, created_at', { count: 'exact' })
      .eq('studio_id', studio.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) esQuery = esQuery.eq('status', status.toUpperCase());

    const { data: esRows, count, error } = await esQuery;

    if (error) {
      console.error('[photographer/enquiries] query error:', error);
      return serverErrorResponse();
    }

    if (!esRows || esRows.length === 0) {
      return successResponse({ enquiries: [], total: count ?? 0, page, limit });
    }

    // Fetch enquiry details
    const enquiryIds = esRows.map((r: { enquiry_id: string }) => r.enquiry_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiries } = await (supabase.from('enquiries') as any)
      .select('enquiry_id, client_name, client_phone, event_type, event_date, event_city, budget_min, budget_max, guest_count, message, status, created_at')
      .in('enquiry_id', enquiryIds);

    const enquiryMap: Record<string, Record<string, unknown>> = {};
    for (const e of enquiries || []) enquiryMap[e.enquiry_id] = e;

    const results = esRows.map((es: Record<string, unknown>) => ({
      ...enquiryMap[es.enquiry_id as string],
      es_id: es.id,
      es_status: es.status,
      quote_amount: es.quote_amount,
      quote_note: es.quote_note,
      replied_at: es.replied_at,
      seen_at: es.seen_at,
    }));

    // Mark PENDING as SEEN
    const pendingIds = esRows
      .filter((r: { status: string; seen_at: string | null }) => r.status === 'PENDING' && !r.seen_at)
      .map((r: { id: string }) => r.id);

    if (pendingIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('enquiry_studios') as any)
        .update({ status: 'SEEN', seen_at: new Date().toISOString() })
        .in('id', pendingIds);
    }

    return successResponse({ enquiries: results, total: count ?? 0, page, limit });
  } catch (err) {
    console.error('[photographer/enquiries] GET error:', err);
    return serverErrorResponse();
  }
}
