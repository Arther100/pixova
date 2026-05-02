// ============================================
// GET /api/v1/messages — List all client messages
// Auth: Photographer JWT
// Query: booking_id? (optional filter), limit?
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
    const bookingIdFilter = searchParams.get('booking_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const supabase = createSupabaseAdmin();

    // Get studio for this photographer
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return successResponse({ messages: [], total: 0 });

    // Fetch messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('client_messages') as any)
      .select('message_id, booking_id, client_id, message_text, is_read, created_at', { count: 'exact' })
      .eq('studio_id', studio.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bookingIdFilter) {
      query = query.eq('booking_id', bookingIdFilter);
    }

    const { data: messages, error, count } = await query;

    if (error) {
      console.error('[messages] list error:', error);
      return serverErrorResponse();
    }

    const rawMessages: Array<{
      message_id: string;
      booking_id: string;
      client_id: string;
      message_text: string;
      is_read: boolean;
      created_at: string;
    }> = messages || [];

    if (rawMessages.length === 0) {
      return successResponse({ messages: [], total: 0 });
    }

    // Batch fetch related bookings and clients
    const bookingIds = Array.from(new Set(rawMessages.map((m) => m.booking_id)));
    const clientIds = Array.from(new Set(rawMessages.map((m) => m.client_id)));

    const [bookingsRes, clientsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, booking_ref, title')
        .in('id', bookingIds),
      supabase
        .from('clients')
        .select('id, name, phone')
        .in('id', clientIds),
    ]);

    const bookingMap = new Map(
      (bookingsRes.data || []).map((b) => [b.id, b])
    );
    const clientMap = new Map(
      (clientsRes.data || []).map((c) => [c.id, c])
    );

    const enriched = rawMessages.map((m) => {
      const booking = bookingMap.get(m.booking_id);
      const client = clientMap.get(m.client_id);
      return {
        message_id: m.message_id,
        booking_id: m.booking_id,
        message_text: m.message_text,
        is_read: m.is_read,
        created_at: m.created_at,
        client_name: client?.name || 'Unknown Client',
        client_phone: client?.phone || '',
        booking_ref: booking?.booking_ref || null,
        booking_title: booking?.title || '',
      };
    });

    return successResponse({ messages: enriched, total: count || 0 });
  } catch (err) {
    console.error('[messages] GET error:', err);
    return serverErrorResponse();
  }
}
