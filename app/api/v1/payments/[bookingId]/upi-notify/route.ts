// ============================================
// POST /api/v1/payments/[bookingId]/upi-notify
// Sends UPI payment link + QR code to client via WhatsApp
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
import { notifyUpiPaymentLink } from "@/lib/notifications";
import { paiseToRupees } from "@/utils/currency";

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
    const { amount, upi_url, qr_url } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return errorResponse("Amount must be greater than 0");
    }
    if (!upi_url) return errorResponse("upi_url is required");

    // Fetch booking + client
    const { data: booking } = await admin
      .from("bookings")
      .select("id, booking_ref, title, client_id")
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (!booking) return notFoundResponse("Booking not found");

    const { data: client } = await admin
      .from("clients")
      .select("name, phone")
      .eq("id", booking.client_id)
      .single();

    if (!client) return notFoundResponse("Client not found");

    const { data: studioRaw } = await admin
      .from("studio_profiles")
      .select("id, name, upi_id")
      .eq("photographer_id", session.photographerId)
      .single();

    // upi_id column added via migration 20260612_upi_id.sql
    const studio = studioRaw as (typeof studioRaw & { upi_id?: string | null }) | null;

    if (!studio?.upi_id) {
      return errorResponse("UPI ID not configured. Add it in Settings → Profile.");
    }

    await notifyUpiPaymentLink({
      studioId: studio.id,
      bookingId,
      bookingRef: booking.booking_ref || bookingId.slice(0, 8).toUpperCase(),
      clientName: client.name,
      clientMobile: client.phone,
      studioName: studio.name,
      upiId: studio.upi_id,
      amountRupees: paiseToRupees(amount),
      upiUrl: upi_url,
      qrUrl: qr_url || "",
    });

    return successResponse({ sent: true });
  } catch (err) {
    console.error("[upi-notify] error:", err);
    return serverErrorResponse();
  }
}
