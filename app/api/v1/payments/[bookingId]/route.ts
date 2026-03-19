// ============================================
// GET  /api/v1/payments/[bookingId] — List payments + summary
// POST /api/v1/payments/[bookingId] — Record a manual payment
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
import { generateReceiptNumber, derivePaymentStatus } from "@/lib/payments";
import { notifyPaymentReceived } from "@/lib/notifications";

interface Params {
  params: { bookingId: string };
}

// ── GET: List payments + summary for a booking ──
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();
    const { bookingId } = params;

    // Verify booking belongs to this photographer
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select(
        "id, total_amount, paid_amount, balance_amount, advance_amount, payment_status, status"
      )
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (bErr || !booking) return notFoundResponse("Booking not found");

    // Fetch payment records
    const { data: payments, error: pErr } = await admin
      .from("payment_records")
      .select(
        "id, amount, method, status, payment_type, payment_date, description, notes, receipt_number, razorpay_payment_id, recorded_by, created_at"
      )
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .order("payment_date", { ascending: false });

    if (pErr) {
      console.error("[payments] list error:", pErr);
      return serverErrorResponse();
    }

    // Calculate totals
    const allPayments = payments || [];
    const totalPaid = allPayments
      .filter((p) => p.payment_type !== "REFUND" && p.status === "captured")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const totalRefunded = allPayments
      .filter((p) => p.payment_type === "REFUND" && p.status === "captured")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    // Find active payment link
    const { data: activeLink } = await admin
      .from("razorpay_orders")
      .select(
        "id, razorpay_order_id, amount_paise, short_url, status, payment_type, expires_at, created_at"
      )
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .in("status", ["CREATED", "ATTEMPTED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Derive status on the fly
    const computedStatus = derivePaymentStatus(
      booking.total_amount,
      booking.paid_amount
    );

    return successResponse({
      summary: {
        total_amount: booking.total_amount,
        advance_amount: booking.advance_amount,
        paid_amount: booking.paid_amount,
        balance_amount: booking.balance_amount,
        payment_status: booking.payment_status || computedStatus,
        total_paid: totalPaid,
        total_refunded: totalRefunded,
      },
      payments: allPayments,
      active_payment_link: activeLink || null,
    });
  } catch (err) {
    console.error("[payments] GET error:", err);
    return serverErrorResponse();
  }
}

// ── POST: Record a manual payment ──
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();
    const { bookingId } = params;
    const body = await request.json();

    const {
      amount,
      payment_type,
      payment_method,
      payment_date,
      notes,
    } = body;

    // Validate required fields
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return errorResponse("Amount must be greater than 0");
    }
    if (
      !payment_type ||
      !["ADVANCE", "PARTIAL", "FINAL", "REFUND", "OVERAGE"].includes(
        payment_type
      )
    ) {
      return errorResponse("Invalid payment_type");
    }
    if (
      !payment_method ||
      !["cash", "upi", "bank_transfer", "cheque", "razorpay", "other"].includes(
        payment_method
      )
    ) {
      return errorResponse("Invalid payment_method");
    }
    if (!payment_date) {
      return errorResponse("payment_date is required");
    }

    // Validate date not in the future
    const pd = new Date(payment_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (pd > today) {
      return errorResponse("Payment date cannot be in the future");
    }

    // Validate date not more than 1 year in past
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (pd < oneYearAgo) {
      return errorResponse("Payment date cannot be more than 1 year ago");
    }

    // Verify booking belongs to photographer
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select(
        "id, total_amount, paid_amount, balance_amount, status, client_id"
      )
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (bErr || !booking) return notFoundResponse("Booking not found");

    if (booking.status === "cancelled") {
      return errorResponse("Cannot record payment for a cancelled booking");
    }

    // Amount is in paise
    const amountPaise = amount;

    // For refunds, validate doesn't exceed paid amount
    if (payment_type === "REFUND" && amountPaise > booking.paid_amount) {
      return errorResponse(
        "Refund amount cannot exceed total paid amount"
      );
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber(
      admin,
      session.photographerId
    );

    // Determine how to update paid_amount
    let newPaidAmount: number;
    if (payment_type === "REFUND") {
      newPaidAmount = Math.max(0, booking.paid_amount - amountPaise);
    } else {
      newPaidAmount = booking.paid_amount + amountPaise;
    }

    // Insert payment record
    const { data: payment, error: prErr } = await admin
      .from("payment_records")
      .insert({
        photographer_id: session.photographerId,
        booking_id: bookingId,
        client_id: booking.client_id,
        amount: amountPaise,
        currency: "INR",
        status: "captured",
        method: payment_method,
        payment_type,
        payment_date,
        receipt_number: receiptNumber,
        recorded_by: "PHOTOGRAPHER",
        description: notes || null,
        notes: notes || null,
      })
      .select(
        "id, amount, method, status, payment_type, payment_date, description, notes, receipt_number, recorded_by, created_at"
      )
      .single();

    if (prErr) {
      console.error("[payments] insert error:", prErr);
      return serverErrorResponse();
    }

    // Update booking paid_amount
    const newPaymentStatus = derivePaymentStatus(
      booking.total_amount,
      newPaidAmount
    );

    const { error: updateErr } = await admin
      .from("bookings")
      .update({
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[payments] booking update error:", updateErr);
    }

    // Get updated booking values
    const { data: updatedBooking } = await admin
      .from("bookings")
      .select("paid_amount, balance_amount, payment_status")
      .eq("id", bookingId)
      .single();

    // NOTIFICATION: Payment received (fire-and-forget)
    if (payment_type !== 'REFUND') {
      const { data: studioForNotif } = await admin
        .from('studio_profiles')
        .select('id, phone')
        .eq('photographer_id', session.photographerId)
        .single();

      const { data: clientForNotif } = await admin
        .from('clients')
        .select('name')
        .eq('id', booking.client_id)
        .single();

      const { data: bookingForRef } = await admin
        .from('bookings')
        .select('booking_ref')
        .eq('id', bookingId)
        .single();

      if (studioForNotif && clientForNotif) {
        notifyPaymentReceived({
          studioId: studioForNotif.id,
          bookingId,
          bookingRef: bookingForRef?.booking_ref || bookingId.slice(0, 8).toUpperCase(),
          clientName: clientForNotif.name,
          amountPaid: amountPaise,
          balanceAmount: updatedBooking?.balance_amount ?? 0,
          receiptNumber,
          photographerMobile: studioForNotif.phone,
        }).catch(err => console.error('[notify payment received]', err));
      }
    }

    // Suggest completing if fully paid and delivered
    const suggestComplete =
      newPaymentStatus === "PAID" && booking.status === "delivered";

    return successResponse(
      {
        payment,
        booking: {
          paid_amount: updatedBooking?.paid_amount ?? newPaidAmount,
          balance_amount: updatedBooking?.balance_amount ?? 0,
          payment_status:
            updatedBooking?.payment_status ?? newPaymentStatus,
        },
        suggest_complete: suggestComplete,
      },
      201
    );
  } catch (err) {
    console.error("[payments] POST error:", err);
    return serverErrorResponse();
  }
}
