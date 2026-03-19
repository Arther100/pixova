// ============================================
// /(photographer)/reviews — Client reviews & ratings
// ============================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FeedbackSummary {
  total_reviews: number;
  average_rating: number;
  rating_breakdown: Record<string, number>;
  recent_feedback: Array<{
    feedback_id: string;
    booking_id: string;
    rating: number;
    review_text: string | null;
    is_public: boolean;
    photographer_reply: string | null;
    submitted_at: string;
    reply_at: string | null;
    client_name: string;
    event_type: string | null;
  }>;
}

export default function ReviewsPage() {
  const [data, setData] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/v1/feedback/summary");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(feedbackId: string, bookingId: string) {
    if (!replyText.trim() || replySending) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/feedback/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setReplyingId(null);
        setReplyText("");
        fetchData(); // Refresh data
      }
    } catch {
      // Silently fail
    } finally {
      setReplySending(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">⭐</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          Reviews
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Client feedback and ratings from your bookings.
        </p>
      </div>

      {/* Summary card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Average Rating</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.average_rating.toFixed(1)}
            </span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`text-lg ${star <= Math.round(data.average_rating) ? "text-yellow-400" : "text-gray-200 dark:text-gray-700"}`}>
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Reviews</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{data.total_reviews}</p>
        </div>
        {/* Rating breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 sm:col-span-2 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">Rating Breakdown</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data.rating_breakdown[String(star)] || 0;
              const pct = data.total_reviews > 0 ? (count / data.total_reviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-gray-500 dark:text-gray-400">{star}</span>
                  <span className="text-yellow-400">★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-gray-400 dark:text-gray-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent feedback */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Recent Reviews
        </h2>
        {data.recent_feedback.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No reviews to display.</p>
        ) : (
          <div className="space-y-3">
            {data.recent_feedback.map((fb) => (
              <div key={fb.feedback_id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {fb.client_name}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-sm ${star <= fb.rating ? "text-yellow-400" : "text-gray-200 dark:text-gray-700"}`}>
                            ★
                          </span>
                        ))}
                      </div>
                      {fb.is_public && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          Public
                        </span>
                      )}
                    </div>
                    {fb.event_type && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{fb.event_type}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(fb.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <Link href={`/bookings/${fb.booking_id}`} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
                      View booking
                    </Link>
                  </div>
                </div>

                {fb.review_text && (
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{fb.review_text}</p>
                )}

                {/* Photographer reply */}
                {fb.photographer_reply ? (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Your Reply</p>
                    <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">{fb.photographer_reply}</p>
                    {fb.reply_at && (
                      <p className="mt-1 text-[10px] text-blue-400 dark:text-blue-500">
                        {new Date(fb.reply_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                ) : replyingId === fb.feedback_id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="Write your reply..."
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{replyText.length}/500</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setReplyingId(null); setReplyText(""); }}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReply(fb.feedback_id, fb.booking_id)}
                          disabled={!replyText.trim() || replySending}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          {replySending ? "Sending..." : "Reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyingId(fb.feedback_id); setReplyText(""); }}
                    className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    Reply to review
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
