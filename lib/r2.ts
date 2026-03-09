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
