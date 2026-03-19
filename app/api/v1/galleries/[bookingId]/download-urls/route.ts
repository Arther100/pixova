export const dynamic = 'force-dynamic';

import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';
import { getPresignedDownloadUrl } from '@/lib/r2';

export async function GET(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const url = new URL(request.url);
    const selectedOnly = url.searchParams.get('selected_only') === 'true';

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
      .select('id, title')
      .eq('booking_id', params.bookingId)
      .single();

    if (!gallery) return notFoundResponse('Gallery not found.');

    // Fetch photos — photographer gets ALL photos (not just client_visible)
    let query = supabase
      .from('gallery_photos')
      .select('id, storage_key, original_filename')
      .eq('gallery_id', gallery.id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (selectedOnly) {
      query = query.eq('client_favourited', true);
    }

    const { data: photos } = await query;

    if (!photos || photos.length === 0) {
      return successResponse({ photos: [], gallery_title: gallery.title, total_count: 0 });
    }

    // Generate presigned download URLs (1 hour)
    const seenNames = new Map<string, number>();
    const photosWithUrls = await Promise.all(
      photos.map(async (p) => {
        let filename = p.original_filename || 'photo.jpg';
        if (!filename.includes('.')) filename += '.jpg';

        const count = seenNames.get(filename) || 0;
        if (count > 0) {
          const ext = filename.lastIndexOf('.');
          filename = `${filename.slice(0, ext)}_${count}${filename.slice(ext)}`;
        }
        seenNames.set(p.original_filename || 'photo.jpg', count + 1);

        const signedUrl = await getPresignedDownloadUrl(p.storage_key, 3600);
        return {
          photo_id: p.id,
          filename,
          url: signedUrl,
        };
      })
    );

    return successResponse({
      photos: photosWithUrls,
      gallery_title: gallery.title,
      total_count: photosWithUrls.length,
    });
  } catch (err) {
    console.error('[galleries] download-urls error:', err);
    return serverErrorResponse();
  }
}
