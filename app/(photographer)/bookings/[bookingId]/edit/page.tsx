// ============================================
// /(photographer)/bookings/[bookingId]/edit — Edit booking
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookingForm } from "@/components/BookingForm";
import { Button } from "@/components/ui";

export default function EditBookingPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/v1/bookings/${bookingId}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Booking not found");
          return;
        }

        const b = json.data;

        // Cannot edit cancelled or completed bookings
        if (b.status === "cancelled" || b.status === "completed") {
          setError(`Cannot edit a ${b.status} booking`);
          return;
        }

        setInitialData({
          title: b.title,
          eventType: b.event_type || "",
          eventDate: b.event_date || "",
          eventEndDate: b.event_end_date || "",
          eventTime: b.event_time || "",
          venue: b.venue || "",
          venueAddress: b.venue_address || "",
          city: b.city || "",
          packageId: b.package_id || "",
          totalAmount: b.total_amount,
          advanceAmount: b.advance_amount,
          notes: b.notes || "",
          internalNotes: b.internal_notes || "",
          teamMembers: b.team_members || [],
          status: b.status,
        });
      } catch {
        setError("Network error. Please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-7 w-36 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
              <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            </div>
          </div>
          <div>
            <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
              <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="h-10 w-20 rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">⚠️</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {error || "Could not load booking"}
        </p>
        <Link href="/bookings" className="mt-4">
          <Button variant="secondary">Back to Bookings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/bookings" className="hover:text-brand-600 dark:hover:text-brand-400">
          Bookings
        </Link>
        <span>/</span>
        <Link
          href={`/bookings/${bookingId}`}
          className="hover:text-brand-600 dark:hover:text-brand-400"
        >
          {(initialData.title as string) || "Detail"}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Edit</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
          Edit Booking
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update booking details. Some fields may be locked after confirmation.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 lg:p-8 dark:border-gray-700 dark:bg-gray-900">
        <BookingForm
          mode="edit"
          bookingId={bookingId}
          initialData={initialData as Record<string, string | number | string[] | undefined>}
        />
      </div>
    </div>
  );
}
