// ============================================
// BookingCard — List-item card for bookings list page
// ============================================

"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { formatRupees } from "@/utils/currency";
import { formatDate } from "@/utils/date";

interface BookingCardProps {
  booking: {
    id: string;
    booking_ref: string | null;
    title: string;
    event_type: string | null;
    event_date: string | null;
    status: string;
    total_amount: number;
    balance_amount: number;
    created_at: string;
    client: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

export function BookingCard({ booking }: BookingCardProps) {
  const { t } = useI18n();
  return (
    <Link
      href={`/bookings/${booking.id}`}
      prefetch={true}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
    >
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 dark:text-gray-100 dark:group-hover:text-brand-400">
          {booking.title}
        </h3>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Client + Ref */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="truncate">{booking.client.name}</span>
        {booking.booking_ref && (
          <span className="shrink-0 font-mono text-gray-400 dark:text-gray-500">
            {booking.booking_ref}
          </span>
        )}
      </div>

      {/* Meta: Event type + Date */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {booking.event_type && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
            {booking.event_type}
          </span>
        )}
        {booking.event_date && (
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(booking.event_date)}
          </span>
        )}
      </div>

      {/* Amount — pushed to bottom */}
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <p className="text-base font-bold text-gray-900 dark:text-gray-100">
          {formatRupees(booking.total_amount)}
        </p>
        {booking.balance_amount > 0 && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {t.bookings.due} {formatRupees(booking.balance_amount)}
          </p>
        )}
      </div>
    </Link>
  );
}
