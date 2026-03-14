// ============================================
// BookingForm — Create / Edit booking form
// ============================================

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { DatePicker, TimePicker } from "@/components/ui/scroll-picker";
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
  const { t } = useI18n();
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

  // ── MOD-03: Date conflict check ──
  const [dateConflict, setDateConflict] = useState<{
    status: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!eventDate) {
      setDateConflict(null);
      return;
    }

    const controller = new AbortController();

    const checkDate = async () => {
      try {
        // Use photographer_id from cookie session (server resolves it)
        const res = await fetch(
          `/api/v1/calendar/check?photographer_id=self&date=${eventDate}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        if (data.data?.status === "BOOKED" || data.data?.status === "BLOCKED") {
          setDateConflict({
            status: "error",
            message: t.calendar.dateConflictBooked,
          });
        } else if (data.data?.status === "ENQUIRY") {
          setDateConflict({
            status: "warning",
            message: t.calendar.dateConflictEnquiry,
          });
        } else {
          setDateConflict(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setDateConflict(null);
      }
    };

    checkDate();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDate]);

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
        // Handle DATE_CONFLICT with confirmation dialog
        if (json.error?.code === "DATE_CONFLICT") {
          const confirmed = window.confirm(
            `This date already has a ${json.error.conflictStatus?.toLowerCase()} booking. Are you sure you want to create another booking on this date?`
          );
          if (confirmed) {
            // Retry with override flag
            const retryRes = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, confirm_date_override: true }),
            });
            const retryJson = await retryRes.json();
            if (!retryRes.ok || !retryJson.success) {
              setError(retryJson.error?.message || retryJson.error || t.bookingForm.somethingWrong);
              return;
            }
            // Override succeeded — continue to success flow
            setSuccess(true);
            const overrideId = retryJson.data?.id || bookingId;
            router.prefetch(`/bookings/${overrideId}`);
            setTimeout(() => router.push(`/bookings/${overrideId}`), 300);
            return;
          }
          // User cancelled — stay on form
          return;
        }
        setError(json.error?.message || json.error || t.bookingForm.somethingWrong);
        return;
      }

      // Show success briefly, then navigate
      setSuccess(true);
      const newBookingId = json.data?.id || bookingId;
      // Prefetch destination and navigate after brief success feedback
      router.prefetch(`/bookings/${newBookingId}`);
      setTimeout(() => router.push(`/bookings/${newBookingId}`), 300);
    } catch {
      setError(t.bookingForm.networkError);
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
          {mode === "create" ? t.bookingForm.bookingCreated : t.bookingForm.changesSaved}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.bookingForm.redirecting}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 lg:space-y-10">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Client Details ── */}
      {mode === "create" && (
        <section>
          <h3 className="mb-4 text-sm font-semibold text-gray-900 lg:mb-5 lg:text-base dark:text-gray-100">
            {t.bookingForm.clientDetails}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <Input
              label={t.bookingForm.clientName}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g., Priya Sharma"
              error={fieldErrors.clientName}
            />
            <Input
              label={t.bookingForm.mobileNumber}
              value={clientMobile}
              onChange={(e) => setClientMobile(e.target.value)}
              placeholder="e.g., 9876543210"
              error={fieldErrors.clientMobile}
            />
            <Input
              label={t.bookingForm.email}
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
        <h3 className="mb-4 text-sm font-semibold text-gray-900 lg:mb-5 lg:text-base dark:text-gray-100">
          {t.bookingForm.eventDetails}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <Input
            label={t.bookingForm.bookingTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Priya & Raj Wedding"
            error={fieldErrors.title}
          />

          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700 lg:text-base dark:text-gray-300">
              {t.bookingForm.eventType}
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="select-styled w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 lg:py-3 lg:text-base dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100"
            >
              <option value="">{t.bookingForm.selectEventType}</option>
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          <div>
            <DatePicker
              label={t.bookingForm.eventDate}
              value={eventDate}
              onChange={(v) => {
                setEventDate(v);
                // If end date is before new start date, reset it
                if (eventEndDate && v > eventEndDate) {
                  setEventEndDate("");
                }
              }}
              error={fieldErrors.eventDate}
            />
            {dateConflict && (
              <p
                className={`mt-1 text-sm ${
                  dateConflict.status === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {dateConflict.message}
              </p>
            )}
          </div>

          <DatePicker
            label={t.bookingForm.eventEndDate}
            value={eventEndDate}
            onChange={setEventEndDate}
            minDate={eventDate || undefined}
            disabled={!eventDate}
            hint={!eventDate ? t.bookingForm.chooseDateFirst : t.bookingForm.multiDay}
            error={fieldErrors.eventEndDate}
          />

          <TimePicker
            label={t.bookingForm.eventTime}
            value={eventTime}
            onChange={setEventTime}
          />

          <Input
            label={t.bookingForm.venueLabel}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g., The Grand Palace"
          />

          <Input
            label={t.bookingForm.venueAddress}
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            placeholder="Full address"
          />

          <Input
            label={t.bookingForm.cityLabel}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Chennai"
          />
        </div>
      </section>

      {/* ── Package & Pricing ── */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-gray-900 lg:mb-5 lg:text-base dark:text-gray-100">
          {t.bookingForm.packagePricing}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {packages.length > 0 && (
            <div className="w-full">
              <label className="mb-1 block text-sm font-medium text-gray-700 lg:text-base dark:text-gray-300">
                {t.bookingForm.packageLabel}
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="select-styled w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 lg:py-3 lg:text-base dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100"
              >
                <option value="">{t.bookingForm.noPackage}</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{paiseToRupees(p.price).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label={t.bookingForm.totalAmount}
            type="number"
            value={totalRupees}
            onChange={(e) => setTotalRupees(e.target.value)}
            placeholder="e.g., 50000"
            error={fieldErrors.totalRupees}
            disabled={isAmountLocked}
            hint={isAmountLocked ? t.bookingForm.lockedAfter : t.bookingForm.minAmount}
          />

          <Input
            label={t.bookingForm.advanceAmount}
            type="number"
            value={advanceRupees}
            onChange={(e) => setAdvanceRupees(e.target.value)}
            placeholder="e.g., 10000"
            error={fieldErrors.advanceRupees}
            hint={t.bookingForm.advanceHint}
          />
        </div>
      </section>

      {/* ── Notes & Team ── */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-gray-900 lg:mb-5 lg:text-base dark:text-gray-100">
          {t.bookingForm.notesTeam}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700 lg:text-base dark:text-gray-300">
              {t.bookingForm.clientNotes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Any details to share with the client..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 lg:py-3 lg:text-base dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-gray-700 lg:text-base dark:text-gray-300">
              {t.bookingForm.internalNotes}
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Private notes for your reference..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 lg:py-3 lg:text-base dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <Input
            label={t.bookingForm.teamMembers}
            value={teamMembersText}
            onChange={(e) => setTeamMembersText(e.target.value)}
            placeholder="e.g., Ram, Sita, Lakshman"
            hint={t.bookingForm.teamHint}
          />
        </div>
      </section>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          {t.cancel}
        </Button>
        <Button type="submit" loading={loading}>
          {mode === "create" ? t.bookingForm.createBooking : t.bookingForm.saveChanges}
        </Button>
      </div>
    </form>
  );
}
