/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

const PIXOVA_UPI_ID = "kuttyvj50-2@okhdfcbank";
const PIXOVA_NAME = "Pixova";

interface Plan {
  slug: string;
  name: string;
  price: number; // rupees
}

interface Props {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function buildUpiUrl(amountRupees: number, planName: string) {
  const tn = encodeURIComponent(`Pixova ${planName} Plan`);
  const pn = encodeURIComponent(PIXOVA_NAME);
  return `upi://pay?pa=${encodeURIComponent(PIXOVA_UPI_ID)}&pn=${pn}&am=${amountRupees.toFixed(2)}&cu=INR&tn=${tn}`;
}

function buildQrUrl(upiUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(upiUrl)}`;
}

export function SubscriptionUpiModal({ plan, isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"pay" | "utr" | "done">("pay");
  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const upiUrl = buildUpiUrl(plan.price, plan.name);
  const qrUrl = buildQrUrl(upiUrl);

  const handleSubmitUtr = async () => {
    const trimmed = utr.trim();
    if (!trimmed || trimmed.length < 6) {
      setUtrError("Enter a valid UTR number (at least 6 characters)");
      return;
    }
    setUtrError(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/subscription/upi-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_slug: plan.slug, utr_number: trimmed, amount: plan.price }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to submit. Please try again.");
        return;
      }
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900" style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg dark:bg-green-900/30">
            💳
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Upgrade to {plan.name}
            </p>
            <p className="text-xs text-gray-500">Pay via UPI · ₹{plan.price}/month</p>
          </div>
          <button onClick={onClose} className="ml-auto shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── STEP 1: Pay ── */}
          {step === "pay" && (
            <>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center space-y-3 dark:border-gray-700 dark:bg-gray-800/50">
                <img src={qrUrl} alt="UPI QR" className="mx-auto rounded-lg" width={200} height={200} />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Scan with Google Pay, PhonePe, or Paytm</p>
                  <p className="mt-1 text-xs font-mono text-gray-600 dark:text-gray-300">{PIXOVA_UPI_ID}</p>
                  <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">₹{plan.price}</p>
                </div>
              </div>

              {/* Pay button for mobile */}
              <a
                href={upiUrl}
                className="block w-full rounded-xl bg-green-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                Pay ₹{plan.price} via UPI App
              </a>

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-800/50 dark:bg-blue-900/10">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  After paying, click below and enter your <strong>UTR / transaction number</strong> to confirm.
                </p>
              </div>

              <button
                onClick={() => setStep("utr")}
                className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                I&apos;ve paid → Enter UTR
              </button>
            </>
          )}

          {/* ── STEP 2: UTR entry ── */}
          {step === "utr" && (
            <>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  UTR / Transaction Number <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => { setUtr(e.target.value); setUtrError(null); }}
                  placeholder="e.g. 421234567890"
                  className={`${inputCls} ${utrError ? "border-red-400" : ""}`}
                />
                {utrError && <p className="mt-1 text-xs text-red-500">{utrError}</p>}
                <p className="mt-1 text-xs text-gray-400">
                  Find UTR in your UPI app under payment history.
                </p>
              </div>

              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-900/10">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  We&apos;ll verify your payment and activate <strong>{plan.name}</strong> within a few hours.
                </p>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("pay")}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmitUtr}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
                >
                  {loading ? "Submitting…" : "Submit UTR"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Done ── */}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  Payment request submitted!
                </p>
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  We&apos;ve received your UTR. Your <strong>{plan.name}</strong> plan will be activated within a few hours.
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Need faster help? WhatsApp us at <strong>+91 87786 67396</strong>
              </p>
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
