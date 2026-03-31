"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RevenueData {
  total_revenue_paise: number;
  mrr_paise: number;
  arr_paise: number;
  active_subscribers: number;
  trial_users: number;
  grace_users: number;
  plan_breakdown: { TRIAL: number; STARTER: number; PRO: number; STUDIO: number };
  recent_upgrades: { event_id: string; event_type: string; new_plan: string; old_plan: string; created_at: string; performed_by: string }[];
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/revenue")
      .then((r) => r.json())
      .then((json) => { if (json.success) setData(json.data); })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-400">Failed to load dashboard data.</p>;

  const planMax = Math.max(...Object.values(data.plan_breakdown), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="MRR" value={fmt(data.mrr_paise)} />
        <StatCard label="ARR" value={fmt(data.arr_paise)} />
        <StatCard label="Active Subs" value={data.active_subscribers} />
        <StatCard label="Trial Users" value={data.trial_users} />
        <StatCard label="Grace Period" value={data.grace_users} />
      </div>

      {/* Plan breakdown */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Plan Breakdown</h2>
        <div className="space-y-3">
          {(["TRIAL", "STARTER", "PRO", "STUDIO"] as const).map((plan) => {
            const count = data.plan_breakdown[plan] ?? 0;
            const pct = (count / planMax) * 100;
            return (
              <div key={plan} className="flex items-center gap-3">
                <span className="w-16 text-sm text-gray-400">{plan}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-brand-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm text-white">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Recent Activity</h2>
        {data.recent_upgrades.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {data.recent_upgrades.map((e) => (
              <div key={e.event_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{e.event_type.replace(/_/g, " ")}</span>
                <span className="text-gray-400">
                  {e.old_plan} → {e.new_plan}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(e.created_at).toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link href="/admin/photographers" className="text-sm text-brand-400 hover:text-brand-300">
          View all photographers →
        </Link>
        <Link href="/admin/revenue" className="text-sm text-brand-400 hover:text-brand-300">
          Full revenue report →
        </Link>
      </div>
    </div>
  );
}
