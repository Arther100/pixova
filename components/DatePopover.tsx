// ============================================
// DatePopover — Contextual popover for calendar date clicks
// ============================================

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { CalendarBlockEnriched } from "@/types";

interface DatePopoverProps {
  date: string;
  block: CalendarBlockEnriched | null;
  position: { x: number; y: number };
  onClose: () => void;
  onBlock: (date: string) => void;
  onUnblock: (blockId: string) => void;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DatePopover({
  date,
  block,
  position,
  onClose,
  onBlock,
  onUnblock,
}: DatePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { locale, t } = useI18n();
  const dateLocale = `${locale}-IN`;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Position the popover near the clicked cell, bounded to viewport
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = position.x;
    let top = position.y + 8;

    // Keep within viewport
    if (left + rect.width > vw - 16) left = vw - rect.width - 16;
    if (left < 16) left = 16;
    if (top + rect.height > vh - 16) top = position.y - rect.height - 8;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [position]);

  const label = new Date(date + "T00:00:00").toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const status = block?.status || "FREE";

  const dotColors: Record<string, string> = {
    FREE: "",
    BOOKED: "bg-red-500",
    ENQUIRY: "bg-amber-500",
    BLOCKED: "bg-gray-400",
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        {dotColors[status] && (
          <span className={`h-2.5 w-2.5 rounded-full ${dotColors[status]}`} />
        )}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {label}
        </h3>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {/* FREE */}
        {!block && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.calendar.dateAvailable}
            </p>
            <button
              onClick={() => onBlock(date)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t.calendar.blockThisDate}
            </button>
          </>
        )}

        {/* BOOKED */}
        {status === "BOOKED" && block && (
          <>
            <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {block.booking_ref || "Booked"}
            </span>
            {block.client_name && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-gray-400">{t.calendar.client}:</span> {block.client_name}
              </p>
            )}
            {block.event_type && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-gray-400">{t.calendar.event}:</span> {block.event_type}
              </p>
            )}
            {block.booking_id && (
              <Link
                href={`/bookings/${block.booking_id}`}
                className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/30"
              >
                {t.calendar.viewBooking}
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </>
        )}

        {/* ENQUIRY */}
        {status === "ENQUIRY" && block && (
          <>
            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {t.calendar.unconfirmedBooking}
            </span>
            {block.booking_ref && (
              <p className="mt-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                {block.booking_ref}
              </p>
            )}
            {block.client_name && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-gray-400">{t.calendar.client}:</span> {block.client_name}
              </p>
            )}
            {block.booking_id && (
              <Link
                href={`/bookings/${block.booking_id}`}
                className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                {t.calendar.viewBooking}
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {t.calendar.confirmToLock}
            </p>
          </>
        )}

        {/* BLOCKED */}
        {status === "BLOCKED" && block && (
          <>
            <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {t.calendar.manuallyBlocked}
            </span>
            {block.notes && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {block.notes}
              </p>
            )}
            <button
              onClick={() => onUnblock(block.block_id)}
              className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {t.calendar.unblockThisDate}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
