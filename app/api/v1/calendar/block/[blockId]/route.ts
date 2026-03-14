// ============================================
// DELETE /api/v1/calendar/block/[blockId] — Unblock a manually blocked date
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
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import type { CalendarBlock } from "@/types";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { blockId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { blockId } = params;

    if (!blockId) {
      return errorResponse("blockId is required");
    }

    const supabase = createSupabaseAdmin();

    // Fetch the block first
    const { data: block, error: fetchError } = await supabase
      .from("calendar_blocks")
      .select("*")
      .eq("id", blockId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (fetchError || !block) {
      return notFoundResponse("Block not found");
    }

    const typedBlock = block as CalendarBlock;

    // Only allow deleting MANUAL blocks
    if (typedBlock.source !== "MANUAL") {
      return errorResponse(
        JSON.stringify({
          code: "CANNOT_DELETE_BOOKING_BLOCK",
          message:
            "This date is blocked by a booking. Cancel the booking to free this date.",
        }),
        400
      );
    }

    // Delete the block
    const { error: deleteError } = await supabase
      .from("calendar_blocks")
      .delete()
      .eq("id", blockId)
      .eq("photographer_id", session.photographerId)
      .eq("source", "MANUAL");

    if (deleteError) {
      console.error("[DELETE /calendar/block/:id] DB error:", deleteError.message);
      return serverErrorResponse("Failed to unblock date");
    }

    return successResponse({
      success: true,
      deleted_date: typedBlock.start_date,
    });
  } catch (err) {
    console.error("[DELETE /calendar/block/:id] Unexpected error:", err);
    return serverErrorResponse();
  }
}
