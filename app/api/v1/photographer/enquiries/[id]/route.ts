// ============================================
// PATCH /api/v1/photographer/enquiries/[id]
// Auth: Photographer JWT
// Actions: reply | decline | convert
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  successResponse, errorResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';
import { notifyEnquiryReplied } from '@/lib/whatsapp';

const patchSchema = z.object({
  action:       z.enum(['reply', 'decline', 'convert']),
  quote_amount: z.number().nonnegative().optional(),
  quote_note:   z.string().max(1000).optional(),
  booking_id:   z.string().uuid().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');

    const { action, quote_amount, quote_note, booking_id } = parsed.data;
    const supabase = createSupabaseAdmin();

    // Get studio
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id, name')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return unauthorizedResponse();

    // Get enquiry_studio row — verify ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: es, error: esError } = await (supabase.from('enquiry_studios') as any)
      .select('id, enquiry_id, status')
      .eq('id', params.id)
      .eq('studio_id', studio.id)
      .single();

    if (esError || !es) return notFoundResponse('Enquiry not found');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiry } = await (supabase.from('enquiries') as any)
      .select('enquiry_id, client_name, client_phone, event_type, event_date')
      .eq('enquiry_id', es.enquiry_id)
      .single();

    const now = new Date().toISOString();

    if (action === 'reply') {
      if (!quote_amount && !quote_note) {
        return errorResponse('Provide a quote_amount or quote_note when replying', 400);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('enquiry_studios') as any)
        .update({
          status: 'REPLIED',
          quote_amount: quote_amount ?? null,
          quote_note: quote_note ?? null,
          replied_at: now,
        })
        .eq('id', es.id);

      // WhatsApp notification to client
      if (enquiry) {
        const quoteStr = quote_amount
          ? `₹${Math.round(quote_amount / 100).toLocaleString('en-IN')}`
          : quote_note?.substring(0, 30) || 'See details';

        await notifyEnquiryReplied({
          clientPhone: enquiry.client_phone,
          clientName: enquiry.client_name,
          studioName: studio.name,
          quote: quoteStr,
          enquiryUrl: `https://pixova.in/account/enquiries/${enquiry.enquiry_id}`,
        });
      }

      return successResponse({ action: 'replied' });
    }

    if (action === 'decline') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('enquiry_studios') as any)
        .update({ status: 'DECLINED' })
        .eq('id', es.id);

      return successResponse({ action: 'declined' });
    }

    if (action === 'convert') {
      if (!booking_id) return errorResponse('booking_id required for convert action', 400);

      // Verify booking belongs to this photographer
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('id', booking_id)
        .eq('photographer_id', session.photographerId)
        .single();

      if (!booking) return notFoundResponse('Booking not found');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('enquiry_studios') as any)
        .update({ status: 'CONVERTED', booking_id })
        .eq('id', es.id);

      return successResponse({ action: 'converted', booking_id });
    }

    return errorResponse('Unknown action', 400);
  } catch (err) {
    console.error('[photographer/enquiries/[id]] PATCH error:', err);
    return serverErrorResponse();
  }
}
