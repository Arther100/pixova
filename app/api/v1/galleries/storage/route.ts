// ============================================
// GET /api/v1/galleries/storage
// Storage usage stats for the photographer
// ============================================

export const dynamic = "force-dynamic";

import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // Get current storage usage
    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("storage_used_bytes")
      .eq("photographer_id", session.photographerId)
      .single();

    // Get plan limit
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plans(max_storage_bytes, max_photos_per_gallery, max_galleries)")
      .eq("photographer_id", session.photographerId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { plans: { max_storage_bytes: number; max_photos_per_gallery: number; max_galleries: number } } | null };

    const plan = sub?.plans ?? null;

    const usedBytes = studio?.storage_used_bytes ?? 0;
    const limitBytes = plan?.max_storage_bytes ?? 5 * 1024 * 1024 * 1024;

    // Count total galleries
    const { count: galleryCount } = await supabase
      .from("galleries")
      .select("*", { count: "exact", head: true })
      .eq("photographer_id", session.photographerId);

    return successResponse({
      used_bytes: usedBytes,
      limit_bytes: limitBytes,
      used_percent: Math.round((usedBytes / limitBytes) * 1000) / 10,
      gallery_count: galleryCount ?? 0,
      max_galleries: plan?.max_galleries ?? 50,
      max_photos_per_gallery: plan?.max_photos_per_gallery ?? 2000,
    });
  } catch (err) {
    console.error("[GET /galleries/storage] Error:", err);
    return serverErrorResponse();
  }
}
