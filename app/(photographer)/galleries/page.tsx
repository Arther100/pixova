"use client";

import { useI18n } from "@/lib/i18n";

export default function GalleriesPage() {
  const { t } = useI18n();
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
        <button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          {t.galleries.newGallery}
        </button>
      </div>

      {/* Empty state */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <span className="text-5xl">🖼️</span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t.galleries.noGalleries}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t.galleries.createFirst}
        </p>
      </div>
    </div>
  );
}
