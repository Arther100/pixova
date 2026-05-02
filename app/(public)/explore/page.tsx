"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Studio {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  city: string | null;
  state: string | null;
  specializations: string[];
  starting_price: number | null;
  avg_rating: number;
  review_count: number;
  years_experience: number;
  is_verified: boolean;
  featured: boolean;
  cover_photo_url: string | null;
}

const SPECIALIZATION_OPTIONS = [
  "Wedding", "Pre-Wedding", "Portrait", "Corporate",
  "Fashion", "Newborn", "Event", "Product", "Architecture", "Wildlife",
];

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? "text-yellow-400" : i === full + 1 && half ? "text-yellow-300" : "text-gray-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

function StudioCard({ studio, availableDate }: { studio: Studio; availableDate?: string }) {
  const priceStr = studio.starting_price
    ? `₹${(studio.starting_price / 100).toLocaleString("en-IN")}`
    : null;

  return (
    <Link
      href={`/${studio.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Cover photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {studio.cover_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={studio.cover_photo_url}
            alt={studio.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">📷</div>
        )}
        {studio.featured && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
            Featured
          </span>
        )}
        {availableDate && (
          <span className="absolute right-2 top-2 rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
            ✓ Available
          </span>
        )}
        {studio.is_verified && (
          <span className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-brand-600">
          {studio.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          📍 {studio.city}{studio.state ? `, ${studio.state}` : ""}
        </p>

        {/* Rating */}
        {studio.avg_rating > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={studio.avg_rating} />
            <span className="text-xs text-gray-500">
              {studio.avg_rating.toFixed(1)} ({studio.review_count})
            </span>
          </div>
        )}

        {/* Specializations */}
        {studio.specializations?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {studio.specializations.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {s}
              </span>
            ))}
            {studio.specializations.length > 3 && (
              <span className="text-xs text-gray-400">+{studio.specializations.length - 3}</span>
            )}
          </div>
        )}

        {/* Price */}
        {priceStr && (
          <p className="mt-auto pt-2 text-sm font-bold text-gray-900 dark:text-white">
            Starting {priceStr}
          </p>
        )}
      </div>
    </Link>
  );
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [studios, setStudios] = useState<Studio[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filter state
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [specialization, setSpecialization] = useState(searchParams.get("specialization") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "default");
  const [minRating, setMinRating] = useState<number | null>(
    searchParams.get("rating") ? Number(searchParams.get("rating")) : null
  );

  const limit = 12;

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(limit));
    if (city)          p.set("city", city);
    if (date)          p.set("date", date);
    if (specialization) p.set("specialization", specialization);
    if (sort !== "default") p.set("sort", sort);
    if (minRating != null)  p.set("rating", String(minRating));
    return p;
  }, [page, city, date, specialization, sort, minRating]);

  const fetchStudios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/explore?${buildParams()}`);
      const json = await res.json();
      if (json.success) {
        setStudios(json.data.studios || []);
        setTotal(json.data.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchStudios(); }, [fetchStudios]);

  // Update URL when filters change
  const applyFilters = () => {
    const p = new URLSearchParams();
    if (city)          p.set("city", city);
    if (date)          p.set("date", date);
    if (specialization) p.set("specialization", specialization);
    if (sort !== "default") p.set("sort", sort);
    if (minRating != null)  p.set("rating", String(minRating));
    setPage(1);
    router.replace(`/explore?${p.toString()}`, { scroll: false });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl font-bold text-brand-600">Pixova</Link>
          <div className="flex items-center gap-3">
            <Link href="/account" className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400">
              My Account
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              For Photographers
            </Link>
          </div>
        </div>
      </header>

      {/* Hero search bar */}
      <div className="bg-white py-8 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="mb-6 text-center font-display text-3xl font-bold text-gray-900 dark:text-white">
            Find Your Perfect Photographer
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="📍 City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="flex-1 min-w-[140px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">🎭 All Types</option>
              {SPECIALIZATION_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={applyFilters}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-4 space-y-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>

              {/* Rating filter */}
              <div>
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Min Rating</p>
                {[4, 3, null].map((r) => (
                  <button
                    key={String(r)}
                    onClick={() => { setMinRating(r); setPage(1); }}
                    className={`mb-1 flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      minRating === r
                        ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {r ? `⭐ ${r}+ stars` : "Any rating"}
                  </button>
                ))}
              </div>

              {/* Specializations filter */}
              <div>
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Type</p>
                <button
                  onClick={() => { setSpecialization(""); setPage(1); }}
                  className={`mb-1 flex w-full items-center rounded-lg px-2 py-1.5 text-sm transition-colors ${
                    !specialization ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300" : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  All Types
                </button>
                {SPECIALIZATION_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSpecialization(s); setPage(1); }}
                    className={`mb-1 flex w-full items-center rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      specialization === s ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300" : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {loading ? "Searching..." : `${total} photographer${total !== 1 ? "s" : ""} found${city ? ` in ${city}` : ""}`}
              </p>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="default">Sort: Best Match</option>
                <option value="rating">Sort: Rating</option>
                <option value="price_asc">Sort: Price ↑</option>
                <option value="price_desc">Sort: Price ↓</option>
                <option value="newest">Sort: Newest</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" style={{ height: 320 }} />
                ))}
              </div>
            ) : studios.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl">📷</span>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No photographers found</h3>
                <p className="mt-2 text-sm text-gray-500">Try adjusting your filters or search a different city.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {studios.map((s) => (
                  <StudioCard key={s.id} studio={s} availableDate={date || undefined} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
