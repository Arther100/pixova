// ============================================
// GET /api/v1/clients — List clients with booking stats
// Auth: Photographer JWT
// Query: search?, page?, limit?
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
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    const supabase = createSupabaseAdmin();

    // Build client query
    let query = supabase
      .from('clients')
      .select('id, name, phone, email, city, total_spent, created_at, is_active', { count: 'exact' })
      .eq('photographer_id', session.photographerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: clients, error, count } = await query;

    if (error) {
      console.error('[clients] list error:', error);
      return serverErrorResponse();
    }

    const clientList = clients || [];

    if (clientList.length === 0) {
      return successResponse({ clients: [], total: count || 0, page, limit });
    }

    // Batch fetch booking stats for this page of clients
    const clientIds = clientList.map((c) => c.id);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('client_id, id, created_at, status')
      .in('client_id', clientIds)
      .eq('photographer_id', session.photographerId)
      .neq('status', 'cancelled');

    // Aggregate booking stats per client
    const statsByClient: Record<string, { booking_count: number; last_booking_date: string | null }> =
      {};
    for (const id of clientIds) {
      statsByClient[id] = { booking_count: 0, last_booking_date: null };
    }
    for (const b of bookings || []) {
      const stat = statsByClient[b.client_id];
      if (!stat) continue;
      stat.booking_count += 1;
      if (!stat.last_booking_date || b.created_at > stat.last_booking_date) {
        stat.last_booking_date = b.created_at;
      }
    }

    const enriched = clientList.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      city: c.city,
      total_spent: c.total_spent ?? 0,
      is_active: c.is_active,
      created_at: c.created_at,
      booking_count: statsByClient[c.id]?.booking_count ?? 0,
      last_booking_date: statsByClient[c.id]?.last_booking_date ?? null,
    }));

    return successResponse({ clients: enriched, total: count || 0, page, limit });
  } catch (err) {
    console.error('[clients] GET error:', err);
    return serverErrorResponse();
  }
}
