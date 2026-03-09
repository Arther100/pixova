// ============================================
// DELETE /api/v1/auth/sessions/[sessionId]
// Revoke a specific active session
// ============================================

import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { getAuthenticatedPhotographer } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const auth = await getAuthenticatedPhotographer();

    if (!auth) {
      return errorResponse("Not authenticated", 401);
    }

    const { sessionId } = params;

    if (!sessionId) {
      return errorResponse("Session ID is required");
    }

    const supabase = createSupabaseAdmin();

    // Only allow deleting own sessions
    const { data: session } = await supabase
      .from("active_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("photographer_id", auth.photographer.id)
      .single();

    if (!session) {
      return errorResponse("Session not found", 404);
    }

    const { error } = await supabase
      .from("active_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("photographer_id", auth.photographer.id);

    if (error) {
      console.error("[sessions/delete] DB error:", error);
      return serverErrorResponse();
    }

    return successResponse({ message: "Session revoked successfully" });
  } catch (err) {
    console.error("[sessions/delete] Unexpected error:", err);
    return serverErrorResponse();
  }
}
