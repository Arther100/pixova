"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SubscriptionData {
  status: string;
  trial_days_left: number | null;
  grace_days_left: number | null;
}

export default function GracePeriodBanner() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check session storage for dismissal
    if (sessionStorage.getItem("grace_banner_dismissed") === "1") {
      setDismissed(true);
    }

    fetch("/api/v1/subscription")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSub(json.data.subscription);
      })
      .catch(() => {});
  }, []);

  if (!sub || dismissed) return null;

  const status = sub.status?.toUpperCase();

  // GRACE banner
  if (status === "GRACE") {
    return (
      <div className="flex items-center justify-between gap-3 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">⚠️</span>
          <span className="text-amber-200">
            Your trial has ended.{" "}
            <strong className="text-amber-100">
              {sub.grace_days_left} {sub.grace_days_left === 1 ? "day" : "days"}
            </strong>{" "}
            left before access is restricted.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/settings/subscription" className="text-amber-300 hover:text-amber-100 font-medium text-xs">
            Upgrade Now →
          </Link>
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem("grace_banner_dismissed", "1");
            }}
            className="text-amber-400/60 hover:text-amber-300 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // TRIAL banner — only show when < 5 days left
  if ((status === "TRIAL" || status === "TRIALING") && sub.trial_days_left !== null && sub.trial_days_left <= 5) {
    return (
      <div className="flex items-center justify-between gap-3 bg-blue-500/10 border-b border-blue-500/20 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <span className="text-blue-200">
            Trial:{" "}
            <strong className="text-blue-100">
              {sub.trial_days_left} {sub.trial_days_left === 1 ? "day" : "days"} remaining
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/settings/subscription" className="text-blue-300 hover:text-blue-100 font-medium text-xs">
            View Plans →
          </Link>
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem("grace_banner_dismissed", "1");
            }}
            className="text-blue-400/60 hover:text-blue-300 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
}
