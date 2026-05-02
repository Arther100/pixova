"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface StudioInfo {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  avg_rating: number;
}

type OtpStep = "phone" | "otp" | "verified";

const EVENT_TYPES = ["Wedding","Pre-Wedding","Portrait","Corporate","Fashion","Newborn","Event","Product","Architecture","Other"];
const BUDGET_PRESETS = [
  { label: "₹10k", min: 0, max: 1000000 },
  { label: "₹25k", min: 0, max: 2500000 },
  { label: "₹50k", min: 0, max: 5000000 },
  { label: "₹1L",  min: 0, max: 10000000 },
  { label: "₹1L+", min: 10000000, max: null },
];

function EnquireContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studioSlug = params.studioSlug as string;

  const [studio, setStudio] = useState<StudioInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Client details
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // OTP
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [verifiedOtp, setVerifiedOtp] = useState("");

  // Event details
  const [eventType, setEventType] = useState(searchParams.get("event") || "Wedding");
  const [eventDate, setEventDate] = useState(searchParams.get("date") || "");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [venueName, setVenueName] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");

  // Budget
  const [budgetMin, setBudgetMin] = useState<number | null>(null);
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchStudio = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/studio/${studioSlug}`);
      const json = await res.json();
      if (json.success) setStudio(json.data.studio);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => { fetchStudio(); }, [fetchStudio]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!clientPhone || clientPhone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setSendingOtp(true);
    try {
      const phone = `+91${clientPhone.replace(/\D/g, "").slice(-10)}`;
      const res = await fetch("/api/v1/client/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (json.success) {
        setClientPhone(phone);
        setOtpStep("otp");
        setOtpCountdown(30);
      } else {
        setError(json.error || "Failed to send OTP");
      }
    } catch {
      setError("Network error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setError("");
    setSendingOtp(true);
    try {
      const res = await fetch("/api/v1/client/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clientPhone, otp }),
      });
      const json = await res.json();
      if (json.success) {
        setVerifiedOtp(otp);
        setOtpStep("verified");
      } else {
        setError(json.error || "Invalid OTP");
      }
    } catch {
      setError("Network error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio) return;
    if (otpStep !== "verified") { setError("Please verify your phone number first"); return; }
    if (!eventDate) { setError("Event date is required"); return; }
    if (!eventCity) { setError("Event city is required"); return; }

    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name:   clientName,
          client_phone:  clientPhone,
          client_email:  clientEmail || null,
          event_type:    eventType,
          event_date:    eventDate,
          event_end_date: eventEndDate || null,
          event_city:    eventCity,
          venue_name:    venueName || null,
          guest_count:   guestCount ? Number(guestCount) : null,
          message:       message || null,
          budget_min:    budgetMin,
          budget_max:    budgetMax,
          studio_ids:    [studio.id],
        }),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/account/enquiries/${json.data.enquiry_id}`);
      } else {
        setError(json.error || "Failed to submit enquiry");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Studio not found.</p>
          <Link href="/explore" className="mt-4 text-brand-600 hover:underline">← Back to Explore</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link href={`/${studioSlug}`} className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400">
            ← Back to Profile
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Send Enquiry
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            to <span className="font-semibold text-gray-700 dark:text-gray-300">{studio.name}</span>
            {studio.city ? ` · ${studio.city}` : ""}
            {studio.avg_rating > 0 ? ` · ⭐ ${studio.avg_rating.toFixed(1)}` : ""}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Your Details */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Your Details</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                {otpStep === "phone" && (
                  <div className="flex gap-2">
                    <div className="flex flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                      <span className="flex items-center bg-gray-50 px-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">+91</span>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="flex-1 bg-white px-3 py-2.5 text-sm dark:bg-gray-800 dark:text-white outline-none"
                        placeholder="10-digit number"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {sendingOtp ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                )}
                {otpStep === "otp" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">OTP sent to +91{clientPhone.slice(-10)} via WhatsApp</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-lg font-bold tracking-widest dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        placeholder="_ _ _ _ _ _"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={sendingOtp || otp.length !== 6}
                        className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {sendingOtp ? "Verifying..." : "Verify →"}
                      </button>
                    </div>
                    {otpCountdown > 0 ? (
                      <p className="text-xs text-gray-400">Resend in {otpCountdown}s</p>
                    ) : (
                      <button type="button" onClick={handleSendOtp} className="text-xs text-brand-600 hover:underline">
                        Resend OTP
                      </button>
                    )}
                  </div>
                )}
                {otpStep === "verified" && (
                  <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-800 dark:bg-green-900/20">
                    <span className="text-green-600">✓</span>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">{clientPhone} verified</span>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Email (optional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Event Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">End Date (opt.)</label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  min={eventDate || new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventCity}
                  onChange={(e) => setEventCity(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Event city"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Venue (optional)</label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Venue name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Guests (opt.)</label>
                <input
                  type="number"
                  min="1"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Guest count"
                />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Budget</h2>
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((b, i) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => {
                    setSelectedBudget(i);
                    setBudgetMin(b.min);
                    setBudgetMax(b.max);
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedBudget === i
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/20 dark:text-brand-300"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Message (optional)</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Tell them about your requirements..."
            />
            <p className="mt-1 text-right text-xs text-gray-400">{message.length}/500</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || otpStep !== "verified"}
            className="w-full rounded-2xl bg-brand-600 py-4 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Sending..." : "Send Enquiry →"}
          </button>
          <p className="text-center text-xs text-gray-400">Free · No commitment · OTP verified</p>
        </form>
      </div>
    </div>
  );
}

export default function EnquirePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    }>
      <EnquireContent />
    </Suspense>
  );
}
