"use client";

import { useI18n } from "@/lib/i18n";

export default function PaymentsPage() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        {t.payments.title}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t.payments.subtitle}
      </p>

      {/* Empty state */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <span className="text-5xl">💰</span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t.payments.noPayments}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t.payments.willAppear}
        </p>
      </div>
    </div>
  );
}
