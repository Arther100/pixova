/* eslint-disable @next/next/no-img-element */
// ============================================
// SendPaymentLinkModal — UPI-first payment request
// If UPI ID not set: ask inline. Razorpay is a secondary fallback.
// ============================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { formatRupees, paiseToRupees, rupeesToPaise } from "@/utils/currency";

interface SendPaymentLinkModalProps {
  bookingId: string;
  bookingRef: string;
  clientName: string;
  clientMobile: string;
  balanceAmount: number; // paise
  studioUpiId: string | null;
  studioName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (link: { id: string; short_url: string; amount: number; expires_at: string }) => void;
}

function buildUpiUrl(upiId: string, studioName: string, amountRupees: number, ref: string) {
  const tn = encodeURIComponent(`Payment for ${ref}`);
  const pn = encodeURIComponent(studioName || "Studio");
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${pn}&am=${amountRupees.toFixed(2)}&cu=INR&tn=${tn}`;
}

function buildQrUrl(upiUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upiUrl)}`;
}

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function SendPaymentLinkModal({
  bookingId,
  bookingRef,
  clientName,
  balanceAmount,
  studioUpiId: initialUpiId,
  studioName,
  isOpen,
  onClose,
  onSuccess,
}: SendPaymentLinkModalProps) {
  const balanceRupees = paiseToRupees(balanceAmount);

  const [amount, setAmount] = useState(balanceRupees.toString());
  const [upiId, setUpiId] = useState(initialUpiId || "");
  const [upiError, setUpiError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<{ name: string | null } | null>(initialUpiId ? { name: null } : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);

  // Razorpay state
  const [paymentType, setPaymentType] = useState("ADVANCE");
  const [description, setDescription] = useState(`Advance payment for ${bookingRef}`);
  const [rzpLink, setRzpLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const amountPaise = rupeesToPaise(amountNum);
  const upiValid = UPI_REGEX.test(upiId.trim());
  const upiUrl = upiValid && verified ? buildUpiUrl(upiId.trim(), studioName, amountNum, bookingRef) : "";
  const qrUrl = upiUrl ? buildQrUrl(upiUrl) : "";

  const handleVerifyUpi = async () => {
    if (!upiValid) { setUpiError("Invalid UPI ID format (e.g. name@oksbi or 9876543210@ybl)"); return; }
    setVerifying(true);
    setUpiError(null);
    setVerified(null);
    try {
      const res = await fetch("/api/v1/settings/verify-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upi_id: upiId.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setUpiError(json.error || "UPI ID not found. Please check and try again.");
        return;
      }
      setVerified({ name: json.data.name || null });
    } catch {
      setUpiError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500";

  // ── Send UPI via WhatsApp ──
  const handleSendUpi = async () => {
    if (amountNum <= 0) { setError("Enter an amount"); return; }
    if (!upiId.trim()) { setUpiError("Enter your UPI ID"); return; }
    if (!upiValid) { setUpiError("Invalid UPI ID format (e.g. name@oksbi or 9876543210@ybl)"); return; }
    setUpiError(null);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/payments/${bookingId}/upi-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          upi_url: upiUrl,
          qr_url: qrUrl,
          upi_id: upiId.trim(), // save to profile if new
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.error || "Failed to send"); return; }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Create Razorpay link ──
  const handleCreateRazorpay = async () => {
    if (amountNum <= 0 || amountPaise > balanceAmount) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/payments/${bookingId}/payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, payment_type: paymentType, description }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.error || "Failed to create link"); return; }
      setRzpLink(json.data.payment_link.short_url);
      onSuccess(json.data.payment_link);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900" style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg dark:bg-green-900/30">
            💸
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Send Payment Request</p>
            <p className="truncate text-xs text-gray-500">{bookingRef} · {clientName}</p>
          </div>
          <button onClick={onClose} className="ml-auto shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── SUCCESS STATE ── */}
          {sent && (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  ✅ WhatsApp sent to {clientName}!
                </p>
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  They received the UPI payment link + QR code.
                </p>
              </div>
              {qrUrl && (
                <div className="space-y-1">
                  <img src={qrUrl} alt="UPI QR" className="mx-auto rounded-xl border border-gray-200" width={200} height={200} />
                  <p className="text-xs text-gray-400">Scan to pay {formatRupees(amountPaise)}</p>
                  <p className="text-xs font-mono text-gray-500">{upiId}</p>
                </div>
              )}
              <Button className="w-full" variant="secondary" onClick={onClose}>Done</Button>
            </div>
          )}

          {/* ── RAZORPAY SUCCESS ── */}
          {rzpLink && !sent && (
            <div className="space-y-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <p className="mb-2 text-sm font-semibold text-green-700 dark:text-green-300">Payment link created!</p>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={rzpLink} className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs dark:border-green-700 dark:bg-gray-800 dark:text-gray-100" />
                  <Button size="sm" onClick={() => navigator.clipboard.writeText(rzpLink)}>Copy</Button>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={onClose} className="w-full">Done</Button>
            </div>
          )}

          {/* ── MAIN FORM ── */}
          {!sent && !rzpLink && (
            <>
              {/* Amount */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="Enter amount" />
                <p className="mt-1 text-xs text-gray-400">Balance due: {formatRupees(balanceAmount)}</p>
              </div>

              {!showRazorpay ? (
                /* ── UPI FLOW (primary) ── */
                <>
                  {/* UPI ID — pre-filled if saved, else ask inline */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Your UPI ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => { setUpiId(e.target.value); setUpiError(null); setVerified(null); }}
                        placeholder="name@oksbi  or  9876543210@ybl"
                        className={`${inputCls} flex-1 ${upiError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : verified ? "border-green-400 focus:border-green-400" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyUpi}
                        disabled={!upiValid || verifying}
                        className="shrink-0 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {verifying ? "..." : "Verify"}
                      </button>
                    </div>
                    {upiError && <p className="mt-1 text-xs text-red-500">❌ {upiError}</p>}
                    {verified && (
                      <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                        ✅ {verified.name ? `${verified.name} — UPI verified` : "UPI ID verified"}
                      </p>
                    )}
                    {!initialUpiId && !verified && (
                      <p className="mt-1 text-xs text-gray-400">Verify first, then send. UPI ID will be saved to your profile.</p>
                    )}
                  </div>

                  {/* Live QR preview */}
                  {upiValid && amountNum > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800/50">
                      <img src={qrUrl} alt="UPI QR" className="mx-auto rounded-lg" width={160} height={160} />
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Client scans → pays {formatRupees(amountPaise)} → directly to your account
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-800/50 dark:bg-blue-900/10">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      📲 We&apos;ll WhatsApp {clientName} the UPI link + QR code.
                      Money goes <strong>directly to your account</strong> — no middleman.
                    </p>
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <Button className="w-full" loading={loading} disabled={amountNum <= 0 || !verified} onClick={handleSendUpi}>
                    Send via WhatsApp 📲
                  </Button>

                  {/* Razorpay fallback link */}
                  <p className="text-center text-xs text-gray-400">
                    Want to send a Razorpay link instead?{" "}
                    <button onClick={() => setShowRazorpay(true)} className="text-brand-600 hover:underline dark:text-brand-400">
                      Use Razorpay →
                    </button>
                  </p>
                </>
              ) : (
                /* ── RAZORPAY FLOW (secondary) ── */
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-900/10">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      💳 Razorpay links require your Razorpay API keys configured.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Type</label>
                    <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={inputCls}>
                      <option value="ADVANCE">Advance</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="FINAL">Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} className={inputCls} />
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowRazorpay(false)} className="flex-1">
                      ← Back to UPI
                    </Button>
                    <Button size="sm" loading={loading} disabled={amountNum <= 0 || amountPaise > balanceAmount} onClick={handleCreateRazorpay} className="flex-1">
                      Create Link
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
