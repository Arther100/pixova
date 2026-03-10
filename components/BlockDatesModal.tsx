// ============================================
// BlockDatesModal — Modal to manually block date ranges
// ============================================

"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";

interface BlockDatesModalProps {
  isOpen: boolean;
  initialDate?: string;
  onClose: () => void;
  onSuccess: (dates: string[]) => void;
}

function formatPreviewDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function countDays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function BlockDatesModal({
  isOpen,
  initialDate,
  onClose,
  onSuccess,
}: BlockDatesModalProps) {
  const { locale, t } = useI18n();
  const dateLocale = `${locale}-IN`;
  const [startDate, setStartDate] = useState(initialDate || "");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate(initialDate || "");
      setEndDate("");
      setNotes("");
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialDate]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const effectiveEnd = endDate || startDate;
  const dayCount = startDate ? countDays(startDate, effectiveEnd) : 0;

  // Client-side validation
  function validate(): boolean {
    if (!startDate) {
      setError("Start date is required");
      return false;
    }
    if (startDate < todayStr) {
      setError("Cannot block dates in the past");
      return false;
    }
    if (endDate && endDate < startDate) {
      setError("End date must be on or after start date");
      return false;
    }
    if (dayCount > 30) {
      setError("Cannot block more than 30 days at once");
      return false;
    }
    if (notes.length > 200) {
      setError("Notes cannot exceed 200 characters");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: Record<string, string> = { date: startDate };
      if (endDate && endDate !== startDate) payload.end_date = endDate;
      if (notes.trim()) payload.notes = notes.trim();

      const res = await fetch("/api/v1/calendar/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to block dates");
        return;
      }

      // If all dates were already blocked, show info message
      if (json.data?.blocked === 0) {
        setError(json.data.message || t.calendar.allAlreadyBlocked);
        return;
      }

      onSuccess(json.data?.dates || []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t.calendar.blockDates}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.calendar.startDate} *
            </label>
            <input
              type="date"
              value={startDate}
              min={todayStr}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && e.target.value > endDate) setEndDate("");
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.calendar.endDate}
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || todayStr}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t.calendar.singleDayHint}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.calendar.notes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder={t.calendar.notesPlaceholder}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {notes.length}/200
            </p>
          </div>

          {/* Preview text */}
          {startDate && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
              {dayCount === 1 ? (
                <>{t.calendar.blocking} <strong>1 {t.calendar.date}</strong>: {formatPreviewDate(startDate)}</>
              ) : (
                <>
                  {t.calendar.blocking} <strong>{dayCount} {t.calendar.dates}</strong>:{" "}
                  {formatPreviewDate(startDate)} – {formatPreviewDate(effectiveEnd)}
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {t.calendar.blockDate}{dayCount > 1 ? ` (${dayCount})` : ""}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
