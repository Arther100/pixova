// ============================================
// GET /api/v1/calendar/check — Date availability check
// Auth: PUBLIC
// Used by: booking form + enquiry form date conflict check
// ============================================

import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const studioId = searchParams.get("studio_id");
    let photographerId = searchParams.get("photographer_id");
    const date = searchParams.get("date");

    if (!date) {
      return errorResponse("date query param is required (YYYY-MM-DD)");
    }

    // If photographer_id=self, resolve from session
    if (photographerId === "self") {
      const session = await getSessionFromCookie();
      if (session) {
        photographerId = session.photographerId;
      } else {
        photographerId = null;
      }
    }

    if (!studioId && !photographerId) {
      return errorResponse("Either studio_id or photographer_id is required");
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse("date must be in YYYY-MM-DD format");
    }

    const supabase = createSupabaseAdmin();

    // Resolve photographer_id
    let resolvedPhotographerId = photographerId;

    if (studioId && !photographerId) {
      const { data: studio } = await supabase
        .from("studio_profiles")
        .select("photographer_id")
        .eq("id", studioId)
        .single();

      if (!studio) {
        return errorResponse("Studio not found");
      }
      resolvedPhotographerId = studio.photographer_id;
    }

    // Query for blocks that contain this date
    // A block contains the date if start_date <= date AND end_date >= date
    const { data: blocks, error: blocksError } = await supabase
      .from("calendar_blocks")
      .select("status")
      .eq("photographer_id", resolvedPhotographerId!)
      .lte("start_date", date)
      .gte("end_date", date)
      .order("status", { ascending: true }); // crude order; we'll pick by priority

    if (blocksError) {
      console.error("[GET /calendar/check] DB error:", blocksError.message);
      return serverErrorResponse("Failed to check date");
    }

    // Determine highest-priority status
    // Priority: BOOKED > BLOCKED > ENQUIRY
    let finalStatus = "FREE" as string;

    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        const s = (block as { status: string }).status || "BLOCKED";
        if (s === "BOOKED") {
          finalStatus = "BOOKED";
          break; // highest priority
        } else if (s === "BLOCKED" && finalStatus !== "BOOKED") {
          finalStatus = "BLOCKED";
        } else if (s === "ENQUIRY" && finalStatus === "FREE") {
          finalStatus = "ENQUIRY";
        }
      }
    }

    // available = TRUE when FREE or ENQUIRY (soft block)
    const available = finalStatus === "FREE" || finalStatus === "ENQUIRY";

    return successResponse({
      date,
      available,
      status: finalStatus as "FREE" | "BOOKED" | "ENQUIRY" | "BLOCKED",
    });
  } catch (err) {
    console.error("[GET /calendar/check] Unexpected error:", err);
    return serverErrorResponse();
  }
}
