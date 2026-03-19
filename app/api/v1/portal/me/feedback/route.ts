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

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review_text: z.string().max(1000).optional(),
  is_public: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback } = await (supabase.from('client_feedback') as any)
      .select('feedback_id, rating, review_text, is_public, photographer_reply, submitted_at, reply_at')
      .eq('booking_id', session.bookingId)
      .single();

    return successResponse({ feedback: feedback || null });
  } catch (err) {
    console.error('[portal] feedback GET error:', err);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const supabase = createSupabaseAdmin();

    // Check booking status — must be delivered or completed
    const { data: booking } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', session.bookingId)
      .single();

    if (!booking || !['delivered', 'completed'].includes(booking.status)) {
      return errorResponse('Feedback can only be submitted for delivered or completed bookings');
    }

    // Check if already submitted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('client_feedback') as any)
      .select('feedback_id')
      .eq('booking_id', session.bookingId)
      .single();

    if (existing) {
      return errorResponse('Feedback already submitted for this booking', 409);
    }

    // Insert feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback, error: insertErr } = await (supabase.from('client_feedback') as any)
      .insert({
        booking_id: session.bookingId,
        client_id: session.clientId,
        studio_id: session.studioId,
        rating: parsed.data.rating,
        review_text: parsed.data.review_text || null,
        is_public: parsed.data.is_public ?? false,
      })
      .select('feedback_id, rating, submitted_at')
      .single();

    if (insertErr) {
      console.error('[portal] feedback insert error:', insertErr);
      return serverErrorResponse();
    }

    return successResponse(feedback, 201);
  } catch (err) {
    console.error('[portal] feedback POST error:', err);
    return serverErrorResponse();
  }
}
