export const dynamic = 'force-dynamic';

import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientSession } from '@/lib/clientAuth';

export async function PATCH(
  request: Request,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const favourited = Boolean(body.favourited);

    const supabase = createSupabaseAdmin();

    // Get gallery for this booking
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, selection_locked')
      .eq('booking_id', session.bookingId)
      .eq('status', 'published')
      .single();

    if (!gallery) return notFoundResponse('Gallery not found.');

    // Check selection is not locked
    if (gallery.selection_locked) {
      return errorResponse(
        'Photo selection has been locked by the photographer.',
        400
      );
    }

    // Verify photo belongs to this gallery and is visible
    const { data: photo } = await supabase
      .from('gallery_photos')
      .select('id')
      .eq('id', params.photoId)
      .eq('gallery_id', gallery.id)
      .eq('client_visible', true)
      .is('deleted_at', null)
      .single();

    if (!photo) return notFoundResponse('Photo not found.');

    // Update favourite status
    await supabase
      .from('gallery_photos')
      .update({ client_favourited: favourited })
      .eq('id', params.photoId);

    // Get updated selection count
    const { count } = await supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('gallery_id', gallery.id)
      .eq('client_favourited', true)
      .is('deleted_at', null);

    return successResponse({
      photo_id: params.photoId,
      client_favourited: favourited,
      selection_count: count || 0,
    });
  } catch (err) {
    console.error('[portal] favourite toggle error:', err);
    return serverErrorResponse();
  }
}
