"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface FeedbackData {
  id: string;
  rating: number;
  review_text: string | null;
  is_public: boolean;
  photographer_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function PortalFeedbackPage() {
  const params = useParams();
  const portalToken = params.portalToken as string;

  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    // Fetch feedback and booking status
    Promise.all([
      fetch("/api/v1/portal/me/feedback").then((r) => r.json()),
      // We need the booking status — get it from overview cookie/session
    ]).then(([feedbackJson]) => {
      if (feedbackJson.success && feedbackJson.data.feedback) {
        setFeedback(feedbackJson.data.feedback);
      }
      // Get booking status from stored session data
      const status = feedbackJson.data?.booking_status;
      if (status) setBookingStatus(status);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/portal/me/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          review_text: reviewText.trim() || null,
          is_public: isPublic,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(json.data.feedback);
        setSubmitted(true);
      }
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const isDelivered = ["delivered", "completed"].includes(bookingStatus);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-gray-100" />
        <div className="h-40 rounded-xl bg-gray-50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`/portal/${portalToken}/overview`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Back to Overview
      </Link>

      <h1 className="text-lg font-bold text-gray-900">Feedback</h1>

      {/* State 1: Already submitted */}
      {feedback ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <p className="mb-2 text-xs text-gray-400">Your Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`text-2xl ${star <= feedback.rating ? "text-yellow-400" : "text-gray-200"}`}>
                  ★
                </span>
              ))}
            </div>
            {feedback.review_text && (
              <p className="mt-3 text-sm text-gray-700">{feedback.review_text}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Submitted {new Date(feedback.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {feedback.is_public ? " · Public" : " · Private"}
            </p>
          </div>

          {/* Photographer reply */}
          {feedback.photographer_reply && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="mb-1 text-xs font-medium text-blue-700">Photographer&apos;s Reply</p>
              <p className="text-sm text-blue-900">{feedback.photographer_reply}</p>
              {feedback.replied_at && (
                <p className="mt-1 text-xs text-blue-400">
                  {new Date(feedback.replied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-xs text-gray-400">Thank you for your feedback! 🙏</p>
        </div>
      ) : !isDelivered ? (
        /* State 3: Not yet delivered */
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
          <span className="text-4xl">⏳</span>
          <p className="mt-3 text-sm text-gray-500">Feedback is available after your booking is delivered.</p>
          <p className="mt-1 text-xs text-gray-400">Once your photos are delivered, you can share your experience here.</p>
        </div>
      ) : submitted ? (
        /* Just submitted */
        <div className="rounded-xl border border-green-100 bg-green-50 p-8 text-center">
          <span className="text-4xl">✅</span>
          <p className="mt-3 text-sm font-medium text-green-700">Thank you for your feedback!</p>
          <p className="mt-1 text-xs text-green-600">Your review helps the photographer grow their business.</p>
        </div>
      ) : (
        /* State 2: Submit form */
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            {/* Star rating */}
            <p className="mb-2 text-sm font-medium text-gray-700">How was your experience?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    star <= rating ? "text-yellow-400" : "text-gray-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
              </p>
            )}
          </div>

          {/* Review text */}
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Write a review <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 1000))}
              placeholder="Tell us about your experience..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{reviewText.length}/1000</p>
          </div>

          {/* Public toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Make review public</p>
              <p className="text-xs text-gray-400">Your review may be shown on the photographer&apos;s profile</p>
            </div>
          </label>

          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      )}
    </div>
  );
}
