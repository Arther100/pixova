// ============================================
// PaymentStatusBadge — payment status indicator
// ============================================

"use client";

interface PaymentStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const styles: Record<string, string> = {
  PENDING:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  PARTIAL:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  PAID:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  OVERPAID:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  REFUNDED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

export function PaymentStatusBadge({ status, size = "md" }: PaymentStatusBadgeProps) {
  const className =
    styles[status] || styles.PENDING;

  const sizeClass = size === "sm"
    ? "px-2 py-0.5 text-[10px]"
    : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${className}`}
    >
      {status}
    </span>
  );
}
