// ============================================
// POST /api/v1/calendar/block — Manually block dates
// Auth: Photographer JWT (required)
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const { date, end_date, notes } = body as {
      date?: string;
      end_date?: string;
      notes?: string;
    };

    // Validation
    if (!date) {
      return errorResponse("date is required (YYYY-MM-DD)");
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return errorResponse("date must be in YYYY-MM-DD format");
    }

    if (end_date && !dateRegex.test(end_date)) {
      return errorResponse("end_date must be in YYYY-MM-DD format");
    }

    if (notes && notes.length > 200) {
      return errorResponse("Notes cannot exceed 200 characters");
    }

    const startDate = new Date(date + "T00:00:00");
    const endDate = end_date ? new Date(end_date + "T00:00:00") : startDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cannot block past dates
    if (startDate < today) {
      return errorResponse("Cannot block dates in the past");
    }

    // end_date must be >= date
    if (endDate < startDate) {
      return errorResponse("end_date must be on or after date");
    }

    // Max 30 days per block request
    const dayDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dayDiff > 29) {
      // 0-indexed diff, so 30 days = diff of 29
      return errorResponse("Cannot block more than 30 days at once");
    }

    // Max 365 days in the future
    const maxFuture = new Date(today);
    maxFuture.setDate(maxFuture.getDate() + 365);
    if (endDate > maxFuture) {
      return errorResponse("Cannot block dates more than 365 days in the future");
    }

    const supabase = createSupabaseAdmin();

    // Build array of dates to block (one row per day)
    const datesToBlock: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      datesToBlock.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    // Check which dates already have MANUAL blocks — skip those
    const { data: existingBlocks } = await supabase
      .from("calendar_blocks")
      .select("start_date")
      .eq("photographer_id", session.photographerId)
      .eq("source", "MANUAL")
      .in("start_date", datesToBlock);

    const existingDates = new Set(
      (existingBlocks || []).map((b: { start_date: string }) => b.start_date)
    );

    const newDates = datesToBlock.filter((d) => !existingDates.has(d));

    if (newDates.length === 0) {
      return successResponse(
        { blocked: 0, dates: [], message: "All dates are already blocked" },
        200
      );
    }

    // Insert all new blocks in a single batch
    const rows = newDates.map((d) => ({
      photographer_id: session.photographerId,
      title: notes || "Blocked",
      start_date: d,
      end_date: d,
      reason: notes || null,
      status: "BLOCKED",
      source: "MANUAL",
    }));

    const { error: insertError } = await supabase
      .from("calendar_blocks")
      .insert(rows);

    if (insertError) {
      console.error("[POST /calendar/block] Insert error:", insertError.message);
      return serverErrorResponse("Failed to block dates");
    }

    return successResponse(
      { blocked: newDates.length, dates: newDates },
      201
    );
  } catch (err) {
    console.error("[POST /calendar/block] Unexpected error:", err);
    return serverErrorResponse();
  }
}
