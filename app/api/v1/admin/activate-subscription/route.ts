// POST /api/v1/admin/activate-subscription
// Admin activates a photographer's subscription after verifying UPI payment.

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
import { sendDirectWhatsApp } from "@/lib/whatsapp";

const PLAN_PERIOD_DAYS = 30;

const PLAN_NAMES: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Professional",
  STUDIO: "Studio",
};

async function isAdmin(photographerId: string): Promise<boolean> {
  const adminPhone = (process.env.ADMIN_PHONE || "918778667396").replace(/\D/g, "");
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("studio_profiles")
    .select("phone")
    .eq("photographer_id", photographerId)
    .single();
  if (!data?.phone) return false;
  const phone = data.phone.replace(/\D/g, "");
  return phone === adminPhone || phone === adminPhone.slice(2);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();
    if (!(await isAdmin(session.photographerId))) return unauthorizedResponse();

    const { request_id } = await request.json();
    if (!request_id) return errorResponse("request_id is required");

    const admin = createSupabaseAdmin();

    // Fetch the payment request
    // Cast to unknown first — table not yet in generated Supabase types
    const { data: reqRaw } = await admin
      .from("subscription_payment_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    const req = reqRaw as unknown as {
      id: string;
      photographer_id: string;
      plan_slug: string;
      amount_rupees: number;
      utr_number: string;
      status: string;
      studio_name: string | null;
      phone: string | null;
      created_at: string;
      activated_at: string | null;
    } | null;

    if (!req) return notFoundResponse("Payment request not found");
    if (req.status === "activated") return errorResponse("Already activated");

    const planSlug = req.plan_slug.toUpperCase();
    const periodEnd = new Date(Date.now() + PLAN_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Upgrade the subscription in Supabase
    const { error: subErr } = await admin
      .from("subscriptions")
      .update({
        status: "active",
        plan_slug: planSlug,
        plan_name: PLAN_NAMES[planSlug] || planSlug,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
        trial_ends_at: null,
      })
      .eq("photographer_id", req.photographer_id);

    if (subErr) {
      console.error("[activate-subscription] sub update error:", subErr);
      return serverErrorResponse();
    }

    // Mark the request as activated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("subscription_payment_requests")
      .update({ status: "activated", activated_at: new Date().toISOString() })
      .eq("id", request_id);

    // Notify the photographer via WhatsApp
    const phone = req.phone as string | null;
    if (phone) {
      await sendDirectWhatsApp({
        to: phone,
        message:
          `✅ *Your Pixova ${PLAN_NAMES[planSlug]} plan is now active!*\n\n` +
          `Your subscription has been activated successfully.\n` +
          `Valid until: ${new Date(periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}\n\n` +
          `Thank you for choosing Pixova! 🎉`,
      });
    }

    return successResponse({ activated: true, photographer_id: req.photographer_id });
  } catch (err) {
    console.error("[activate-subscription] error:", err);
    return serverErrorResponse();
  }
}
