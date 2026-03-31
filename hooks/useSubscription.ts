"use client";

import { useState, useEffect, useCallback } from "react";

export interface SubscriptionInfo {
  status: string;
  plan_name: string;
  plan_slug: string;
  current_period_end: string;
  grace_period_ends_at: string | null;
  grace_days_left: number | null;
  trial_days_left: number | null;
  bookings_this_cycle: number;
  booking_limit: number | null;
  overage_enabled: boolean;
  overage_price_paise: number;
}

export interface UsageInfo {
  bookings_used: number;
  bookings_limit: number | null;
  bookings_percent: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  storage_percent: number;
  storage_used_gb: number;
  storage_limit_gb: number;
}

export interface BillingInfo {
  razorpay_sub_id: string | null;
  next_billing_date: string | null;
  amount_paise: number | null;
}

export interface SubscriptionData {
  subscription: SubscriptionInfo;
  usage: UsageInfo;
  billing: BillingInfo;
}

export function useSubscription() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/subscription");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load subscription");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
