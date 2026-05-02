"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface EnquiryFull {
  enquiry_id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  event_type: string;
  event_date: string;
  event_end_date: string | null;
  event_city: string;
  venue_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  guest_count: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface EsRow {
  id: string;
  status: string;
  quote_amount: number | null;
  quote_note: string | null;
  replied_at: string | null;
}

export default function PhotographerEnquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enquiryId = params.enquiryId as string;

  const [enquiry, setEnquiry] = useState<EnquiryFull | null>(null);
  const [esRow, setEsRow] = useState<EsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reply form
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [bookingId, setBookingId] = useState("");

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEnquiry = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/enquiries/${enquiryId}`);
      const json = await res.json();
      if (json.success) {
        setEnquiry(json.data.enquiry);
        // Find this photographer's studio response
        if (json.data.responses?.length > 0) {
          setEsRow(json.data.responses[0]);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [enquiryId]);

  useEffect(() => { fetchEnquiry(); }, [fetchEnquiry]);

  const handleAction = async (action: "reply" | "decline" | "convert") => {
    if (!esRow) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "reply") {
        if (!quoteAmount && !quoteNote) {
          showToast("error", "Enter a quote amount or message");
          setSubmitting(false);
          return;
        }
        if (quoteAmount) body.quote_amount = Math.round(Number(quoteAmount) * 100); // rupees → paise
        if (quoteNote) body.quote_note = quoteNote;
      }
      if (action === "convert") {
        if (!bookingId) { showToast("error", "Enter the booking ID"); setSubmitting(false); return; }
        body.booking_id = bookingId;
      }

      const res = await fetch(`/api/v1/photographer/enquiries/${esRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", action === "reply" ? "Reply sent via WhatsApp!" : action === "decline" ? "Enquiry declined" : "Converted to booking!");
        fetchEnquiry();
      } else {
        showToast("error", json.error || "Action failed");
      }
    } catch {
      showToast("error", "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Enquiry not found.</p>
        <Link href="/enquiries" className="mt-4 inline-block text-brand-600 hover:underline">← Back to Enquiries</Link>
      </div>
    );
  }

  const isReplied = esRow?.status === "REPLIED" || esRow?.status === "ACCEPTED" || esRow?.status === "CONVERTED";
  const isDeclined = esRow?.status === "DECLINED";
  const eventDateStr = new Date(enquiry.event_date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const budgetStr = enquiry.budget_min && enquiry.budget_max
    ? `₹${(enquiry.budget_min / 100).toLocaleString("en-IN")} - ₹${(enquiry.budget_max / 100).toLocaleString("en-IN")}`
    : enquiry.budget_max
    ? `Up to ₹${(enquiry.budget_max / 100).toLocaleString("en-IN")}`
    : "Not specified";

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-20 z-50 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium ${
          toast.type === "success" ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200" :
          "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/enquiries" className="text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400">
          ← Back to Enquiries
        </Link>
      </div>

      {/* Client + Event details */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">
          {enquiry.event_type} Enquiry
        </h1>
        <p className="mt-1 text-sm text-gray-500">{eventDateStr}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-gray-500">Client</p>
            <p className="font-semibold text-gray-900 dark:text-white">{enquiry.client_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">WhatsApp</p>
            <p className="font-semibold text-gray-900 dark:text-white">{enquiry.client_phone}</p>
          </div>
          {enquiry.client_email && (
            <div>
              <p className="text-xs font-medium text-gray-500">Email</p>
              <p className="font-semibold text-gray-900 dark:text-white">{enquiry.client_email}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500">City</p>
            <p className="font-semibold text-gray-900 dark:text-white">{enquiry.event_city}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Budget</p>
            <p className="font-semibold text-gray-900 dark:text-white">{budgetStr}</p>
          </div>
          {enquiry.guest_count && (
            <div>
              <p className="text-xs font-medium text-gray-500">Guests</p>
              <p className="font-semibold text-gray-900 dark:text-white">{enquiry.guest_count}</p>
            </div>
          )}
          {enquiry.venue_name && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-500">Venue</p>
              <p className="font-semibold text-gray-900 dark:text-white">{enquiry.venue_name}</p>
            </div>
          )}
        </div>

        {enquiry.message && (
          <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 mb-2">Message from client</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">"{enquiry.message}"</p>
          </div>
        )}
      </div>

      {/* Current status */}
      {esRow && (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isReplied ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
              isDeclined ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}>
              {esRow.status}
            </span>
            {esRow.quote_amount && (
              <span className="ml-auto text-sm font-semibold text-gray-900 dark:text-white">
                Quote: ₹{(esRow.quote_amount / 100).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reply form (only if not yet replied/declined) */}
      {!isReplied && !isDeclined && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Reply with Quote</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Quote Amount (₹)
              </label>
              <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <span className="bg-gray-50 px-3 py-2.5 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="e.g. 35000"
                  className="flex-1 bg-white px-3 py-2.5 text-sm outline-none dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Message</label>
              <textarea
                rows={3}
                value={quoteNote}
                onChange={(e) => setQuoteNote(e.target.value.slice(0, 1000))}
                placeholder="Tell them about your availability, packages, etc..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("reply")}
                disabled={submitting}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send Reply via WhatsApp"}
              </button>
              <button
                onClick={() => handleAction("decline")}
                disabled={submitting}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to booking */}
      {isReplied && esRow?.status !== "CONVERTED" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Convert to Booking</h2>
          <p className="mb-3 text-sm text-gray-500">Already created a booking? Link it here to mark this enquiry as converted.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Booking ID (UUID)"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={() => handleAction("convert")}
              disabled={submitting || !bookingId}
              className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              Convert →
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Or <Link href="/bookings/new" className="text-brand-600 hover:underline">create a new booking →</Link>
          </p>
        </div>
      )}
    </div>
  );
}
