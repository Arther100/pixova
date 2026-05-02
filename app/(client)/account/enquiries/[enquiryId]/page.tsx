"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface EnquiryDetails {
  enquiry_id: string;
  client_name: string;
  client_phone: string;
  event_type: string;
  event_date: string;
  event_city: string;
  venue_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  guest_count: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface StudioResponse {
  id: string;
  es_id: string;
  studio_id: string;
  studio_name: string;
  studio_slug: string;
  avg_rating: number;
  city: string | null;
  cover_photo_url: string | null;
  es_status: string;
  quote_amount: number | null;
  quote_note: string | null;
  replied_at: string | null;
}

export default function EnquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enquiryId = params.enquiryId as string;

  const [enquiry, setEnquiry] = useState<EnquiryDetails | null>(null);
  const [responses, setResponses] = useState<StudioResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnquiry = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/enquiries/${enquiryId}`);
      if (res.status === 401) {
        router.replace("/login?type=client");
        return;
      }
      const json = await res.json();
      if (json.success) {
        setEnquiry(json.data.enquiry);
        setResponses(json.data.responses || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [enquiryId, router]);

  useEffect(() => { fetchEnquiry(); }, [fetchEnquiry]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Enquiry not found.</p>
          <Link href="/account" className="mt-4 inline-block text-brand-600 hover:underline">← My Account</Link>
        </div>
      </div>
    );
  }

  const repliedCount = responses.filter(r => ["REPLIED","ACCEPTED","CONVERTED"].includes(r.es_status)).length;
  const eventDateStr = new Date(enquiry.event_date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const budgetStr = enquiry.budget_min && enquiry.budget_max
    ? `₹${(enquiry.budget_min / 100).toLocaleString("en-IN")} - ₹${(enquiry.budget_max / 100).toLocaleString("en-IN")}`
    : enquiry.budget_max
    ? `Up to ₹${(enquiry.budget_max / 100).toLocaleString("en-IN")}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link href="/account" className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400">
            ← My Enquiries
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {/* Enquiry details */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">
            {enquiry.event_type} · {eventDateStr}
          </h1>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Location</p>
              <p className="text-sm text-gray-900 dark:text-white">{enquiry.event_city}</p>
            </div>
            {budgetStr && (
              <div>
                <p className="text-xs font-medium text-gray-500">Budget</p>
                <p className="text-sm text-gray-900 dark:text-white">{budgetStr}</p>
              </div>
            )}
            {enquiry.guest_count && (
              <div>
                <p className="text-xs font-medium text-gray-500">Guests</p>
                <p className="text-sm text-gray-900 dark:text-white">{enquiry.guest_count}</p>
              </div>
            )}
            {enquiry.venue_name && (
              <div>
                <p className="text-xs font-medium text-gray-500">Venue</p>
                <p className="text-sm text-gray-900 dark:text-white">{enquiry.venue_name}</p>
              </div>
            )}
          </div>
          {enquiry.message && (
            <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-xs font-medium text-gray-500 mb-1">Your message</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">"{enquiry.message}"</p>
            </div>
          )}
        </div>

        {/* Responses */}
        <div>
          <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">
            Responses ({repliedCount} of {responses.length} replied)
          </h2>
          <div className="space-y-3">
            {responses.map((r) => (
              <div key={r.id || r.es_id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    {r.cover_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.cover_photo_url} alt={r.studio_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl text-gray-300">📷</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 dark:text-white">{r.studio_name}</p>
                      {r.avg_rating > 0 && (
                        <span className="text-sm text-gray-500">⭐ {r.avg_rating.toFixed(1)}</span>
                      )}
                    </div>
                    {r.city && <p className="text-xs text-gray-500">📍 {r.city}</p>}
                  </div>
                </div>

                {/* Response content */}
                {r.es_status === "REPLIED" || r.es_status === "ACCEPTED" || r.es_status === "CONVERTED" ? (
                  <div className="mt-4 space-y-3">
                    {r.quote_amount && (
                      <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Quote</span>
                        <span className="text-lg font-bold text-green-800 dark:text-green-200">
                          ₹{(r.quote_amount / 100).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {r.quote_note && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">"{r.quote_note}"</p>
                    )}
                    <div className="flex gap-2">
                      <Link
                        href={`/${r.studio_slug}`}
                        className="flex-1 rounded-xl border border-gray-200 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/${r.studio_slug}/enquire`}
                        className="flex-1 rounded-xl bg-brand-600 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Accept & Book →
                      </Link>
                    </div>
                  </div>
                ) : r.es_status === "DECLINED" ? (
                  <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800">
                    This studio has declined your enquiry.
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">Awaiting response...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
