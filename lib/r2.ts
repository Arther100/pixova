// ============================================
// Cloudflare R2 — S3-compatible object storage
// ============================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    // Disable automatic CRC32 checksums — they break presigned PUT URLs
    // (SDK calculates CRC32 of empty body at presign time, R2 then rejects
    //  the actual upload because the file's CRC32 doesn't match)
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return r2Client;
}

const BUCKET = () => process.env.R2_BUCKET_NAME!;

// ---------- Upload ----------
export async function uploadToR2(
  key: string,
  body: Buffer | ReadableStream | Blob,
  contentType: string,
  metadata?: Record<string, string>
): Promise<{ key: string; url: string }> {
  const params: PutObjectCommandInput = {
    Bucket: BUCKET(),
    Key: key,
    Body: body as PutObjectCommandInput["Body"],
    ContentType: contentType,
    Metadata: metadata,
  };

  await getR2Client().send(new PutObjectCommand(params));

  const publicUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : key;

  return { key, url: publicUrl };
}

// ---------- Presigned upload URL (client-side uploads) ----------
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}

// ---------- Presigned download URL ----------
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}

// ---------- Delete ----------
export async function deleteFromR2(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: BUCKET(),
      Key: key,
    })
  );
}

// ---------- Key generators ----------
/**
 * Generate a storage key for a gallery photo.
 * Format: photographers/{photographerId}/galleries/{galleryId}/{photoId}.{ext}
 */
export function galleryPhotoKey(
  photographerId: string,
  galleryId: string,
  photoId: string,
  extension: string
): string {
  return `photographers/${photographerId}/galleries/${galleryId}/${photoId}.${extension}`;
}

/**
 * Generate a storage key for a thumbnail.
 * Format: photographers/{photographerId}/galleries/{galleryId}/thumbs/{photoId}_{size}.webp
 */
export function thumbnailKey(
  photographerId: string,
  galleryId: string,
  photoId: string,
  size: "sm" | "md" | "lg" | "xl"
): string {
  return `photographers/${photographerId}/galleries/${galleryId}/thumbs/${photoId}_${size}.webp`;
}

/**
 * Generate a storage key for the studio logo.
 * Format: photographers/{photographerId}/studio/logo.{ext}
 */
export function studioLogoKey(photographerId: string, extension: string): string {
  return `photographers/${photographerId}/studio/logo.${extension}`;
}

/**
 * Generate a storage key for portfolio showcase photos.
 * Format: photographers/{photographerId}/portfolio/{showcaseId}/{index}.{ext}
 */
export function portfolioPhotoKey(
  photographerId: string,
  showcaseId: string,
  index: number,
  extension: string
): string {
  return `photographers/${photographerId}/portfolio/${showcaseId}/${index}.${extension}`;
}

/**
 * Generate a storage key for agreement PDFs.
 * Format: agreements/{studioId}/{agreementId}.pdf
 */
export function agreementPdfKey(
  studioId: string,
  agreementId: string
): string {
  return `agreements/${studioId}/${agreementId}.pdf`;
}

/**
 * Generate a storage key for agreement signatures.
 * Format: photographers/{photographerId}/agreements/{agreementId}/signature.png
 */
export function signatureKey(
  photographerId: string,
  agreementId: string
): string {
  return `photographers/${photographerId}/agreements/${agreementId}/signature.png`;
}

/**
 * Generate a storage key for invoice PDFs.
 * Format: photographers/{photographerId}/invoices/{invoiceId}.pdf
 */
export function invoicePdfKey(
  photographerId: string,
  invoiceId: string
): string {
  return `photographers/${photographerId}/invoices/${invoiceId}.pdf`;
}

// ---------- Photo URL ----------
/**
 * Returns public URL if R2 public access enabled,
 * otherwise returns a signed URL.
 */
export async function getPhotoUrl(
  key: string,
  expiresIn = 14400
): Promise<string> {
  // Always use presigned URLs — the public CDN domain (R2_PUBLIC_URL)
  // needs R2 bucket public access enabled + custom domain configured.
  // Until that's set up, presigned S3 URLs are the reliable path.
  return getPresignedDownloadUrl(key, expiresIn);
}

// ---------- Batch delete ----------
export async function deletePhotosFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += 10) {
    batches.push(keys.slice(i, i + 10));
  }
  for (const batch of batches) {
    await Promise.allSettled(
      batch.map((key) => deleteFromR2(key))
    );
  }
}
