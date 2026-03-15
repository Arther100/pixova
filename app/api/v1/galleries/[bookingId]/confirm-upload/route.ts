// ============================================
// POST /api/v1/galleries/[bookingId]/confirm-upload
// Called after successful R2 upload — updates storage
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

interface Params {
  params: { bookingId: string };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest, _context: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const { photo_id, file_size } = body;

    if (!photo_id) return errorResponse("photo_id is required");

    const supabase = createSupabaseAdmin();

    // Verify photo belongs to this photographer
    const { data: photo } = await supabase
      .from("gallery_photos")
      .select("id, size_bytes, photographer_id")
      .eq("id", photo_id)
      .eq("photographer_id", session.photographerId)
      .single();

    if (!photo) return errorResponse("Photo not found", 404);

    const actualSize = file_size || photo.size_bytes;

    // Update storage on studio_profiles
    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("id, storage_used_bytes")
      .eq("photographer_id", session.photographerId)
      .single();

    if (studio) {
      const newUsed = (studio.storage_used_bytes ?? 0) + actualSize;
      await supabase
        .from("studio_profiles")
        .update({ storage_used_bytes: newUsed })
        .eq("id", studio.id);

      // Get plan limit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id, plans(max_storage_bytes)")
        .eq("photographer_id", session.photographerId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { plans: { max_storage_bytes: number } } | null };

      const limitBytes = sub?.plans?.max_storage_bytes ?? 5 * 1024 * 1024 * 1024;

      return successResponse({
        photo_id,
        used_bytes: newUsed,
        limit_bytes: limitBytes,
        used_percent: Math.round((newUsed / limitBytes) * 1000) / 10,
      });
    }

    return successResponse({ photo_id });
  } catch (err) {
    console.error("[confirm-upload] Error:", err);
    return serverErrorResponse();
  }
}
