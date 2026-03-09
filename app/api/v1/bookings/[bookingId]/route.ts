// ============================================
// GET    /api/v1/bookings/[bookingId] — Get single booking
// PUT    /api/v1/bookings/[bookingId] — Update booking
// DELETE /api/v1/bookings/[bookingId] — Delete (soft: cancel) booking
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
import { updateBookingSchema } from "@/lib/validations";

interface Params {
  params: { bookingId: string };
}

// ── GET: Single booking with client info ──
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const supabase = createSupabaseAdmin();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        client:clients!inner(id, name, phone, email, whatsapp, city, address),
        package:studio_packages(id, name, price, deliverables)
      `
      )
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (error || !booking) {
      return notFoundResponse("Booking not found");
    }

    return successResponse(booking);
  } catch (err) {
    console.error("[GET /bookings/:id] Unexpected error:", err);
    return serverErrorResponse();
  }
}

// ── PUT: Update booking ──
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const body = await request.json();
    const parsed = updateBookingSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data = parsed.data;
    const supabase = createSupabaseAdmin();

    // ── Fetch existing booking ──
    const { data: existing, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, total_amount, advance_amount, internal_notes, event_date, event_end_date")
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (fetchError || !existing) {
      return notFoundResponse("Booking not found");
    }

    // ── Cannot edit cancelled bookings ──
    if (existing.status === "cancelled") {
      return errorResponse("Cannot edit a cancelled booking");
    }

    // ── Lock total_amount after CONFIRMED ──
    const lockedStatuses = ["confirmed", "in_progress", "delivered", "completed"];
    if (data.totalAmount !== undefined && lockedStatuses.includes(existing.status)) {
      return errorResponse("Total amount cannot be changed after confirmation");
    }

    // ── Validate: advance ≤ total ──
    const newTotal = data.totalAmount ?? existing.total_amount;
    const newAdvance = data.advanceAmount ?? existing.advance_amount;
    if (newAdvance > newTotal) {
      return errorResponse("Advance amount cannot exceed total amount");
    }

    // ── Validate: event_date must be in the future ──
    if (data.eventDate) {
      const eventDateObj = new Date(data.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDateObj < today) {
        return errorResponse("Event date must be today or in the future");
      }
    }

    // ── Validate: event_end_date ≥ event_date ──
    const finalEventDate = data.eventDate ?? existing.event_date;
    const finalEndDate = data.eventEndDate ?? existing.event_end_date;
    if (finalEventDate && finalEndDate) {
      if (new Date(finalEndDate) < new Date(finalEventDate)) {
        return errorResponse("End date must be on or after start date");
      }
    }

    // ── Check date conflicts ──
    const checkDate = data.eventDate ?? existing.event_date;
    if (checkDate && data.eventDate) {
      // Only check conflicts if the date is actually being changed
      const { data: blocks } = await supabase
        .from("calendar_blocks")
        .select("id, title")
        .eq("photographer_id", session.photographerId)
        .lte("start_date", checkDate)
        .gte("end_date", checkDate);

      if (blocks && blocks.length > 0) {
        return errorResponse(
          `Date conflict: ${checkDate} overlaps with "${blocks[0].title}". Please choose another date.`
        );
      }
    }

    // ── Build update object ──
    const updateFields: Record<string, unknown> = {};
    if (data.title !== undefined) updateFields.title = data.title;
    if (data.eventType !== undefined) updateFields.event_type = data.eventType;
    if (data.eventDate !== undefined) updateFields.event_date = data.eventDate || null;
    if (data.eventEndDate !== undefined) updateFields.event_end_date = data.eventEndDate || null;
    if (data.eventTime !== undefined) updateFields.event_time = data.eventTime || null;
    if (data.venue !== undefined) updateFields.venue = data.venue || null;
    if (data.venueAddress !== undefined) updateFields.venue_address = data.venueAddress || null;
    if (data.city !== undefined) updateFields.city = data.city || null;
    if (data.packageId !== undefined) updateFields.package_id = data.packageId || null;
    if (data.totalAmount !== undefined) updateFields.total_amount = data.totalAmount;
    if (data.advanceAmount !== undefined) updateFields.advance_amount = data.advanceAmount;
    if (data.notes !== undefined) updateFields.notes = data.notes || null;
    if (data.internalNotes !== undefined) updateFields.internal_notes = data.internalNotes || null;
    if (data.teamMembers !== undefined) updateFields.team_members = data.teamMembers;

    if (Object.keys(updateFields).length === 0) {
      return errorResponse("No fields to update");
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update(updateFields)
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
      console.error("[PUT /bookings/:id] Update error:", updateError?.message);
      return serverErrorResponse("Failed to update booking");
    }

    return successResponse(updated);
  } catch (err) {
    console.error("[PUT /bookings/:id] Unexpected error:", err);
    return serverErrorResponse();
  }
}

// ── DELETE: Cancel a booking ──
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const supabase = createSupabaseAdmin();

    // Fetch existing
    const { data: existing, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (fetchError || !existing) {
      return notFoundResponse("Booking not found");
    }

    if (existing.status === "cancelled") {
      return errorResponse("Booking is already cancelled");
    }

    if (existing.status === "completed") {
      return errorResponse("Cannot cancel a completed booking");
    }

    // Soft-delete: set status to cancelled
    const { data: cancelled, error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .select("*")
      .single();

    if (cancelError || !cancelled) {
      console.error("[DELETE /bookings/:id] Cancel error:", cancelError?.message);
      return serverErrorResponse("Failed to cancel booking");
    }

    return successResponse({ message: "Booking cancelled", booking: cancelled });
  } catch (err) {
    console.error("[DELETE /bookings/:id] Unexpected error:", err);
    return serverErrorResponse();
  }
}
