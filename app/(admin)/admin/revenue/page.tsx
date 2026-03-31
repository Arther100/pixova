"use client";

import { useEffect, useState } from "react";

export default function AdminRevenuePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/revenue")
      .then((r) => r.json())
      .then((json) => { if (json.success) setData(json.data); })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-400">Failed to load.</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold text-white">Revenue</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Revenue", value: fmt(data.total_revenue_paise) },
          { label: "MRR", value: fmt(data.mrr_paise) },
          { label: "ARR", value: fmt(data.arr_paise) },
          { label: "Active Subscribers", value: data.active_subscribers },
          { label: "Trial Users", value: data.trial_users },
          { label: "Grace Period", value: data.grace_users },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Plan Breakdown</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          {Object.entries(data.plan_breakdown as Record<string, number>).map(([plan, count]) => (
            <div key={plan} className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs">{plan}</p>
              <p className="text-white text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by month */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Revenue by Month</h2>
        {data.revenue_by_month.length === 0 ? (
          <p className="text-gray-500 text-sm">No data yet</p>
        ) : (
          <div className="space-y-2">
            {data.revenue_by_month.map((m: { month: string; revenue_paise: number; new_subs: number }) => (
              <div key={m.month} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 w-20">{m.month}</span>
                <div className="flex-1 mx-4 bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-brand-500"
                    style={{
                      width: `${Math.min(100, (m.revenue_paise / Math.max(...data.revenue_by_month.map((x: { revenue_paise: number }) => x.revenue_paise), 1)) * 100)}%`
                    }}
                  />
                </div>
                <span className="text-white w-24 text-right">{fmt(m.revenue_paise)}</span>
                <span className="text-gray-400 w-20 text-right text-xs">+{m.new_subs} new</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
