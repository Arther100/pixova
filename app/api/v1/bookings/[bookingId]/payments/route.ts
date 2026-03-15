// ============================================
// GET  /api/v1/bookings/[bookingId]/payments — List payment records
// POST /api/v1/bookings/[bookingId]/payments — Record a manual payment
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { z } from "zod/v4";
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

// ── Validation schema ──
const recordPaymentSchema = z.object({
  amount: z.number().int().min(100, "Minimum payment is ₹1"), // paise
  method: z.enum(["upi", "bank_transfer", "cash", "cheque", "other"]),
  paymentDate: z.string().optional(), // ISO date, defaults to today
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  allowOverpay: z.boolean().optional(),
  overpayReason: z.string().max(200).optional(),
});

// ── GET: List payments for a booking ──
export async function GET(
  _request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();
    const { bookingId } = params;

    // Verify booking belongs to this photographer
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (bErr || !booking) return notFoundResponse("Booking not found");

    // Fetch payment records
    const { data: payments, error: pErr } = await admin
      .from("payment_records")
      .select("id, amount, method, status, payment_date, description, notes, created_at")
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .order("payment_date", { ascending: false });

    if (pErr) {
      console.error("[payments] list error:", pErr);
      return serverErrorResponse();
    }

    return successResponse({ payments: payments || [] });
  } catch (err) {
    console.error("[payments] GET error:", err);
    return serverErrorResponse();
  }
}

// ── POST: Record a manual payment ──
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();
    const { bookingId } = params;

    // Validate body
    const body = await request.json();
    const parsed = z.safeParse(recordPaymentSchema, body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return errorResponse(firstError);
    }

    const { amount, method, paymentDate, description, notes, allowOverpay, overpayReason } = parsed.data;

    // Verify booking belongs to this photographer and get current amounts
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, total_amount, paid_amount, balance_amount, status, client_id")
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (bErr || !booking) return notFoundResponse("Booking not found");

    // Can't add payment to cancelled bookings
    if (booking.status === "cancelled") {
      return errorResponse("Cannot record payment for a cancelled booking");
    }

    // Check payment doesn't exceed balance (unless overpay is allowed with a reason)
    if (amount > booking.balance_amount) {
      if (!allowOverpay || !overpayReason?.trim()) {
        return errorResponse(
          `Payment amount (₹${(amount / 100).toLocaleString("en-IN")}) exceeds balance due (₹${(booking.balance_amount / 100).toLocaleString("en-IN")})`
        );
      }
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber(admin, session.photographerId);

    // Insert payment record
    const { data: payment, error: prErr } = await admin
      .from("payment_records")
      .insert({
        photographer_id: session.photographerId,
        booking_id: bookingId,
        client_id: booking.client_id,
        amount,
        currency: "INR",
        status: "captured", // manual payments are instantly captured
        method,
        payment_type: "ADVANCE",
        receipt_number: receiptNumber,
        recorded_by: "PHOTOGRAPHER",
        payment_date: paymentDate || new Date().toISOString().split("T")[0],
        description: description || (allowOverpay && overpayReason
          ? `Extra payment: ${overpayReason}`
          : `Manual ${method} payment`),
        notes: notes || null,
      })
      .select("id, amount, method, status, payment_type, receipt_number, recorded_by, payment_date, description, notes, created_at")
      .single();

    if (prErr) {
      console.error("[payments] insert error:", prErr);
      return serverErrorResponse();
    }

    // Update paid_amount on the booking
    const newPaidAmount = booking.paid_amount + amount;
    const isOverpayment = amount > booking.balance_amount;
    const newPaymentStatus = derivePaymentStatus(booking.total_amount, newPaidAmount);
    const updateFields: Record<string, unknown> = {
      paid_amount: newPaidAmount,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    };

    // If overpaying, increase total_amount to match so balance stays at 0
    if (isOverpayment) {
      updateFields.total_amount = booking.total_amount + (amount - booking.balance_amount);
    }

    const { error: updateErr } = await admin
      .from("bookings")
      .update(updateFields)
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[payments] booking update error:", updateErr);
      // Payment was recorded but booking not updated — log but don't fail
    }

    // Return the updated booking data too
    const { data: updatedBooking } = await admin
      .from("bookings")
      .select("total_amount, paid_amount, balance_amount")
      .eq("id", bookingId)
      .single();

    return successResponse(
      {
        payment,
        booking: {
          total_amount: updatedBooking?.total_amount ?? (isOverpayment ? (booking.total_amount + (amount - booking.balance_amount)) : booking.total_amount),
          paid_amount: updatedBooking?.paid_amount ?? newPaidAmount,
          balance_amount: updatedBooking?.balance_amount ?? 0,
        },
      },
      201
    );
  } catch (err) {
    console.error("[payments] POST error:", err);
    return serverErrorResponse();
  }
}
