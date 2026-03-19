export const dynamic = 'force-dynamic';

import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';

// GET: View client's photo selection
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
      .select('id, photographer_id')
      .eq('id', params.bookingId)
      .eq('photographer_id', session.photographerId)
      .single();

    if (!booking) return notFoundResponse('Booking not found.');

    // Get gallery
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, selection_locked, photo_count, title')
      .eq('booking_id', params.bookingId)
      .single();

    if (!gallery) return notFoundResponse('Gallery not found.');

    // Get client-favourited photos
    const { data: selected } = await supabase
      .from('gallery_photos')
      .select('id, storage_key, original_filename, sort_order, client_favourited')
      .eq('gallery_id', gallery.id)
      .eq('client_favourited', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    const r2PublicUrl = process.env.R2_PUBLIC_URL || '';
    const selectedPhotos = (selected || []).map((p) => ({
      id: p.id,
      url: `${r2PublicUrl}/${p.storage_key}`,
      filename: p.original_filename,
      sort_order: p.sort_order,
    }));

    // Total photos
    const { count: totalPhotos } = await supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('gallery_id', gallery.id)
      .is('deleted_at', null);

    return successResponse({
      total_photos: totalPhotos || 0,
      selected_count: selectedPhotos.length,
      selection_locked: gallery.selection_locked ?? false,
      selected_photos: selectedPhotos,
    });
  } catch (err) {
    console.error('[galleries] selection GET error:', err);
    return serverErrorResponse();
  }
}

// PATCH: Lock/unlock client selection
export async function PATCH(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const selectionLocked = Boolean(body.selection_locked);

    const supabase = createSupabaseAdmin();

    // Verify booking belongs to photographer
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, photographer_id')
      .eq('id', params.bookingId)
      .eq('photographer_id', session.photographerId)
      .single();

    if (!booking) return notFoundResponse('Booking not found.');

    // Update gallery
    const { data: gallery, error } = await supabase
      .from('galleries')
      .update({ selection_locked: selectionLocked })
      .eq('booking_id', params.bookingId)
      .select('selection_locked')
      .single();

    if (error || !gallery) {
      return errorResponse('Failed to update selection lock.', 500);
    }

    return successResponse({
      selection_locked: gallery.selection_locked,
    });
  } catch (err) {
    console.error('[galleries] selection PATCH error:', err);
    return serverErrorResponse();
  }
}
