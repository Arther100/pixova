export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createSupabaseAdmin } from "@/lib/supabase";
import { generateReceiptNumber, derivePaymentStatus } from "@/lib/payments";
import { notifyPaymentReceived } from "@/lib/notifications";
import { logSubscriptionEvent } from "@/lib/adminAuth";
import { sendAndLog } from "@/lib/notifications";
import { formatMobileForWhatsApp } from "@/lib/aisensy";

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

          // NOTIFICATION: Payment received via Razorpay (fire-and-forget)
          const { data: studioForNotif } = await supabase
            .from('studio_profiles')
            .select('id, phone')
            .eq('photographer_id', order.photographer_id)
            .single();

          const { data: clientForNotif } = await supabase
            .from('clients')
            .select('name')
            .eq('id', bookingForClient?.client_id ?? '')
            .single();

          const { data: bookingForRef } = await supabase
            .from('bookings')
            .select('booking_ref, balance_amount')
            .eq('id', order.booking_id)
            .single();

          if (studioForNotif && clientForNotif) {
            notifyPaymentReceived({
              studioId: studioForNotif.id,
              bookingId: order.booking_id,
              bookingRef: bookingForRef?.booking_ref || order.booking_id.slice(0, 8).toUpperCase(),
              clientName: clientForNotif.name,
              amountPaid: amountPaid,
              balanceAmount: bookingForRef?.balance_amount ?? 0,
              receiptNumber,
              photographerMobile: studioForNotif.phone,
            }).catch(err => console.error('[notify payment webhook]', err));
          }
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

      case "subscription.activated": {
        const sub = event.payload.subscription?.entity;
        if (!sub) break;

        const razorpaySubId = sub.id;

        // Find our razorpay_subscriptions record
        const { data: rzpSub } = await supabase
          .from("razorpay_subscriptions")
          .select("id, photographer_id, studio_id, plan_id")
          .eq("razorpay_sub_id", razorpaySubId)
          .maybeSingle();

        if (!rzpSub) {
          console.log("[webhook] Unknown subscription:", razorpaySubId);
          break;
        }

        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Update razorpay_subscriptions
        await supabase
          .from("razorpay_subscriptions")
          .update({
            status: "active",
            current_start: now.toISOString(),
            current_end: nextMonth.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("razorpay_sub_id", razorpaySubId);

        // Get plan details
        const { data: plan } = await supabase
          .from("plans")
          .select("name, price_monthly")
          .eq("id", rzpSub.plan_id)
          .single();

        // Update main subscription
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("photographer_id", rzpSub.photographer_id)
          .single();

        await supabase
          .from("subscriptions")
          .update({
            plan_id: rzpSub.plan_id,
            status: "ACTIVE",
            current_period_start: now.toISOString(),
            current_period_end: nextMonth.toISOString(),
            grace_period_ends_at: null,
            bookings_this_cycle: 0,
            razorpay_subscription_id: razorpaySubId,
            updated_at: now.toISOString(),
          })
          .eq("photographer_id", rzpSub.photographer_id);

        await logSubscriptionEvent({
          photographerId: rzpSub.photographer_id,
          studioId: rzpSub.studio_id,
          eventType: "SUBSCRIPTION_ACTIVATED",
          newPlan: plan?.name,
          oldStatus: currentSub?.status as string | undefined,
          newStatus: "ACTIVE",
          amountPaise: plan?.price_monthly,
          razorpaySubId,
        });

        // Notify photographer
        const { data: studio } = await supabase
          .from("studio_profiles")
          .select("id, phone, name")
          .eq("id", rzpSub.studio_id)
          .single();

        if (studio?.phone) {
          sendAndLog({
            studioId: studio.id,
            recipientMobile: formatMobileForWhatsApp(studio.phone),
            recipientType: "PHOTOGRAPHER",
            campaignName: "subscription_activated",
            userName: studio.name,
            templateParams: [studio.name, plan?.name ?? ""],
          }).catch(console.error);
        }

        break;
      }

      case "subscription.charged": {
        const sub = event.payload.subscription?.entity;
        if (!sub) break;

        const razorpaySubId = sub.id;

        const { data: rzpSub } = await supabase
          .from("razorpay_subscriptions")
          .select("id, photographer_id, studio_id, plan_id, amount_paise")
          .eq("razorpay_sub_id", razorpaySubId)
          .maybeSingle();

        if (!rzpSub) break;

        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await supabase
          .from("razorpay_subscriptions")
          .update({
            paid_count: sub.paid_count ?? 0,
            current_start: now.toISOString(),
            current_end: nextMonth.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("razorpay_sub_id", razorpaySubId);

        await supabase
          .from("subscriptions")
          .update({
            status: "ACTIVE",
            current_period_start: now.toISOString(),
            current_period_end: nextMonth.toISOString(),
            grace_period_ends_at: null,
            bookings_this_cycle: 0,
            updated_at: now.toISOString(),
          })
          .eq("photographer_id", rzpSub.photographer_id);

        const { data: plan } = await supabase
          .from("plans")
          .select("name")
          .eq("id", rzpSub.plan_id)
          .single();

        await logSubscriptionEvent({
          photographerId: rzpSub.photographer_id,
          studioId: rzpSub.studio_id,
          eventType: "SUBSCRIPTION_RENEWED",
          newStatus: "ACTIVE",
          amountPaise: rzpSub.amount_paise,
          razorpaySubId,
          newPlan: plan?.name,
        });

        const { data: studio } = await supabase
          .from("studio_profiles")
          .select("id, phone, name")
          .eq("id", rzpSub.studio_id)
          .single();

        if (studio?.phone) {
          sendAndLog({
            studioId: studio.id,
            recipientMobile: formatMobileForWhatsApp(studio.phone),
            recipientType: "PHOTOGRAPHER",
            campaignName: "subscription_renewed",
            userName: studio.name,
            templateParams: [studio.name, plan?.name ?? ""],
          }).catch(console.error);
        }

        break;
      }

      case "subscription.cancelled": {
        const sub = event.payload.subscription?.entity;
        if (!sub) break;

        const razorpaySubId = sub.id;
        const { data: rzpSub } = await supabase
          .from("razorpay_subscriptions")
          .select("photographer_id, studio_id")
          .eq("razorpay_sub_id", razorpaySubId)
          .maybeSingle();

        if (!rzpSub) break;

        await supabase
          .from("razorpay_subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("razorpay_sub_id", razorpaySubId);

        await supabase
          .from("subscriptions")
          .update({ status: "CANCELLED", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("photographer_id", rzpSub.photographer_id);

        await logSubscriptionEvent({
          photographerId: rzpSub.photographer_id,
          studioId: rzpSub.studio_id,
          eventType: "SUBSCRIPTION_CANCELLED",
          newStatus: "CANCELLED",
          razorpaySubId,
        });

        break;
      }

      case "subscription.halted": {
        const sub = event.payload.subscription?.entity;
        if (!sub) break;

        const razorpaySubId = sub.id;
        const { data: rzpSub } = await supabase
          .from("razorpay_subscriptions")
          .select("photographer_id, studio_id")
          .eq("razorpay_sub_id", razorpaySubId)
          .maybeSingle();

        if (!rzpSub) break;

        const graceEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await supabase
          .from("razorpay_subscriptions")
          .update({ status: "halted", updated_at: new Date().toISOString() })
          .eq("razorpay_sub_id", razorpaySubId);

        await supabase
          .from("subscriptions")
          .update({
            status: "GRACE",
            grace_period_ends_at: graceEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("photographer_id", rzpSub.photographer_id);

        await logSubscriptionEvent({
          photographerId: rzpSub.photographer_id,
          studioId: rzpSub.studio_id,
          eventType: "GRACE_PERIOD_STARTED",
          oldStatus: "ACTIVE",
          newStatus: "GRACE",
          razorpaySubId,
          notes: "Payment failed — 7-day grace period started",
        });

        const { data: studio } = await supabase
          .from("studio_profiles")
          .select("id, phone, name")
          .eq("id", rzpSub.studio_id)
          .single();

        if (studio?.phone) {
          sendAndLog({
            studioId: studio.id,
            recipientMobile: formatMobileForWhatsApp(studio.phone),
            recipientType: "PHOTOGRAPHER",
            campaignName: "payment_failed_grace",
            userName: studio.name,
            templateParams: [studio.name, "7"],
          }).catch(console.error);
        }

        break;
      }

      case "subscription.completed": {
        const sub = event.payload.subscription?.entity;
        if (!sub) break;

        const razorpaySubId = sub.id;
        const { data: rzpSub } = await supabase
          .from("razorpay_subscriptions")
          .select("photographer_id, studio_id")
          .eq("razorpay_sub_id", razorpaySubId)
          .maybeSingle();

        if (!rzpSub) break;

        await supabase
          .from("razorpay_subscriptions")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("razorpay_sub_id", razorpaySubId);

        await supabase
          .from("subscriptions")
          .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
          .eq("photographer_id", rzpSub.photographer_id);

        await logSubscriptionEvent({
          photographerId: rzpSub.photographer_id,
          studioId: rzpSub.studio_id,
          eventType: "SUBSCRIPTION_CANCELLED",
          newStatus: "EXPIRED",
          razorpaySubId,
        });

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
