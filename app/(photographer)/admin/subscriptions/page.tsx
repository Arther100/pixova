"use client";

import { useEffect, useState } from "react";

interface PaymentRequest {
  id: string;
  photographer_id: string;
  plan_slug: string;
  amount_rupees: number;
  utr_number: string;
  status: string;
  studio_name: string | null;
  phone: string | null;
  created_at: string;
  activated_at: string | null;
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  STUDIO: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminSubscriptionsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "activated" | "all">("pending");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/payment-requests");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to load. Are you logged in as admin?");
        return;
      }
      setRequests(json.data.requests);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async (requestId: string, studioName: string) => {
    if (!confirm(`Activate subscription for ${studioName}?`)) return;
    setActivating(requestId);
    try {
      const res = await fetch("/api/v1/admin/activate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Activation failed.");
        return;
      }
      // Mark as activated in UI without full reload
      setRequests((prev) =>
        prev.map((r) => r.id === requestId ? { ...r, status: "activated", activated_at: new Date().toISOString() } : r)
      );
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setActivating(null);
    }
  };

  const filtered = requests.filter((r) => filter === "all" ? true : r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">UPI payment requests pending activation</p>
        </div>
        <button
          onClick={load}
          className="text-sm text-brand-500 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["pending", "activated", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-400 text-sm">
            {filter === "pending" ? "No pending requests" : "No requests found"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((req) => (
          <div
            key={req.id}
            className={`rounded-2xl border p-5 bg-white dark:bg-gray-900 ${
              req.status === "pending"
                ? "border-amber-200 dark:border-amber-800/50"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {req.studio_name || "Unknown Studio"}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[req.plan_slug] || "bg-gray-100 text-gray-600"}`}>
                    {req.plan_slug}
                  </span>
                  {req.status === "activated" && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      ✓ Activated
                    </span>
                  )}
                  {req.status === "pending" && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Pending
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>₹{req.amount_rupees}</span>
                  {req.phone && <span>📱 {req.phone}</span>}
                  <span>🕐 {formatDate(req.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">UTR:</p>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-800 dark:text-gray-200">
                    {req.utr_number}
                  </code>
                </div>

                {req.activated_at && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Activated on {formatDate(req.activated_at)}
                  </p>
                )}
              </div>

              {req.status === "pending" && (
                <button
                  onClick={() => handleActivate(req.id, req.studio_name || "this studio")}
                  disabled={activating === req.id}
                  className="shrink-0 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-60"
                >
                  {activating === req.id ? "Activating…" : "Activate"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
