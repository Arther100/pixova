// ============================================
// Phone number utilities
// ============================================

import { INDIAN_PHONE_REGEX } from "@/lib/constants";

/**
 * Validate an Indian phone number.
 * Accepts: 9876543210, +919876543210, 919876543210
 */
export function isValidIndianPhone(phone: string): boolean {
  return INDIAN_PHONE_REGEX.test(phone.trim());
}

/**
 * Normalize phone to 10-digit format (no country code).
 * @example normalize("  +91 98765 43210 ") → "9876543210"
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Format phone for display.
 * @example formatPhone("9876543210") → "+91 98765 43210"
 */
export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Get E.164 format.
 * @example toE164("9876543210") → "+919876543210"
 */
export function toE164(phone: string): string {
  return `+91${normalizePhone(phone)}`;
}

/**
 * Mask phone for privacy.
 * @example maskPhone("9876543210") → "98****3210"
 */
export function maskPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return phone;
  return `${digits.slice(0, 2)}****${digits.slice(-4)}`;
}
