"use client";

import Link from "next/link";
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

        {/* Cancellation Policy */}
        <Link
          href="/settings/cancellation-policy"
          className="block rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-brand-200 hover:bg-brand-50/30 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.agreements.cancellationPolicy}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t.agreements.policyDesc}
              </p>
            </div>
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </Link>

        {/* Notifications */}
        <Link
          href="/settings/notifications"
          className="block rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-brand-200 hover:bg-brand-50/30 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                WhatsApp Notifications
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Control which automatic WhatsApp messages are sent to you and your clients.
              </p>
            </div>
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
