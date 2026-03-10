// ============================================
// AvailabilityLegend — Calendar colour legend
// ============================================

"use client";

import { useI18n } from "@/lib/i18n";

export function AvailabilityLegend() {
  const { t } = useI18n();

  const items = [
    { label: t.calendar.free, color: "bg-green-500", desc: t.calendar.available },
    { label: t.calendar.booked, color: "bg-red-500", desc: t.calendar.confirmedBooking },
    { label: t.calendar.enquiry, color: "bg-amber-500", desc: t.calendar.unconfirmed },
    { label: t.calendar.blocked, color: "bg-gray-400", desc: t.calendar.manuallyBlocked },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t.calendar.legend}
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {item.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              — {item.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
