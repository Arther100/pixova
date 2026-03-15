// ============================================
// PATCH / DELETE /api/v1/galleries/[bookingId]/photos/[photoId]
// Update or soft-delete a single photo
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { deletePhotosFromR2 } from "@/lib/r2";

interface Params {
  params: { bookingId: string; photoId: string };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { photoId } = params;
    const body = await request.json();

    // Only allow safe fields
    const allowed: Record<string, unknown> = {};
    if (typeof body.sort_order === "number") allowed.sort_order = body.sort_order;
    if (typeof body.caption === "string") allowed.caption = body.caption;
    if (Object.keys(allowed).length === 0) {
      return errorResponse("No valid fields to update");
    }

    const supabase = createSupabaseAdmin();

    const { data: photo } = await supabase
      .from("gallery_photos")
      .select("id, photographer_id")
      .eq("id", photoId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (!photo) return notFoundResponse("Photo not found");

    const { data: updated, error } = await supabase
      .from("gallery_photos")
      .update(allowed)
      .eq("id", photoId)
      .select("*")
      .single();

    if (error) {
      console.error("[PATCH /photo] Error:", error.message);
      return serverErrorResponse();
    }

    return successResponse({ photo: updated });
  } catch (err) {
    console.error("[PATCH /photo] Error:", err);
    return serverErrorResponse();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { photoId } = params;
    const supabase = createSupabaseAdmin();

    // Get photo to delete
    const { data: photo } = await supabase
      .from("gallery_photos")
      .select("id, gallery_id, storage_key, thumbnail_key, size_bytes, photographer_id")
      .eq("id", photoId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (!photo) return notFoundResponse("Photo not found");

    // Hard delete the photo row
    await supabase
      .from("gallery_photos")
      .delete()
      .eq("id", photoId);

    // Delete from R2
    const keysToDelete = [photo.storage_key];
    if (photo.thumbnail_key) keysToDelete.push(photo.thumbnail_key);
    await deletePhotosFromR2(keysToDelete);

    // Update gallery photo count
    const { count: remaining } = await supabase
      .from("gallery_photos")
      .select("*", { count: "exact", head: true })
      .eq("gallery_id", photo.gallery_id);

    await supabase
      .from("galleries")
      .update({
        photo_count: remaining ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", photo.gallery_id);

    // Reduce studio storage
    if (photo.size_bytes) {
      const { data: studio } = await supabase
        .from("studio_profiles")
        .select("id, storage_used_bytes")
        .eq("photographer_id", session.photographerId)
        .single();

      if (studio) {
        const newUsed = Math.max(0, (studio.storage_used_bytes ?? 0) - photo.size_bytes);
        await supabase
          .from("studio_profiles")
          .update({ storage_used_bytes: newUsed })
          .eq("id", studio.id);
      }
    }

    return successResponse({ deleted: true });
  } catch (err) {
    console.error("[DELETE /photo] Error:", err);
    return serverErrorResponse();
  }
}
