// ============================================
// /(photographer)/bookings — Bookings list page
// Filters, search, pagination, empty state
// ============================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { BookingCard } from "@/components/BookingCard";
import { Button } from "@/components/ui";

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
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "enquiry", label: "Enquiry" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest First" },
  { value: "created_at:asc", label: "Oldest First" },
  { value: "event_date:asc", label: "Event Date (Soonest)" },
  { value: "event_date:desc", label: "Event Date (Latest)" },
  { value: "total_amount:desc", label: "Amount (High → Low)" },
  { value: "total_amount:asc", label: "Amount (Low → High)" },
];

// In-memory cache: show stale data instantly on revisit, refresh in background
let cachedBookings: BookingListResponse | null = null;
let cachedKey = "";

export default function BookingsPage() {
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
            Bookings
          </h1>
          <p className="mt-1 hidden text-sm text-gray-500 sm:block dark:text-gray-400">
            Manage your photography bookings and events.
          </p>
        </div>
        <Link href="/bookings/new" prefetch={true}>
          <Button>New Booking</Button>
        </Link>
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
            placeholder="Search by client name, mobile, or booking ref..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-styled rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
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
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Content ── */}
      <div className="mt-6">
        {loading && !data ? (
          null // No flash — data is prefetched
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-4xl">⚠️</span>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={fetchBookings}>
              Retry
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
              {searchQuery || statusFilter ? "No bookings match your filters" : "No bookings yet"}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter
                ? "Try adjusting your search or filters."
                : "Create your first booking to get started."}
            </p>
            {!searchQuery && !statusFilter && (
              <Link href="/bookings/new" prefetch={true} className="mt-6">
                <Button>New Booking</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Bookings list */}
            <div className="space-y-3">
              {data.items.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>

            {/* Pagination */}
            {data.total > limit && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, data.total)} of {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.hasMore}
                  >
                    Next
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
