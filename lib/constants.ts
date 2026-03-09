// ============================================
// App-wide constants
// ============================================

/** OTP length for WhatsApp / SMS verification */
export const OTP_LENGTH = 6;

/** OTP expiry in seconds */
export const OTP_EXPIRY_SECONDS = 600; // 10 min

/** Max OTP verification attempts */
export const OTP_MAX_ATTEMPTS = 3;

/** Delay before SMS fallback (ms) */
export const SMS_FALLBACK_DELAY_MS = 30_000; // 30 sec

/** Max photo upload size in bytes (25 MB) */
export const MAX_PHOTO_SIZE_BYTES = 25 * 1024 * 1024;

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/** Gallery photo thumbnail sizes */
export const THUMBNAIL_SIZES = {
  sm: 320,
  md: 640,
  lg: 1280,
  xl: 1920,
} as const;

/** Subscription plans (amounts in paise) */
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: "Starter",
    priceMonthly: 99900, // ₹999
    priceYearly: 999900, // ₹9,999
    maxStorage: 10 * 1024 * 1024 * 1024, // 10 GB
    maxGalleries: 20,
    maxPhotosPerGallery: 500,
    watermark: true,
    clientSelections: true,
    downloadEnabled: true,
  },
  professional: {
    name: "Professional",
    priceMonthly: 199900, // ₹1,999
    priceYearly: 1999900, // ₹19,999
    maxStorage: 50 * 1024 * 1024 * 1024, // 50 GB
    maxGalleries: 100,
    maxPhotosPerGallery: 2000,
    watermark: true,
    clientSelections: true,
    downloadEnabled: true,
  },
  studio: {
    name: "Studio",
    priceMonthly: 499900, // ₹4,999
    priceYearly: 4999900, // ₹49,999
    maxStorage: 200 * 1024 * 1024 * 1024, // 200 GB
    maxGalleries: -1, // unlimited
    maxPhotosPerGallery: -1, // unlimited
    watermark: true,
    clientSelections: true,
    downloadEnabled: true,
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

/** Booking statuses */
export const BOOKING_STATUSES = [
  "enquiry",
  "confirmed",
  "in_progress",
  "delivered",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Indian phone regex (10 digits, optionally prefixed with +91) */
export const INDIAN_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
