// ============================================
// Payment helpers — receipt generation, status derivation, labels
// ============================================

import { SupabaseClient } from "@supabase/supabase-js";

// ─── Receipt Number ───────────────────────────
// Format: RCP-2026-0001 (per photographer per year)
export async function generateReceiptNumber(
  supabase: SupabaseClient,
  photographerId: string
): Promise<string> {
  const year = new Date().getFullYear();

  const { count } = await supabase
    .from("payment_records")
    .select("*", { count: "exact", head: true })
    .eq("photographer_id", photographerId)
    .not("receipt_number", "is", null)
    .gte("created_at", `${year}-01-01`)
    .lt("created_at", `${year + 1}-01-01`);

  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `RCP-${year}-${seq}`;
}

// ─── Payment Status Calculation ───────────────
// Derives payment_status from paid_amount vs total_amount (in paise)
export function derivePaymentStatus(
  totalAmount: number,
  paidAmount: number
): string {
  if (paidAmount <= 0) return "PENDING";
  if (paidAmount > totalAmount) return "OVERPAID";
  if (paidAmount >= totalAmount) return "PAID";
  return "PARTIAL";
}

// ─── Payment Type Label ───────────────────────
export function getPaymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ADVANCE: "Advance Payment",
    PARTIAL: "Partial Payment",
    FINAL: "Final Payment",
    REFUND: "Refund",
    OVERAGE: "Overage Charge",
  };
  return labels[type] ?? type;
}

// ─── Payment Method Label ─────────────────────
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    razorpay: "Razorpay",
    other: "Other",
  };
  return labels[method] ?? method;
}
