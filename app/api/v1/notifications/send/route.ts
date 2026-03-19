// ============================================
// POST /api/v1/notifications/send — Manual re-send
// Auth: Photographer JWT
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import {
  notifyAgreementReady,
  notifyGalleryPublished,
  notifyPaymentLink,
  notifyEventReminder,
} from '@/lib/notifications';

function maskMobile(mobile: string): string {
  if (mobile.length < 6) return '***';
  return mobile.slice(0, 5) + '***' + mobile.slice(-2);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const { booking_id, type } = body;

    if (!booking_id || !type) {
      return errorResponse('booking_id and type are required');
    }

    const validTypes = ['agreement_ready', 'gallery_published', 'payment_link', 'event_reminder'];
    if (!validTypes.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const supabase = createSupabaseAdmin();

    // Get studio profile
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id, name, phone')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return notFoundResponse('Studio not found');

    // Get booking with client
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, booking_ref, event_type, event_date, venue, city, total_amount, balance_amount, client_id')
      .eq('id', booking_id)
      .eq('photographer_id', session.photographerId)
      .single();

    if (!booking) return notFoundResponse('Booking not found');

    // Get client
    const { data: client } = await supabase
      .from('clients')
      .select('name, phone')
      .eq('id', booking.client_id)
      .single();

    if (!client) return notFoundResponse('Client not found');

    let recipient = '';

    switch (type) {
      case 'agreement_ready': {
        const { data: agreement } = await supabase
          .from('agreements')
          .select('agreement_id')
          .eq('booking_id', booking_id)
          .maybeSingle();

        if (!agreement) return errorResponse('No agreement found for this booking');

        await notifyAgreementReady({
          studioId: studio.id,
          bookingId: booking_id,
          bookingRef: booking.booking_ref || booking_id.slice(0, 8).toUpperCase(),
          clientName: client.name,
          clientMobile: client.phone,
          studioName: studio.name,
          agreementId: agreement.agreement_id,
        });
        recipient = maskMobile(client.phone);
        break;
      }

      case 'gallery_published': {
        const { data: gallery } = await supabase
          .from('galleries')
          .select('id, slug, status')
          .eq('booking_id', booking_id)
          .maybeSingle();

        if (!gallery) return errorResponse('No gallery found for this booking');
        if (gallery.status !== 'published') return errorResponse('Gallery is not published');

        const { count } = await supabase
          .from('gallery_photos')
          .select('*', { count: 'exact', head: true })
          .eq('gallery_id', gallery.id);

        await notifyGalleryPublished({
          studioId: studio.id,
          bookingId: booking_id,
          bookingRef: booking.booking_ref || booking_id.slice(0, 8).toUpperCase(),
          clientName: client.name,
          clientMobile: client.phone,
          studioName: studio.name,
          gallerySlug: gallery.slug,
          photoCount: count ?? 0,
        });
        recipient = maskMobile(client.phone);
        break;
      }

      case 'payment_link': {
        const { data: order } = await supabase
          .from('razorpay_orders')
          .select('id, short_url, amount_paise, expires_at')
          .eq('booking_id', booking_id)
          .eq('photographer_id', session.photographerId)
          .in('status', ['CREATED', 'ATTEMPTED'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!order) return errorResponse('No active payment link');

        await notifyPaymentLink({
          studioId: studio.id,
          bookingId: booking_id,
          bookingRef: booking.booking_ref || booking_id.slice(0, 8).toUpperCase(),
          clientName: client.name,
          clientMobile: client.phone,
          studioName: studio.name,
          amount: order.amount_paise,
          paymentUrl: order.short_url || '',
          expiresAt: order.expires_at || new Date().toISOString(),
        });
        recipient = maskMobile(client.phone);
        break;
      }

      case 'event_reminder': {
        await notifyEventReminder({
          studioId: studio.id,
          bookingId: booking_id,
          bookingRef: booking.booking_ref || booking_id.slice(0, 8).toUpperCase(),
          eventType: booking.event_type || 'Event',
          eventDate: booking.event_date || new Date().toISOString(),
          venueName: booking.venue,
          venueCity: booking.city,
          clientName: client.name,
          clientMobile: client.phone,
          photographerMobile: studio.phone,
          balanceAmount: booking.balance_amount ?? 0,
        });
        recipient = maskMobile(client.phone);
        break;
      }
    }

    return successResponse({
      sent: true,
      type,
      recipient,
    });
  } catch (err) {
    console.error('[notifications/send] POST error:', err);
    return serverErrorResponse();
  }
}
