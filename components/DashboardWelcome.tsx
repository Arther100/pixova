// ============================================
// DashboardWelcome — Hero section for dashboard
// Shows greeting, quick actions, profile bar, and stats
// ============================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ProfileCompletionBar } from "./ProfileCompletionBar";
import { formatRupees } from "@/utils/currency";

export interface DashboardData {
  photographer: {
    fullName: string;
    avatarUrl?: string | null;
  };
  studio: {
    id: string;
    name: string;
    slug: string;
    isPublic: boolean;
  } | null;
  subscription: {
    planName: string;
    status: string;
    trialEndsAt?: string | null;
    bookingsUsed: number;
    bookingsLimit: number;
  } | null;
  stats: {
    totalBookings: number;
    pendingEnquiries: number;
    unreadNotifications: number;
    totalRevenue: number;
    totalOutstanding: number;
  };
  profileScore: number;
}

interface DashboardWelcomeProps {
  data: DashboardData;
}

export function DashboardWelcome({ data }: DashboardWelcomeProps) {
  const { t } = useI18n();
  const { photographer, studio, subscription, stats, profileScore } = data;

  const firstName = photographer.fullName?.split(" ")[0] || "there";
  const greeting = getGreeting(t);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {studio
            ? `${t.dashboard.studioOverview} ${studio.name}`
            : t.dashboard.setupStudio}
        </p>
      </div>

      {/* Trial banner */}
      {subscription?.status === "trialing" && subscription.trialEndsAt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t.dashboard.trialActive}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t.dashboard.trialEnds}{" "}
                {new Date(subscription.trialEndsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={t.dashboard.totalBookings}
          value={stats.totalBookings.toString()}
          href="/bookings"
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          icon={
            <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          }
        />
        <StatCard
          label={t.dashboard.pendingEnquiries}
          value={stats.pendingEnquiries.toString()}
          href="/enquiries"
          iconBg="bg-orange-50 dark:bg-orange-900/30"
          icon={
            <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          }
        />
        <StatCard
          label={t.dashboard.notifications}
          value={stats.unreadNotifications.toString()}
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          icon={
            <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          }
        />
        <StatCard
          label={t.dashboard.bookingsQuota}
          value={
            subscription
              ? `${subscription.bookingsUsed}/${subscription.bookingsLimit === -1 ? "∞" : subscription.bookingsLimit}`
              : "0/10"
          }
          subtitle={subscription?.planName ?? "Starter"}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          icon={
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
          }
        />
        <StatCard
          label="Total Revenue"
          value={formatRupees(stats.totalRevenue)}
          href="/payments"
          iconBg="bg-green-50 dark:bg-green-900/30"
          icon={
            <svg className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          }
        />
        <StatCard
          label="Outstanding"
          value={formatRupees(stats.totalOutstanding)}
          href="/payments"
          iconBg={stats.totalOutstanding > 0 ? "bg-red-50 dark:bg-red-900/30" : "bg-green-50 dark:bg-green-900/30"}
          icon={
            <svg className={`h-4 w-4 ${stats.totalOutstanding > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          }
        />
      </div>

      {/* Feedback summary */}
      <FeedbackSummaryCard />

      {/* Profile completion bar (show if < 80%) */}
      {profileScore < 80 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <ProfileCompletionBar score={profileScore} />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t.dashboard.completeProfile}{" "}
            <Link
              href="/settings"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {t.dashboard.updateProfile}
            </Link>
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t.dashboard.quickActions}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            label={t.dashboard.newBooking}
            href="/bookings/new"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M12 14v4M10 16h4" /></svg>
            }
          />
          <QuickAction
            label={t.dashboard.viewCalendar}
            href="/bookings"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></svg>
            }
          />
          <QuickAction
            label={t.dashboard.shareProfile}
            href={studio ? `/${studio.slug}` : "/settings"}
            external={!!studio}
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>
            }
          />
          <QuickAction
            label="Enquiries"
            href="/enquiries"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ──
function StatCard({
  icon,
  iconBg,
  label,
  value,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="mt-auto pt-3">
        <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {value}
        </p>
        <p className="mt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
          {subtitle || "\u00A0"}
        </p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} prefetch={true} className="h-full">{content}</Link>;
  }

  return content;
}

// ── Quick Action Button ──
function QuickAction({
  icon,
  label,
  href,
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  external?: boolean;
}) {
  const cls = "flex flex-col items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-5 text-center transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </a>
    );
  }

  return (
    <Link href={href} prefetch={true} className={cls}>
      <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </Link>
  );
}

// ── Greeting by time of day ──
function getGreeting(t: { dashboard: { goodMorning: string; goodAfternoon: string; goodEvening: string } }): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.dashboard.goodMorning;
  if (hour < 17) return t.dashboard.goodAfternoon;
  return t.dashboard.goodEvening;
}

// ── Feedback Summary Card (fetched client-side) ──
function FeedbackSummaryCard() {
  const [data, setData] = useState<{ average_rating: number; total_reviews: number } | null>(null);

  useEffect(() => {
    fetch("/api/v1/feedback/summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.total_reviews > 0) setData(json.data);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <Link href="/reviews" className="block">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/30">
            <span className="text-lg">⭐</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {data.average_rating.toFixed(1)} average rating
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.total_reviews} review{data.total_reviews !== 1 ? "s" : ""} from clients
            </p>
          </div>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`text-sm ${star <= Math.round(data.average_rating) ? "text-yellow-400" : "text-gray-200 dark:text-gray-700"}`}>
              ★
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
