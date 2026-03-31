"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdminPhotographerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [extendModal, setExtendModal] = useState(false);
  const [newPlan, setNewPlan] = useState("PRO");
  const [planNotes, setPlanNotes] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [extendDays, setExtendDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/admin/photographers/${id}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChangePlan = async () => {
    setActionLoading(true);
    await fetch(`/api/v1/admin/photographers/${id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_name: newPlan, notes: planNotes }),
    });
    setPlanModal(false);
    await fetchData();
    setActionLoading(false);
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    await fetch(`/api/v1/admin/photographers/${id}/suspend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: suspendReason }),
    });
    setSuspendModal(false);
    await fetchData();
    setActionLoading(false);
  };

  const handleUnsuspend = async () => {
    setActionLoading(true);
    await fetch(`/api/v1/admin/photographers/${id}/unsuspend`, { method: "PATCH" });
    await fetchData();
    setActionLoading(false);
  };

  const handleExtendTrial = async () => {
    setActionLoading(true);
    await fetch(`/api/v1/admin/photographers/${id}/extend-trial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: extendDays }),
    });
    setExtendModal(false);
    await fetchData();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-400">Photographer not found.</p>;

  const { photographer, studio, subscription, events, recent_bookings } = data;
  const plan = subscription?.plans;
  const isSuspended = photographer?.is_suspended;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">← Back</button>

      {/* Header */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{photographer?.full_name}</h1>
          <p className="text-gray-400 text-sm">{photographer?.phone} · {studio?.name ?? "No studio"}</p>
          {isSuspended && (
            <div className="mt-2 text-sm text-red-400 bg-red-900/20 px-3 py-1.5 rounded-lg inline-flex">
              🚫 Suspended: {photographer?.suspended_reason}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPlanModal(true)} className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm">Change Plan</button>
          <button onClick={() => setExtendModal(true)} className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm">Extend Trial</button>
          {isSuspended ? (
            <button onClick={handleUnsuspend} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm">Unsuspend</button>
          ) : (
            <button onClick={() => setSuspendModal(true)} className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm">Suspend</button>
          )}
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Subscription</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-400">Plan</p><p className="text-white font-medium">{plan?.name ?? "TRIAL"}</p></div>
          <div><p className="text-gray-400">Status</p><p className="text-white font-medium">{subscription?.status}</p></div>
          <div><p className="text-gray-400">Bookings Used</p><p className="text-white font-medium">{subscription?.bookings_this_cycle ?? 0}</p></div>
          <div><p className="text-gray-400">Period End</p><p className="text-white">{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-IN") : "—"}</p></div>
          <div><p className="text-gray-400">Grace End</p><p className="text-white">{subscription?.grace_period_ends_at ? new Date(subscription.grace_period_ends_at).toLocaleDateString("en-IN") : "—"}</p></div>
          <div><p className="text-gray-400">Storage</p><p className="text-white">{((studio?.storage_used_bytes ?? 0) / 1024 ** 3).toFixed(2)} GB</p></div>
        </div>
      </div>

      {/* Events timeline */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Subscription Events</h2>
        {!events?.length ? (
          <p className="text-gray-500 text-sm">No events yet</p>
        ) : (
          <div className="space-y-2">
            {events.map((e: { event_id: string; event_type: string; old_plan?: string; new_plan?: string; old_status?: string; new_status?: string; performed_by: string; created_at: string }) => (
              <div key={e.event_id} className="flex items-center justify-between text-sm border-b border-gray-700/50 pb-2">
                <span className="text-gray-300 font-medium">{e.event_type.replace(/_/g, " ")}</span>
                <span className="text-gray-400 text-xs">{e.old_status} → {e.new_status} · by {e.performed_by}</span>
                <span className="text-gray-500 text-xs">{new Date(e.created_at).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent bookings */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Bookings</h2>
        {!recent_bookings?.length ? (
          <p className="text-gray-500 text-sm">No bookings yet</p>
        ) : (
          <div className="space-y-2">
            {recent_bookings.map((b: { id: string; booking_ref: string; status: string; event_date: string; total_amount: number }) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span className="text-white">{b.booking_ref ?? b.id.slice(0, 8)}</span>
                <span className="text-gray-400">{b.status}</span>
                <span className="text-gray-400">{b.event_date ? new Date(b.event_date).toLocaleDateString("en-IN") : "—"}</span>
                <span className="text-gray-300">₹{(b.total_amount / 100).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {planModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-80 border border-gray-700 space-y-4">
            <h3 className="text-white font-semibold">Change Plan</h3>
            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-2 text-sm text-white">
              <option>TRIAL</option><option>STARTER</option><option>PRO</option><option>STUDIO</option>
            </select>
            <input value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-2 text-sm text-white" />
            <div className="flex gap-2">
              <button onClick={() => setPlanModal(false)} className="flex-1 py-2 rounded-lg bg-gray-700 text-sm text-gray-300">Cancel</button>
              <button onClick={handleChangePlan} disabled={actionLoading} className="flex-1 py-2 rounded-lg bg-brand-600 text-sm text-white">Apply</button>
            </div>
          </div>
        </div>
      )}

      {suspendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-80 border border-gray-700 space-y-4">
            <h3 className="text-white font-semibold">Suspend Account</h3>
            <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Reason for suspension" className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-2 text-sm text-white h-20 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setSuspendModal(false)} className="flex-1 py-2 rounded-lg bg-gray-700 text-sm text-gray-300">Cancel</button>
              <button onClick={handleSuspend} disabled={actionLoading || !suspendReason.trim()} className="flex-1 py-2 rounded-lg bg-red-600 text-sm text-white">Suspend</button>
            </div>
          </div>
        </div>
      )}

      {extendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-80 border border-gray-700 space-y-4">
            <h3 className="text-white font-semibold">Extend Trial</h3>
            <input type="number" min={1} max={30} value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-2 text-sm text-white" />
            <p className="text-gray-400 text-xs">Max 30 days</p>
            <div className="flex gap-2">
              <button onClick={() => setExtendModal(false)} className="flex-1 py-2 rounded-lg bg-gray-700 text-sm text-gray-300">Cancel</button>
              <button onClick={handleExtendTrial} disabled={actionLoading} className="flex-1 py-2 rounded-lg bg-brand-600 text-sm text-white">Extend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
