// ============================================
// POST /api/v1/auth/verify-otp
// Verify OTP → photographer record → JWT session cookie
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { verifyOtpSchema } from "@/lib/validations";
import { normalizePhone, toE164 } from "@/utils/phone";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  createActiveSession,
  createTrialSubscription,
  enforceSessionLimit,
  getSessionLimit,
} from "@/lib/auth";
import { OTP_MAX_ATTEMPTS } from "@/lib/constants";
import type { OtpSession } from "@/types";
import crypto from "crypto";
import { createSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Validate input ──
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid input");
    }

    const normalizedPhone = normalizePhone(parsed.data.phone);
    console.log(`[verify-otp] phone=${normalizedPhone} otp_input=${parsed.data.otp}`);
    const otpHash = crypto
      .createHash("sha256")
      .update(parsed.data.otp)
      .digest("hex");

    const supabase = createSupabaseAdmin();

    // ── Fetch latest unverified OTP for this phone ──
    const { data, error: fetchError } = await supabase
      .from("otp_sessions")
      .select("*")
      .eq("phone", normalizedPhone)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const otpRecord = data as OtpSession | null;

    if (fetchError || !otpRecord) {
      console.warn(`[verify-otp] No valid OTP record found for ${normalizedPhone}`, fetchError?.message);
      return errorResponse(
        "OTP expired or not found. Please request a new one."
      );
    }

    console.log(`[verify-otp] Found OTP record id=${otpRecord.id} attempts=${otpRecord.attempts} expires=${otpRecord.expires_at}`);

    // ── Check max attempts ──
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      return errorResponse("Too many attempts. Please request a new OTP.");
    }

    // ── Increment attempt counter ──
    await supabase
      .from("otp_sessions")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // ── Verify hash ──
    if (otpRecord.otp_hash !== otpHash) {
      const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
      console.warn(
        `[verify-otp] Hash mismatch for phone ${normalizedPhone} | ` +
        `attempt ${otpRecord.attempts + 1}/${OTP_MAX_ATTEMPTS} | ` +
        `stored_hash=${otpRecord.otp_hash.slice(0, 8)}… | ` +
        `input_hash=${otpHash.slice(0, 8)}…`
      );
      return errorResponse(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Invalid OTP. No attempts remaining. Please request a new OTP."
      );
    }

    // ── Mark OTP as verified ──
    await supabase
      .from("otp_sessions")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // ── Find or create Supabase Auth user ──
    const e164Phone = toE164(normalizedPhone);
    let authUserId: string;
    let isNewUser = false;

    // Search for existing photographer by phone
    const { data: existingPhotographer } = await supabase
      .from("photographers")
      .select("id, auth_id, is_onboarded, full_name")
      .eq("phone", normalizedPhone)
      .single();

    if (existingPhotographer) {
      // Existing user — use their auth_id
      authUserId = existingPhotographer.auth_id;
    } else {
      // Create a Supabase Auth user for DB foreign keys / RLS only
      const { data: newAuth, error: createError } =
        await supabase.auth.admin.createUser({
          phone: e164Phone,
          phone_confirm: true,
          user_metadata: { phone: normalizedPhone },
        });

      if (createError || !newAuth.user) {
        console.error("[verify-otp] Auth create error:", createError);
        return serverErrorResponse("Failed to create user account");
      }

      authUserId = newAuth.user.id;
      isNewUser = true;
    }

    // ── Ensure photographer record exists ──
    let photographer = existingPhotographer;

    if (!photographer) {
      const { data: newPhotographer, error: pgError } = await supabase
        .from("photographers")
        .insert({
          auth_id: authUserId,
          phone: normalizedPhone,
          full_name: "",
        })
        .select("id, is_onboarded, full_name")
        .single();

      if (pgError || !newPhotographer) {
        console.error("[verify-otp] Photographer create error:", pgError);
        return serverErrorResponse("Failed to create photographer profile");
      }

      photographer = { ...newPhotographer, auth_id: authUserId };
      isNewUser = true;

      // Create trial subscription for new users
      await createTrialSubscription(photographer.id);
    }

    // ── Enforce session limit ──
    const sessionLimit = await getSessionLimit(photographer.id);
    await enforceSessionLimit(photographer.id, sessionLimit);

    // ── Create active session ──
    await createActiveSession(photographer.id, request);

    // ── Update last_login_at ──
    await supabase
      .from("photographers")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", photographer.id);

    // ── Determine redirect ──
    const needsOnboarding = isNewUser || !photographer.is_onboarded;
    const redirectTo = needsOnboarding ? "/onboarding" : "/dashboard";

    // ── Create long-lived JWT session token ──
    // We return it in the JSON body. The login page (same origin)
    // sets it as a cookie via document.cookie, then navigates.
    // This is the only approach that works reliably everywhere,
    // including VS Code Simple Browser (iframe sandbox).
    const sessionToken = await createSessionToken({
      photographerId: photographer.id,
      authId: authUserId,
      phone: normalizedPhone,
    });

    console.log(`[verify-otp] ✅ Session token created for ${normalizedPhone} → ${redirectTo}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "OTP verified successfully",
          sessionToken,
          redirectTo,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[verify-otp] Unexpected error:", err);
    return serverErrorResponse();
  }
}
