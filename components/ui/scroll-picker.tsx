"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface ScrollPickerColumnProps {
  items: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
  width?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

function ScrollPickerColumn({ items, selected, onChange, width = "flex-1" }: ScrollPickerColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const animFrame = useRef<number>(0);

  const selectedIndex = items.findIndex((i) => i.value === selected);

  // Scroll to selected item
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const targetScroll = Math.max(0, selectedIndex) * ITEM_HEIGHT;
    el.scrollTop = targetScroll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const snapToNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
    if (items[clamped] && items[clamped].value !== selected) {
      onChange(items[clamped].value);
    }
  }, [items, selected, onChange]);

  // Handle scroll end snap
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let scrollTimer: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (!isDragging.current) snapToNearest();
      }, 80);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [snapToNearest]);

  // Touch / mouse handlers for momentum
  const handlePointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDragging.current = true;
    startY.current = e.clientY;
    startScroll.current = el.scrollTop;
    velocity.current = 0;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    cancelAnimationFrame(animFrame.current);
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    const diff = startY.current - e.clientY;
    el.scrollTop = startScroll.current + diff;

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastY.current - e.clientY) / dt;
    }
    lastY.current = e.clientY;
    lastTime.current = now;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    // Let scroll handler snap
    setTimeout(snapToNearest, 100);
  };

  const containerHeight = VISIBLE_ITEMS * ITEM_HEIGHT;
  const paddingTop = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

  return (
    <div className={`relative ${width}`} style={{ height: containerHeight }}>
      {/* Highlight band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 rounded-lg border border-brand-500/30 bg-brand-500/5 dark:border-brand-400/20 dark:bg-brand-400/5"
        style={{ top: paddingTop, height: ITEM_HEIGHT }}
      />
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white dark:from-gray-900" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white dark:from-gray-900" />

      <div
        ref={containerRef}
        className="no-scrollbar h-full cursor-grab overflow-y-scroll active:cursor-grabbing"
        style={{ scrollSnapType: "y mandatory" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Top padding */}
        <div style={{ height: paddingTop }} />

        {items.map((item) => {
          const isSelected = item.value === selected;
          return (
            <div
              key={item.value}
              className={`flex select-none items-center justify-center text-center transition-all duration-150 ${
                isSelected
                  ? "text-base font-semibold text-gray-900 dark:text-white"
                  : "text-sm text-gray-400 dark:text-gray-500"
              }`}
              style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
              onClick={() => {
                onChange(item.value);
                const el = containerRef.current;
                const idx = items.indexOf(item);
                if (el) el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
              }}
            >
              {item.label}
            </div>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: paddingTop }} />
      </div>
    </div>
  );
}

/* ─── Time Picker (iOS-style wheel) ─── */

interface TimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
  label?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i * 5).padStart(2, "0"),
  label: String(i * 5).padStart(2, "0"),
}));

const PERIODS = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse 24h time to 12h parts
  const hour24 = value ? parseInt(value.split(":")[0]) : -1;
  const minute = value ? value.split(":")[1] : "00";
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 === 0 ? "12" : hour24 > 12 ? String(hour24 - 12) : hour24 === 12 ? "12" : String(hour24);

  const displayText = value
    ? `${hour12}:${minute} ${period}`
    : "Select time";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function buildTime(h: string, m: string, p: string) {
    let h24 = parseInt(h);
    if (p === "PM" && h24 !== 12) h24 += 12;
    if (p === "AM" && h24 === 12) h24 = 0;
    return `${String(h24).padStart(2, "0")}:${m}`;
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 lg:text-base dark:text-gray-300">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors lg:py-3 lg:text-base ${
          open
            ? "border-brand-500 ring-2 ring-brand-500/20"
            : "border-gray-300 dark:border-gray-600"
        } ${value ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"} bg-white dark:bg-gray-800`}
      >
        <span>{displayText}</span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-1/2 z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-stretch divide-x divide-gray-100 px-2 py-2 dark:divide-gray-800">
            <ScrollPickerColumn
              items={HOURS_12}
              selected={value ? hour12 : "12"}
              onChange={(h) => {
                const m = value ? minute : "00";
                const p = value ? period : "AM";
                onChange(buildTime(h, m, p));
              }}
            />
            <ScrollPickerColumn
              items={MINUTES}
              selected={value ? minute : "00"}
              onChange={(m) => {
                const h = value ? hour12 : "12";
                const p = value ? period : "AM";
                onChange(buildTime(h, m, p));
              }}
            />
            <ScrollPickerColumn
              items={PERIODS}
              selected={value ? period : "AM"}
              width="w-20"
              onChange={(p) => {
                const h = value ? hour12 : "12";
                const m = value ? minute : "00";
                onChange(buildTime(h, m, p));
              }}
            />
          </div>
          <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Date Picker (iOS-style wheel) ─── */

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  label?: string;
  minDate?: string; // "YYYY-MM-DD"
  disabled?: boolean;
  hint?: string;
  error?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DatePicker({ value, onChange, label, minDate, disabled, hint, error }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse value or default to today
  const today = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const currentYear = parsed ? parsed.getFullYear() : today.getFullYear();
  const currentMonth = parsed ? String(parsed.getMonth() + 1) : String(today.getMonth() + 1);
  const currentDay = parsed ? String(parsed.getDate()) : String(today.getDate());

  // Generate year options (from current year to +5)
  const startYear = today.getFullYear();
  const yearItems = Array.from({ length: 6 }, (_, i) => ({
    value: String(startYear + i),
    label: String(startYear + i),
  }));

  const monthItems = MONTH_NAMES.map((name, i) => ({
    value: String(i + 1),
    label: name.slice(0, 3),
  }));

  // Days in selected month
  const daysInMonth = new Date(currentYear, parseInt(currentMonth), 0).getDate();
  const dayItems = Array.from({ length: daysInMonth }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  // Format display
  const displayText = parsed
    ? `${parsed.getDate()} ${MONTH_NAMES[parsed.getMonth()].slice(0, 3)} ${parsed.getFullYear()}`
    : "Select date";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function buildDate(y: string, m: string, d: string): string {
    // Clamp day to valid range for the month
    const maxDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const clampedDay = Math.min(parseInt(d), maxDay);
    const result = `${y}-${m.padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;

    // Enforce minDate
    if (minDate && result < minDate) return minDate;
    return result;
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 lg:text-base dark:text-gray-300">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors lg:py-3 lg:text-base ${
          open
            ? "border-brand-500 ring-2 ring-brand-500/20"
            : error
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
        } ${value ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"} ${
          disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
            : "bg-white dark:bg-gray-800"
        }`}
      >
        <span>{displayText}</span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-400 lg:text-sm dark:text-gray-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500 lg:text-sm">{error}</p>}

      {open && (
        <div className="absolute z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-stretch divide-x divide-gray-100 px-2 py-2 dark:divide-gray-800">
            <ScrollPickerColumn
              items={dayItems}
              selected={currentDay}
              onChange={(d) => {
                onChange(buildDate(String(currentYear), currentMonth, d));
              }}
            />
            <ScrollPickerColumn
              items={monthItems}
              selected={currentMonth}
              onChange={(m) => {
                onChange(buildDate(String(currentYear), m, currentDay));
              }}
            />
            <ScrollPickerColumn
              items={yearItems}
              selected={String(currentYear)}
              onChange={(y) => {
                onChange(buildDate(y, currentMonth, currentDay));
              }}
            />
          </div>
          <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
