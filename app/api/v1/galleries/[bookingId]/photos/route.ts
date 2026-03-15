// ============================================
// GET /api/v1/galleries/[bookingId]/photos
// List photos for a gallery (photographer view)
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { getPhotoUrl } from "@/lib/r2";

interface Params {
  params: { bookingId: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const url = request.nextUrl;
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    const supabase = createSupabaseAdmin();

    // Find gallery
    const { data: gallery } = await supabase
      .from("galleries")
      .select("id, photographer_id")
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .maybeSingle();

    if (!gallery) return notFoundResponse("Gallery not found");

    // Fetch photos
    const { data: photos, count } = await supabase
      .from("gallery_photos")
      .select("id, gallery_id, photographer_id, storage_key, thumbnail_key, original_filename, content_type, size_bytes, width, height, sort_order, is_selected, is_favorited, caption, created_at", { count: "exact" })
      .eq("gallery_id", gallery.id)
      .order("sort_order", { ascending: true })
      .range(offset, offset + limit - 1);

    if (!photos) return successResponse({ photos: [], total: 0, page, limit });

    // Resolve URLs
    const photosWithUrls = await Promise.all(
      photos.map(async (p) => ({
        ...p,
        url: await getPhotoUrl(p.storage_key),
        thumbnail_url: p.thumbnail_key
          ? await getPhotoUrl(p.thumbnail_key)
          : null,
      }))
    );

    return successResponse({
      photos: photosWithUrls,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[GET /galleries/photos] Error:", err);
    return serverErrorResponse();
  }
}
