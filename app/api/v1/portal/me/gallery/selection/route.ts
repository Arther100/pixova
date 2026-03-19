export const dynamic = 'force-dynamic';

import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientSession } from '@/lib/clientAuth';

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // Get gallery for this booking
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, selection_locked, photo_count')
      .eq('booking_id', session.bookingId)
      .eq('status', 'published')
      .single();

    if (!gallery) return notFoundResponse('Gallery not found.');

    // Get selected photos
    const { data: selected } = await supabase
      .from('gallery_photos')
      .select('id, storage_key, original_filename, sort_order')
      .eq('gallery_id', gallery.id)
      .eq('client_favourited', true)
      .eq('client_visible', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    const r2PublicUrl = process.env.R2_PUBLIC_URL || '';
    const selectedPhotos = (selected || []).map((p) => ({
      photo_id: p.id,
      url: `${r2PublicUrl}/${p.storage_key}`,
      filename: p.original_filename,
      sort_order: p.sort_order,
    }));

    // Total visible photos
    const { count: totalPhotos } = await supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('gallery_id', gallery.id)
      .eq('client_visible', true)
      .is('deleted_at', null);

    return successResponse({
      total_photos: totalPhotos || 0,
      selected_count: selectedPhotos.length,
      selection_locked: gallery.selection_locked ?? false,
      selected_photos: selectedPhotos,
    });
  } catch (err) {
    console.error('[portal] selection summary error:', err);
    return serverErrorResponse();
  }
}
