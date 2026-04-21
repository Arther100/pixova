export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';
import { sendAndLog } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: { portalToken: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { portalToken } = params;
    const supabase = createSupabaseAdmin();

    // Verify booking belongs to this photographer
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, client_id, status, booking_ref, event_type')
      .eq('portal_token', portalToken)
      .eq('photographer_id', session.photographerId)
      .single();

    if (!booking) return notFoundResponse('Booking not found');

    if (!['delivered', 'completed'].includes(booking.status)) {
      return errorResponse('Feedback can only be requested for delivered or completed bookings');
    }

    // Check if already requested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookingFull } = await (supabase.from('bookings') as any)
      .select('feedback_requested_at')
      .eq('id', booking.id)
      .single() as { data: { feedback_requested_at: string | null } | null; error: unknown };

    if (bookingFull?.feedback_requested_at) {
      return errorResponse('Feedback already requested', 400);
    }

    // Set feedback_requested_at
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('bookings') as any)
      .update({ feedback_requested_at: new Date().toISOString() })
      .eq('id', booking.id);

    // Fetch client + studio for WhatsApp notification
    const [clientRes, studioRes] = await Promise.all([
      supabase.from('clients').select('name, phone').eq('id', booking.client_id).single(),
      supabase.from('studio_profiles').select('id, name, phone').eq('photographer_id', session.photographerId).single(),
    ]);

    // Fire-and-forget WhatsApp notification
    if (clientRes.data?.phone && studioRes.data) {
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalToken}/feedback`;
      sendAndLog({
        studioId: studioRes.data.id,
        bookingId: booking.id,
        recipientMobile: clientRes.data.phone,
        recipientType: 'CLIENT',
        campaignName: 'pixova_event_reminder',
        userName: clientRes.data.name,
        templateParams: [
          clientRes.data.name,
          studioRes.data.name,
          portalUrl,
          booking.booking_ref || '',
        ],
      }).catch((err: unknown) => console.error('[notify] feedback request error:', err));
    }

    return successResponse({ requested: true });
  } catch (err) {
    console.error('[portal] request-feedback error:', err);
    return serverErrorResponse();
  }
}
