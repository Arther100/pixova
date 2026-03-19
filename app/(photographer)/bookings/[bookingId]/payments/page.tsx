// ============================================
// /(photographer)/bookings/[bookingId]/payments — Payment tracking for a booking
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { PaymentSummaryCard } from "@/components/payments/PaymentSummaryCard";
import { RecordPaymentModal } from "@/components/payments/RecordPaymentModal";
import { SendPaymentLinkModal } from "@/components/payments/SendPaymentLinkModal";
import { PaymentHistoryList } from "@/components/payments/PaymentHistoryList";
import { ActivePaymentLink } from "@/components/payments/ActivePaymentLink";

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  status: string;
  payment_type: string | null;
  payment_date: string;
  description: string | null;
  notes: string | null;
  receipt_number: string | null;
  razorpay_payment_id: string | null;
  recorded_by: string | null;
  created_at: string;
}

interface PaymentSummary {
  total_amount: number;
  advance_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  total_paid: number;
  total_refunded: number;
}

interface RazorpayOrder {
  id: string;
  razorpay_order_id: string;
  amount_paise: number;
  short_url: string;
  status: string;
  payment_type: string;
  expires_at: string;
  created_at: string;
}

interface BookingInfo {
  id: string;
  booking_ref: string | null;
  title: string;
  event_type: string | null;
  event_date: string | null;
  status: string;
  client: {
    name: string;
    phone: string;
    email: string | null;
  };
}

export default function BookingPaymentsPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { t } = useI18n();

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeLink, setActiveLink] = useState<RazorpayOrder | null>(null);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [payRes, bookingRes] = await Promise.all([
        fetch(`/api/v1/payments/${bookingId}`),
        fetch(`/api/v1/bookings/${bookingId}`),
      ]);

      const payJson = await payRes.json();
      const bookingJson = await bookingRes.json();

      if (payJson.success) {
        setSummary(payJson.data.summary);
        setPayments(payJson.data.payments || []);
        setActiveLink(payJson.data.active_payment_link);
      }

      if (bookingJson.success) {
        setBooking(bookingJson.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePaymentRecorded = () => {
    showToast("success", "Payment recorded!");
    fetchData();
  };

  const handlePaymentDeleted = () => {
    showToast("success", "Payment deleted");
    fetchData();
  };

  const handleLinkCreated = () => {
    showToast("success", "Payment link created!");
    fetchData();
  };

  const handleLinkCancelled = () => {
    showToast("success", "Payment link cancelled");
    setActiveLink(null);
  };

  const handleSendViaWhatsApp = async () => {
    try {
      const res = await fetch('/api/v1/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, type: 'payment_link' }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Payment link sent via WhatsApp');
      } else {
        showToast('error', json.error || 'Failed to send');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-40 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        <div className="h-32 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      </div>
    );
  }

  const bookingRef =
    booking?.booking_ref || booking?.title || bookingId.slice(0, 8);
  const isCancelled = booking?.status === "cancelled";

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/40"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/40"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              toast.type === "success"
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            }`}
          >
            {toast.text}
          </span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/bookings"
          className="hover:text-brand-600 dark:hover:text-brand-400"
        >
          {t.bookings.title}
        </Link>
        <span>/</span>
        <Link
          href={`/bookings/${bookingId}`}
          className="hover:text-brand-600 dark:hover:text-brand-400"
        >
          {bookingRef}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Payments</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Payments
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {bookingRef}
            {booking?.client?.name ? ` · ${booking.client.name}` : ""}
          </p>
        </div>

        {!isCancelled && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendViaWhatsApp}
            >
              Send via WhatsApp
            </Button>
            {summary && summary.balance_amount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowLinkModal(true)}
              >
                Send Payment Link
              </Button>
            )}
            <Button size="sm" onClick={() => setShowRecordModal(true)}>
              Record Payment
            </Button>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="mt-6">
          <PaymentSummaryCard
            totalAmount={summary.total_amount}
            paidAmount={summary.paid_amount}
            balanceAmount={summary.balance_amount}
            paymentStatus={summary.payment_status}
          />
        </div>
      )}

      {/* Active Payment Link */}
      {activeLink && (
        <div className="mt-4">
          <ActivePaymentLink
            link={activeLink}
            bookingId={bookingId}
            onLinkCancelled={handleLinkCancelled}
          />
        </div>
      )}

      {/* Payment History */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Payment History
        </h3>
        <PaymentHistoryList
          payments={payments}
          bookingId={bookingId}
          onPaymentDeleted={handlePaymentDeleted}
        />
      </div>

      {/* Record Payment Modal */}
      {summary && (
        <RecordPaymentModal
          bookingId={bookingId}
          bookingRef={bookingRef}
          balanceAmount={summary.balance_amount}
          totalAmount={summary.total_amount}
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          onSuccess={handlePaymentRecorded}
        />
      )}

      {/* Send Payment Link Modal */}
      {summary && booking?.client && (
        <SendPaymentLinkModal
          bookingId={bookingId}
          bookingRef={bookingRef}
          clientName={booking.client.name}
          clientMobile={booking.client.phone}
          balanceAmount={summary.balance_amount}
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onSuccess={handleLinkCreated}
        />
      )}
    </div>
  );
}
