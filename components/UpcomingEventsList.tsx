// ============================================
// UpcomingEventsList — Shows next 5 upcoming bookings
// ============================================

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface UpcomingEvent {
  id: string;
  booking_ref: string;
  event_type: string | null;
  event_date: string | null;
  client: { name: string };
}

export function UpcomingEventsList() {
  const { locale, t } = useI18n();
  const dateLocale = `${locale}-IN`;
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const today = new Date().toISOString().split("T")[0];
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureStr = future.toISOString().split("T")[0];

    (async () => {
      try {
        const res = await fetch(
          `/api/v1/bookings?status=confirmed&dateFrom=${today}&dateTo=${futureStr}&sortBy=event_date&sortOrder=asc&limit=5&page=1`
        );
        const json = await res.json();
        if (json.success && json.data?.items) {
          setEvents(json.data.items);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function formatEventDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t.calendar.upcoming}
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t.calendar.upcoming}
      </h3>

      {events.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t.calendar.noUpcoming}
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/bookings/${event.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-brand-700 dark:hover:bg-brand-900/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {event.client?.name || "Unknown"}
                  </p>
                  {event.event_type && (
                    <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      {event.event_type}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {event.event_date && (
                    <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {formatEventDate(event.event_date)}
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-gray-400">
                    {event.booking_ref}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
