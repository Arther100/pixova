// ============================================
// SendPaymentLinkModal — create Razorpay payment link
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
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (link: { id: string; short_url: string; amount: number; expires_at: string }) => void;
}

export function SendPaymentLinkModal({
  bookingId,
  bookingRef,
  clientName,
  balanceAmount,
  isOpen,
  onClose,
  onSuccess,
}: SendPaymentLinkModalProps) {
  const balanceRupees = paiseToRupees(balanceAmount);
  const [amount, setAmount] = useState(balanceRupees.toString());
  const [paymentType, setPaymentType] = useState("ADVANCE");
  const [description, setDescription] = useState(
    `Advance payment for ${bookingRef}`
  );
  const [notifySms, setNotifySms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const amountPaise = rupeesToPaise(amountNum);

  const handleSubmit = async () => {
    if (amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (amountPaise > balanceAmount) {
      setError("Amount cannot exceed balance due");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/payments/${bookingId}/payment-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amountPaise,
            payment_type: paymentType,
            description: description || undefined,
            notify_sms: notifySms,
          }),
        }
      );

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

  const copyLink = () => {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Send Payment Link
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {bookingRef} · {clientName}
            </p>
          </div>
        </div>

        {createdLink ? (
          /* Success state — show the link */
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Payment link created!
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdLink}
                  className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-green-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <Button size="sm" onClick={copyLink}>
                  Copy
                </Button>
              </div>
              <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                Share this link with {clientName} via WhatsApp
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Form state */
          <div className="mt-5 space-y-4">
            {/* Amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                max={balanceRupees}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-400">
                Maximum: {formatRupees(balanceAmount)}
              </p>
            </div>

            {/* Payment Type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Type *
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="ADVANCE">Advance Payment</option>
                <option value="PARTIAL">Partial Payment</option>
                <option value="FINAL">Final Payment</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Notify SMS */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifySms}
                onChange={(e) => setNotifySms(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Notify client via SMS
                </span>
                <p className="text-xs text-gray-400">
                  ₹0.15/SMS via Razorpay
                </p>
              </div>
            </label>

            {/* Info box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                📱 Payment link will be created at rzp.io. Share it with{" "}
                {clientName} on WhatsApp manually. You&apos;ll be notified when
                payment is received.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                loading={loading}
                disabled={amountNum <= 0 || amountPaise > balanceAmount}
                onClick={handleSubmit}
              >
                Create Payment Link
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
