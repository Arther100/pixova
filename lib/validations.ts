// ============================================
// Zod validation schemas
// Shared across API routes and client forms
// ============================================

import { z } from "zod/v4";

// ---------- Phone (Indian) ----------
export const phoneSchema = z
  .string()
  .regex(/^(\+91)?[6-9]\d{9}$/, "Invalid Indian phone number");

// ---------- Auth ----------
export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// ---------- Studio ----------
export const createStudioSchema = z.object({
  name: z.string().min(2, "Studio name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  phone: phoneSchema,
  email: z.email("Invalid email address").optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  whatsapp: z.string().max(15).optional(),
  website: z.url("Invalid URL").optional(),
  instagram: z.string().max(100).optional(),
  facebook: z.string().max(100).optional(),
  youtube: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  specializations: z.array(z.string().max(50)).max(10).optional(),
  languages: z.array(z.string().max(30)).max(10).optional(),
  startingPrice: z.number().int().min(0).optional(), // paise
});

export const updateStudioSchema = createStudioSchema.partial();

// ---------- Studio Package ----------
export const createPackageSchema = z.object({
  name: z.string().min(1, "Package name is required").max(200),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0, "Price must be positive"), // paise
  deliverables: z.string().max(1000).optional(),
  durationHours: z.number().int().min(1).max(720).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePackageSchema = createPackageSchema.partial();

// ---------- Client ----------
export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: phoneSchema,
  email: z.email("Invalid email address").optional(),
  notes: z.string().max(1000).optional(),
});

export const updateClientSchema = createClientSchema.partial();

// ---------- Booking ----------
export const createBookingSchema = z.object({
  clientId: z.uuid("Invalid client ID"),
  title: z.string().min(1, "Title is required").max(200),
  eventType: z.string().max(100).optional(),
  eventDate: z.string().date("Invalid date format (YYYY-MM-DD)").optional(),
  venue: z.string().max(300).optional(),
  totalAmount: z.number().int().min(0, "Amount must be positive"), // paise
  notes: z.string().max(2000).optional(),
});

export const updateBookingSchema = createBookingSchema.partial().omit({
  clientId: true,
});

// ---------- Gallery ----------
export const createGallerySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  bookingId: z.uuid().optional(),
  clientId: z.uuid().optional(),
  allowDownload: z.boolean().default(true),
  allowSelection: z.boolean().default(false),
  selectionLimit: z.number().int().min(1).optional(),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only digits")
    .optional(),
  expiresAt: z.iso.datetime().optional(),
});

export const updateGallerySchema = createGallerySchema.partial();

// ---------- Upload ----------
export const presignedUrlSchema = z.object({
  galleryId: z.uuid("Invalid gallery ID"),
  filename: z.string().min(1, "Filename is required").max(255),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(25 * 1024 * 1024, "File size must be under 25 MB"),
});

// ---------- Payments ----------
export const createPaymentOrderSchema = z.object({
  amount: z.number().int().min(100, "Minimum amount is ₹1"), // paise
  bookingId: z.uuid().optional(),
  type: z.enum(["subscription", "booking_advance", "booking_final"]),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// ---------- Gallery access (client-side) ----------
export const galleryPinSchema = z.object({
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only digits"),
});

// ---------- Photo selection ----------
export const photoSelectionSchema = z.object({
  photoIds: z.array(z.uuid()).min(1, "Select at least one photo"),
});

// ---------- Pagination query ----------
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------- Calendar Block ----------
export const createCalendarBlockSchema = z.object({
  startDate: z.string().date("Invalid date format (YYYY-MM-DD)"),
  endDate: z.string().date("Invalid date format (YYYY-MM-DD)"),
  reason: z.string().max(200).optional(),
});

// ---------- Enquiry ----------
export const createEnquirySchema = z.object({
  clientName: z.string().min(1, "Name is required").max(200),
  clientPhone: phoneSchema,
  clientEmail: z.email("Invalid email address").optional(),
  eventType: z.string().max(100).optional(),
  eventDate: z.string().date("Invalid date format (YYYY-MM-DD)").optional(),
  venue: z.string().max(300).optional(),
  message: z.string().max(2000).optional(),
  budget: z.number().int().min(0).optional(), // paise
  source: z.string().max(100).optional(),
});

export const updateEnquirySchema = z.object({
  status: z.enum(["new", "contacted", "converted", "declined"]).optional(),
  notes: z.string().max(2000).optional(),
});

// ---------- Agreement ----------
export const createAgreementSchema = z.object({
  bookingId: z.uuid("Invalid booking ID"),
  content: z.string().min(1, "Agreement content is required"),
  validUntil: z.iso.datetime().optional(),
});

export const signAgreementSchema = z.object({
  signatureUrl: z.url("Invalid signature URL"),
});

// ---------- Invoice ----------
export const createInvoiceSchema = z.object({
  bookingId: z.uuid("Invalid booking ID"),
  clientId: z.uuid("Invalid client ID"),
  invoiceNumber: z.string().min(1, "Invoice number is required").max(50),
  totalAmount: z.number().int().min(0, "Amount must be positive"), // paise
  dueDate: z.string().date("Invalid date format (YYYY-MM-DD)").optional(),
  lineItems: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  paidAmount: z.number().int().min(0).optional(),
  dueDate: z.string().date("Invalid date format (YYYY-MM-DD)").optional(),
  notes: z.string().max(2000).optional(),
});

// ---------- Portfolio Showcase ----------
export const createShowcaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  eventType: z.string().max(100).optional(),
  coverPhotoUrl: z.url("Invalid URL").optional(),
  photoUrls: z.array(z.url()).max(50).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateShowcaseSchema = createShowcaseSchema.partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});

// ---------- Client Feedback ----------
export const createFeedbackSchema = z.object({
  bookingId: z.uuid("Invalid booking ID"),
  galleryId: z.uuid("Invalid gallery ID").optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// ---------- Client Account ----------
export const createClientAccountSchema = z.object({
  clientId: z.uuid("Invalid client ID"),
});

// ---------- Type exports ----------
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateStudioInput = z.infer<typeof createStudioSchema>;
export type UpdateStudioInput = z.infer<typeof updateStudioSchema>;
export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CreateGalleryInput = z.infer<typeof createGallerySchema>;
export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>;
export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateCalendarBlockInput = z.infer<typeof createCalendarBlockSchema>;
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;
export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type SignAgreementInput = z.infer<typeof signAgreementSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateShowcaseInput = z.infer<typeof createShowcaseSchema>;
export type UpdateShowcaseInput = z.infer<typeof updateShowcaseSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type CreateClientAccountInput = z.infer<typeof createClientAccountSchema>;
