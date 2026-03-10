// ============================================
// BookingStatusBadge — Colored pill showing booking status
// ============================================

"use client";

import { useI18n } from "@/lib/i18n";

interface BookingStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  enquiry: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  confirmed: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  in_progress: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  delivered: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-800 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    dot: "bg-green-500",
  },
  cancelled: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    dot: "bg-red-500",
  },
};

const STATUS_LABEL_KEYS: Record<string, "statusEnquiry" | "statusConfirmed" | "statusInProgress" | "statusDelivered" | "statusCompleted" | "statusCancelled"> = {
  enquiry: "statusEnquiry",
  confirmed: "statusConfirmed",
  in_progress: "statusInProgress",
  delivered: "statusDelivered",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

export function BookingStatusBadge({ status, size = "sm" }: BookingStatusBadgeProps) {
  const { t } = useI18n();
  const style = STATUS_STYLES[status] || STATUS_STYLES.enquiry;
  const labelKey = STATUS_LABEL_KEYS[status] || "statusEnquiry";
  const sizeClasses = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {t.bookings[labelKey]}
    </span>
  );
}
