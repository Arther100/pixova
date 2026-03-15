// ============================================
// ActivePaymentLink — shows active Razorpay link
// ============================================

"use client";

import { useState } from "react";
import { formatRupees } from "@/utils/currency";
import { Button } from "@/components/ui";

interface RazorpayOrder {
  id: string;
  razorpay_order_id: string;
  amount_paise: number;
  short_url: string;
  status: string;
  payment_type: string;
  expires_at: string;
  created_at: string;
}

interface ActivePaymentLinkProps {
  link: RazorpayOrder | null;
  bookingId: string;
  onLinkCancelled: () => void;
}

export function ActivePaymentLink({
  link,
  bookingId,
  onLinkCancelled,
}: ActivePaymentLinkProps) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!link) return null;

  const expiresAt = new Date(link.expires_at);
  const now = new Date();
  const hoursLeft = Math.max(
    0,
    Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
  );
  const isExpired = expiresAt < now;

  const expiryColor = isExpired
    ? "text-red-600 dark:text-red-400"
    : hoursLeft < 24
    ? "text-amber-600 dark:text-amber-400"
    : "text-green-600 dark:text-green-400";

  const expiryText = isExpired
    ? "Expired"
    : `Expires in ${hoursLeft} hours`;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/v1/payments/${bookingId}/payment-link`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        onLinkCancelled();
      }
    } catch {
      // silent
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TYPE_LABELS: Record<string, string> = {
    ADVANCE: "Advance",
    PARTIAL: "Partial",
    FINAL: "Final",
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Active Payment Link
            </span>
            <span className={`text-xs font-medium ${expiryColor}`}>
              {expiryText}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-300">
            {formatRupees(link.amount_paise)} ·{" "}
            {TYPE_LABELS[link.payment_type] || link.payment_type}
          </p>
          <p className="mt-1 font-mono text-xs text-blue-600 dark:text-blue-400">
            {link.short_url}
          </p>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <a
              href={link.short_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm">
                Open
              </Button>
            </a>
            {confirmCancel ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  loading={cancelling}
                  onClick={handleCancel}
                >
                  Confirm Cancel
                </Button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Keep
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel Link
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
