// ============================================
// POST /api/v1/galleries/[bookingId]/upload-url
// Generate presigned PUT URL for direct R2 upload
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
import { getPresignedUploadUrl, galleryPhotoKey } from "@/lib/r2";
import {
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTOS_PER_GALLERY,
  ALLOWED_MIME_TYPES,
} from "@/lib/gallery";
import { getFileExtension } from "@/utils/helpers";

interface Params {
  params: { bookingId: string };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const body = await request.json();
    const { filename, content_type, file_size } = body;

    if (!filename || !content_type) {
      return errorResponse("filename and content_type are required");
    }

    // Validate mime type
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(content_type)) {
      return errorResponse(
        `Unsupported file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    // Validate file size
    if (file_size && file_size > MAX_PHOTO_SIZE_BYTES) {
      return errorResponse("File too large. Maximum 50 MB per photo.");
    }

    const supabase = createSupabaseAdmin();

    // Verify booking + get gallery
    const { data: gallery } = await supabase
      .from("galleries")
      .select("id, photographer_id")
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .maybeSingle();

    if (!gallery) return notFoundResponse("Gallery not found. Initialize first.");

    // Check photo count
    const { count: photoCount } = await supabase
      .from("gallery_photos")
      .select("*", { count: "exact", head: true })
      .eq("gallery_id", gallery.id);

    if ((photoCount ?? 0) >= MAX_PHOTOS_PER_GALLERY) {
      return errorResponse(`Maximum ${MAX_PHOTOS_PER_GALLERY} photos per gallery reached.`);
    }

    // Check storage quota
    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("id, storage_used_bytes")
      .eq("photographer_id", session.photographerId)
      .single();

    if (!studio) return notFoundResponse("Studio not found");

    // Get plan storage limit
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id, plans(max_storage_bytes)")
      .eq("photographer_id", session.photographerId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { plans: { max_storage_bytes: number } } | null };

    const maxStorage = sub?.plans?.max_storage_bytes ?? 5 * 1024 * 1024 * 1024; // Default 5GB
    const usedBytes = studio.storage_used_bytes ?? 0;

    if (file_size && usedBytes + file_size > maxStorage) {
      return errorResponse("Storage quota reached. Upgrade your plan.");
    }

    // Generate photo ID and R2 key
    const photoId = crypto.randomUUID();
    const ext = getFileExtension(filename);
    const r2Key = galleryPhotoKey(
      session.photographerId,
      gallery.id,
      photoId,
      ext
    );

    // Generate presigned upload URL
    const uploadUrl = await getPresignedUploadUrl(r2Key, content_type, 300);

    // Insert photo record
    const { error: insertError } = await supabase
      .from("gallery_photos")
      .insert({
        id: photoId,
        gallery_id: gallery.id,
        photographer_id: session.photographerId,
        storage_key: r2Key,
        original_filename: filename,
        content_type,
        size_bytes: file_size || 0,
        sort_order: (photoCount ?? 0) + 1,
      });

    if (insertError) {
      console.error("[upload-url] Insert error:", insertError.message);
      return serverErrorResponse();
    }

    return successResponse({
      photo_id: photoId,
      upload_url: uploadUrl,
      r2_key: r2Key,
      expires_in: 300,
    });
  } catch (err) {
    console.error("[upload-url] Error:", err);
    return serverErrorResponse();
  }
}
