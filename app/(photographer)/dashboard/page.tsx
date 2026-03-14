// ============================================
// /(photographer)/dashboard — Main dashboard page
// Fetches real data from API and shows overview
// Uses in-memory cache for instant revisits
// ============================================

"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { DashboardWelcome, type DashboardData } from "@/components/DashboardWelcome";

// In-memory cache: show stale data instantly, then refresh in background
let cachedData: DashboardData | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      try {
        const res = await fetch("/api/v1/dashboard");
        const json = await res.json();

        if (!isMounted.current) return;

        if (!res.ok || !json.success) {
          if (!cachedData) setError(json.error || "Failed to load dashboard");
          return;
        }

        cachedData = json.data;
        cacheTime = Date.now();
        setData(json.data);
      } catch {
        if (!isMounted.current) return;
        if (!cachedData) setError(t.dashboard.networkError);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    // If cache is fresh, skip fetch
    if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
      setLoading(false);
    } else {
      fetchData();
    }

    return () => { isMounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div>
          <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 h-4 w-72 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-32 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          <div className="h-32 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">⚠️</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {error || t.dashboard.somethingWrong}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t.dashboard.retry}
        </button>
      </div>
    );
  }

  return <DashboardWelcome data={data} />;
}
