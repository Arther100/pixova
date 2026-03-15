// ============================================
// PaymentSummaryCard — shows financial overview
// ============================================

"use client";

import { formatRupees } from "@/utils/currency";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface PaymentSummaryCardProps {
  totalAmount: number; // paise
  paidAmount: number; // paise
  balanceAmount: number; // paise
  paymentStatus: string;
}

export function PaymentSummaryCard({
  totalAmount,
  paidAmount,
  balanceAmount,
  paymentStatus,
}: PaymentSummaryCardProps) {
  const percent =
    totalAmount > 0
      ? Math.min(Math.round((paidAmount / totalAmount) * 100), 100)
      : 0;

  const barColor =
    percent === 0
      ? "bg-gray-300 dark:bg-gray-600"
      : percent >= 100
      ? "bg-green-500"
      : "bg-amber-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Payment Summary
        </h3>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Amount
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatRupees(totalAmount)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Amount Received
          </span>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatRupees(paidAmount)}
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-400">
            {percent}% received
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Balance Due
          </span>
          <span
            className={`text-lg font-bold ${
              balanceAmount > 0
                ? "text-red-600 dark:text-red-400"
                : balanceAmount < 0
                ? "text-purple-600 dark:text-purple-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {balanceAmount < 0
              ? `Credit: ${formatRupees(Math.abs(balanceAmount))}`
              : formatRupees(balanceAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
