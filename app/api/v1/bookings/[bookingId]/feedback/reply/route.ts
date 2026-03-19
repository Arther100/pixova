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
import type { ClientFeedback } from '@/types/database';
import { z } from 'zod';

const replySchema = z.object({
  reply_text: z.string().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const supabase = createSupabaseAdmin();

    // Verify booking belongs to photographer
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', params.bookingId)
      .eq('photographer_id', session.photographerId)
      .single();

    if (!booking) return notFoundResponse('Booking not found');

    // Get feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback } = await (supabase.from('client_feedback') as any)
      .select('feedback_id')
      .eq('booking_id', params.bookingId)
      .single() as { data: Pick<ClientFeedback, 'feedback_id'> | null; error: unknown };

    if (!feedback) return notFoundResponse('No feedback found for this booking');

    // Update with reply
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateErr } = await (supabase.from('client_feedback') as any)
      .update({
        photographer_reply: parsed.data.reply_text,
        reply_at: new Date().toISOString(),
      })
      .eq('feedback_id', feedback.feedback_id)
      .select('feedback_id, photographer_reply, reply_at')
      .single();

    if (updateErr) {
      console.error('[feedback] reply update error:', updateErr);
      return serverErrorResponse();
    }

    return successResponse(updated);
  } catch (err) {
    console.error('[feedback] reply error:', err);
    return serverErrorResponse();
  }
}
