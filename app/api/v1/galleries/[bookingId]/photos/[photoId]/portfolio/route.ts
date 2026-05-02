// ============================================
// PATCH /api/v1/galleries/[bookingId]/photos/[photoId]/portfolio
// Auth: Photographer JWT
// Toggle show_in_portfolio on a gallery photo
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse, errorResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string; photoId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    if (typeof body.show !== 'boolean') return errorResponse('show (boolean) is required');

    const supabase = createSupabaseAdmin();

    // Get gallery for this booking
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id')
      .eq('booking_id', params.bookingId)
      .eq('photographer_id', session.photographerId)
      .single();

    if (!gallery) return notFoundResponse('Gallery not found');

    // Verify photo belongs to this gallery and photographer
    const { data: photo, error } = await supabase
      .from('gallery_photos')
      .select('id')
      .eq('id', params.photoId)
      .eq('gallery_id', gallery.id)
      .eq('photographer_id', session.photographerId)
      .is('deleted_at', null)
      .single();

    if (error || !photo) return notFoundResponse('Photo not found');

    // Update show_in_portfolio
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('gallery_photos') as any)
      .update({ show_in_portfolio: body.show })
      .eq('id', params.photoId);

    return successResponse({ photo_id: params.photoId, show_in_portfolio: body.show });
  } catch (err) {
    console.error('[portfolio toggle] PATCH error:', err);
    return serverErrorResponse();
  }
}
