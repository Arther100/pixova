// ============================================
// /(photographer)/bookings/[bookingId] — Booking detail page
// Shows full booking info, timeline, status actions, edit
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { AgreementStatusBadge } from "@/components/AgreementStatusBadge";
import { BookingTimeline } from "@/components/BookingTimeline";
import { ClientDetailsForm } from "@/components/ClientDetailsForm";
import { Button } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { formatRupees } from "@/utils/currency";
import { formatDate, formatDateTime } from "@/utils/date";


interface BookingDetail {
  id: string;
  booking_ref: string | null;
  title: string;
  event_type: string | null;
  event_date: string | null;
  event_end_date: string | null;
  event_time: string | null;
  venue: string | null;
  venue_address: string | null;
  city: string | null;
  status: string;
  total_amount: number;
  advance_amount: number;
  paid_amount: number;
  balance_amount: number;
  notes: string | null;
  internal_notes: string | null;
  team_members: string[];
  created_at: string;
  updated_at: string;
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    whatsapp: string | null;
    city?: string | null;
    address?: string | null;
  };
  package?: {
    id: string;
    name: string;
    price: number;
    deliverables: string | null;
  } | null;
}

// Cache booking detail for instant revisits
const bookingCache = new Map<string, BookingDetail>();

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { t } = useI18n();

  const NEXT_ACTIONS: Record<string, { label: string; status: string; variant: "primary" | "secondary" }[]> = {
    enquiry: [{ label: t.bookings.confirmBooking, status: "confirmed", variant: "primary" }],
    confirmed: [{ label: t.bookings.startWork, status: "in_progress", variant: "primary" }],
    in_progress: [{ label: t.bookings.markDelivered, status: "delivered", variant: "primary" }],
    delivered: [{ label: t.bookings.markCompleted, status: "completed", variant: "primary" }],
    completed: [],
    cancelled: [],
  };

  const [booking, setBooking] = useState<BookingDetail | null>(bookingCache.get(bookingId) || null);
  const [loading, setLoading] = useState(!bookingCache.has(bookingId));
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");


  // Agreement state
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [agreementRef, setAgreementRef] = useState<string | null>(null);
  const [agreementStatus, setAgreementStatus] = useState<string | null>(null);
  const [generatingAgreement, setGeneratingAgreement] = useState(false);

  const fetchBooking = useCallback(async () => {
    // Show cached data instantly, still refresh in background
    if (!bookingCache.has(bookingId)) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (!bookingCache.has(bookingId)) setError(json.error || "Booking not found");
        return;
      }
      bookingCache.set(bookingId, json.data);
      setBooking(json.data);
    } catch {
      if (!bookingCache.has(bookingId)) setError("Network error. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Fetch agreement for this booking
  const fetchAgreement = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/agreements?booking_id=${bookingId}`);
      const json = await res.json();
      if (json.success && json.data?.agreements?.length) {
        const a = json.data.agreements[0];
        setAgreementId(a.agreement_id);
        setAgreementRef(a.agreement_ref);
        setAgreementStatus(a.status);
      }
    } catch {
      // non-critical
    }
  }, [bookingId]);

  useEffect(() => {
    fetchAgreement();
  }, [fetchAgreement]);

  async function handleGenerateAgreement() {
    setGeneratingAgreement(true);
    try {
      const res = await fetch(`/api/v1/agreements/generate/${bookingId}`, { method: "POST" });
      const json = await res.json();
      if (json.success && json.data?.agreement) {
        setAgreementId(json.data.agreement.agreement_id);
        setAgreementRef(json.data.agreement.agreement_ref);
        setAgreementStatus("GENERATED");
        setStatusSuccess(t.agreements.generated);
        setTimeout(() => setStatusSuccess(null), 3000);
      } else {
        setStatusError(json.error || t.bookings.failedStatus);
        setTimeout(() => setStatusError(null), 4000);
      }
    } catch {
      setStatusError(t.bookings.networkError);
      setTimeout(() => setStatusError(null), 4000);
    } finally {
      setGeneratingAgreement(false);
    }
  }

  // Record a manual payment — now in dedicated /bookings/[id]/payments page

  async function handleStatusChange(newStatus: string, reason?: string) {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setStatusError(json.error || t.bookings.failedStatus);
        setTimeout(() => setStatusError(null), 4000);
        return;
      }
      setBooking(json.data.booking);
      bookingCache.set(bookingId, json.data.booking);
      setShowCancelModal(false);
      setCancelReason("");

      // Show success feedback
      const labels: Record<string, string> = {
        confirmed: t.bookings.bookingConfirmed,
        in_progress: t.bookings.workStarted,
        delivered: t.bookings.markedDelivered,
        completed: t.bookings.bookingCompleted,
        cancelled: t.bookings.bookingCancelled,
      };
      setStatusSuccess(labels[newStatus] || t.bookings.statusUpdated);
      setTimeout(() => setStatusSuccess(null), 3000);
    } catch {
      setStatusError(t.bookings.networkError);
      setTimeout(() => setStatusError(null), 4000);
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div>
              <div className="h-7 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-4 w-64 rounded bg-gray-100 dark:bg-gray-800/60" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
        <div className="h-16 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-48 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
            <div className="h-32 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          </div>
          <div className="h-64 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">⚠️</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {error || t.bookings.bookingNotFound}
        </p>
        <Link href="/bookings" className="mt-4">
          <Button variant="secondary">{t.bookings.backToBookings}</Button>
        </Link>
      </div>
    );
  }

  const actions = NEXT_ACTIONS[booking.status] || [];
  const canCancel = !["completed", "cancelled"].includes(booking.status);
  const canEdit = booking.status === "enquiry";

  return (
    <div>
      {/* ── Success / Error Toast ── */}
      {statusSuccess && (
        <div className="fixed right-4 top-20 z-50 animate-in slide-in-from-right flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg dark:border-green-800 dark:bg-green-900/40">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
            <svg className="h-3.5 w-3.5 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-green-800 dark:text-green-200">{statusSuccess}</span>
        </div>
      )}
      {statusError && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg dark:border-red-800 dark:bg-red-900/40">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-800">
            <svg className="h-3.5 w-3.5 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="text-sm font-medium text-red-800 dark:text-red-200">{statusError}</span>
        </div>
      )}

      {/* ── Breadcrumb ── */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/bookings" prefetch={true} className="hover:text-brand-600 dark:hover:text-brand-400">
          {t.bookings.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">
          {booking.booking_ref || booking.title}
        </span>
      </nav>

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
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
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
                {booking.title}
              </h1>
              <BookingStatusBadge status={booking.status} size="md" />
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              {booking.booking_ref && (
                <span className="font-mono">{booking.booking_ref}</span>
              )}
              {booking.event_type && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                  {booking.event_type}
                </span>
              )}
              <span>{t.bookings.created} {formatDateTime(booking.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons — always right-aligned */}
        <div className="flex items-center justify-end gap-2 sm:shrink-0">
          {canEdit && (
            <Link href={`/bookings/${booking.id}/edit`}>
              <Button variant="secondary" size="sm">
                {t.bookings.edit}
              </Button>
            </Link>
          )}
          {actions.map((action) => (
            <Button
              key={action.status}
              variant={action.variant}
              size="sm"
              loading={statusLoading}
              onClick={() => handleStatusChange(action.status)}
            >
              {action.label}
            </Button>
          ))}
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              disabled={statusLoading}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <BookingTimeline currentStatus={booking.status} />
      </div>

      {/* ── Agreement Quick Link ── */}
      {booking.status !== "cancelled" && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t.agreements.title}
                </h3>
                {agreementRef && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {agreementRef}
                  </p>
                )}
              </div>
              {agreementStatus && <AgreementStatusBadge status={agreementStatus} />}
            </div>
            <div>
              {booking.status === "enquiry" ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t.agreements.confirmFirst}
                </span>
              ) : agreementId ? (
                <Link href={`/bookings/${booking.id}/agreement`}>
                  <Button variant="secondary" size="sm">
                    {t.agreements.viewAgreement}
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  loading={generatingAgreement}
                  onClick={handleGenerateAgreement}
                >
                  {t.agreements.clickToGenerate}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Quick Link ── */}
      {booking.status !== "cancelled" && booking.status !== "enquiry" && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t.galleries.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.galleries.uploadAndShare}
                </p>
              </div>
            </div>
            <Link href={`/galleries/${booking.id}`}>
              <Button variant="secondary" size="sm">
                {t.galleries.openGallery}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: Booking details (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Event details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t.bookings.eventDetails}
            </h3>
            <div className="space-y-3">
              {booking.event_date && (
                <InfoRow
                  label={t.bookings.eventDate}
                  value={formatDate(booking.event_date)}
                />
              )}
              {booking.event_end_date && (
                <InfoRow
                  label={t.bookings.endDate}
                  value={formatDate(booking.event_end_date)}
                />
              )}
              {booking.event_time && (
                <InfoRow label={t.bookings.time} value={booking.event_time} />
              )}
              {booking.venue && (
                <InfoRow label={t.bookings.venue} value={booking.venue} />
              )}
              {booking.venue_address && (
                <InfoRow label={t.bookings.address} value={booking.venue_address} />
              )}
              {booking.city && (
                <InfoRow label={t.bookings.city} value={booking.city} />
              )}
              {booking.package && (
                <InfoRow
                  label={t.bookings.packageLabel}
                  value={`${booking.package.name} — ${formatRupees(booking.package.price)}`}
                />
              )}
              {booking.team_members.length > 0 && (
                <InfoRow
                  label={t.bookings.team}
                  value={booking.team_members.join(", ")}
                />
              )}
            </div>
          </div>

          {/* Payments Quick Link Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                  <svg className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t.bookings.paymentSummary}
                    </h3>
                    <PaymentStatusBadge
                      status={
                        booking.paid_amount <= 0
                          ? "PENDING"
                          : booking.paid_amount >= booking.total_amount && booking.total_amount > 0
                            ? booking.paid_amount > booking.total_amount ? "OVERPAID" : "PAID"
                            : "PARTIAL"
                      }
                      size="sm"
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Total: {formatRupees(booking.total_amount)}</span>
                    <span className="text-green-600 dark:text-green-400">
                      Paid: {formatRupees(booking.paid_amount)}
                    </span>
                    <span className={booking.balance_amount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                      Due: {formatRupees(booking.balance_amount)}
                    </span>
                  </div>
                </div>
              </div>
              <Link href={`/bookings/${booking.id}/payments`}>
                <Button variant="secondary" size="sm">
                  View Payments
                </Button>
              </Link>
            </div>
          </div>

          {/* Notes */}
          {(booking.notes || booking.internal_notes) && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t.bookings.notes}
              </h3>
              {booking.notes && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.bookings.clientFacing}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {booking.notes}
                  </p>
                </div>
              )}
              {booking.internal_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t.bookings.internalNotes}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {booking.internal_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Client info (1 col) */}
        <div>
          <ClientDetailsForm client={booking.client} />
        </div>
      </div>

      {/* ── Cancel Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t.bookings.cancelBooking}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t.bookings.cancelReason}
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g., Client requested cancellation..."
              className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={statusLoading}
              >
                {t.bookings.keepBooking}
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={statusLoading}
                disabled={!cancelReason.trim()}
                onClick={() => handleStatusChange("cancelled", cancelReason.trim())}
              >
                {t.bookings.confirmCancellation}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper components ──

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}


