export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createSupabaseAdmin } from "@/lib/supabase";

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
      case "payment.captured": {
        const payment = event.payload.payment.entity;
        await supabase
          .from("payment_records")
          .update({ status: "captured" })
          .eq("razorpay_order_id", payment.order_id);
        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment.entity;
        await supabase
          .from("payment_records")
          .update({ status: "failed" })
          .eq("razorpay_order_id", payment.order_id);
        break;
      }

      case "subscription.activated":
      case "subscription.charged":
      case "subscription.cancelled": {
        // TODO: Handle subscription lifecycle events
        console.log(`[webhook] ${event.event}`, event.payload);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
