/* eslint-disable @next/next/no-img-element */
// ============================================
// SendPaymentLinkModal — UPI payment link + QR code (primary)
//                        Razorpay link (paid subscribers only, optional)
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
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(upiUrl)}`;
}

export function SendPaymentLinkModal({
  bookingId,
  bookingRef,
  clientName,
  balanceAmount,
  studioUpiId,
  studioName,
  isOpen,
  onClose,
  onSuccess,
}: SendPaymentLinkModalProps) {
  const balanceRupees = paiseToRupees(balanceAmount);
  const [amount, setAmount] = useState(balanceRupees.toString());
  const [tab, setTab] = useState<"upi" | "razorpay">(studioUpiId ? "upi" : "razorpay");
  const [paymentType, setPaymentType] = useState("ADVANCE");
  const [description, setDescription] = useState(`Advance payment for ${bookingRef}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [upiGenerated, setUpiGenerated] = useState(false);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const amountPaise = rupeesToPaise(amountNum);
  const upiUrl = studioUpiId ? buildUpiUrl(studioUpiId, studioName, amountNum, bookingRef) : "";
  const qrUrl = upiUrl ? buildQrUrl(upiUrl) : "";

  // ── UPI: send WhatsApp with link + QR ──
  const handleSendUpi = async () => {
    if (amountNum <= 0) { setError("Amount must be greater than 0"); return; }
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
          client_mobile: undefined, // resolved server-side from booking
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to send notification");
        return;
      }
      setUpiGenerated(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Razorpay: create payment link ──
  const handleCreateRazorpay = async () => {
    if (amountNum <= 0) { setError("Amount must be greater than 0"); return; }
    if (amountPaise > balanceAmount) { setError("Amount cannot exceed balance due"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/payments/${bookingId}/payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, payment_type: paymentType, description }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to create payment link");
        return;
      }
      setCreatedLink(json.data.payment_link.short_url);
      onSuccess(json.data.payment_link);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-gray-900" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 p-5 dark:border-gray-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <span className="text-lg">💸</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Send Payment Request</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{bookingRef} · {clientName}</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {studioUpiId && (
              <button
                onClick={() => setTab("upi")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${tab === "upi" ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
              >
                📱 UPI / QR Code
              </button>
            )}
            <button
              onClick={() => setTab("razorpay")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${tab === "razorpay" ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
            >
              💳 Razorpay Link
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹) *</label>
            <input
              type="number" min="1" max={balanceRupees}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">Balance due: {formatRupees(balanceAmount)}</p>
          </div>

          {/* ── UPI Tab ── */}
          {tab === "upi" && studioUpiId && (
            <>
              {upiGenerated ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20 text-center">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3">
                      ✅ WhatsApp sent to {clientName}!
                    </p>
                    {/* QR code for photographer to share */}
                    <img src={qrUrl} alt="UPI QR Code" className="mx-auto rounded-lg border border-green-200" width={180} height={180} />
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      Client can also scan this QR to pay {formatRupees(amountPaise)} via any UPI app
                    </p>
                    <p className="mt-1 text-xs text-gray-500">UPI ID: <span className="font-mono font-medium">{studioUpiId}</span></p>
                  </div>
                  <Button className="w-full" variant="secondary" onClick={onClose}>Done</Button>
                </div>
              ) : (
                <>
                  {/* QR Preview */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/50">
                    {amountNum > 0 ? (
                      <>
                        <img src={qrUrl} alt="UPI QR Code" className="mx-auto rounded-lg" width={200} height={200} />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Scan to pay {formatRupees(amountPaise)} · UPI ID: <span className="font-mono">{studioUpiId}</span>
                        </p>
                      </>
                    ) : (
                      <p className="py-8 text-sm text-gray-400">Enter amount above to generate QR</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      📲 We&apos;ll send {clientName} a WhatsApp with the UPI link + QR code.
                      They can pay directly via Google Pay, PhonePe, or any UPI app.
                    </p>
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <div className="flex gap-3">
                    <Button variant="secondary" size="sm" onClick={onClose} disabled={loading} className="flex-1">Cancel</Button>
                    <Button size="sm" loading={loading} disabled={amountNum <= 0} onClick={handleSendUpi} className="flex-1">
                      Send via WhatsApp
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Razorpay Tab ── */}
          {tab === "razorpay" && (
            <>
              {createdLink ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">Payment link created!</p>
                    <div className="mt-2 flex items-center gap-2">
                      <input type="text" readOnly value={createdLink}
                        className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-green-700 dark:bg-gray-800 dark:text-gray-100" />
                      <Button size="sm" onClick={() => navigator.clipboard.writeText(createdLink)}>Copy</Button>
                    </div>
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">Share this link with {clientName} via WhatsApp</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={onClose} className="w-full">Done</Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Type *</label>
                    <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={inputCls}>
                      <option value="ADVANCE">Advance Payment</option>
                      <option value="PARTIAL">Partial Payment</option>
                      <option value="FINAL">Final Payment</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} className={inputCls} />
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💳 Creates a Razorpay payment link. Client can pay via card, net banking, or UPI.
                      Requires your Razorpay keys to be configured.
                    </p>
                  </div>
                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                  <div className="flex gap-3">
                    <Button variant="secondary" size="sm" onClick={onClose} disabled={loading} className="flex-1">Cancel</Button>
                    <Button size="sm" loading={loading} disabled={amountNum <= 0 || amountPaise > balanceAmount} onClick={handleCreateRazorpay} className="flex-1">
                      Create Link
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* No UPI + no Razorpay */}
          {!studioUpiId && tab === "upi" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">UPI ID not configured</p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Add your UPI ID in <a href="/settings/profile" className="underline font-medium">Settings → Profile</a> to enable UPI payments.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
