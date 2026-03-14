// ============================================
// GET  /api/v1/auth/sessions — list active sessions
// ============================================

export const dynamic = 'force-dynamic';

import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { getAuthenticatedPhotographer } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthenticatedPhotographer();

    if (!auth) {
      return errorResponse("Not authenticated", 401);
    }

    const { createSupabaseAdmin } = await import("@/lib/supabase");
    const supabase = createSupabaseAdmin();

    const { data: sessions, error } = await supabase
      .from("active_sessions")
      .select("id, device_info, ip_address, user_agent, last_active_at, created_at")
      .eq("photographer_id", auth.photographer.id)
      .gt("expires_at", new Date().toISOString())
      .order("last_active_at", { ascending: false });

    if (error) {
      console.error("[sessions] DB error:", error);
      return serverErrorResponse();
    }

    return successResponse({
      sessions: sessions ?? [],
      count: sessions?.length ?? 0,
    });
  } catch (err) {
    console.error("[sessions] Unexpected error:", err);
    return serverErrorResponse();
  }
}
