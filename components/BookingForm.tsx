// ============================================
// BookingForm — Create / Edit booking form
// ============================================

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { rupeesToPaise, paiseToRupees } from "@/utils/currency";

interface PackageOption {
  id: string;
  name: string;
  price: number; // paise
  deliverables: string | null;
}

interface BookingFormProps {
  mode: "create" | "edit";
  bookingId?: string;
  initialData?: {
    clientName?: string;
    clientMobile?: string;
    clientEmail?: string;
    title?: string;
    eventType?: string;
    eventDate?: string;
    eventEndDate?: string;
    eventTime?: string;
    venue?: string;
    venueAddress?: string;
    city?: string;
    packageId?: string;
    totalAmount?: number; // paise
    advanceAmount?: number; // paise
    notes?: string;
    internalNotes?: string;
    teamMembers?: string[];
    status?: string;
  };
}

// Module-level cache: packages rarely change, cache across navigations
let cachedPackages: PackageOption[] | null = null;

const EVENT_TYPES = [
  "Wedding",
  "Pre-Wedding",
  "Engagement",
  "Birthday",
  "Baby Shower",
  "Maternity",
  "New Born",
  "Corporate",
  "Product",
  "Portrait",
  "Fashion",
  "Event",
  "Other",
];

export function BookingForm({ mode, bookingId, initialData }: BookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageOption[]>([]);

  // Prefetch target page so navigation after save is instant
  useEffect(() => {
    if (mode === "edit" && bookingId) {
      router.prefetch(`/bookings/${bookingId}`);
    }
    router.prefetch("/bookings");
  }, [router, mode, bookingId]);

  // ── Form state ──
  const [clientName, setClientName] = useState(initialData?.clientName || "");
  const [clientMobile, setClientMobile] = useState(initialData?.clientMobile || "");
  const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [eventType, setEventType] = useState(initialData?.eventType || "");
  const [eventDate, setEventDate] = useState(initialData?.eventDate || "");
  const [eventEndDate, setEventEndDate] = useState(initialData?.eventEndDate || "");
  const [eventTime, setEventTime] = useState(initialData?.eventTime || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [venueAddress, setVenueAddress] = useState(initialData?.venueAddress || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [selectedPackage, setSelectedPackage] = useState(initialData?.packageId || "");
  const [totalRupees, setTotalRupees] = useState(
    initialData?.totalAmount ? paiseToRupees(initialData.totalAmount).toString() : ""
  );
  const [advanceRupees, setAdvanceRupees] = useState(
    initialData?.advanceAmount ? paiseToRupees(initialData.advanceAmount).toString() : ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || "");
  const [teamMembersText, setTeamMembersText] = useState(
    initialData?.teamMembers?.join(", ") || ""
  );

  // Lock total_amount for edit mode when status is confirmed+
  const isAmountLocked =
    mode === "edit" &&
    !!initialData?.status &&
    ["confirmed", "in_progress", "delivered", "completed"].includes(initialData.status);

  // ── Load packages (with in-memory cache) ──
  const pkgFetched = useRef(false);
  useEffect(() => {
    if (pkgFetched.current) return;
    pkgFetched.current = true;

    // Use cache if available
    if (cachedPackages) {
      setPackages(cachedPackages);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/v1/packages");
        const json = await res.json();
        if (json.success && json.data?.packages) {
          cachedPackages = json.data.packages;
          setPackages(json.data.packages);
        }
      } catch {
        // Non-critical — form works without packages
      }
    })();
  }, []);

  // ── Auto-fill from package ──
  useEffect(() => {
    if (selectedPackage && mode === "create") {
      const pkg = packages.find((p) => p.id === selectedPackage);
      if (pkg) {
        setTotalRupees(paiseToRupees(pkg.price).toString());
        if (!title) setTitle(pkg.name);
      }
    }
  }, [selectedPackage, packages, mode, title]);

  // ── Field validation helpers ──
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (mode === "create") {
      if (!clientName.trim() || clientName.trim().length < 2) {
        errors.clientName = "Client name must be at least 2 characters";
      }
      const digits = clientMobile.replace(/\D/g, "");
      const normalizedDigits = digits.startsWith("91") && digits.length === 12
        ? digits.slice(2)
        : digits;
      if (!/^[6-9]\d{9}$/.test(normalizedDigits)) {
        errors.clientMobile = "Enter a valid 10-digit Indian mobile number";
      }
    }

    if (!title.trim()) errors.title = "Title is required";

    const totalNum = parseFloat(totalRupees);
    if (!totalRupees || isNaN(totalNum) || totalNum < 1000) {
      errors.totalRupees = "Minimum total is ₹1,000";
    }

    const advanceNum = parseFloat(advanceRupees || "0");
    if (advanceNum > totalNum) {
      errors.advanceRupees = "Advance cannot exceed total";
    }

    if (eventDate) {
      const d = new Date(eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) {
        errors.eventDate = "Event date must be today or in the future";
      }
    }

    if (eventDate && eventEndDate && new Date(eventEndDate) < new Date(eventDate)) {
      errors.eventEndDate = "End date must be on or after start date";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const totalPaise = rupeesToPaise(parseFloat(totalRupees));
      const advancePaise = advanceRupees ? rupeesToPaise(parseFloat(advanceRupees)) : 0;
      const teamMembers = teamMembersText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        title: title.trim(),
        eventType: eventType || undefined,
        eventDate: eventDate || undefined,
        eventEndDate: eventEndDate || undefined,
        eventTime: eventTime || undefined,
        venue: venue || undefined,
        venueAddress: venueAddress || undefined,
        city: city || undefined,
        packageId: selectedPackage || undefined,
        totalAmount: totalPaise,
        advanceAmount: advancePaise,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
      };

      if (mode === "create") {
        payload.clientName = clientName.trim();
        payload.clientMobile = clientMobile.trim();
        if (clientEmail) payload.clientEmail = clientEmail.trim();
      }

      const url =
        mode === "create"
          ? "/api/v1/bookings"
          : `/api/v1/bookings/${bookingId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Something went wrong");
        return;
      }

      // Show success briefly, then navigate
      setSuccess(true);
      const newBookingId = json.data?.id || bookingId;
      // Prefetch destination and navigate after brief success feedback
      router.prefetch(`/bookings/${newBookingId}`);
      setTimeout(() => router.push(`/bookings/${newBookingId}`), 300);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          {mode === "create" ? "Booking created!" : "Changes saved!"}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Redirecting…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Client Details ── */}
      {mode === "create" && (
        <section>
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Client Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Client Name *"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g., Priya Sharma"
              error={fieldErrors.clientName}
            />
            <Input
              label="Mobile Number *"
              value={clientMobile}
              onChange={(e) => setClientMobile(e.target.value)}
              placeholder="e.g., 9876543210"
              error={fieldErrors.clientMobile}
            />
            <Input
              label="Email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </section>
      )}

      {/* ── Event Details ── */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Event Details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Booking Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Priya & Raj Wedding"
            error={fieldErrors.title}
          />

          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="select-styled w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100"
            >
              <option value="">Select type</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <Input
            label="Event Date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            error={fieldErrors.eventDate}
          />

          <Input
            label="End Date"
            type="date"
            value={eventEndDate}
            onChange={(e) => setEventEndDate(e.target.value)}
            hint="For multi-day events"
            error={fieldErrors.eventEndDate}
          />

          <Input
            label="Event Time"
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
          />

          <Input
            label="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g., The Grand Palace"
          />

          <Input
            label="Venue Address"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            placeholder="Full address"
          />

          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Chennai"
          />
        </div>
      </section>

      {/* ── Package & Pricing ── */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Package &amp; Pricing
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.length > 0 && (
            <div className="w-full">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Package
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="select-styled w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100"
              >
                <option value="">No package</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{paiseToRupees(p.price).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Total Amount (₹) *"
            type="number"
            value={totalRupees}
            onChange={(e) => setTotalRupees(e.target.value)}
            placeholder="e.g., 50000"
            error={fieldErrors.totalRupees}
            disabled={isAmountLocked}
            hint={isAmountLocked ? "Locked after confirmation" : "Minimum ₹1,000"}
          />

          <Input
            label="Advance Amount (₹)"
            type="number"
            value={advanceRupees}
            onChange={(e) => setAdvanceRupees(e.target.value)}
            placeholder="e.g., 10000"
            error={fieldErrors.advanceRupees}
            hint="Amount expected as advance"
          />
        </div>
      </section>

      {/* ── Notes & Team ── */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Notes &amp; Team
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes (shared with client)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Any details to share with the client..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Internal Notes (private)
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Private notes for your reference..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <Input
            label="Team Members"
            value={teamMembersText}
            onChange={(e) => setTeamMembersText(e.target.value)}
            placeholder="e.g., Ram, Sita, Lakshman"
            hint="Comma separated names"
          />
        </div>
      </section>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button type="submit" loading={loading}>
          {mode === "create" ? "Create Booking" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
