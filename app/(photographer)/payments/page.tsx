// ============================================
// /(photographer)/payments — Payments overview
// ============================================

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatRupees } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";

interface BookingPaymentRow {
  id: string;
  booking_ref: string | null;
  title: string;
  event_date: string | null;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string | null;
  client: {
    name: string;
    phone: string;
  };
}

interface PaymentSummary {
  total_bookings: number;
  gross_revenue: number;
  collected: number;
  outstanding: number;
  fully_paid: number;
  partial: number;
  pending: number;
}

type TabFilter = "all" | "PENDING" | "PARTIAL" | "PAID";

const LIMIT = 20;

export default function PaymentsPage() {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<BookingPaymentRow[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [tab, setTab] = useState<TabFilter>("all");

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/payments/summary");
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch {
      // silent
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        page: String(page),
        sortBy: "created_at",
        sortOrder: "desc",
      });
      const res = await fetch(`/api/v1/bookings?${params}`);
      const json = await res.json();
      if (json.success) {
        setBookings(json.data.bookings || []);
        setTotalBookings(json.data.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Derive payment status for bookings without the column
  function deriveStatus(b: BookingPaymentRow): string {
    if (b.payment_status) return b.payment_status;
    if (b.paid_amount <= 0) return "PENDING";
    if (b.paid_amount >= b.total_amount && b.total_amount > 0) return "PAID";
    if (b.paid_amount > b.total_amount) return "OVERPAID";
    return "PARTIAL";
  }

  // Filter out cancelled bookings and apply tab filter
  const filtered = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "cancelled");
    if (tab === "all") return active;
    return active.filter((b) => deriveStatus(b) === tab);
  }, [bookings, tab]);

  const totalPages = Math.ceil(totalBookings / LIMIT);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "PARTIAL", label: "Partial" },
    { key: "PAID", label: "Paid" },
  ];

  return (
    <div>
      {/* Header */}
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        {t.payments.title}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t.payments.subtitle}
      </p>

      {/* Summary Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Receivable"
          value={summary ? formatRupees(summary.gross_revenue) : "—"}
          icon="📊"
        />
        <SummaryCard
          label="Total Received"
          value={summary ? formatRupees(summary.collected) : "—"}
          icon="✅"
          accent="green"
        />
        <SummaryCard
          label="Outstanding"
          value={summary ? formatRupees(summary.outstanding) : "—"}
          icon="⏳"
          accent={summary && summary.outstanding > 0 ? "amber" : "green"}
        />
        <SummaryCard
          label="Fully Paid"
          value={summary ? `${summary.fully_paid} booking${summary.fully_paid !== 1 ? "s" : ""}` : "—"}
          icon="🎉"
        />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="mt-4 animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <span className="text-5xl">💰</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            {tab === "all" ? t.payments.noPayments : `No ${tab.toLowerCase()} bookings`}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t.payments.willAppear}
          </p>
        </div>
      ) : (
        <>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Mobile: card list */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
            {filtered.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}/payments`}
                className="block p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {b.client.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {b.booking_ref || b.title}
                      {b.event_date ? ` · ${formatDate(b.event_date)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatRupees(b.total_amount)}
                    </p>
                    <PaymentStatusBadge status={deriveStatus(b)} size="sm" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Paid: {formatRupees(b.paid_amount)}</span>
                  <span>
                    Due:{" "}
                    <span
                      className={
                        b.balance_amount > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }
                    >
                      {formatRupees(b.balance_amount)}
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <table className="hidden w-full md:table">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Booking
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Paid
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Balance
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/bookings/${b.id}/payments`}
                      className="text-sm font-medium text-gray-900 hover:text-brand-600 dark:text-gray-100 dark:hover:text-brand-400"
                    >
                      {b.client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {b.booking_ref || b.title}
                    </p>
                    {b.event_date && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(b.event_date)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatRupees(b.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-green-600 dark:text-green-400">
                    {formatRupees(b.paid_amount)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-medium ${
                      b.balance_amount > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {formatRupees(b.balance_amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PaymentStatusBadge status={deriveStatus(b)} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{totalBookings} bookings total</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-700">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: "green" | "amber";
}) {
  const valueColor = accent === "green"
    ? "text-green-600 dark:text-green-400"
    : accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-gray-900 dark:text-gray-100";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <span>{icon}</span>
        {label}
      </div>
      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
