// ============================================
// POST /api/v1/auth/logout
// Sign out — remove active session, clear JWT cookie
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();

    if (!session) {
      return errorResponse("Not authenticated", 401);
    }

    const admin = createSupabaseAdmin();

    // ── Find photographer ──
    const { data: photographer } = await admin
      .from("photographers")
      .select("id")
      .eq("id", session.photographerId)
      .single();

    if (photographer) {
      // ── Remove specific session if sessionId provided, else remove all ──
      const body = await request.json().catch(() => ({}));
      const sessionId = (body as { sessionId?: string }).sessionId;

      if (sessionId) {
        await admin
          .from("active_sessions")
          .delete()
          .eq("id", sessionId)
          .eq("photographer_id", photographer.id);
      } else {
        // Remove all sessions for this photographer
        await admin
          .from("active_sessions")
          .delete()
          .eq("photographer_id", photographer.id);
      }
    }

    // ── Clear JWT session cookie ──
    const res = NextResponse.json(
      { success: true, data: { message: "Logged out successfully" } },
      { status: 200 }
    );
    res.cookies.set("pixova_session", "", { path: "/", maxAge: 0 });
    res.cookies.set("pixova_onboarded", "", { path: "/", maxAge: 0 });

    return res;
  } catch (err) {
    console.error("[logout] Unexpected error:", err);
    return serverErrorResponse();
  }
}
