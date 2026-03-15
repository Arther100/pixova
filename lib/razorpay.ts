// ============================================
// Razorpay — Payment gateway integration
// ============================================

import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  return razorpayInstance;
}

// ---------- Create Order ----------
export async function createOrder(params: {
  amount: number; // in paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}> {
  const order = await getRazorpay().orders.create({
    amount: params.amount,
    currency: params.currency || "INR",
    receipt: params.receipt,
    notes: params.notes || {},
  });

  return {
    id: order.id,
    amount: order.amount as number,
    currency: order.currency,
    receipt: order.receipt || params.receipt,
  };
}

// ---------- Verify Payment Signature ----------
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  return expectedSignature === params.signature;
}

// ---------- Verify Webhook Signature ----------
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

// ---------- Fetch Payment ----------
export async function fetchPayment(paymentId: string) {
  return getRazorpay().payments.fetch(paymentId);
}

// ---------- Create Subscription ----------
export async function createSubscription(params: {
  planId: string;
  totalCount: number;
  notes?: Record<string, string>;
}) {
  return getRazorpay().subscriptions.create({
    plan_id: params.planId,
    total_count: params.totalCount,
    notes: params.notes || {},
  });
}

// ---------- Cancel Subscription ----------
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true
) {
  return getRazorpay().subscriptions.cancel(
    subscriptionId,
    cancelAtCycleEnd
  );
}

// ---------- Create Payment Link ----------
export async function createPaymentLink(params: {
  amountPaise: number;
  bookingRef: string;
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  description: string;
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
  expiryMinutes?: number; // default 4320 = 72 hours
}): Promise<{
  id: string;
  short_url: string;
  amount: number;
  status: string;
}> {
  const rzp = getRazorpay();
  const expireBy =
    Math.floor(Date.now() / 1000) +
    (params.expiryMinutes ?? 4320) * 60;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = await (rzp as any).paymentLink.create({
    amount: params.amountPaise,
    currency: "INR",
    accept_partial: false,
    description: params.description,
    customer: {
      name: params.clientName,
      contact: params.clientMobile,
      email: params.clientEmail ?? "",
    },
    notify: {
      sms: params.notifyViaSms ?? false,
      email: params.notifyViaEmail ?? false,
    },
    reminder_enable: true,
    notes: {
      booking_ref: params.bookingRef,
    },
    expire_by: expireBy,
    reference_id: params.bookingRef,
  });

  return {
    id: link.id,
    short_url: link.short_url,
    amount: link.amount,
    status: link.status,
  };
}

// ---------- Cancel Payment Link ----------
export async function cancelPaymentLink(
  paymentLinkId: string
): Promise<void> {
  const rzp = getRazorpay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (rzp as any).paymentLink.cancel(paymentLinkId);
}
