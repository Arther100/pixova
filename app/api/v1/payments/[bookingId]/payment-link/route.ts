// ============================================
// POST   /api/v1/payments/[bookingId]/payment-link — Create payment link
// DELETE /api/v1/payments/[bookingId]/payment-link — Cancel payment link
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
import { createPaymentLink, cancelPaymentLink } from "@/lib/razorpay";
import { getPaymentTypeLabel } from "@/lib/payments";
import { formatDate } from "@/utils/date";
import { notifyPaymentLink } from "@/lib/notifications";

interface Params {
  params: { bookingId: string };
}

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
      description,
      notify_sms,
      notify_email,
    } = body;

    // Validate
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return errorResponse("Amount must be greater than 0");
    }
    if (amount < 100) {
      return errorResponse("Minimum amount is ₹1");
    }
    if (
      !payment_type ||
      !["ADVANCE", "PARTIAL", "FINAL"].includes(payment_type)
    ) {
      return errorResponse("Invalid payment_type");
    }

    // Fetch booking with client
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select(
        "id, booking_ref, title, event_type, event_date, total_amount, balance_amount, client_id, status"
      )
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (bErr || !booking) return notFoundResponse("Booking not found");

    // Amount in paise
    const amountPaise = amount;

    // Validate amount doesn't exceed balance
    if (booking.balance_amount <= 0) {
      return errorResponse("This booking is fully paid.");
    }
    if (amountPaise > booking.balance_amount) {
      return errorResponse(
        "Amount cannot exceed balance due"
      );
    }

    // Check for existing active payment link
    const { data: existingLink } = await admin
      .from("razorpay_orders")
      .select("id, razorpay_order_id, short_url, amount_paise, expires_at")
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .in("status", ["CREATED", "ATTEMPTED"])
      .limit(1)
      .maybeSingle();

    if (existingLink) {
      return errorResponse("An active payment link already exists. Cancel it first.");
    }

    // Get client details
    const { data: client } = await admin
      .from("clients")
      .select("name, phone, email")
      .eq("id", booking.client_id)
      .single();

    if (!client) return notFoundResponse("Client not found");

    // Build description
    const typeLabel = getPaymentTypeLabel(payment_type);
    const defaultDesc = booking.event_type && booking.event_date
      ? `${typeLabel} for ${booking.booking_ref || booking.title} — ${booking.event_type} on ${formatDate(booking.event_date)}`
      : `${typeLabel} for ${booking.booking_ref || booking.title}`;

    // Create Razorpay payment link
    let link;
    try {
      link = await createPaymentLink({
        amountPaise,
        bookingRef: booking.booking_ref || bookingId.slice(0, 8),
        clientName: client.name,
        clientMobile: client.phone,
        clientEmail: client.email || undefined,
        description: description || defaultDesc,
        notifyViaSms: notify_sms ?? false,
        notifyViaEmail: notify_email ?? false,
      });
    } catch (rzpErr) {
      console.error("[payment-link] Razorpay API error:", rzpErr);
      return errorResponse(
        "Failed to create payment link. Check Razorpay credentials.",
        502
      );
    }

    // Save to razorpay_orders
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await admin
      .from("razorpay_orders")
      .insert({
        booking_id: bookingId,
        photographer_id: session.photographerId,
        razorpay_order_id: link.id,
        amount_paise: amountPaise,
        payment_type,
        short_url: link.short_url,
        status: "CREATED",
        expires_at: expiresAt,
      });

    if (insertErr) {
      console.error("[payment-link] insert error:", insertErr);
      return serverErrorResponse();
    }

    // NOTIFICATION: Payment link sent (fire-and-forget)
    {
      const { data: studioForNotif } = await admin
        .from('studio_profiles')
        .select('id, name')
        .eq('photographer_id', session.photographerId)
        .single();

      if (studioForNotif) {
        notifyPaymentLink({
          studioId: studioForNotif.id,
          bookingId,
          bookingRef: booking.booking_ref || bookingId.slice(0, 8),
          clientName: client.name,
          clientMobile: client.phone,
          studioName: studioForNotif.name,
          amount: amountPaise,
          paymentUrl: link.short_url,
          expiresAt,
        }).catch(err => console.error('[notify payment link]', err));
      }
    }

    return successResponse(
      {
        payment_link: {
          id: link.id,
          short_url: link.short_url,
          amount: amountPaise,
          expires_at: expiresAt,
        },
      },
      201
    );
  } catch (err) {
    console.error("[payment-link] POST error:", err);
    return serverErrorResponse();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();
    const { bookingId } = params;

    // Find active payment link
    const { data: order, error: oErr } = await admin
      .from("razorpay_orders")
      .select("id, razorpay_order_id")
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .in("status", ["CREATED", "ATTEMPTED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (oErr || !order)
      return notFoundResponse("No active payment link found");

    // Cancel via Razorpay API
    try {
      await cancelPaymentLink(order.razorpay_order_id);
    } catch (rzpErr) {
      console.error("[payment-link] Razorpay cancel error:", rzpErr);
      // Continue to update our DB even if Razorpay call fails
    }

    // Update order status
    await admin
      .from("razorpay_orders")
      .update({ status: "CANCELLED" })
      .eq("id", order.id);

    return successResponse({ cancelled: true });
  } catch (err) {
    console.error("[payment-link] DELETE error:", err);
    return serverErrorResponse();
  }
}
