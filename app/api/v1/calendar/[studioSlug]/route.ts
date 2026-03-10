// ============================================
// GET /api/v1/calendar/[studioSlug] — Public availability
// Auth: PUBLIC — no auth required
// Used by: MOD-13 enquiry form date picker
// ============================================

import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

// Cache this response for 5 minutes
export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: { studioSlug: string } }
) {
  try {
    const { studioSlug } = params;
    const { searchParams } = request.nextUrl;
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");

    if (!fromDate || !toDate) {
      return errorResponse("from_date and to_date query params are required");
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return errorResponse("Dates must be in YYYY-MM-DD format");
    }

    // Validate range <= 90 days
    const from = new Date(fromDate + "T00:00:00");
    const to = new Date(toDate + "T00:00:00");
    const diffDays = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return errorResponse("to_date must be on or after from_date");
    }

    if (diffDays > 90) {
      return errorResponse("Date range cannot exceed 90 days");
    }

    const supabase = createSupabaseAdmin();

    // Resolve studioSlug → photographer_id
    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("photographer_id")
      .eq("slug", studioSlug)
      .eq("is_listed", true)
      .single();

    if (!studio) {
      return notFoundResponse("Studio not found or not publicly listed");
    }

    // Query calendar_blocks for overlapping date range
    const { data: blocks, error: blocksError } = await supabase
      .from("calendar_blocks")
      .select("start_date, end_date, status")
      .eq("photographer_id", studio.photographer_id)
      .lte("start_date", toDate)
      .gte("end_date", fromDate);

    if (blocksError) {
      console.error("[GET /calendar/:slug] DB error:", blocksError.message);
      return serverErrorResponse("Failed to fetch availability");
    }

    // Build a date map: every date in range defaults to FREE
    const dates: Record<string, "FREE" | "BOOKED" | "ENQUIRY"> = {};
    const current = new Date(from);
    while (current <= to) {
      const dateStr = current.toISOString().split("T")[0];
      dates[dateStr] = "FREE";
      current.setDate(current.getDate() + 1);
    }

    // Apply blocks to the date map with priority
    // Priority: BOOKED > BLOCKED (shown as BOOKED) > ENQUIRY
    for (const block of blocks || []) {
      const blockStart = new Date(block.start_date + "T00:00:00");
      const blockEnd = new Date(block.end_date + "T00:00:00");
      const rangeStart = new Date(Math.max(blockStart.getTime(), from.getTime()));
      const rangeEnd = new Date(Math.min(blockEnd.getTime(), to.getTime()));

      const d = new Date(rangeStart);
      while (d <= rangeEnd) {
        const dateStr = d.toISOString().split("T")[0];
        const status = block.status || "BLOCKED";

        // Public API: BLOCKED dates show as BOOKED (private info hidden)
        const publicStatus =
          status === "BOOKED" || status === "BLOCKED" ? "BOOKED" : "ENQUIRY";

        // Apply with priority: BOOKED > ENQUIRY > FREE
        const currentStatus = dates[dateStr];
        if (
          currentStatus === "FREE" ||
          (currentStatus === "ENQUIRY" && publicStatus === "BOOKED")
        ) {
          dates[dateStr] = publicStatus;
        }

        d.setDate(d.getDate() + 1);
      }
    }

    return successResponse({
      studio_slug: studioSlug,
      from_date: fromDate,
      to_date: toDate,
      dates,
    });
  } catch (err) {
    console.error("[GET /calendar/:slug] Unexpected error:", err);
    return serverErrorResponse();
  }
}
