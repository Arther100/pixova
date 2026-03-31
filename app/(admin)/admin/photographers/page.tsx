"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Photographer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  studio_name: string | null;
  plan: string;
  status: string;
  bookings_count: number;
  storage_used: number;
  joined_at: string;
  last_active: string | null;
  is_suspended: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-green-400 bg-green-900/30",
  TRIAL: "text-blue-400 bg-blue-900/30",
  GRACE: "text-amber-400 bg-amber-900/30",
  EXPIRED: "text-red-400 bg-red-900/30",
  SUSPENDED: "text-red-400 bg-red-900/30",
  CANCELLED: "text-gray-400 bg-gray-700/30",
};

export default function AdminPhotographersPage() {
  const [data, setData] = useState<{ photographers: Photographer[]; total: number }>({ photographers: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(search && { search }),
      ...(planFilter && { plan: planFilter }),
      ...(statusFilter && { status: statusFilter }),
    });
    const res = await fetch(`/api/v1/admin/photographers?${params}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [search, planFilter, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtBytes = (b: number) => {
    if (b < 1024) return "0 GB";
    return `${(b / (1024 ** 3)).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          Photographers <span className="text-gray-400 text-base font-normal">({data.total})</span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
        />
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Plans</option>
          <option value="TRIAL">Trial</option>
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
          <option value="STUDIO">Studio</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="GRACE">Grace</option>
          <option value="EXPIRED">Expired</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-700">
            <tr className="text-left text-gray-400 uppercase text-xs tracking-wide">
              <th className="px-4 py-3">Name / Studio</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Storage</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : data.photographers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No photographers found
                </td>
              </tr>
            ) : (
              data.photographers.map((p) => (
                <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-gray-400 text-xs">{p.studio_name ?? p.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{p.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status] ?? "text-gray-400"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{p.bookings_count}</td>
                  <td className="px-4 py-3 text-gray-300">{fmtBytes(p.storage_used)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(p.joined_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/photographers/${p.id}`}
                      className="text-brand-400 hover:text-brand-300 text-xs font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{data.total} total</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-3 py-1.5">{page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data.photographers.length < 20}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
