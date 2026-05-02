"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BookingItem {
  booking_id: string;
  booking_ref: string | null;
  studio_name: string;
  studio_slug: string;
  event_type: string | null;
  event_date: string | null;
  title: string;
  status: string;
  balance_amount: number;
  has_gallery: boolean;
  has_agreement: boolean;
  portal_token: string | null;
}

interface EnquiryItem {
  enquiry_id: string;
  event_type: string;
  event_date: string;
  studios_count: number;
  replies_count: number;
  created_at: string;
}

interface SavedStudio {
  studio_id: string;
  studio_name: string;
  studio_slug: string;
  avg_rating: number;
  city: string | null;
  cover_photo_url: string | null;
}

interface DashboardData {
  account: { name: string | null; phone: string; city: string | null; email: string | null };
  upcoming_bookings: BookingItem[];
  past_bookings: BookingItem[];
  active_enquiries: EnquiryItem[];
  saved_studios: SavedStudio[];
  stats: { total_bookings: number; total_spent: number; total_photos: number };
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bookings" | "enquiries" | "saved">("bookings");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/account/dashboard");
      if (res.status === 401) {
        router.replace("/login?type=client&redirect=/account");
        return;
      }
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSignOut = async () => {
    document.cookie = "pixova_account_session=; path=/; max-age=0";
    router.replace("/login?type=client");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const account = data?.account;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl font-bold text-brand-600">Pixova</Link>
          <div className="flex items-center gap-3">
            {account?.name && (
              <span className="text-sm text-gray-700 dark:text-gray-300">Hi {account.name.split(" ")[0]} 👋</span>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Stats */}
        {data?.stats && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { label: "Bookings", value: data.stats.total_bookings },
              { label: "Spent", value: `₹${(data.stats.total_spent / 100).toLocaleString("en-IN")}` },
              { label: "Photos", value: data.stats.total_photos },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(["bookings", "enquiries", "saved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === t
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t === "bookings" ? `Bookings (${(data?.upcoming_bookings?.length ?? 0) + (data?.past_bookings?.length ?? 0)})` :
               t === "enquiries" ? `Enquiries (${data?.active_enquiries?.length ?? 0})` :
               `Saved (${data?.saved_studios?.length ?? 0})`}
            </button>
          ))}
        </div>

        {/* Bookings tab */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {/* Upcoming */}
            {(data?.upcoming_bookings?.length ?? 0) > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {data!.upcoming_bookings.map((b) => (
                    <BookingCard key={b.booking_id} booking={b} />
                  ))}
                </div>
              </div>
            )}
            {/* Past */}
            {(data?.past_bookings?.length ?? 0) > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Past Events
                </h2>
                <div className="space-y-3">
                  {data!.past_bookings.map((b) => (
                    <BookingCard key={b.booking_id} booking={b} />
                  ))}
                </div>
              </div>
            )}
            {(data?.upcoming_bookings?.length ?? 0) === 0 && (data?.past_bookings?.length ?? 0) === 0 && (
              <div className="py-16 text-center">
                <span className="text-4xl">🎊</span>
                <p className="mt-4 text-gray-500">No bookings yet.</p>
                <Link href="/explore" className="mt-2 inline-block text-brand-600 hover:underline">Find a photographer →</Link>
              </div>
            )}
          </div>
        )}

        {/* Enquiries tab */}
        {activeTab === "enquiries" && (
          <div className="space-y-3">
            {(data?.active_enquiries?.length ?? 0) === 0 ? (
              <div className="py-16 text-center">
                <span className="text-4xl">📩</span>
                <p className="mt-4 text-gray-500">No active enquiries.</p>
                <Link href="/explore" className="mt-2 inline-block text-brand-600 hover:underline">Explore photographers →</Link>
              </div>
            ) : (
              data!.active_enquiries.map((enq) => (
                <Link
                  key={enq.enquiry_id}
                  href={`/account/enquiries/${enq.enquiry_id}`}
                  className="block rounded-xl border border-gray-100 bg-white p-4 hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {enq.event_type} · {new Date(enq.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {enq.studios_count} studio{enq.studios_count !== 1 ? "s" : ""} · {enq.replies_count} repl{enq.replies_count !== 1 ? "ies" : "y"}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                      {enq.replies_count > 0 ? "Replied" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Sent {new Date(enq.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Saved studios tab */}
        {activeTab === "saved" && (
          <div className="space-y-3">
            {(data?.saved_studios?.length ?? 0) === 0 ? (
              <div className="py-16 text-center">
                <span className="text-4xl">❤️</span>
                <p className="mt-4 text-gray-500">No saved photographers yet.</p>
                <Link href="/explore" className="mt-2 inline-block text-brand-600 hover:underline">Explore photographers →</Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data!.saved_studios.map((s) => (
                  <Link
                    key={s.studio_id}
                    href={`/${s.studio_slug}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900 transition-colors"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {s.cover_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.cover_photo_url} alt={s.studio_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl text-gray-300">📷</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">{s.studio_name}</p>
                      <p className="text-xs text-gray-500">
                        {s.city && <span>{s.city} · </span>}
                        {s.avg_rating > 0 && <span>⭐ {s.avg_rating.toFixed(1)}</span>}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking: b }: { booking: BookingItem }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {b.event_type || b.title}
            {b.event_date && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                {new Date(b.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </p>
          <Link href={`/${b.studio_slug}`} className="text-sm text-brand-600 hover:underline">
            {b.studio_name}
          </Link>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          b.status === "confirmed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
          b.status === "completed" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
        }`}>
          {b.status}
        </span>
      </div>
      {b.balance_amount > 0 && (
        <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          ₹{(b.balance_amount / 100).toLocaleString("en-IN")} balance due
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {b.portal_token && (
          <Link
            href={`/portal/${b.portal_token}`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            View Details
          </Link>
        )}
        {b.has_gallery && b.portal_token && (
          <Link
            href={`/portal/${b.portal_token}/gallery`}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
          >
            📷 Photos
          </Link>
        )}
        {b.has_agreement && b.portal_token && (
          <Link
            href={`/portal/${b.portal_token}/agreement`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            📄 Agreement
          </Link>
        )}
      </div>
    </div>
  );
}
