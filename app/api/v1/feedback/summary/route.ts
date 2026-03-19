export const dynamic = 'force-dynamic';

import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';
import type { ClientFeedback } from '@/types/database';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // Get studio
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return successResponse({ total_reviews: 0, average_rating: 0, rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, recent_feedback: [] });

    // Get all feedback for studio
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allFeedback } = await (supabase.from('client_feedback') as any)
      .select('feedback_id, rating, review_text, is_public, submitted_at, client_id, booking_id')
      .eq('studio_id', studio.id)
      .order('submitted_at', { ascending: false }) as { data: Pick<ClientFeedback, 'feedback_id' | 'rating' | 'review_text' | 'is_public' | 'submitted_at' | 'client_id' | 'booking_id'>[] | null; error: unknown };

    const feedback = allFeedback || [];
    const total = feedback.length;
    const avgRating = total > 0
      ? Math.round((feedback.reduce((sum, f) => sum + f.rating, 0) / total) * 10) / 10
      : 0;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    feedback.forEach((f) => { breakdown[f.rating]++; });

    // Get recent public feedback with client names
    const recentPublic = feedback.filter((f) => f.is_public).slice(0, 5);
    const clientIds = recentPublic.map((f) => f.client_id).filter((v, i, a) => a.indexOf(v) === i);
    const bookingIds = recentPublic.map((f) => f.booking_id).filter((v, i, a) => a.indexOf(v) === i);

    const [clientsRes, bookingsRes] = await Promise.all([
      clientIds.length > 0
        ? supabase.from('clients').select('id, name').in('id', clientIds)
        : Promise.resolve({ data: [] }),
      bookingIds.length > 0
        ? supabase.from('bookings').select('id, event_type, event_date').in('id', bookingIds)
        : Promise.resolve({ data: [] }),
    ]);

    const clientMap = new Map((clientsRes.data || []).map((c) => [c.id, c.name]));
    const bookingMap = new Map((bookingsRes.data || []).map((b) => [b.id, { event_type: b.event_type, event_date: b.event_date }]));

    const recentFormatted = recentPublic.map((f) => ({
      feedback_id: f.feedback_id,
      rating: f.rating,
      review_text: f.review_text,
      submitted_at: f.submitted_at,
      client_name: clientMap.get(f.client_id) || 'Client',
      event_type: bookingMap.get(f.booking_id)?.event_type || null,
      event_date: bookingMap.get(f.booking_id)?.event_date || null,
    }));

    return successResponse({
      total_reviews: total,
      average_rating: avgRating,
      rating_breakdown: breakdown,
      recent_feedback: recentFormatted,
    });
  } catch (err) {
    console.error('[feedback] summary error:', err);
    return serverErrorResponse();
  }
}
