// ============================================
// Currency utilities — paise ↔ rupees
// ============================================

/**
 * Convert paise to rupees string with ₹ symbol.
 * @example formatRupees(149900) → "₹1,499.00"
 */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert paise to plain rupees number.
 * @example paiseToRupees(149900) → 1499
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Convert rupees to paise.
 * @example rupeesToPaise(1499) → 149900
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format compact amount.
 * @example formatCompact(1500000) → "₹15,000"
 */
export function formatCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(1)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)} L`;
  }
  return formatRupees(paise);
}
