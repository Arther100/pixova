// ============================================
// AgreementStatusBadge — Colored pill for agreement status
// ============================================

"use client";

interface AgreementStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  GENERATED: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Generated",
  },
  VIEWED: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    dot: "bg-green-500",
    label: "Viewed",
  },
  ACKNOWLEDGED: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
    dot: "bg-purple-500",
    label: "Acknowledged",
  },
};

export function AgreementStatusBadge({ status }: AgreementStatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.GENERATED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
