// ============================================
// /login — OTP-based phone login
// ============================================

"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { OTPInput } from "@/components/ui/otp-input";
import { OTP_EXPIRY_SECONDS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

type Step = "phone" | "otp";

// Verify state machine: idle → verifying → error/success
// Only "idle" allows a new verify call — prevents ALL loop scenarios
type VerifyState = "idle" | "verifying" | "error" | "success";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { t } = useI18n();

  // ── State ──
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [countdown, setCountdown] = useState(0);

  const isVerifying = verifyState === "verifying";

  // ── Resend countdown ──
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ── Send OTP ──
  const handleSendOtp = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError("");
      setSendingOtp(true);

      try {
        const res = await fetch("/api/v1/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: `+91${phone}` }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || t.login.failedToSend);
          return;
        }

        setChannel(data.data.channel);
        setStep("otp");
        setOtp("");
        setVerifyState("idle");
        setCountdown(30);
      } catch {
        setError(t.login.networkError);
      } finally {
        setSendingOtp(false);
      }
    },
    [phone, t]
  );

  // ── Verify OTP — only runs from "idle" state ──
  const doVerify = useCallback(
    async (otpValue: string) => {
      // HARD GATE: only proceed from idle state
      if (otpValue.length !== 6) return;

      setVerifyState((prev) => {
        // Only transition from idle → verifying
        if (prev !== "idle") return prev;
        return "verifying";
      });
    },
    []
  );

  // ── Actual verify effect — fires when verifyState becomes "verifying" ──
  useEffect(() => {
    if (verifyState !== "verifying" || otp.length !== 6) return;

    const otpValue = otp;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/v1/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: `+91${phone}`, otp: otpValue }),
        });

        if (cancelled) return;

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || t.login.verificationFailed);
          setOtp("");
          setVerifyState("error"); // ← NOT "idle", so no re-trigger
          return;
        }

        setVerifyState("success");

        // Try setting cookie (works in real browsers, not in VS Code Simple Browser iframe)
        const maxAge = 60 * 60 * 24 * 7; // 7 days
        document.cookie = `pixova_session=${data.data.sessionToken};path=/;max-age=${maxAge};samesite=lax`;

        // Navigate with token in URL as fallback (needed for iframe environments
        // like VS Code Simple Browser where ALL cookie mechanisms are blocked).
        // Middleware reads _pxtoken from URL when cookie is absent.
        const target = data.data.redirectTo || redirect || "/dashboard";
        const url = new URL(target, window.location.origin);
        url.searchParams.set("_pxtoken", data.data.sessionToken);
        window.location.href = url.toString();
      } catch {
        if (cancelled) return;
        setError(t.login.networkError);
        setOtp("");
        setVerifyState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [verifyState, otp, phone, redirect, t]);

  // ── OTP change handler ──
  const handleOtpChange = useCallback(
    (val: string) => {
      setOtp(val);
      setError("");
      // Reset to idle when user starts typing again (after error)
      setVerifyState("idle");

      // Auto-submit when 6 digits are entered
      if (val.length === 6) {
        doVerify(val);
      }
    },
    [doVerify]
  );

  // ── Change number ──
  const handleChangeNumber = useCallback(() => {
    setStep("phone");
    setOtp("");
    setError("");
    setVerifyState("idle");
  }, []);

  // ── Resend OTP ──
  const handleResend = useCallback(async () => {
    setOtp("");
    setError("");
    setVerifyState("idle");
    await handleSendOtp();
  }, [handleSendOtp]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      {/* Full-screen overlay when verified — hides OTP UI instantly */}
      {verifyState === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="flex flex-col items-center gap-4">
            <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t.login.settingUp}</p>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-brand-600">
            {t.appName}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {step === "phone" ? t.login.signInTitle : t.login.enterOtp}
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {step === "phone" ? (
            // ── Phone Step ──
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t.login.phoneLabel}
                </label>
                <div className="mt-1 flex overflow-hidden rounded-xl border border-gray-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500 dark:border-gray-600">
                  <span className="flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder={t.login.phonePlaceholder}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    className="flex-1 px-3 py-2.5 text-sm outline-none dark:bg-gray-900 dark:text-gray-100"
                    autoFocus
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t.login.phoneHint}
                </p>
              </div>

              {error && (
                <p className="text-center text-xs text-red-500">{error}</p>
              )}

              <Button
                type="submit"
                disabled={phone.length !== 10 || sendingOtp}
                loading={sendingOtp}
                className="w-full"
              >
                {t.login.sendOtp}
              </Button>
            </form>
          ) : (
            // ── OTP Step ──
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.login.otpSentVia}{" "}
                  <span className="font-medium capitalize">{channel}</span>{" "}
                  {t.login.otpSentTo}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  +91 {phone.slice(0, 5)} {phone.slice(5)}
                </p>
              </div>

              <OTPInput
                value={otp}
                onChange={handleOtpChange}
                disabled={isVerifying}
                error={error}
              />

              {/* Error message */}
              {error && verifyState === "error" && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-center dark:bg-red-900/20 dark:border-red-800">
                  <p className="text-sm text-red-600">{error}</p>
                  <p className="mt-1 text-xs text-red-400">
                    {t.login.retryHint}
                  </p>
                </div>
              )}

              <Button
                onClick={() => doVerify(otp)}
                disabled={otp.length !== 6 || isVerifying}
                loading={isVerifying}
                className="w-full"
              >
                {t.login.verifySignIn}
              </Button>

              {/* Resend + change number */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isVerifying}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:text-gray-400"
                >
                  {countdown > 0
                    ? `${t.login.resendOtpIn} ${countdown}s`
                    : t.login.resendOtp}
                </button>
                <button
                  type="button"
                  onClick={handleChangeNumber}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {t.login.changeNumber}
                </button>
              </div>

              {/* Timer info */}
              <p className="text-center text-[11px] text-gray-400">
                {t.login.otpExpires} {Math.floor(OTP_EXPIRY_SECONDS / 60)}{" "}
                {t.login.minutes} • {t.login.maxAttempts}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          {t.terms.bySigningIn}{" "}
          <a href="/terms" className="underline hover:text-gray-600">
            {t.terms.termsOfService}
          </a>{" "}
          {t.terms.and}{" "}
          <a href="/privacy" className="underline hover:text-gray-600">
            {t.terms.privacyPolicy}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
