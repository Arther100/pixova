export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientSession } from '@/lib/clientAuth';
import { z } from 'zod';

const messageSchema = z.object({
  message_text: z.string().min(1, 'Message cannot be empty').max(500),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const supabase = createSupabaseAdmin();

    // Rate limit: max 5 messages per hour per booking
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase.from('client_messages') as any)
      .select('message_id', { count: 'exact', head: true })
      .eq('booking_id', session.bookingId)
      .gte('created_at', oneHourAgo);

    if (count !== null && count >= 5) {
      return errorResponse('Maximum 5 messages per hour. Please try again later.', 429);
    }

    // Insert message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: message, error: insertErr } = await (supabase.from('client_messages') as any)
      .insert({
        booking_id: session.bookingId,
        client_id: session.clientId,
        studio_id: session.studioId,
        message_text: parsed.data.message_text,
      })
      .select('message_id, created_at')
      .single();

    if (insertErr) {
      console.error('[portal] message insert error:', insertErr);
      return serverErrorResponse();
    }

    // Fire-and-forget WhatsApp to photographer
    const [clientRes, studioRes, bookingRes] = await Promise.all([
      supabase.from('clients').select('name').eq('id', session.clientId).single(),
      supabase.from('studio_profiles').select('id, phone').eq('id', session.studioId).single(),
      supabase.from('bookings').select('booking_ref').eq('id', session.bookingId).single(),
    ]);

    if (studioRes.data?.phone) {
      const { sendAndLog } = await import(/* webpackIgnore: true */ '@/lib/notifications') as typeof import('@/lib/notifications');
      const truncated = parsed.data.message_text.length > 100
        ? parsed.data.message_text.substring(0, 100) + '...'
        : parsed.data.message_text;
      sendAndLog({
        studioId: session.studioId,
        bookingId: session.bookingId,
        recipientMobile: studioRes.data.phone,
        recipientType: 'PHOTOGRAPHER',
        campaignName: process.env.AISENSY_CAMPAIGN_CLIENT_MESSAGE || 'client_message',
        userName: clientRes.data?.name || 'Client',
        templateParams: [
          clientRes.data?.name || 'Client',
          truncated,
          bookingRes.data?.booking_ref || '',
        ],
      }).catch((err: unknown) => console.error('[notify] client message error:', err));
    }

    return successResponse(message, 201);
  } catch (err) {
    console.error('[portal] message POST error:', err);
    return serverErrorResponse();
  }
}
