// ============================================
// DELETE /api/v1/payments/[bookingId]/[paymentId]
// Delete a manually recorded payment
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { derivePaymentStatus } from "@/lib/payments";

interface Params {
  params: { bookingId: string; paymentId: string };
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();
    const { bookingId, paymentId } = params;

    // Fetch payment
    const { data: payment, error: pErr } = await admin
      .from("payment_records")
      .select(
        "id, amount, payment_type, recorded_by, photographer_id, booking_id"
      )
      .eq("id", paymentId)
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (pErr || !payment) return notFoundResponse("Payment not found");

    // Cannot delete online payments
    if (payment.recorded_by === "CLIENT") {
      return errorResponse(
        "Online payments cannot be deleted. Record a refund instead.",
        400
      );
    }

    // Get current booking amounts
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, total_amount, paid_amount")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) return notFoundResponse("Booking not found");

    // Reverse the paid_amount change
    let newPaidAmount: number;
    if (payment.payment_type === "REFUND") {
      // Deleting a refund = add the amount back
      newPaidAmount = booking.paid_amount + payment.amount;
    } else {
      // Deleting a payment = subtract the amount
      newPaidAmount = Math.max(0, booking.paid_amount - payment.amount);
    }

    // Delete the payment record
    const { error: delErr } = await admin
      .from("payment_records")
      .delete()
      .eq("id", paymentId);

    if (delErr) {
      console.error("[payments] delete error:", delErr);
      return serverErrorResponse();
    }

    // Update booking
    const newPaymentStatus = derivePaymentStatus(
      booking.total_amount,
      newPaidAmount
    );

    await admin
      .from("bookings")
      .update({
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    // Get updated booking
    const { data: updatedBooking } = await admin
      .from("bookings")
      .select("paid_amount, balance_amount, payment_status")
      .eq("id", bookingId)
      .single();

    return successResponse({
      deleted: true,
      booking: {
        paid_amount: updatedBooking?.paid_amount ?? newPaidAmount,
        balance_amount: updatedBooking?.balance_amount ?? 0,
        payment_status:
          updatedBooking?.payment_status ?? newPaymentStatus,
      },
    });
  } catch (err) {
    console.error("[payments] DELETE error:", err);
    return serverErrorResponse();
  }
}
