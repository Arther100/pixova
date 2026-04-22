"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import UsageBar from "@/components/UsageBar";

const PLANS = [
  {
    slug: "STARTER",
    name: "Starter",
    price: 999,
    pricePaise: 99900,
    bookings: 10,
    storage: "10 GB",
    features: ["10 bookings/month", "10 GB storage", "Client portal", "Agreements"],
  },
  {
    slug: "PROFESSIONAL",
    name: "Professional",
    price: 1999,
    pricePaise: 199900,
    bookings: 30,
    storage: "50 GB",
    features: ["30 bookings/month", "50 GB storage", "Priority support", "Custom branding"],
    popular: true,
  },
  {
    slug: "STUDIO",
    name: "Studio",
    price: 4999,
    pricePaise: 499900,
    bookings: null,
    storage: "200 GB",
    features: ["Unlimited bookings", "200 GB storage", "Multi-user", "White-label"],
  },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(paise: number | null) {
  if (paise === null) return "—";
  return `₹${(paise / 100).toFixed(0)}`;
}

export default function SubscriptionPage() {
  const { data, loading, error, refresh } = useSubscription();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleUpgrade(planSlug: string) {
    setUpgrading(planSlug);
    setActionError(null);
    try {
      const res = await fetch("/api/v1/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_name: planSlug, payment_method: "subscription" }),
      });
      const json = await res.json();
      if (json.success && json.data?.subscription_url) {
        window.location.href = json.data.subscription_url;
      } else {
        setActionError(json.error || "Failed to create subscription");
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setUpgrading(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setActionError(null);
    try {
      const res = await fetch("/api/v1/subscription/cancel", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setShowCancelConfirm(false);
        refresh();
      } else {
        setActionError(json.error || "Failed to cancel subscription");
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64" />
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error || "Failed to load subscription data."}</p>
        <button onClick={refresh} className="mt-4 text-sm text-brand-500 underline">Retry</button>
      </div>
    );
  }

  const { subscription: sub, usage, billing } = data;
  const status = sub.status?.toUpperCase();
  const currentPlanSlug = sub.plan_slug?.toUpperCase();
  const isExpired = status === "EXPIRED";
  const isGrace = status === "GRACE";
  const isTrial = status === "TRIAL" || status === "TRIALING";
  const isActive = status === "ACTIVE";
  const isCancelled = status === "CANCELLED";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription &amp; Billing</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage your plan and billing details</p>
      </div>

      {/* Expired full-block */}
      {isExpired && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-red-700 dark:text-red-300 font-semibold text-lg">Your subscription has expired</p>
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">
            Upgrade to a paid plan to continue using Pixova.
          </p>
        </div>
      )}

      {/* Current Plan Card */}
      {!isExpired && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Current Plan</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{sub.plan_name}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          {isTrial && sub.trial_days_left !== null && (
            <div className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl px-4 py-3 text-sm">
              🎁 Trial ends in <strong>{sub.trial_days_left} day{sub.trial_days_left !== 1 ? "s" : ""}</strong>. Upgrade to keep access.
            </div>
          )}

          {isGrace && sub.grace_days_left !== null && (
            <div className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl px-4 py-3 text-sm">
              ⚠️ Grace period — <strong>{sub.grace_days_left} day{sub.grace_days_left !== 1 ? "s" : ""} remaining</strong>. Upgrade to avoid losing access.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">
                {isActive || isCancelled ? "Renews" : "Period ends"}
              </p>
              <p className="text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(sub.current_period_end)}</p>
            </div>
            {billing.next_billing_date && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Next billing</p>
                <p className="text-gray-800 dark:text-gray-200 mt-0.5">
                  {formatDate(billing.next_billing_date)} · {formatAmount(billing.amount_paise)}
                </p>
              </div>
            )}
          </div>

          {/* Usage */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Usage this cycle</p>
            <UsageBar
              label="Bookings"
              used={usage.bookings_used}
              limit={usage.bookings_limit}
              usedLabel={String(usage.bookings_used)}
              limitLabel={usage.bookings_limit ? String(usage.bookings_limit) : ""}
              percent={usage.bookings_percent}
            />
            <UsageBar
              label="Storage"
              used={usage.storage_used_bytes}
              limit={usage.storage_limit_bytes}
              usedLabel={`${usage.storage_used_gb.toFixed(1)} GB`}
              limitLabel={usage.storage_limit_gb ? `${usage.storage_limit_gb.toFixed(0)} GB` : ""}
              percent={usage.storage_percent}
            />
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.slug === currentPlanSlug && (isActive || isTrial || isGrace);
            return (
              <div
                key={plan.slug}
                className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                  isCurrent
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950 shadow-md"
                    : plan.popular
                    ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                }`}
              >
                {plan.popular && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                    Current plan
                  </span>
                )}
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">{plan.name}</p>
                  <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                    ₹{plan.price}
                    <span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-xl py-2 text-sm font-medium bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 cursor-default"
                  >
                    Current plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.slug)}
                    disabled={upgrading !== null}
                    className="w-full rounded-xl py-2 text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60"
                  >
                    {upgrading === plan.slug ? "Redirecting…" : "Upgrade →"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          {actionError}
        </div>
      )}

      {/* Billing History */}
      <BillingHistory />

      {/* Cancel */}
      {(isActive || isGrace) && billing.razorpay_sub_id && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Danger zone</h3>
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600 underline"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Are you sure? You&apos;ll keep access until the end of your billing period, then your account will expire.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {cancelling ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Keep subscription
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    TRIAL:    { label: "Trial", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    TRIALING: { label: "Trial", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    ACTIVE: { label: "Active", cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    GRACE: { label: "Grace period", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    CANCELLED: { label: "Cancelled", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    EXPIRED: { label: "Expired", cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    SUSPENDED: { label: "Suspended", cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function BillingHistory() {
  const [invoices, setInvoices] = useState<
    Array<{ id: string; event_type: string; created_at: string; metadata: Record<string, unknown> }>
  >([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    const res = await fetch("/api/v1/subscription/invoices");
    const json = await res.json();
    if (json.success) {
      setInvoices(json.data.invoices ?? []);
    }
    setLoaded(true);
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Billing History</h3>
        {!loaded && (
          <button onClick={load} className="text-xs text-brand-500 hover:underline">
            Load
          </button>
        )}
      </div>
      {!loaded ? (
        <p className="text-sm text-gray-400">Click &ldquo;Load&rdquo; to view billing history.</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-gray-400">No billing events yet.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {inv.event_type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(inv.created_at)}</p>
              </div>
              {inv.metadata?.amount_paise !== undefined && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatAmount(inv.metadata.amount_paise as number)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
