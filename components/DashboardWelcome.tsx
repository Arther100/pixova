// ============================================
// DashboardWelcome — Hero section for dashboard
// Shows greeting, quick actions, profile bar, and stats
// ============================================

"use client";

import Link from "next/link";
import { ProfileCompletionBar } from "./ProfileCompletionBar";

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
    todayBookings: number;
    pendingEnquiries: number;
    unreadNotifications: number;
  };
  profileScore: number;
}

interface DashboardWelcomeProps {
  data: DashboardData;
}

export function DashboardWelcome({ data }: DashboardWelcomeProps) {
  const { photographer, studio, subscription, stats, profileScore } = data;

  const firstName = photographer.fullName?.split(" ")[0] || "there";
  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {studio
            ? `Here's what's happening at ${studio.name}`
            : "Set up your studio to get started"}
        </p>
      </div>

      {/* Trial banner */}
      {subscription?.status === "trialing" && subscription.trialEndsAt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Free trial active
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Your trial ends on{" "}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="📅"
          label="Today's Bookings"
          value={stats.todayBookings.toString()}
          href="/bookings"
        />
        <StatCard
          icon="📩"
          label="Pending Enquiries"
          value={stats.pendingEnquiries.toString()}
          href="/bookings"
        />
        <StatCard
          icon="🔔"
          label="Notifications"
          value={stats.unreadNotifications.toString()}
        />
        <StatCard
          icon="📦"
          label="Bookings Used"
          value={
            subscription
              ? `${subscription.bookingsUsed}/${subscription.bookingsLimit === -1 ? "∞" : subscription.bookingsLimit}`
              : "0/10"
          }
          subtitle={subscription?.planName ?? "Starter"}
        />
      </div>

      {/* Profile completion bar (show if < 80%) */}
      {profileScore < 80 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <ProfileCompletionBar score={profileScore} />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Complete your profile to attract more clients.{" "}
            <Link
              href="/settings"
              className="font-medium text-brand-600 hover:underline"
            >
              Update Profile →
            </Link>
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            icon="📅"
            label="New Booking"
            href="/bookings"
          />
          <QuickAction
            icon="📆"
            label="View Calendar"
            href="/bookings"
          />
          <QuickAction
            icon="🔗"
            label="Share Profile"
            href={studio ? `/${studio.slug}` : "/settings"}
            external={!!studio}
          />
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ──
function StatCard({
  icon,
  label,
  value,
  subtitle,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
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
  icon: string;
  label: string;
  href: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-4 text-center transition-all hover:border-brand-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600"
      >
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-4 text-center transition-all hover:border-brand-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </Link>
  );
}

// ── Greeting by time of day ──
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
