// ============================================
// /(photographer)/bookings — Bookings list page
// Filters, search, pagination, empty state
// ============================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { BookingCard } from "@/components/BookingCard";
import { Button } from "@/components/ui";
import BookingSummaryCards from "@/components/BookingSummaryCards";
import QuotaWarningBanner from "@/components/QuotaWarningBanner";

interface BookingListItem {
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
    email: string | null;
    whatsapp: string | null;
  };
}

interface BookingListResponse {
  items: BookingListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  quota?: {
    used: number;
    limit: number;
    resetDate: string | null;
  };
}

// In-memory cache: show stale data instantly on revisit, refresh in background
let cachedBookings: BookingListResponse | null = null;
let cachedKey = "";

export default function BookingsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<BookingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortValue, setSortValue] = useState("created_at:desc");
  const [page, setPage] = useState(1);
  const limit = 20;
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounce search input (300ms)
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const fetchBookings = useCallback(async () => {
    const [sortBy, sortOrder] = sortValue.split(":");
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (statusFilter) params.set("status", statusFilter);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    const key = params.toString();

    // Show cached data instantly if same filters
    if (cachedBookings && cachedKey === key) {
      setData(cachedBookings);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await fetch(`/api/v1/bookings?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (!cachedBookings) setError(json.error || "Failed to fetch bookings");
        return;
      }

      cachedBookings = json.data;
      cachedKey = key;
      setData(json.data);
    } catch {
      if (!cachedBookings) setError("Network error. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, sortValue, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Prefetch packages so "New Booking" opens instantly
  useEffect(() => {
    fetch("/api/v1/packages").catch(() => {});
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, sortValue]);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t.bookings.title}
          </h1>
          <p className="mt-1 hidden text-sm text-gray-500 sm:block dark:text-gray-400">
            {t.bookings.subtitle}
          </p>
        </div>
        <Link href="/bookings/new" prefetch={true}>
          <Button>{t.bookings.newBooking}</Button>
        </Link>
      </div>

      {/* ── Summary Cards & Quota Banner ── */}
      <div className="mt-6">
        <BookingSummaryCards />
        {data?.quota && (
          <QuotaWarningBanner
            used={data.quota.used}
            limit={data.quota.limit}
            resetDate={data.quota.resetDate}
          />
        )}
      </div>

      {/* ── Filters bar ── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.bookings.searchPlaceholder}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-styled rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100"
        >
          {[
            { value: "", label: t.bookings.allStatuses },
            { value: "enquiry", label: t.bookings.statusEnquiry },
            { value: "confirmed", label: t.bookings.statusConfirmed },
            { value: "in_progress", label: t.bookings.statusInProgress },
            { value: "delivered", label: t.bookings.statusDelivered },
            { value: "completed", label: t.bookings.statusCompleted },
            { value: "cancelled", label: t.bookings.statusCancelled },
          ].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortValue}
          onChange={(e) => setSortValue(e.target.value)}
          className="select-styled rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100"
        >
          {[
            { value: "created_at:desc", label: t.bookings.newestFirst },
            { value: "created_at:asc", label: t.bookings.oldestFirst },
            { value: "event_date:asc", label: t.bookings.eventSoonest },
            { value: "event_date:desc", label: t.bookings.eventLatest },
            { value: "total_amount:desc", label: t.bookings.amountHighLow },
            { value: "total_amount:asc", label: t.bookings.amountLowHigh },
          ].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Content ── */}
      <div className="mt-6">
        {loading && !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-36 rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-4xl">⚠️</span>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={fetchBookings}>
              {t.retry}
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <svg
              className="h-12 w-12 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {searchQuery || statusFilter ? t.bookings.noMatch : t.bookings.noBookings}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter
                ? t.bookings.adjustFilters
                : t.bookings.createFirst}
            </p>
            {!searchQuery && !statusFilter && (
              <Link href="/bookings/new" prefetch={true} className="mt-6">
                <Button>{t.bookings.newBooking}</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Bookings grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.items.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>

            {/* Pagination */}
            {data.total > limit && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t.bookings.showing} {(page - 1) * limit + 1}–
                  {Math.min(page * limit, data.total)} {t.bookings.of} {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t.bookings.previous}
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t.bookings.page} {page}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.hasMore}
                  >
                    {t.bookings.next}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
