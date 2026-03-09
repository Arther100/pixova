// ============================================
// BookingCard — List-item card for bookings list page
// ============================================

"use client";

import Link from "next/link";
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
  return (
    <Link
      href={`/bookings/${booking.id}`}
      prefetch={true}
      className="group block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 dark:text-gray-100 dark:group-hover:text-brand-400">
              {booking.title}
            </h3>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {/* Client */}
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {booking.client.name}
            </span>

            {/* Booking ref */}
            {booking.booking_ref && (
              <span className="font-mono text-gray-400 dark:text-gray-500">
                {booking.booking_ref}
              </span>
            )}

            {/* Event type */}
            {booking.event_type && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                {booking.event_type}
              </span>
            )}

            {/* Event date */}
            {booking.event_date && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(booking.event_date)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Amount */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatRupees(booking.total_amount)}
          </p>
          {booking.balance_amount > 0 && (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
              Due: {formatRupees(booking.balance_amount)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
