// ============================================
// /(photographer)/bookings/[bookingId] — Booking detail page
// Shows full booking info, timeline, status actions, edit
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { BookingTimeline } from "@/components/BookingTimeline";
import { ClientDetailsForm } from "@/components/ClientDetailsForm";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { formatRupees, paiseToRupees, rupeesToPaise } from "@/utils/currency";
import { formatDate, formatDateTime } from "@/utils/date";

// ── Status transitions UI ──
const NEXT_ACTIONS: Record<string, { label: string; status: string; variant: "primary" | "secondary" }[]> = {
  enquiry: [
    { label: "Confirm Booking", status: "confirmed", variant: "primary" },
  ],
  confirmed: [
    { label: "Start Work", status: "in_progress", variant: "primary" },
  ],
  in_progress: [
    { label: "Mark Delivered", status: "delivered", variant: "primary" },
  ],
  delivered: [
    { label: "Mark Completed", status: "completed", variant: "primary" },
  ],
  completed: [],
  cancelled: [],
};

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

  const [booking, setBooking] = useState<BookingDetail | null>(bookingCache.get(bookingId) || null);
  const [loading, setLoading] = useState(!bookingCache.has(bookingId));
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");
  const [isOverpay, setIsOverpay] = useState(false);
  const [overpayReason, setOverpayReason] = useState("");
  interface PaymentRecord {
    id: string;
    amount: number;
    method: string;
    status: string;
    payment_date: string;
    description: string | null;
    notes: string | null;
    created_at: string;
  }
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

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

  // Fetch payment history
  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/payments`);
      const json = await res.json();
      if (json.success) setPayments(json.data.payments || []);
    } catch {
      // non-critical
    }
  }, [bookingId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Record a manual payment
  async function handleRecordPayment() {
    const amountPaise = rupeesToPaise(parseFloat(paymentAmount));
    if (!paymentAmount || isNaN(amountPaise) || amountPaise < 100) {
      setStatusError("Minimum payment is ₹1");
      setTimeout(() => setStatusError(null), 3000);
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          method: paymentMethod,
          paymentDate: paymentDate,
          notes: paymentNote || undefined,
          allowOverpay: isOverpay || undefined,
          overpayReason: isOverpay ? overpayReason : undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setStatusError(json.error || "Failed to record payment");
        setTimeout(() => setStatusError(null), 4000);
        return;
      }

      // Update booking amounts locally
      if (booking && json.data.booking) {
        const updated = {
          ...booking,
          total_amount: json.data.booking.total_amount ?? booking.total_amount,
          paid_amount: json.data.booking.paid_amount,
          balance_amount: json.data.booking.balance_amount,
        };
        setBooking(updated);
        bookingCache.set(bookingId, updated);
      }

      // Add new payment to list
      if (json.data.payment) {
        setPayments((prev) => [json.data.payment, ...prev]);
      }

      // Reset modal
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentMethod("upi");
      setPaymentNote("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setIsOverpay(false);
      setOverpayReason("");

      setStatusSuccess(`Payment of ₹${parseFloat(paymentAmount).toLocaleString("en-IN")} recorded!`);
      setTimeout(() => setStatusSuccess(null), 3000);
    } catch {
      setStatusError("Network error. Please try again.");
      setTimeout(() => setStatusError(null), 4000);
    } finally {
      setPaymentLoading(false);
    }
  }

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
        setStatusError(json.error || "Failed to update status");
        setTimeout(() => setStatusError(null), 4000);
        return;
      }
      setBooking(json.data.booking);
      bookingCache.set(bookingId, json.data.booking);
      setShowCancelModal(false);
      setCancelReason("");

      // Show success feedback
      const labels: Record<string, string> = {
        confirmed: "Booking confirmed!",
        in_progress: "Work started!",
        delivered: "Marked as delivered!",
        completed: "Booking completed!",
        cancelled: "Booking cancelled",
      };
      setStatusSuccess(labels[newStatus] || "Status updated!");
      setTimeout(() => setStatusSuccess(null), 3000);
    } catch {
      setStatusError("Network error. Please try again.");
      setTimeout(() => setStatusError(null), 4000);
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">⚠️</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {error || "Booking not found"}
        </p>
        <Link href="/bookings" className="mt-4">
          <Button variant="secondary">Back to Bookings</Button>
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
          Bookings
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
              <span>Created {formatDateTime(booking.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/bookings/${booking.id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
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

      {/* ── Main content grid ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: Booking details (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Event details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Event Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {booking.event_date && (
                <InfoRow
                  label="Event Date"
                  value={formatDate(booking.event_date)}
                />
              )}
              {booking.event_end_date && (
                <InfoRow
                  label="End Date"
                  value={formatDate(booking.event_end_date)}
                />
              )}
              {booking.event_time && (
                <InfoRow label="Time" value={booking.event_time} />
              )}
              {booking.venue && (
                <InfoRow label="Venue" value={booking.venue} />
              )}
              {booking.venue_address && (
                <InfoRow label="Address" value={booking.venue_address} />
              )}
              {booking.city && (
                <InfoRow label="City" value={booking.city} />
              )}
              {booking.package && (
                <InfoRow
                  label="Package"
                  value={`${booking.package.name} — ${formatRupees(booking.package.price)}`}
                />
              )}
              {booking.team_members.length > 0 && (
                <InfoRow
                  label="Team"
                  value={booking.team_members.join(", ")}
                />
              )}
            </div>
          </div>

          {/* Financial details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Payment Summary
              </h3>
              {booking.status !== "cancelled" && (
                <button
                  onClick={() => {
                    setShowPaymentModal(true);
                    // Auto-enable overpay when fully paid
                    if (booking.balance_amount <= 0) {
                      setIsOverpay(true);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Record Payment
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FinanceCard
                label="Total Amount"
                value={formatRupees(booking.total_amount)}
                variant="default"
              />
              <FinanceCard
                label="Advance Expected"
                value={formatRupees(booking.advance_amount)}
                variant="default"
              />
              <FinanceCard
                label="Paid"
                value={formatRupees(booking.paid_amount)}
                variant="success"
              />
              <FinanceCard
                label="Balance Due"
                value={formatRupees(booking.balance_amount)}
                variant={booking.balance_amount > 0 ? "warning" : "success"}
              />
            </div>

            {/* Extra paid indicator */}
            {booking.paid_amount > booking.total_amount && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-900/20">
                <svg className="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <span className="font-medium">Extra paid:</span>{" "}
                  {formatRupees(booking.paid_amount - booking.total_amount)} over total amount
                </p>
              </div>
            )}

            {booking.balance_amount === 0 && booking.paid_amount > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-800 dark:bg-green-900/20">
                <svg className="h-4 w-4 shrink-0 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Fully Paid
                </p>
              </div>
            )}

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Payment History
                </h4>
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          p.status === "captured"
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatRupees(p.amount)}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {p.method.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())} · {formatDate(p.payment_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        {p.description && p.description.startsWith("Extra payment:") && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Extra
                          </span>
                        )}
                        {(p.description && p.description.startsWith("Extra payment:")) && (
                          <p className="max-w-[200px] truncate text-[11px] text-amber-600 dark:text-amber-400">
                            {p.description.replace("Extra payment: ", "")}
                          </p>
                        )}
                        {p.notes && (
                          <p className="max-w-[200px] truncate text-xs text-gray-400 dark:text-gray-500">
                            {p.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {(booking.notes || booking.internal_notes) && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notes
              </h3>
              {booking.notes && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Client-facing notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {booking.notes}
                  </p>
                </div>
              )}
              {booking.internal_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Internal notes (private)
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

      {/* ── Record Payment Modal ── */}
      {showPaymentModal && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Record Payment
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {booking.balance_amount > 0
                    ? `Balance due: ${formatRupees(booking.balance_amount)}`
                    : "Fully paid — record extra payment"}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Amount — capped to balance unless overpay is on */}
              {(() => {
                const maxRupees = paiseToRupees(booking.balance_amount);
                return (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={isOverpay ? undefined : maxRupees}
                      value={paymentAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!isOverpay && val && parseFloat(val) > maxRupees) {
                          setPaymentAmount(maxRupees.toString());
                        } else {
                          setPaymentAmount(val);
                        }
                      }}
                      placeholder={`Max ₹${maxRupees.toLocaleString("en-IN")}`}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                    {!isOverpay && (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Maximum: ₹{maxRupees.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="select-styled w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Input
                label="Payment Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Note (optional)
                </label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="e.g., Advance via Google Pay"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>

              {/* Overpay toggle */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isOverpay}
                    onChange={(e) => {
                      setIsOverpay(e.target.checked);
                      if (!e.target.checked) {
                        setOverpayReason("");
                        // Cap amount back to balance
                        const max = paiseToRupees(booking.balance_amount);
                        if (paymentAmount && parseFloat(paymentAmount) > max) {
                          setPaymentAmount(max.toString());
                        }
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Client is paying extra
                  </span>
                </label>
                {isOverpay && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Reason for extra payment *
                    </label>
                    <input
                      type="text"
                      value={overpayReason}
                      onChange={(e) => setOverpayReason(e.target.value)}
                      placeholder="e.g., Extra hours, additional editing"
                      maxLength={200}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount("");
                  setPaymentNote("");
                  setIsOverpay(false);
                  setOverpayReason("");
                }}
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                loading={paymentLoading}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || (isOverpay && !overpayReason.trim())}
                onClick={handleRecordPayment}
              >
                Record Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Cancel Booking
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please provide a reason for cancelling this booking.
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
                Keep Booking
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={statusLoading}
                disabled={!cancelReason.trim()}
                onClick={() => handleStatusChange("cancelled", cancelReason.trim())}
              >
                Confirm Cancellation
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

function FinanceCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "default" | "success" | "warning";
}) {
  const colors = {
    default: "text-gray-900 dark:text-gray-100",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${colors[variant]}`}>
        {value}
      </p>
    </div>
  );
}
