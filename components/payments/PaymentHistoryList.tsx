// ============================================
// PaymentHistoryList — list of payment records
// ============================================

"use client";

import { useState } from "react";
import { formatRupees } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { Button } from "@/components/ui";

interface PaymentRecord {
  id: string;
  amount: number; // paise
  method: string;
  status: string;
  payment_type: string | null;
  payment_date: string;
  description: string | null;
  notes: string | null;
  receipt_number: string | null;
  razorpay_payment_id: string | null;
  recorded_by: string | null;
  created_at: string;
}

interface PaymentHistoryListProps {
  payments: PaymentRecord[];
  bookingId: string;
  onPaymentDeleted: (paymentId: string) => void;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  razorpay: "Razorpay",
  other: "Other",
};

const TYPE_LABELS: Record<string, string> = {
  ADVANCE: "Advance",
  PARTIAL: "Partial",
  FINAL: "Final",
  REFUND: "Refund",
  OVERAGE: "Overage",
};

export function PaymentHistoryList({
  payments,
  bookingId,
  onPaymentDeleted,
}: PaymentHistoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (paymentId: string) => {
    setDeletingId(paymentId);
    try {
      const res = await fetch(
        `/api/v1/payments/${bookingId}/${paymentId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        onPaymentDeleted(paymentId);
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <span className="text-4xl">💰</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No payments recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((p) => {
        const isRefund = p.payment_type === "REFUND";
        const isOnline = p.recorded_by === "CLIENT";
        const canDelete = !isOnline;
        const methodLabel = METHOD_LABELS[p.method] || p.method;
        const typeLabel = p.payment_type
          ? TYPE_LABELS[p.payment_type] || p.payment_type
          : null;

        return (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
          >
            {/* Left: receipt + type + method */}
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  isRefund
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {p.receipt_number && (
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {p.receipt_number}
                    </span>
                  )}
                  {typeLabel && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isRefund
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {typeLabel}
                    </span>
                  )}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {methodLabel}
                  </span>
                  {isOnline && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Online
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(p.payment_date)}
                  </span>
                  {p.notes && (
                    <span className="max-w-[200px] truncate text-xs text-gray-400 dark:text-gray-500">
                      · {p.notes}
                    </span>
                  )}
                </div>
                {p.razorpay_payment_id && (
                  <p className="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                    {p.razorpay_payment_id}
                  </p>
                )}
              </div>
            </div>

            {/* Right: amount + delete */}
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold ${
                  isRefund
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {isRefund ? "-" : "+"}
                {formatRupees(p.amount)}
              </span>

              {canDelete && (
                <>
                  {confirmDeleteId === p.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={deletingId === p.id}
                        onClick={() => handleDelete(p.id)}
                      >
                        Confirm
                      </Button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      title="Delete payment"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
