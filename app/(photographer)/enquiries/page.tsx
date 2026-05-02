"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface EnquiryRow {
  enquiry_id: string;
  client_name: string;
  client_phone: string;
  event_type: string;
  event_date: string;
  event_city: string;
  budget_min: number | null;
  budget_max: number | null;
  message: string | null;
  status: string;
  created_at: string;
  es_id: string;
  es_status: string;
  quote_amount: number | null;
  replied_at: string | null;
}

type StatusFilter = "all" | "PENDING" | "SEEN" | "REPLIED" | "CONVERTED" | "DECLINED";

export default function PhotographerEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/v1/photographer/enquiries?${params}`);
      const json = await res.json();
      if (json.success) {
        setEnquiries(json.data.enquiries || []);
        setTotal(json.data.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  const pendingCount = enquiries.filter(e => e.es_status === "PENDING" || e.es_status === "SEEN").length;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      PENDING:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      SEEN:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      REPLIED:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      DECLINED:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      CONVERTED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Enquiries
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Client enquiries from your public profile
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {pendingCount} need response
          </span>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "PENDING", "SEEN", "REPLIED", "CONVERTED", "DECLINED"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Enquiry list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : enquiries.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <span className="text-4xl">📩</span>
          <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
            No enquiries {statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Complete your profile to appear in marketplace searches and receive enquiries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enquiries.map((enq) => {
            const budgetStr = enq.budget_min && enq.budget_max
              ? `₹${(enq.budget_min / 100).toLocaleString("en-IN")} - ₹${(enq.budget_max / 100).toLocaleString("en-IN")}`
              : enq.budget_max
              ? `Up to ₹${(enq.budget_max / 100).toLocaleString("en-IN")}`
              : null;

            return (
              <Link
                key={enq.es_id}
                href={`/enquiries/${enq.enquiry_id}`}
                className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-4 hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {enq.client_name}
                    </p>
                    <span className="text-xs text-gray-400">
                      {enq.client_phone.replace(/(\d{2})(\d{5})(\d{5})/, "$1XXXXX$3")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    {enq.event_type} · {new Date(enq.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {enq.event_city}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                    {budgetStr && <span>💰 {budgetStr}</span>}
                    {enq.message && <span>💬 {enq.message.slice(0, 60)}{enq.message.length > 60 ? "..." : ""}</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Received {new Date(enq.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(enq.es_status)}`}>
                    {enq.es_status.charAt(0) + enq.es_status.slice(1).toLowerCase()}
                  </span>
                  {enq.quote_amount && (
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{(enq.quote_amount / 100).toLocaleString("en-IN")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-brand-600 hover:underline">
                    View & Reply →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{total} total</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
