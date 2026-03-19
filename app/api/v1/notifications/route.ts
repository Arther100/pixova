// ============================================
// GET /api/v1/notifications — List notification log
// Auth: Photographer JWT
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';

function maskMobile(mobile: string): string {
  if (mobile.length < 6) return '***';
  return mobile.slice(0, 5) + '***' + mobile.slice(-2);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const supabase = createSupabaseAdmin();

    // Get studio for this photographer
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return unauthorizedResponse();

    let query = supabase
      .from('whatsapp_notifications')
      .select('notification_id, booking_id, recipient_mobile, recipient_type, campaign_name, status, error_message, sent_at, created_at', { count: 'exact' })
      .eq('studio_id', studio.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }
    if (status && ['SENT', 'FAILED', 'PENDING', 'SKIPPED'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: notifications, count, error } = await query;

    if (error) {
      console.error('[notifications] list error:', error);
      return serverErrorResponse();
    }

    // Mask mobile numbers
    const masked = (notifications || []).map((n) => ({
      ...n,
      recipient_mobile: maskMobile(n.recipient_mobile),
    }));

    return successResponse({
      notifications: masked,
      total: count ?? masked.length,
    });
  } catch (err) {
    console.error('[notifications] GET error:', err);
    return serverErrorResponse();
  }
}
