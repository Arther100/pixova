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

    // Fetch published gallery for this booking
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, title, slug, status, photo_count, allow_download, download_enabled, selection_locked, published_at')
      .eq('booking_id', session.bookingId)
      .eq('status', 'published')
      .single();

    if (!gallery) {
      return notFoundResponse('Gallery is not published yet.');
    }

    // Fetch visible photos via gallery_id
    const { data: photos } = await supabase
      .from('gallery_photos')
      .select('id, storage_key, thumbnail_key, original_filename, sort_order, caption, client_favourited')
      .eq('gallery_id', gallery.id)
      .eq('client_visible', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    // Generate public URLs for photos
    const r2PublicUrl = process.env.R2_PUBLIC_URL || '';
    const photosWithUrls = (photos || []).map((p) => ({
      id: p.id,
      url: `${r2PublicUrl}/${p.storage_key}`,
      thumbnail_url: p.thumbnail_key ? `${r2PublicUrl}/${p.thumbnail_key}` : `${r2PublicUrl}/${p.storage_key}`,
      filename: p.original_filename,
      sort_order: p.sort_order,
      caption: p.caption,
      client_favourited: p.client_favourited ?? false,
    }));

    return successResponse({
      gallery: {
        id: gallery.id,
        title: gallery.title,
        slug: gallery.slug,
        photo_count: gallery.photo_count,
        allow_download: gallery.allow_download,
        download_enabled: gallery.download_enabled,
        selection_locked: gallery.selection_locked ?? false,
        published_at: gallery.published_at,
      },
      photos: photosWithUrls,
    });
  } catch (err) {
    console.error('[portal] gallery error:', err);
    return serverErrorResponse();
  }
}
