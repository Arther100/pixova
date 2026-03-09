// ============================================
// Date / time utilities (IST-first)
// ============================================

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // +5:30

/**
 * Get current date-time in IST as ISO string.
 */
export function nowIST(): Date {
  const utc = new Date();
  return new Date(utc.getTime() + IST_OFFSET);
}

/**
 * Format date for display: "15 Mar 2026"
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

/**
 * Format date-time: "15 Mar 2026, 3:30 PM"
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

/**
 * Relative time: "2 hours ago", "in 3 days"
 */
export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`;
  return formatDate(date);
}

/**
 * Check if a date is in the past.
 */
export function isPast(date: string | Date): boolean {
  return new Date(date).getTime() < Date.now();
}

/**
 * Check if a date is today (IST).
 */
export function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const today = new Date();
  return (
    d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) ===
    today.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
  );
}

/**
 * Add days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
