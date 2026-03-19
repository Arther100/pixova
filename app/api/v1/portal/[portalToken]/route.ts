export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { createClientSession, getClientSessionCookieOptions } from '@/lib/clientAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: { portalToken: string } }
) {
  try {
    const { portalToken } = params;
    const supabase = createSupabaseAdmin();

    // 1. Look up booking by portal_token
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, booking_ref, status, event_type, event_date, event_end_date, venue, city, total_amount, advance_amount, paid_amount, balance_amount, payment_status, client_id, photographer_id')
      .eq('portal_token', portalToken)
      .neq('status', 'cancelled')
      .single();

    if (bErr || !booking) {
      return notFoundResponse('This link is invalid or expired.');
    }

    // 2. Fetch client
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('id', booking.client_id)
      .single();

    // 3. Fetch studio
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id, name, city, phone')
      .eq('photographer_id', booking.photographer_id)
      .single();

    if (!client || !studio) {
      return notFoundResponse('This link is invalid or expired.');
    }

    // 4. Log portal access
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('portal_access_logs') as any).insert({
      booking_id: booking.id,
      portal_token: portalToken,
      ip_address: ip,
      user_agent: userAgent,
    });

    // 5. Check has_agreement / has_gallery / has_feedback
    const [agRes, galRes, fbRes] = await Promise.all([
      supabase.from('agreements').select('agreement_id').eq('booking_id', booking.id).limit(1),
      supabase.from('galleries').select('id').eq('booking_id', booking.id).eq('status', 'published').limit(1),
      supabase.from('client_feedback').select('feedback_id').eq('booking_id', booking.id).limit(1),
    ]);

    // 6. Create client JWT session
    const jwt = await createClientSession({
      bookingId: booking.id,
      clientId: client.id,
      studioId: studio.id,
      portalToken,
    });

    // 7. Build response with Set-Cookie
    const cookieOpts = getClientSessionCookieOptions();
    const res = successResponse({
      booking: {
        booking_ref: booking.booking_ref,
        status: booking.status,
        event_type: booking.event_type,
        event_date: booking.event_date,
        event_end_date: booking.event_end_date,
        venue: booking.venue,
        city: booking.city,
        total_amount: booking.total_amount,
        advance_amount: booking.advance_amount,
        paid_amount: booking.paid_amount,
        balance_amount: booking.balance_amount,
        payment_status: booking.payment_status,
      },
      client: {
        name: client.name,
        phone: client.phone,
        email: client.email,
      },
      studio: {
        name: studio.name,
        city: studio.city,
        phone: studio.phone,
      },
      has_agreement: (agRes.data?.length ?? 0) > 0,
      has_gallery: (galRes.data?.length ?? 0) > 0,
      has_feedback: (fbRes.data?.length ?? 0) > 0,
    });

    res.cookies.set(cookieOpts.name, jwt, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      maxAge: cookieOpts.maxAge,
      path: cookieOpts.path,
    });

    return res;
  } catch (err) {
    console.error('[portal] Entry error:', err);
    return serverErrorResponse();
  }
}
