// ============================================
// Agreement helpers — ref generation, defaults
// ============================================

import { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_CANCELLATION_POLICY =
  "Advance payment is non-refundable upon cancellation. " +
  "Cancellations made 30 or more days before the event date will forfeit the advance payment only. " +
  "Cancellations within 30 days of the event date will be charged the full booking amount. " +
  "In exceptional circumstances, please contact us directly to discuss alternative arrangements.";

export async function generateAgreementRef(
  supabase: SupabaseClient,
  studioId: string,
  studioName: string
): Promise<string> {
  const year = new Date().getFullYear();
  const code = studioName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  const { count } = await supabase
    .from("agreements")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studioId);

  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `AGR-${year}-${code}-${seq}`;
}

export function formatEventType(eventType: string | null): string {
  if (!eventType) return "Photography";
  return eventType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatAgreementDate(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return rupees.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}
