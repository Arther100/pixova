// POST /api/v1/subscription/upi-request
// Photographer submits UTR after paying via UPI.
// Sends a WhatsApp alert to admin for manual activation.

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

    // Get photographer profile for the alert
    const { data: studio } = await admin
      .from("studio_profiles")
      .select("name, phone")
      .eq("photographer_id", session.photographerId)
      .single();

    const studioName = studio?.name || "Unknown studio";
    const phone = studio?.phone || session.photographerId;
    const planLabel = PLAN_NAMES[plan_slug as string];
    const utr = utr_number.trim();

    // Notify admin via WhatsApp
    const adminPhone = process.env.ADMIN_PHONE || "918778667396";
    await sendDirectWhatsApp({
      to: adminPhone,
      message:
        `🔔 *Subscription Payment Request*\n\n` +
        `Studio: ${studioName}\n` +
        `Phone: ${phone}\n` +
        `Plan: ${planLabel}\n` +
        `Amount: ₹${amount}\n` +
        `UTR: \`${utr}\`\n\n` +
        `Verify the payment and activate the plan in Supabase.\n` +
        `Photographer ID: ${session.photographerId}`,
    });

    return successResponse({ submitted: true });
  } catch (err) {
    console.error("[upi-request] error:", err);
    return serverErrorResponse();
  }
}
