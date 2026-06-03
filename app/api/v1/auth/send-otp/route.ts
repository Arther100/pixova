export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { sendOtpSchema } from "@/lib/validations";
import { normalizePhone } from "@/utils/phone";
import { generateOtp } from "@/utils/helpers";
import {
  OTP_LENGTH,
  OTP_EXPIRY_SECONDS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/constants";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sendOtp } from "@/lib/whatsapp";
import { sendSMSOTP } from "@/lib/sms";
import crypto from "crypto";

/** Rate limit: max OTPs per phone per hour */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = process.env.NODE_ENV === "development" ? 50 : 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Validate input ──
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid input");
    }

    const normalizedPhone = normalizePhone(parsed.data.phone);
    const supabase = createSupabaseAdmin();

    // ── Generate OTP early (no DB needed) ──
    const otp = generateOtp(OTP_LENGTH);
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Dev-only: log OTP so you can test without SMS
    if (process.env.NODE_ENV === "development") {
      console.log(`\n🔑 [DEV] OTP for ${normalizedPhone}: ${otp}\n`);
    }

    // ── Rate limit + invalidate old OTPs in parallel ──
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MS
    ).toISOString();

    const [rateCheck] = await Promise.all([
      supabase
        .from("otp_sessions")
        .select("id", { count: "exact", head: true })
        .eq("phone", normalizedPhone)
        .gte("created_at", windowStart),
      supabase
        .from("otp_sessions")
        .update({ verified: true })
        .eq("phone", normalizedPhone)
        .eq("verified", false),
    ]);

    if (
      rateCheck.count !== null &&
      rateCheck.count >= RATE_LIMIT_MAX
    ) {
      return errorResponse(
        "Too many OTP requests. Please try again later.",
        429
      );
    }

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_SECONDS * 1000
    ).toISOString();

    // ── Request metadata ──
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || null;
    const userAgent = request.headers.get("user-agent") || null;

    // ── Save OTP + send WhatsApp in parallel ──
    const [dbResult, sendResult] = await Promise.all([
      supabase.from("otp_sessions").insert({
        phone: normalizedPhone,
        otp_hash: otpHash,
        expires_at: expiresAt,
        channel: "whatsapp",
        role: "photographer",
        max_attempts: OTP_MAX_ATTEMPTS,
        ip_address: ip,
        user_agent: userAgent,
      }),
      sendOtp(normalizedPhone, otp),
    ]);

    if (dbResult.error) {
      console.error("[send-otp] DB error:", dbResult.error);
      return serverErrorResponse("Failed to create OTP session");
    }

    // Try WhatsApp first; fall back to SMS if it fails
    let channel = sendResult.channel ?? 'whatsapp';
    if (!sendResult.success) {
      const smsResult = await sendSMSOTP(normalizedPhone, otp);
      if (!smsResult.success) {
        return serverErrorResponse("Failed to send OTP. Please try again.");
      }
      channel = 'sms';
    }

    return successResponse({
      message: `OTP sent via ${channel}`,
      channel,
      expiresIn: OTP_EXPIRY_SECONDS,
      ...(process.env.NODE_ENV === 'development' && process.env.PIXOVA_DEV_MODE === 'true'
        ? { dev_otp: otp }
        : {}),
    });
  } catch (err) {
    console.error("[send-otp] Unexpected error:", err);
    return serverErrorResponse();
  }
}
