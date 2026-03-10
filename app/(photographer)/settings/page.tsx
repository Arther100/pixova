"use client";

import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        {t.settings.title}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t.settings.subtitle}
      </p>

      <div className="mt-8 space-y-6">
        {/* Studio Profile */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t.settings.studioProfile}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t.settings.studioProfileDesc}
          </p>
          {/* Form placeholder */}
          <div className="mt-4 text-sm text-gray-400 dark:text-gray-500 italic">
            {t.settings.comingSoon}
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.settings.subscriptionTitle}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t.settings.subscriptionDesc}
          </p>
          <div className="mt-4 text-sm text-gray-400 dark:text-gray-500 italic">
            {t.settings.comingSoon}
          </div>
        </div>
      </div>
    </div>
  );
}
