"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 dark:bg-gray-950">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          {t.landing.heroTitle}{" "}
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            {t.landing.heroHighlight}
          </span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
          {t.landing.heroDescription}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            {t.landing.getStarted}
          </Link>
          <Link
            href="#features"
            className="rounded-xl border border-gray-300 px-8 py-3 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-800"
          >
            {t.landing.seeFeatures}
          </Link>
        </div>
      </div>

      {/* Built for India badge */}
      <div className="mt-20 flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <span>🇮🇳</span>
        <span>{t.landing.builtForIndia}</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>{t.landing.whatsappFirst}</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>{t.landing.razorpayPayments}</span>
      </div>
    </main>
  );
}
