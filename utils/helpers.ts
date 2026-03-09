// ============================================
// General utilities
// ============================================

import { randomUUID } from "crypto";

/**
 * Generate a UUID v4.
 */
export function uuid(): string {
  return randomUUID();
}

/**
 * Generate a URL-safe slug from a string.
 * @example slugify("Shree Krishna Studios") → "shree-krishna-studios"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a numeric OTP of given length.
 */
export function generateOtp(length = 6): string {
  const digits = "0123456789";
  let otp = "";
  const array = new Uint8Array(length);
  globalThis.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    otp += digits[array[i] % 10];
  }
  return otp;
}

/**
 * Generate a short random PIN (for gallery access).
 */
export function generatePin(length = 4): string {
  return generateOtp(length);
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Get file extension from filename.
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Format bytes to human-readable.
 * @example formatBytes(1536000) → "1.5 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Sleep / delay helper.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type-safe Object.keys().
 */
export function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}
