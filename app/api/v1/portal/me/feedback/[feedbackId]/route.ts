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
import { getClientSession } from '@/lib/clientAuth';
import type { ClientFeedback } from '@/types/database';
import { z } from 'zod';

const updateSchema = z.object({
  review_text: z.string().max(1000).optional(),
  is_public: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { feedbackId: string } }
) {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const supabase = createSupabaseAdmin();

    // Verify feedback belongs to this booking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback } = await (supabase.from('client_feedback') as any)
      .select('feedback_id, booking_id, photographer_reply')
      .eq('feedback_id', params.feedbackId)
      .single() as { data: Pick<ClientFeedback, 'feedback_id' | 'booking_id' | 'photographer_reply'> | null; error: unknown };

    if (!feedback || feedback.booking_id !== session.bookingId) {
      return notFoundResponse('Feedback not found');
    }

    // Cannot edit after photographer replied
    if (feedback.photographer_reply) {
      return errorResponse('Cannot edit after photographer has replied', 400);
    }

    // Update
    const updateFields: Record<string, unknown> = {};
    if (parsed.data.review_text !== undefined) updateFields.review_text = parsed.data.review_text;
    if (parsed.data.is_public !== undefined) updateFields.is_public = parsed.data.is_public;

    if (Object.keys(updateFields).length === 0) {
      return errorResponse('No fields to update');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateErr } = await (supabase.from('client_feedback') as any)
      .update(updateFields)
      .eq('feedback_id', params.feedbackId)
      .select('feedback_id, review_text, is_public')
      .single();

    if (updateErr) {
      console.error('[portal] feedback update error:', updateErr);
      return serverErrorResponse();
    }

    return successResponse(updated);
  } catch (err) {
    console.error('[portal] feedback PATCH error:', err);
    return serverErrorResponse();
  }
}
