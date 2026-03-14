// ============================================
// CalendarGrid — Monthly calendar grid component
// ============================================

"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type { CalendarBlockEnriched } from "@/types";

interface CalendarGridProps {
  year: number;
  month: number;
  blocks: CalendarBlockEnriched[];
  onDateClick: (date: string, block: CalendarBlockEnriched | null) => void;
  onMonthChange: (year: number, month: number) => void;
}

/** Resolve the highest-priority status for a date with multiple blocks */
function resolveStatus(blocks: CalendarBlockEnriched[]): CalendarBlockEnriched {
  // Priority: BOOKED > BLOCKED > ENQUIRY
  const booked = blocks.find((b) => b.status === "BOOKED");
  if (booked) return booked;
  const blocked = blocks.find((b) => b.status === "BLOCKED");
  if (blocked) return blocked;
  return blocks[0]; // ENQUIRY or whatever is first
}

export function CalendarGrid({
  year,
  month,
  blocks,
  onDateClick,
  onMonthChange,
}: CalendarGridProps) {
  const { locale, t } = useI18n();
  const dateLocale = `${locale}-IN`;

  // Generate locale-aware day labels (Monday-first)
  const dayLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, 1 + i); // 2024-01-01 is a Monday
      labels.push(d.toLocaleDateString(dateLocale, { weekday: "short" }));
    }
    return labels;
  }, [dateLocale]);

  // Locale-aware month name
  const monthName = new Date(year, month - 1).toLocaleDateString(dateLocale, { month: "long" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Build a date-to-block map for O(1) lookups
  const blockMap = useMemo(() => {
    const map: Record<string, CalendarBlockEnriched[]> = {};
    for (const block of blocks) {
      if (!map[block.block_date]) {
        map[block.block_date] = [];
      }
      map[block.block_date].push(block);
    }
    return map;
  }, [blocks]);

  // Calculate calendar grid cells
  const cells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    // Day of week: 0 = Sunday, convert to Monday-first (0 = Monday)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const result: Array<{
      date: string;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      block: CalendarBlockEnriched | null;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({
        date: dateStr,
        day: d,
        isCurrentMonth: false,
        isToday: false,
        isPast: new Date(dateStr + "T00:00:00") < today,
        block: null,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(dateStr + "T00:00:00");
      const dateBlocks = blockMap[dateStr];
      const block = dateBlocks ? resolveStatus(dateBlocks) : null;

      result.push({
        date: dateStr,
        day: d,
        isCurrentMonth: true,
        isToday:
          dateObj.getFullYear() === today.getFullYear() &&
          dateObj.getMonth() === today.getMonth() &&
          dateObj.getDate() === today.getDate(),
        isPast: dateObj < today,
        block,
      });
    }

    // Next month padding to fill grid (always 6 rows = 42 cells)
    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({
        date: dateStr,
        day: d,
        isCurrentMonth: false,
        isToday: false,
        isPast: new Date(dateStr + "T00:00:00") < today,
        block: null,
      });
    }

    return result;
  }, [year, month, blockMap, today]);

  // Navigation handlers
  const canGoPrev = !(year === currentYear && month === currentMonth);
  const canGoNext = !(
    year === currentYear + 1 && month === currentMonth
  );

  function goPrev() {
    if (!canGoPrev) return;
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  }

  function goNext() {
    if (!canGoNext) return;
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  }

  function goToday() {
    onMonthChange(currentYear, currentMonth);
  }

  const isCurrentMonthView = year === currentYear && month === currentMonth;

  return (
    <div>
      {/* Navigation header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Previous month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <h2 className="min-w-[180px] text-center text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
            {monthName} {year}
          </h2>

          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Next month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {!isCurrentMonthView && (
          <button
            onClick={goToday}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {t.calendar.today}
          </button>
        )}
      </div>

      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7 gap-px">
        {dayLabels.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
        {cells.map((cell, idx) => {
          const status = cell.block?.status || "FREE";

          // Status-based styling
          let bgClass = "bg-white dark:bg-gray-900"; // FREE
          let textClass = "text-gray-900 dark:text-gray-100";
          let dotColor = "";

          if (!cell.isCurrentMonth) {
            bgClass = "bg-gray-50 dark:bg-gray-900/50";
            textClass = "text-gray-400 dark:text-gray-600";
          } else if (cell.isPast && status === "FREE") {
            bgClass = "bg-white dark:bg-gray-900";
            textClass = "text-gray-400 dark:text-gray-600";
          } else if (status === "BOOKED") {
            bgClass = "bg-red-50 dark:bg-red-950/40";
            textClass = "text-red-700 dark:text-red-300";
            dotColor = "bg-red-500";
          } else if (status === "ENQUIRY") {
            bgClass = "bg-amber-50 dark:bg-amber-950/40";
            textClass = "text-amber-700 dark:text-amber-300";
            dotColor = "bg-amber-500";
          } else if (status === "BLOCKED") {
            bgClass = "bg-gray-100 dark:bg-gray-800";
            textClass = "text-gray-500 dark:text-gray-500";
            dotColor = "bg-gray-400";
          }

          return (
            <button
              key={idx}
              onClick={() => {
                if (cell.isCurrentMonth) {
                  onDateClick(cell.date, cell.block);
                }
              }}
              disabled={!cell.isCurrentMonth}
              className={`relative flex min-h-[52px] flex-col items-center justify-center p-1 transition-colors sm:min-h-[64px] ${bgClass} ${
                cell.isCurrentMonth
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium sm:h-8 sm:w-8 ${textClass} ${
                  cell.isToday
                    ? "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-gray-900"
                    : ""
                }`}
              >
                {cell.day}
              </span>
              {dotColor && cell.isCurrentMonth && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${dotColor}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
