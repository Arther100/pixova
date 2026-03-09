// ============================================
// /(photographer)/dashboard — Main dashboard page
// Fetches real data from API and shows overview
// Uses in-memory cache for instant revisits
// ============================================

"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardWelcome, type DashboardData } from "@/components/DashboardWelcome";

// In-memory cache: show stale data instantly, then refresh in background
let cachedData: DashboardData | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export default function DashboardPage() {
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
        if (!cachedData) setError("Network error. Please refresh.");
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
  }, []);

  if (loading) {
    return null; // No flash — data is prefetched, renders instantly
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
