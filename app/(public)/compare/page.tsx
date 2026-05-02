"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface StudioData {
  studio: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    avg_rating: number;
    review_count: number;
    starting_price: number | null;
    cover_photo_url: string | null;
  };
  packages: Array<{ id: string; name: string; price: number }>;
  blocked_dates: string[];
}

function CompareCard({ data, date }: { data: StudioData; date: string }) {
  const { studio, packages, blocked_dates } = data;
  const isAvailable = !date || !blocked_dates.includes(date);
  const cheapest = packages.reduce(
    (min, p) => (p.price < (min?.price ?? Infinity) ? p : min),
    packages[0]
  );

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden dark:border-gray-800 dark:bg-gray-900">
      {/* Cover */}
      <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {studio.cover_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={studio.cover_photo_url} alt={studio.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">📷</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-4 space-y-3">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{studio.name}</h3>
          {studio.city && <p className="text-xs text-gray-500">📍 {studio.city}</p>}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <span className="text-yellow-400">★</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {studio.avg_rating > 0 ? studio.avg_rating.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-gray-500">
            ({studio.review_count} review{studio.review_count !== 1 ? "s" : ""})
          </span>
        </div>

        {/* Price */}
        <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Starting price</p>
          <p className="font-bold text-gray-900 dark:text-white">
            {studio.starting_price
              ? `₹${(studio.starting_price / 100).toLocaleString("en-IN")}`
              : "—"}
          </p>
        </div>

        {/* Date availability */}
        {date && (
          <div className={`rounded-lg px-3 py-2 ${isAvailable ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
            <p className="text-xs text-gray-500">{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            <p className={`text-sm font-semibold ${isAvailable ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {isAvailable ? "✓ Available" : "✗ Not Available"}
            </p>
          </div>
        )}

        {/* Packages */}
        <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Packages ({packages.length})</p>
          {cheapest ? (
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              From ₹{(cheapest.price / 100).toLocaleString("en-IN")}
            </p>
          ) : (
            <p className="text-sm text-gray-400">None listed</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/${studio.slug}`}
            className="flex-1 rounded-xl border border-gray-200 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            View Profile
          </Link>
          {isAvailable ? (
            <Link
              href={`/${studio.slug}/enquire${date ? `?date=${date}` : ""}`}
              className="flex-1 rounded-xl bg-brand-600 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
            >
              Enquire →
            </Link>
          ) : (
            <span className="flex-1 rounded-xl bg-gray-100 py-2 text-center text-sm font-semibold text-gray-400 cursor-not-allowed dark:bg-gray-800">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const slugsParam = searchParams.get("studios") || "";
  const date = searchParams.get("date") || "";

  const slugs = slugsParam.split(",").filter(Boolean).slice(0, 3);
  const [studios, setStudios] = useState<(StudioData | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slugs.length === 0) { setLoading(false); return; }
    Promise.all(
      slugs.map((slug) =>
        fetch(`/api/v1/studio/${slug}`)
          .then((r) => r.json())
          .then((j) => (j.success ? j.data : null))
          .catch(() => null)
      )
    ).then((results) => {
      setStudios(results);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugsParam]);

  const validStudios = studios.filter(Boolean) as StudioData[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/explore" className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400">← Explore</Link>
          <Link href="/" className="font-display text-xl font-bold text-brand-600">Pixova</Link>
          <Link href="/account" className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400">My Account</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-2 font-display text-2xl font-bold text-gray-900 dark:text-white">Compare Photographers</h1>
        {date && (
          <p className="mb-6 text-sm text-gray-500">
            Showing availability for {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slugs.map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : validStudios.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500">No studios found. Add studios to compare via the URL.</p>
            <p className="mt-2 text-xs text-gray-400">Example: /compare?studios=slug1,slug2</p>
            <Link href="/explore" className="mt-4 inline-block text-brand-600 hover:underline">← Back to Explore</Link>
          </div>
        ) : (
          <div className={`grid gap-4 ${validStudios.length === 1 ? "max-w-sm" : validStudios.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {validStudios.map((data) => (
              <CompareCard key={data.studio.id} data={data} date={date} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
