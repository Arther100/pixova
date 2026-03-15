export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createSupabaseAdmin } from "@/lib/supabase";
import { generateReceiptNumber, derivePaymentStatus } from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("[webhook] Invalid Razorpay signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const supabase = createSupabaseAdmin();

    switch (event.event) {
      case "payment_link.paid": {
        const paymentLink = event.payload.payment_link?.entity;
        const paymentEntity = event.payload.payment?.entity;
        if (!paymentLink) break;

        const razorpayOrderId = paymentLink.id;
        const razorpayPaymentId = paymentEntity?.id || null;
        const amountPaid = paymentLink.amount_paid || paymentLink.amount;

        // Find our razorpay_order
        const { data: order } = await supabase
          .from("razorpay_orders")
          .select("id, booking_id, photographer_id, payment_type, amount_paise")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (!order) {
          console.log("[webhook] Unknown payment link:", razorpayOrderId);
          return NextResponse.json({ received: true });
        }

        // Fetch booking to get client_id
        const { data: bookingForClient } = await supabase
          .from("bookings")
          .select("client_id")
          .eq("id", order.booking_id)
          .single();

        // Idempotency: check if already processed
        if (razorpayPaymentId) {
          const { data: existing } = await supabase
            .from("payment_records")
            .select("id")
            .eq("razorpay_payment_id", razorpayPaymentId)
            .maybeSingle();

          if (existing) {
            return NextResponse.json({ received: true });
          }
        }

        // Generate receipt number
        const receiptNumber = await generateReceiptNumber(
          supabase,
          order.photographer_id
        );

        // Insert payment record
        await supabase.from("payment_records").insert({
          photographer_id: order.photographer_id,
          booking_id: order.booking_id,
          client_id: bookingForClient?.client_id || null,
          amount: amountPaid,
          currency: "INR",
          status: "captured",
          method: "razorpay",
          payment_type: order.payment_type,
          payment_date: new Date().toISOString().split("T")[0],
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_status: "PAID",
          receipt_number: receiptNumber,
          recorded_by: "CLIENT",
          description: `Online payment via Razorpay`,
        });

        // Update razorpay_orders status
        await supabase
          .from("razorpay_orders")
          .update({ status: "PAID", paid_at: new Date().toISOString() })
          .eq("id", order.id);

        // Update booking paid_amount and payment_status
        const { data: booking } = await supabase
          .from("bookings")
          .select("total_amount, paid_amount")
          .eq("id", order.booking_id)
          .single();

        if (booking) {
          const newPaidAmount = booking.paid_amount + amountPaid;
          const newPaymentStatus = derivePaymentStatus(
            booking.total_amount,
            newPaidAmount
          );

          await supabase
            .from("bookings")
            .update({
              paid_amount: newPaidAmount,
              payment_status: newPaymentStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.booking_id);
        }

        break;
      }

      case "payment.captured": {
        const payment = event.payload.payment.entity;
        await supabase
          .from("payment_records")
          .update({ status: "captured", razorpay_status: "PAID" })
          .eq("razorpay_order_id", payment.order_id);
        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment.entity;
        await supabase
          .from("payment_records")
          .update({ status: "failed", razorpay_status: "FAILED" })
          .eq("razorpay_order_id", payment.order_id);
        break;
      }

      case "subscription.activated":
      case "subscription.charged":
      case "subscription.cancelled": {
        console.log(`[webhook] ${event.event}`, event.payload);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event.event}`);
    }

    // Always return 200 to Razorpay
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    // Return 200 even on errors to prevent Razorpay retries
    return NextResponse.json({ received: true });
  }
}
