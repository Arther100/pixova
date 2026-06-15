// POST /api/v1/subscription/upi-request
// Photographer submits UTR after paying via UPI.
// Saves request to DB and sends WhatsApp alert to admin.

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { sendDirectWhatsApp } from "@/lib/whatsapp";

const PLAN_NAMES: Record<string, string> = {
  STARTER: "Starter (₹999/mo)",
  PRO: "Professional (₹1999/mo)",
  STUDIO: "Studio (₹4999/mo)",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const { plan_slug, utr_number, amount } = body;

    if (!plan_slug || !PLAN_NAMES[plan_slug as string]) {
      return errorResponse("Invalid plan");
    }
    if (!utr_number || typeof utr_number !== "string" || utr_number.trim().length < 6) {
      return errorResponse("Valid UTR number is required");
    }

    const admin = createSupabaseAdmin();
    const utr = utr_number.trim();

    // Get photographer profile
    const { data: studio } = await admin
      .from("studio_profiles")
      .select("name, phone")
      .eq("photographer_id", session.photographerId)
      .single();

    const studioName = studio?.name || "Unknown studio";
    const phone = studio?.phone || "";
    const planLabel = PLAN_NAMES[plan_slug as string];

    // Save request to DB — cast: table not yet in generated Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error: saveErr } = await (admin as any)
      .from("subscription_payment_requests")
      .insert({
        photographer_id: session.photographerId,
        plan_slug: plan_slug as string,
        amount_rupees: amount as number,
        utr_number: utr,
        studio_name: studioName,
        phone,
        status: "pending",
      })
      .select("id")
      .single();

    if (saveErr) {
      console.error("[upi-request] DB insert error:", saveErr);
      return serverErrorResponse();
    }

    // WhatsApp alert to admin with dashboard link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pixova.in";
    const adminPhone = process.env.ADMIN_PHONE || "918778667396";
    const dashboardUrl = `${appUrl}/admin/subscriptions`;

    await sendDirectWhatsApp({
      to: adminPhone,
      message:
        `🔔 *New Subscription Payment*\n\n` +
        `Studio: ${studioName}\n` +
        `Phone: ${phone}\n` +
        `Plan: ${planLabel}\n` +
        `Amount: ₹${amount}\n` +
        `UTR: \`${utr}\`\n` +
        `Request ID: \`${saved.id}\`\n\n` +
        `👉 Activate here:\n${dashboardUrl}`,
    });

    return successResponse({ submitted: true, request_id: saved.id });
  } catch (err) {
    console.error("[upi-request] error:", err);
    return serverErrorResponse();
  }
}
