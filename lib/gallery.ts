// ============================================
// Gallery helpers — slug generation, constants
// ============================================

export function generateGallerySlug(
  studioName: string,
  bookingRef: string
): string {
  const studioPart = studioName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 20)
    .replace(/^-|-$/g, "");

  const refPart = bookingRef.toLowerCase().replace(/[^a-z0-9]/g, "");

  return `${studioPart}-${refPart}`;
}

export const MAX_PHOTO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_PHOTOS_PER_GALLERY = 2000;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;
