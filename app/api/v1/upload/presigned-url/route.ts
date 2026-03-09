import { NextRequest } from "next/server";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-helpers";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getPresignedUploadUrl } from "@/lib/r2";
import { galleryPhotoKey } from "@/lib/r2";
import { ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE_BYTES } from "@/lib/constants";
import { uuid, getFileExtension } from "@/utils/helpers";

export async function POST(request: NextRequest) {
  try {
    // TODO: Auth middleware — extract user from token
    const body = await request.json();
    const { galleryId, filename, contentType, sizeBytes } = body;

    // Validate
    if (!galleryId || !filename || !contentType) {
      return errorResponse("galleryId, filename, and contentType are required");
    }

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
      return errorResponse(
        `Unsupported file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`
      );
    }

    if (sizeBytes && sizeBytes > MAX_PHOTO_SIZE_BYTES) {
      return errorResponse("File too large. Maximum 25 MB.");
    }

    const supabase = createSupabaseAdmin();

    // Fetch gallery to get photographer_id
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("id, photographer_id")
      .eq("id", galleryId)
      .single();

    if (galleryError || !gallery) {
      return errorResponse("Gallery not found", 404);
    }

    const photoId = uuid();
    const ext = getFileExtension(filename);
    const key = galleryPhotoKey(gallery.photographer_id, galleryId, photoId, ext);

    // Generate presigned URL for direct upload
    const uploadUrl = await getPresignedUploadUrl(key, contentType);

    return successResponse({
      uploadUrl,
      key,
      photoId,
    });
  } catch (err) {
    console.error("[upload-url] Unexpected error:", err);
    return serverErrorResponse();
  }
}
