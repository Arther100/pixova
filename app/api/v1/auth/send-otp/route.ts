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
import crypto from "crypto";

/** Rate limit: max OTPs per phone per hour */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = process.env.NODE_ENV === "development" ? 50 : 5;

export async function POST(request: NextRequest) {
  try {
    const t0 = Date.now();
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

    console.log(`[send-otp] ⏱ parse+generate: ${Date.now() - t0}ms`);

    // ── Rate limit + invalidate old OTPs in parallel ──
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MS
    ).toISOString();

    const t1 = Date.now();
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
    console.log(`[send-otp] ⏱ rate-limit+invalidate: ${Date.now() - t1}ms`);

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
    const t2 = Date.now();
    const [dbResult, sendResult] = await Promise.all([
      supabase.from("otp_sessions").insert({
        phone: normalizedPhone,
        otp_hash: otpHash,
        expires_at: expiresAt,
        channel: "whatsapp",
        max_attempts: OTP_MAX_ATTEMPTS,
        ip_address: ip,
        user_agent: userAgent,
      }),
      sendOtp(normalizedPhone, otp),
    ]);
    console.log(`[send-otp] ⏱ insert+send: ${Date.now() - t2}ms`);
    console.log(`[send-otp] ⏱ TOTAL: ${Date.now() - t0}ms`);

    if (dbResult.error) {
      console.error("[send-otp] DB error:", dbResult.error);
      return serverErrorResponse("Failed to create OTP session");
    }

    if (!sendResult.success) {
      return serverErrorResponse("Failed to send OTP. Please try again.");
    }

    return successResponse({
      message: `OTP sent via ${sendResult.channel}`,
      channel: sendResult.channel,
      expiresIn: OTP_EXPIRY_SECONDS,
    });
  } catch (err) {
    console.error("[send-otp] Unexpected error:", err);
    return serverErrorResponse();
  }
}
