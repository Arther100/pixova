"use client";

import { useI18n } from "@/lib/i18n";

interface QuotaWarningBannerProps {
  used: number;
  limit: number;
  resetDate?: string | null;
}

export default function QuotaWarningBanner({
  used,
  limit,
  resetDate,
}: QuotaWarningBannerProps) {
  const { t } = useI18n();
  // -1 limit = unlimited plan (Studio) — never show banner
  if (limit === -1) return null;

  const percentage = (used / limit) * 100;

  // Only show when >= 80% used
  if (percentage < 80) return null;

  const remaining = limit - used;
  const isExceeded = used >= limit;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
        isExceeded
          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{isExceeded ? "🚫" : "⚠️"}</span>
        <span
          className={
            isExceeded
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }
        >
          {isExceeded
            ? t.quota.limitReached
            : `${used}/${limit} — ${remaining} ${t.quota.nearLimit}`}
          {resetDate && (
            <span className="ml-1 opacity-70">
              {t.quota.resetsOn}{" "}
              {new Date(resetDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
              .
            </span>
          )}
        </span>
      </div>
      <a
        href="/settings"
        className={`whitespace-nowrap font-medium underline ${
          isExceeded
            ? "text-red-700 dark:text-red-300"
            : "text-amber-700 dark:text-amber-300"
        }`}
      >
        {t.quota.upgrade}
      </a>
    </div>
  );
}
