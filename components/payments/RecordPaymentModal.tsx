// ============================================
// RecordPaymentModal — record a manual payment
// ============================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { formatRupees, paiseToRupees, rupeesToPaise } from "@/utils/currency";

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  payment_type: string;
  payment_date: string;
  receipt_number: string;
  notes: string | null;
  recorded_by: string;
  created_at: string;
}

interface RecordPaymentModalProps {
  bookingId: string;
  bookingRef: string;
  balanceAmount: number; // paise
  totalAmount: number; // paise
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: PaymentRecord) => void;
}

const PAYMENT_TYPES = [
  { value: "ADVANCE", label: "Advance Payment" },
  { value: "PARTIAL", label: "Partial Payment" },
  { value: "FINAL", label: "Final Payment" },
  { value: "REFUND", label: "Refund" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "💵 Cash" },
  { value: "upi", label: "📱 UPI" },
  { value: "bank_transfer", label: "🏦 Bank Transfer" },
  { value: "cheque", label: "📄 Cheque" },
  { value: "razorpay", label: "💳 Razorpay (manual entry)" },
  { value: "other", label: "📦 Other" },
];

export function RecordPaymentModal({
  bookingId,
  bookingRef,
  balanceAmount,
  // totalAmount reserved for future refund-max logic
  isOpen,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const balanceRupees = paiseToRupees(balanceAmount);
  const [amount, setAmount] = useState(balanceRupees > 0 ? balanceRupees.toString() : "");
  const [paymentType, setPaymentType] = useState("ADVANCE");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const amountPaise = rupeesToPaise(amountNum);

  // Preview text
  const typeLabel =
    PAYMENT_TYPES.find((t) => t.value === paymentType)?.label || paymentType;
  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label?.replace(/^.+\s/, "") ||
    paymentMethod;

  const handleSubmit = async () => {
    if (amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/payments/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          payment_type: paymentType,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to record payment");
        return;
      }

      onSuccess(json.data.payment);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = [
    { label: "₹5,000", value: 5000 },
    { label: "₹10,000", value: 10000 },
    { label: "₹25,000", value: 25000 },
  ];
  if (balanceRupees > 0) {
    quickAmounts.push({
      label: `Full Balance ${formatRupees(balanceAmount)}`,
      value: balanceRupees,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Record Payment
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {bookingRef}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount (₹) *
            </label>
            <input
              type="number"
              min="1"
              max={paymentType !== "REFUND" ? balanceRupees || undefined : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in rupees"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
            {balanceRupees > 0 && paymentType !== "REFUND" && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Balance due: ₹{balanceRupees.toLocaleString("en-IN")}
              </p>
            )}
            {/* Quick amount buttons */}
            <div className="mt-2 flex flex-wrap gap-2">
              {quickAmounts.map((qa) => (
                <button
                  key={qa.value}
                  type="button"
                  onClick={() => setAmount(qa.value.toString())}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-600 dark:hover:text-brand-400"
                >
                  {qa.label}
                </button>
              ))}
            </div>
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
              {PAYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="e.g. Paid via GPay to 9876543210"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* Preview */}
          {amountNum > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              Recording {formatRupees(amountPaise)} {typeLabel.toLowerCase()} via {methodLabel} on{" "}
              {new Date(paymentDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-3">
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
            disabled={amountNum <= 0}
            onClick={handleSubmit}
          >
            Record Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
