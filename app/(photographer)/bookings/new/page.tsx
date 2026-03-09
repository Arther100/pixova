// ============================================
// /(photographer)/bookings/new — Create new booking
// ============================================

"use client";

import { BookingForm } from "@/components/BookingForm";
import Link from "next/link";

export default function NewBookingPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link
            href="/bookings"
            prefetch={true}
            className="hover:text-brand-600 dark:hover:text-brand-400"
          >
            Bookings
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">New Booking</span>
        </nav>
      </div>

      {/* Page header */}
      <div className="mb-8 flex items-start gap-3">
        <Link
          href="/bookings"
          prefetch={true}
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          aria-label="Back to Bookings"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create New Booking
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add a new photography booking for a client.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <BookingForm mode="create" />
      </div>
    </div>
  );
}
