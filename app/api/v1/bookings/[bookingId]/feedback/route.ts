export const dynamic = 'force-dynamic';

import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';
import type { ClientFeedback } from '@/types/database';

export async function GET(
  _request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // Verify booking belongs to photographer
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', params.bookingId)
      .eq('photographer_id', session.photographerId)
      .single();

    if (!booking) return successResponse({ feedback: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback } = await (supabase.from('client_feedback') as any)
      .select('feedback_id, rating, review_text, is_public, photographer_reply, submitted_at, reply_at, client_id')
      .eq('booking_id', params.bookingId)
      .single() as { data: Pick<ClientFeedback, 'feedback_id' | 'rating' | 'review_text' | 'is_public' | 'photographer_reply' | 'submitted_at' | 'reply_at' | 'client_id'> | null; error: unknown };

    if (!feedback) return successResponse({ feedback: null });

    // Get client name
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', feedback.client_id)
      .single();

    return successResponse({
      feedback: {
        ...feedback,
        client_name: client?.name || 'Client',
      },
    });
  } catch (err) {
    console.error('[feedback] GET error:', err);
    return serverErrorResponse();
  }
}
