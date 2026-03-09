// ============================================
// POST /api/v1/bookings/[bookingId]/status — Update booking status
// Enforces the status machine transitions
// ============================================

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
import { updateBookingStatusSchema } from "@/lib/validations";

// ── Status machine: allowed transitions ──
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  enquiry: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
  completed: [], // terminal state
  cancelled: [], // terminal state
};

const STATUS_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface Params {
  params: { bookingId: string };
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const body = await request.json();
    const parsed = updateBookingStatusSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid input");
    }

    const { status: newStatus, reason } = parsed.data;
    const supabase = createSupabaseAdmin();

    // ── Fetch current booking ──
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, total_amount, advance_amount, internal_notes")
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (fetchError || !booking) {
      return notFoundResponse("Booking not found");
    }

    const currentStatus = booking.status;

    // ── Check if transition is allowed ──
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return errorResponse(
        `Cannot change status from "${STATUS_LABELS[currentStatus]}" to "${STATUS_LABELS[newStatus]}". ` +
        `Allowed transitions: ${allowed.map(s => STATUS_LABELS[s]).join(", ") || "none (terminal state)"}`
      );
    }

    // ── Cancellation requires a reason ──
    if (newStatus === "cancelled" && !reason) {
      return errorResponse("A reason is required when cancelling a booking");
    }

    // ── Build update payload ──
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
    };

    // Append cancellation reason to internal_notes
    if (newStatus === "cancelled" && reason) {
      const timestamp = new Date().toISOString();
      const cancelNote = `\n[Cancelled ${timestamp}]: ${reason}`;
      updatePayload.internal_notes = (booking.internal_notes || "") + cancelNote;
    }

    // ── Apply status change ──
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .select(
        `
        *,
        client:clients!inner(id, name, phone, email, whatsapp)
      `
      )
      .single();

    if (updateError || !updated) {
      console.error("[POST /bookings/:id/status] Update error:", updateError?.message);
      return serverErrorResponse("Failed to update booking status");
    }

    return successResponse({
      message: `Booking status changed to ${STATUS_LABELS[newStatus]}`,
      booking: updated,
    });
  } catch (err) {
    console.error("[POST /bookings/:id/status] Unexpected error:", err);
    return serverErrorResponse();
  }
}
