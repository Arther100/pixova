// ============================================
// PATCH /api/v1/portal/me/gallery/photos/[photoId]/select
// Toggle client photo selection (respects selection_limit)
// Auth: pixova_client_session
// Body: { selected: boolean }
// ============================================

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const selected = Boolean(body.selected);

    const supabase = createSupabaseAdmin();

    // Get gallery for this booking
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, selection_locked, allow_selection, selection_limit')
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

    // Check selection is enabled
    if (!gallery.allow_selection) {
      return errorResponse('Photo selection is not enabled for this gallery.', 400);
    }

    // Verify photo belongs to this gallery and is visible
    const { data: photo } = await supabase
      .from('gallery_photos')
      .select('id, client_favourited')
      .eq('id', params.photoId)
      .eq('gallery_id', gallery.id)
      .eq('client_visible', true)
      .is('deleted_at', null)
      .single();

    if (!photo) return notFoundResponse('Photo not found.');

    // If selecting (not deselecting), check selection limit
    if (selected && !photo.client_favourited && gallery.selection_limit) {
      const { count: currentCount } = await supabase
        .from('gallery_photos')
        .select('id', { count: 'exact', head: true })
        .eq('gallery_id', gallery.id)
        .eq('client_favourited', true)
        .is('deleted_at', null);

      if ((currentCount ?? 0) >= gallery.selection_limit) {
        return errorResponse(
          `Maximum ${gallery.selection_limit} photos allowed. Please deselect a photo first.`,
          400
        );
      }
    }

    // Update selection
    await supabase
      .from('gallery_photos')
      .update({ client_favourited: selected })
      .eq('id', params.photoId);

    // Get updated selection count
    const { count: selectionCount } = await supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('gallery_id', gallery.id)
      .eq('client_favourited', true)
      .is('deleted_at', null);

    return successResponse({
      photo_id: params.photoId,
      selected,
      selection_count: selectionCount ?? 0,
      selection_limit: gallery.selection_limit ?? null,
    });
  } catch (err) {
    console.error('[portal] select toggle error:', err);
    return serverErrorResponse();
  }
}
