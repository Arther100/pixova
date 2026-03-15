// ============================================
// GET /api/v1/gallery/[gallerySlug]
// PUBLIC client gallery view — no auth required
// Optional PIN verification via ?pin= query param
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { getPhotoUrl } from "@/lib/r2";

interface Params {
  params: { gallerySlug: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { gallerySlug } = params;
    const url = request.nextUrl;
    const pin = url.searchParams.get("pin");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    const supabase = createSupabaseAdmin();

    // Find published gallery
    const { data: gallery } = await supabase
      .from("galleries")
      .select(
        "id, title, description, slug, cover_photo_url, status, photo_count, allow_download, allow_selection, selection_limit, selected_count, pin, watermark_enabled, expires_at, published_at"
      )
      .eq("slug", gallerySlug)
      .eq("status", "published")
      .maybeSingle();

    if (!gallery) return notFoundResponse("Gallery not found or not published");

    // Check expiry
    if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
      return errorResponse("This gallery has expired", 410);
    }

    // PIN protection
    if (gallery.pin) {
      if (!pin) {
        // Return minimal info + requires_pin flag
        return successResponse({
          gallery: {
            title: gallery.title,
            requires_pin: true,
          },
          photos: [],
        });
      }
      if (pin !== gallery.pin) {
        return errorResponse("Incorrect PIN", 403);
      }
    }

    // Get visible photos
    const { data: photos, count } = await supabase
      .from("gallery_photos")
      .select("id, original_filename, storage_key, thumbnail_key, sort_order, is_selected, is_favorited, caption, created_at", { count: "exact" })
      .eq("gallery_id", gallery.id)
      .order("sort_order", { ascending: true })
      .range(offset, offset + limit - 1);

    const photosWithUrls = await Promise.all(
      (photos || []).map(async (p) => ({
        id: p.id,
        filename: p.original_filename,
        url: await getPhotoUrl(p.storage_key),
        thumbnail_url: p.thumbnail_key
          ? await getPhotoUrl(p.thumbnail_key)
          : null,
        sort_order: p.sort_order,
        is_selected: p.is_selected,
        is_favorited: p.is_favorited,
        caption: p.caption,
      }))
    );

    // Strip PIN from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pin: _pin, ...galleryInfo } = gallery;

    return successResponse({
      gallery: {
        ...galleryInfo,
        requires_pin: false,
      },
      photos: photosWithUrls,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[GET /gallery/slug] Error:", err);
    return serverErrorResponse();
  }
}
