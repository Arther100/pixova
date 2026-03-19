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
import { getPresignedDownloadUrl } from '@/lib/r2';

export async function GET(request: Request) {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const url = new URL(request.url);
    const selectedOnly = url.searchParams.get('selected_only') === 'true';

    const supabase = createSupabaseAdmin();

    // Get gallery for this booking
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, title, download_enabled')
      .eq('booking_id', session.bookingId)
      .eq('status', 'published')
      .single();

    if (!gallery) return notFoundResponse('Gallery not found.');

    // Check download is enabled
    if (!gallery.download_enabled) {
      return errorResponse(
        'Downloads are disabled for this gallery.',
        403
      );
    }

    // Fetch photos
    let query = supabase
      .from('gallery_photos')
      .select('id, storage_key, original_filename')
      .eq('gallery_id', gallery.id)
      .eq('client_visible', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (selectedOnly) {
      query = query.eq('client_favourited', true);
    }

    const { data: photos } = await query;

    if (!photos || photos.length === 0) {
      return errorResponse('No photos to download.', 404);
    }

    // Generate presigned download URLs (1 hour expiry)
    // Deduplicate filenames
    const seenNames = new Map<string, number>();
    const photosWithUrls = await Promise.all(
      photos.map(async (p) => {
        let filename = p.original_filename || 'photo.jpg';
        // Ensure extension
        if (!filename.includes('.')) filename += '.jpg';

        // Deduplicate
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
    console.error('[portal] download-urls error:', err);
    return serverErrorResponse();
  }
}
