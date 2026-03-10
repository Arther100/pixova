// ============================================
// GET /api/v1/calendar — Photographer's monthly calendar
// Auth: Photographer JWT (required)
// ============================================

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import type { CalendarBlock } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { searchParams } = request.nextUrl;
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");

    if (!yearStr || !monthStr) {
      return errorResponse("year and month query params are required");
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return errorResponse("Invalid year or month (month must be 1-12)");
    }

    // Calculate month boundaries
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const supabase = createSupabaseAdmin();

    // Query blocks that overlap with the month range
    // A block overlaps if start_date <= monthEnd AND end_date >= monthStart
    const { data: blocks, error: blocksError } = await supabase
      .from("calendar_blocks")
      .select("*")
      .eq("photographer_id", session.photographerId)
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
      .order("start_date", { ascending: true });

    if (blocksError) {
      console.error("[GET /calendar] DB error:", blocksError.message);
      return serverErrorResponse("Failed to fetch calendar blocks");
    }

    const typedBlocks = (blocks || []) as CalendarBlock[];

    // Collect booking_ids for enrichment
    const bookingIds = typedBlocks
      .filter((b) => b.booking_id)
      .map((b) => b.booking_id as string);

    // Fetch booking details with client data for enrichment
    let bookingMap: Record<
      string,
      { booking_ref: string; client_name: string; event_type: string | null }
    > = {};

    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, booking_ref, event_type, client:clients!inner(name)")
        .in("id", bookingIds);

      if (bookings) {
        for (const b of bookings as Array<{
          id: string;
          booking_ref: string;
          event_type: string | null;
          client: { name: string };
        }>) {
          bookingMap[b.id] = {
            booking_ref: b.booking_ref,
            client_name: b.client?.name || "",
            event_type: b.event_type,
          };
        }
      }
    }

    // Build enriched response — expand multi-day blocks into per-day entries
    const enrichedBlocks: Array<{
      block_id: string;
      block_date: string;
      status: string;
      source: string;
      booking_id: string | null;
      booking_ref: string | null;
      client_name: string | null;
      event_type: string | null;
      notes: string | null;
    }> = [];

    for (const block of typedBlocks) {
      const startDate = new Date(block.start_date + "T00:00:00");
      const endDate = new Date(block.end_date + "T00:00:00");
      const rangeStart = new Date(monthStart + "T00:00:00");
      const rangeEnd = new Date(monthEnd + "T00:00:00");

      // Iterate through each day in the block's range that falls within the month
      const current = new Date(Math.max(startDate.getTime(), rangeStart.getTime()));
      const last = new Date(Math.min(endDate.getTime(), rangeEnd.getTime()));

      while (current <= last) {
        const dateStr = current.toISOString().split("T")[0];
        const bookingInfo = block.booking_id ? bookingMap[block.booking_id] : null;

        enrichedBlocks.push({
          block_id: block.id,
          block_date: dateStr,
          status: block.status || "BLOCKED",
          source: block.source || "MANUAL",
          booking_id: block.booking_id || null,
          booking_ref: bookingInfo?.booking_ref || null,
          client_name: bookingInfo?.client_name || null,
          event_type: bookingInfo?.event_type || null,
          notes: block.reason || null,
        });

        current.setDate(current.getDate() + 1);
      }
    }

    return successResponse(
      { year, month, blocks: enrichedBlocks },
      200,
      "short"
    );
  } catch (err) {
    console.error("[GET /calendar] Unexpected error:", err);
    return serverErrorResponse();
  }
}
