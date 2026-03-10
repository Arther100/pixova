"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface SummaryData {
  totalThisMonth: number;
  revenueThisMonth: number;
  pendingBalance: number;
  upcomingThisWeek: number;
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function BookingSummaryCards() {
  const { t } = useI18n();
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    fetch("/api/v1/bookings/summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch(() => {});
  }, []);

  if (!data) return <SummarySkeleton />;

  const formatCurrency = (paise: number) =>
    `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

  const cards = [
    {
      label: t.bookings.bookingsThisMonth,
      value: data.totalThisMonth.toString(),
      icon: "📅",
      color: "text-blue-500",
    },
    {
      label: t.bookings.revenueThisMonth,
      value: formatCurrency(data.revenueThisMonth),
      icon: "💰",
      color: "text-green-500",
    },
    {
      label: t.bookings.pendingBalance,
      value: formatCurrency(data.pendingBalance),
      icon: "⏳",
      color: "text-amber-500",
    },
    {
      label: t.bookings.upcomingThisWeek,
      value: data.upcomingThisWeek.toString(),
      icon: "🔔",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">{card.icon}</span>
            <span className={`text-xl font-bold ${card.color}`}>
              {card.value}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );
}
