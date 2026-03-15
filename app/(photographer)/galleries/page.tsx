"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { StorageBar } from "@/components/StorageBar";
import { formatBytes } from "@/utils/helpers";
import { formatDate } from "@/utils/date";

interface GalleryItem {
  id: string;
  booking_id: string | null;
  title: string;
  slug: string;
  status: string;
  photo_count: number;
  total_size_bytes: number;
  published_at: string | null;
  created_at: string;
}

interface StorageInfo {
  used_bytes: number;
  limit_bytes: number;
  gallery_count: number;
  max_galleries: number;
}

export default function GalleriesPage() {
  const { t } = useI18n();
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [storageRes] = await Promise.all([
        fetch("/api/v1/galleries/storage"),
      ]);
      const storageJson = await storageRes.json();

      if (storageJson.success) {
        setStorage(storageJson.data);
      }

      // Fetch galleries list via bookings with gallery info
      const bookingsRes = await fetch("/api/v1/bookings?limit=100");
      const bookingsJson = await bookingsRes.json();

      if (bookingsJson.success) {
        // Get galleries for each booking
        const galleryPromises = (bookingsJson.data.bookings || []).map(
          async (b: { id: string; title: string }) => {
            const res = await fetch(`/api/v1/galleries/${b.id}`);
            const json = await res.json();
            if (json.success && json.data?.gallery) {
              return json.data.gallery;
            }
            return null;
          }
        );

        const galleryResults = await Promise.allSettled(galleryPromises);
        const galleryList = galleryResults
          .filter(
            (r): r is PromiseFulfilledResult<GalleryItem> =>
              r.status === "fulfilled" && r.value !== null
          )
          .map((r) => r.value);

        setGalleries(galleryList);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            {t.galleries.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t.galleries.subtitle}
          </p>
        </div>
      </div>

      {/* Storage bar */}
      {storage && (
        <div className="mt-4">
          <StorageBar usedBytes={storage.used_bytes} limitBytes={storage.limit_bytes} />
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            />
          ))}
        </div>
      ) : galleries.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <span className="text-5xl">🖼️</span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t.galleries.noGalleries}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t.galleries.createFirst}
          </p>
          <Link href="/bookings" className="mt-4 inline-block">
            <span className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {t.galleries.goToBookings}
            </span>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery) => (
            <Link
              key={gallery.id}
              href={`/galleries/${gallery.booking_id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
            >
              <div className="flex items-start justify-between">
                <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 dark:text-gray-100 dark:group-hover:text-brand-400">
                  {gallery.title}
                </h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    gallery.status === "published"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : gallery.status === "archived"
                      ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {gallery.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{gallery.photo_count} photos</span>
                <span>{formatBytes(gallery.total_size_bytes)}</span>
              </div>
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {gallery.published_at
                  ? `Published ${formatDate(gallery.published_at)}`
                  : `Created ${formatDate(gallery.created_at)}`}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
