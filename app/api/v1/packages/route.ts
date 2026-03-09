// ============================================
// GET /api/v1/packages
// Returns studio packages for the authenticated photographer
// Lightweight endpoint used by BookingForm
// ============================================

import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();

    // Get studio_id for this photographer
    const { data: studio, error: studioErr } = await admin
      .from("studio_profiles")
      .select("id")
      .eq("photographer_id", session.photographerId)
      .single();

    if (studioErr || !studio) {
      return successResponse({ packages: [] });
    }

    // Fetch packages
    const { data: packages, error: pkgErr } = await admin
      .from("studio_packages")
      .select("id, name, price, deliverables")
      .eq("studio_id", studio.id)
      .order("sort_order", { ascending: true });

    if (pkgErr) {
      console.error("[packages] fetch error:", pkgErr);
      return successResponse({ packages: [] });
    }

    return successResponse({ packages: packages || [] });
  } catch (err) {
    console.error("[packages] error:", err);
    return serverErrorResponse();
  }
}
