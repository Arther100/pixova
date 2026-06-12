// ============================================
// POST /api/v1/settings/verify-upi
// Verifies a UPI VPA using Razorpay's validation API
// Returns account holder name if valid
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const { upi_id } = body;

    if (!upi_id || typeof upi_id !== "string" || !upi_id.trim()) {
      return errorResponse("UPI ID is required");
    }

    const vpa = upi_id.trim();

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return errorResponse("Razorpay not configured", 503);
    }

    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const res = await fetch("https://api.razorpay.com/v1/payments/validate/vpa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ vpa }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return errorResponse(
        data.error?.description || "Invalid UPI ID — please check and try again",
        400
      );
    }

    // Razorpay returns { vpa, success, customer_name }
    if (!data.success) {
      return errorResponse("UPI ID not found. Please check and try again.", 400);
    }

    return successResponse({
      valid: true,
      vpa: data.vpa,
      name: data.customer_name || null,
    });
  } catch (err) {
    console.error("[verify-upi] error:", err);
    return serverErrorResponse();
  }
}
