// ============================================
// /(photographer)/calendar — Calendar & Availability page
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarGrid } from "@/components/CalendarGrid";
import { DatePopover } from "@/components/DatePopover";
import { BlockDatesModal } from "@/components/BlockDatesModal";
import { AvailabilityLegend } from "@/components/AvailabilityLegend";
import { UpcomingEventsList } from "@/components/UpcomingEventsList";
import { useI18n } from "@/lib/i18n";
import type { CalendarBlockEnriched } from "@/types";

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Initialize from URL params or current date
  const now = new Date();
  const initialYear = parseInt(searchParams.get("year") || "") || now.getFullYear();
  const initialMonth = parseInt(searchParams.get("month") || "") || now.getMonth() + 1;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [blocks, setBlocks] = useState<CalendarBlockEnriched[]>([]);
  const [loading, setLoading] = useState(true);

  // Popover state
  const [popover, setPopover] = useState<{
    date: string;
    block: CalendarBlockEnriched | null;
    position: { x: number; y: number };
  } | null>(null);

  // Block modal state
  const [blockModal, setBlockModal] = useState<{
    open: boolean;
    initialDate?: string;
  }>({ open: false });

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  // Show toast with auto-dismiss
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch calendar blocks
  const fetchBlocks = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/calendar?year=${y}&month=${m}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && json.data?.blocks) {
        setBlocks(json.data.blocks);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when month changes
  useEffect(() => {
    fetchBlocks(year, month);
  }, [year, month, fetchBlocks]);

  // Update URL when month changes
  function handleMonthChange(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
    setPopover(null);
    router.replace(`/calendar?year=${newYear}&month=${newMonth}`, {
      scroll: false,
    });
  }

  // Handle date cell click
  function handleDateClick(
    date: string,
    block: CalendarBlockEnriched | null
  ) {
    // Get click position for popover
    const event = window.event as MouseEvent;
    if (event) {
      setPopover({
        date,
        block,
        position: { x: event.clientX, y: event.clientY },
      });
    }
  }

  // Handle block from popover
  function handleBlockFromPopover(date: string) {
    setPopover(null);
    setBlockModal({ open: true, initialDate: date });
  }

  // Handle unblock from popover
  async function handleUnblock(blockId: string) {
    try {
      const res = await fetch(`/api/v1/calendar/block/${blockId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        // Optimistically remove from blocks
        setBlocks((prev) => prev.filter((b) => b.block_id !== blockId));
        setPopover(null);
        showToast(t.calendar.dateUnblocked);
      } else {
        showToast(json.error || t.calendar.networkError);
      }
    } catch {
      showToast(t.calendar.networkError);
    }
  }

  // Handle block success
  function handleBlockSuccess(dates: string[]) {
    setBlockModal({ open: false });
    fetchBlocks(year, month);
    showToast(
      dates.length === 1
        ? `1 ${t.calendar.dateBlocked}`
        : `${dates.length} ${t.calendar.dateBlocked}`
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t.calendar.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t.calendar.subtitle}
          </p>
        </div>
        <button
          onClick={() => setBlockModal({ open: true })}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path d="M12 14v4M10 16h4" />
          </svg>
          {t.calendar.blockDates}
        </button>
      </div>

      {/* Main layout: calendar + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Calendar grid */}
        <div className="min-w-0">
          {loading && blocks.length === 0 ? (
            <div className="animate-pulse">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-6 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="h-6 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-h-[52px] bg-white dark:bg-gray-900 sm:min-h-[64px]"
                  />
                ))}
              </div>
            </div>
          ) : (
            <CalendarGrid
              year={year}
              month={month}
              blocks={blocks}
              onDateClick={handleDateClick}
              onMonthChange={handleMonthChange}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <AvailabilityLegend />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <UpcomingEventsList />
          </div>
        </div>
      </div>

      {/* Date popover */}
      {popover && (
        <DatePopover
          date={popover.date}
          block={popover.block}
          position={popover.position}
          onClose={() => setPopover(null)}
          onBlock={handleBlockFromPopover}
          onUnblock={handleUnblock}
        />
      )}

      {/* Block dates modal */}
      <BlockDatesModal
        isOpen={blockModal.open}
        initialDate={blockModal.initialDate}
        onClose={() => setBlockModal({ open: false })}
        onSuccess={handleBlockSuccess}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
          {toast}
        </div>
      )}
    </div>
  );
}
