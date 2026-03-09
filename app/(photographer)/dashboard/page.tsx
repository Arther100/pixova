// ============================================
// /(photographer)/dashboard — Main dashboard page
// Fetches real data from API and shows overview
// ============================================

"use client";

import { useState, useEffect } from "react";
import { DashboardWelcome, type DashboardData } from "@/components/DashboardWelcome";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/dashboard");
        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.error || "Failed to load dashboard");
          return;
        }

        setData(json.data);
      } catch {
        setError("Network error. Please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">⚠️</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {error || "Something went wrong"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return <DashboardWelcome data={data} />;
}
